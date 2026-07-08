import convert from 'xml-js';
import { makeAdtRequest, getBaseUrl, McpError, ErrorCode } from './utils';

/**
 * Escapes special regex characters in a string for use in RegExp constructor
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Represents a class include
 */
export interface ClassInclude {
    type: string; // 'main', 'definitions', 'implementations', 'macros', 'testclasses'
    uri: string; // e.g., 'source/main', 'includes/implementations'
    includeType: string; // Original includeType from XML
}

/**
 * Represents class metadata
 */
export interface ClassMetadata {
    className: string;
    includes: ClassInclude[];
}

/**
 * Represents a fetched include with its source code
 */
export interface FetchedInclude {
    type: string;
    source: string | null;
    error?: string;
}

/**
 * Helper function to safely extract attribute from XML-JS object
 */
function extractAttr(obj: any, attrName: string): string | undefined {
    if (!obj || !obj._attributes) return undefined;
    return obj._attributes[attrName];
}

/**
 * Maps include type names to standardized types
 */
function normalizeIncludeType(includeType: string): string {
    const typeMap: { [key: string]: string } = {
        main: 'main',
        definitions: 'definitions',
        implementations: 'implementations',
        macros: 'macros',
        testclasses: 'testclasses',
        testClasses: 'testclasses',
    };
    return typeMap[includeType] || includeType;
}

/**
 * Fetches class metadata XML and extracts available includes
 *
 * @param className - Name of the ABAP class
 * @returns Class metadata with list of available includes
 */
export async function fetchClassMetadata(className: string): Promise<ClassMetadata> {
    try {
        const encodedClassName = encodeURIComponent(className);
        const baseUrl = await getBaseUrl();
        const url = `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}`;

        const response = await makeAdtRequest(url, 'GET', 30000, undefined, undefined, {
            Accept: 'application/vnd.sap.adt.oo.classes.v1+xml',
        });

        // Parse XML response
        const result = convert.xml2js(response.data, { compact: true });
        const classNode = result['class:abapClass'];

        if (!classNode) {
            throw new McpError(ErrorCode.InternalError, 'Invalid class metadata response format');
        }

        // Extract includes
        const includes: ClassInclude[] = [];
        const includeNodes = classNode['class:include'];

        if (includeNodes) {
            const includeArray = Array.isArray(includeNodes) ? includeNodes : [includeNodes];

            for (const node of includeArray) {
                const includeType = extractAttr(node, 'class:includeType');
                const sourceUri = extractAttr(node, 'abapsource:sourceUri');

                if (includeType && sourceUri) {
                    includes.push({
                        type: normalizeIncludeType(includeType),
                        uri: sourceUri,
                        includeType: includeType,
                    });
                }
            }
        }

        return {
            className,
            includes,
        };
    } catch (error: any) {
        // Re-throw authorization and not-found errors so callers see them
        if (error?.response?.status === 401 || error?.response?.status === 403 || error?.response?.status === 404) {
            throw error;
        }
        if (error instanceof McpError) {
            throw error;
        }
        // For unexpected parse/network errors, fall back to standard include URIs
        console.error(`Failed to fetch class metadata for ${className}, using fallback:`, error.message);
        return createFallbackMetadata(className);
    }
}

/**
 * Creates fallback metadata with standard include URIs
 */
function createFallbackMetadata(className: string): ClassMetadata {
    return {
        className,
        includes: [
            { type: 'main', uri: 'source/main', includeType: 'main' },
            { type: 'definitions', uri: 'includes/definitions', includeType: 'definitions' },
            { type: 'implementations', uri: 'includes/implementations', includeType: 'implementations' },
            { type: 'macros', uri: 'includes/macros', includeType: 'macros' },
            { type: 'testclasses', uri: 'includes/testclasses', includeType: 'testclasses' },
        ],
    };
}

/**
 * Fetches multiple class includes in parallel
 *
 * @param className - Name of the ABAP class
 * @param includeTypes - Array of include types to fetch ('all' fetches all available)
 * @returns Array of fetched includes with source code or null for missing includes
 */
export async function fetchIncludes(className: string, includeTypes: string[]): Promise<FetchedInclude[]> {
    // Fetch metadata to get available includes
    const metadata = await fetchClassMetadata(className);

    // Determine which includes to fetch
    let includesToFetch = metadata.includes;
    if (!includeTypes.includes('all')) {
        includesToFetch = metadata.includes.filter((inc) => includeTypes.includes(inc.type));
        // Warn when a requested type was not found in metadata
        const foundTypes = new Set(includesToFetch.map((inc) => inc.type));
        for (const requestedType of includeTypes) {
            if (!foundTypes.has(requestedType)) {
                console.warn(`Include type '${requestedType}' not found in metadata for class ${className}`);
            }
        }
    }

    // Fetch all includes in parallel
    const encodedClassName = encodeURIComponent(className);
    const baseUrl = await getBaseUrl();

    const fetchPromises = includesToFetch.map(async (include): Promise<FetchedInclude> => {
        try {
            const url = `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}/${include.uri}`;
            const response = await makeAdtRequest(url, 'GET', 30000, undefined, undefined, {
                Accept: 'text/plain',
            });

            return {
                type: include.type,
                source: response.data || null,
            };
        } catch (error: any) {
            // 404 is expected for includes that don't exist - not an error
            if (error.message?.includes('404') || error.response?.status === 404) {
                return {
                    type: include.type,
                    source: null,
                };
            }

            // For other errors (auth, network), propagate them
            throw error;
        }
    });

    return Promise.all(fetchPromises);
}

/**
 * Formats multiple includes into a single output with section separators
 *
 * @param includes - Array of fetched includes
 * @returns Formatted string with all includes separated by headers
 */
export function formatMultiIncludeOutput(includes: FetchedInclude[]): string {
    const sections: string[] = [];

    // Define section order and labels
    const sectionOrder = [
        { type: 'main', label: 'MAIN SOURCE' },
        { type: 'definitions', label: 'LOCAL CLASS DEFINITIONS (CCDEF)' },
        { type: 'implementations', label: 'LOCAL CLASS IMPLEMENTATIONS (CCIMP)' },
        { type: 'macros', label: 'LOCAL MACROS (CCMAC)' },
        { type: 'testclasses', label: 'LOCAL TEST CLASSES (CCAU)' },
    ];

    // Process includes in defined order
    for (const section of sectionOrder) {
        const include = includes.find((inc) => inc.type === section.type);
        if (!include) continue;

        // Create section header
        const separator = '='.repeat(80);
        const header = `${separator}\n${section.label}\n${separator}`;

        if (include.source) {
            sections.push(`${header}\n${include.source}`);
        } else {
            sections.push(`${header}\n// No ${section.type} include found`);
        }
    }

    return sections.join('\n\n');
}

/**
 * Gets the file suffix for an include type (for export)
 *
 * @param includeType - The include type
 * @returns File suffix (e.g., '.locals_imp' for implementations)
 */
export function getIncludeSuffix(includeType: string): string {
    switch (includeType) {
        case 'main':
            return '';
        case 'definitions':
            return '.locals_def';
        case 'implementations':
            return '.locals_imp';
        case 'macros':
            return '.macros';
        case 'testclasses':
            return '.testclasses';
        default:
            return `.${includeType}`;
    }
}

/**
 * Gets a human-readable label for an include type
 *
 * @param includeType - The include type
 * @returns Human-readable label
 */
export function getIncludeLabel(includeType: string): string {
    switch (includeType) {
        case 'main':
            return 'Main Source';
        case 'definitions':
            return 'Local Definitions (CCDEF)';
        case 'implementations':
            return 'Local Implementations (CCIMP)';
        case 'macros':
            return 'Local Macros (CCMAC)';
        case 'testclasses':
            return 'Test Classes (CCAU)';
        default:
            return includeType;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured ABAP output — for output_format: 'structured'
// Converts raw ABAP source text to JSON so downstream compressors (e.g.
// Headroom SmartCrusher) can achieve 90%+ compression vs ~65% on plain text.
// Fully backward-compatible: only used when caller passes output_format.
// ─────────────────────────────────────────────────────────────────────────────

export interface AbapMethodEntry {
    name: string;
    body: string;
}

export interface AbapClassDefinition {
    public: string;
    protected: string;
    private: string;
}

export interface AbapStructuredClass {
    object_type: 'CLAS';
    name: string;
    definition: AbapClassDefinition;
    methods: AbapMethodEntry[];
}

/**
 * Parses a raw ABAP class source string into a structured JSON object.
 * Uses regex-based section/method boundary detection — no full AST needed
 * because ABAP class structure is highly uniform and predictable.
 *
 * Structure detected:
 *   CLASS <name> DEFINITION.
 *     PUBLIC SECTION. / PROTECTED SECTION. / PRIVATE SECTION.
 *   ENDCLASS.
 *   CLASS <name> IMPLEMENTATION.
 *     METHOD <name>. ... ENDMETHOD.
 *   ENDCLASS.
 *
 * @param source - Raw ABAP class source string from GetClass()
 * @param className - Class name for the output object
 * @returns Structured JSON representation of the class
 */
export function parseAbapClassToJson(source: string, className: string): AbapStructuredClass {
    const result: AbapStructuredClass = {
        object_type: 'CLAS',
        name: className.toUpperCase(),
        definition: { public: '', protected: '', private: '' },
        methods: [],
    };

    const lines = source.split('\n');

    // ── 1. Extract DEFINITION sections ──────────────────────────────────────
    let inDefinition = false;
    let currentSection: keyof AbapClassDefinition | null = null;
    const sectionBuffers: Record<keyof AbapClassDefinition, string[]> = {
        public: [],
        protected: [],
        private: [],
    };

    for (const line of lines) {
        const trimmed = line.trimEnd();

        if (/^\s*CLASS\s+\S+\s+DEFINITION\b/i.test(trimmed)) {
            inDefinition = true;
            continue;
        }
        if (/^ENDCLASS\s*\./i.test(trimmed) && inDefinition) {
            inDefinition = false;
            currentSection = null;
            continue;
        }

        if (inDefinition) {
            if (/^\s*PUBLIC\s+SECTION\s*\./i.test(trimmed)) {
                currentSection = 'public';
                continue;
            }
            if (/^\s*PROTECTED\s+SECTION\s*\./i.test(trimmed)) {
                currentSection = 'protected';
                continue;
            }
            if (/^\s*PRIVATE\s+SECTION\s*\./i.test(trimmed)) {
                currentSection = 'private';
                continue;
            }
            if (currentSection) sectionBuffers[currentSection].push(trimmed);
        }
    }

    result.definition.public = sectionBuffers.public.join('\n').trim();
    result.definition.protected = sectionBuffers.protected.join('\n').trim();
    result.definition.private = sectionBuffers.private.join('\n').trim();

    // ── 2. Extract METHOD bodies from IMPLEMENTATION ─────────────────────────
    let inImplementation = false;
    let inMethod = false;
    let currentMethodName = '';
    const methodBuffer: string[] = [];

    for (const line of lines) {
        const trimmed = line.trimEnd();

        if (/^\s*CLASS\s+\S+\s+IMPLEMENTATION\b/i.test(trimmed)) {
            inImplementation = true;
            continue;
        }
        if (/^ENDCLASS\s*\./i.test(trimmed) && inImplementation) {
            inImplementation = false;
            if (inMethod) {
                // Discard any unclosed method buffer (malformed source)
                inMethod = false;
                currentMethodName = '';
                methodBuffer.length = 0;
            }
            continue;
        }

        if (!inImplementation) continue;

        // METHOD <name>. — handles simple and interface methods (IF~METH)
        const methodStart = trimmed.match(/^\s*METHOD\s+([\w~]+)\s*\./i);
        if (methodStart && !inMethod) {
            inMethod = true;
            currentMethodName = methodStart[1].toUpperCase();
            methodBuffer.length = 0;
            methodBuffer.push(trimmed);
            continue;
        }

        if (inMethod) {
            methodBuffer.push(trimmed);
            if (/^\s*ENDMETHOD\s*\./i.test(trimmed)) {
                result.methods.push({
                    name: currentMethodName,
                    body: methodBuffer.join('\n'),
                });
                inMethod = false;
                currentMethodName = '';
                methodBuffer.length = 0;
            }
        }
    }

    return result;
}
