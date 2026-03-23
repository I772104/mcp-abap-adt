import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { parseStringPromise } from 'xml2js';

interface RuntimeError {
    user: string;
    error_type: string;
    program: string;
    timestamp: string;
    dump_id: string;
}

interface ListRuntimeErrorsArgs {
    user?: string;
    from?: string;
    to?: string;
    max_results?: number;
}

/**
 * Parse Atom feed XML response to extract runtime error entries
 */
async function parseAtomFeed(xmlResponse: string): Promise<RuntimeError[]> {
    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });

    // Handle both namespaced and non-namespaced feed elements
    const feed = parsed?.['atom:feed'] || parsed?.feed;

    if (!feed) {
        // Debug: Log what we actually received
        const rootKeys = Object.keys(parsed || {});
        throw new McpError(
            ErrorCode.InternalError,
            `Invalid Atom feed format. Root element keys: ${rootKeys.join(', ')}. Expected 'feed' or 'atom:feed'.`
        );
    }

    // Handle case where there are no entries
    const entry = feed['atom:entry'] || feed.entry;
    if (!entry) {
        return [];
    }

    // Normalize to array
    const entries = Array.isArray(entry) ? entry : [entry];

    return entries.map((entry: any) => {
        // Extract user from author (with namespace)
        const author = entry['atom:author'] || entry.author;
        const user = author?.['atom:name'] || author?.name || '';

        // Extract error type and program from categories
        let errorType = '';
        let program = '';
        const category = entry['atom:category'] || entry.category;
        const categories = Array.isArray(category) ? category : [category];

        for (const cat of categories) {
            const attrs = cat.$ || cat;
            const label = attrs.label || '';
            const term = attrs.term || '';

            if (label === 'ABAP runtime error') {
                errorType = term;
            }
            if (label === 'Terminated ABAP program') {
                program = term;
            }
        }

        // Extract timestamp (with namespace)
        const timestamp = entry['atom:published'] || entry.published || '';

        // Extract dump ID from self link
        let dumpId = '';
        const link = entry['atom:link'] || entry.link;
        const links = Array.isArray(link) ? link : [link];

        for (const lnk of links) {
            const attrs = lnk.$ || lnk;
            const rel = attrs.rel || '';
            const href = attrs.href || '';

            if (rel === 'self' && href.includes('/runtime/dump/')) {
                // Extract dump ID from href like: adt://ER1/sap/bc/adt/runtime/dump/{id}
                const match = href.match(/\/runtime\/dump\/([^/]+?)(?:\?|$)/);
                if (match) {
                    dumpId = match[1];
                }
                break;
            }
        }

        return {
            user,
            error_type: errorType,
            program,
            timestamp,
            dump_id: dumpId,
        };
    });
}

/**
 * Convert ISO timestamp to ABAP timestamp format (YYYYMMDDhhmmss)
 */
function toAbapTimestamp(isoTimestamp: string): string {
    // Strip all non-digit characters
    return isoTimestamp.replace(/[^0-9]/g, '');
}

/**
 * Format runtime errors as a readable table
 */
function formatRuntimeErrors(errors: RuntimeError[]): string {
    if (errors.length === 0) {
        return 'No runtime errors found.';
    }

    let output = `Runtime Error Dumps (${errors.length} entries)\n`;
    output += '='.repeat(80) + '\n\n';

    // Table header
    output += String('#').padEnd(4);
    output += String('Error Type').padEnd(32);
    output += String('Program').padEnd(30);
    output += String('User').padEnd(14);
    output += '\n';
    output += '-'.repeat(80) + '\n';

    // Table rows
    errors.forEach((error, index) => {
        output += String(index + 1).padEnd(4);
        output += error.error_type.substring(0, 30).padEnd(32);
        output += error.program.substring(0, 28).padEnd(30);
        output += error.user.substring(0, 12).padEnd(14);
        output += '\n';
    });

    output += '\n';
    output += 'Dump IDs (for use with GetRuntimeError):\n';
    errors.forEach((error, index) => {
        output += `  ${index + 1}: ${error.dump_id}\n`;
    });

    output += '\n';
    output += 'Timestamps:\n';
    errors.forEach((error, index) => {
        output += `  ${index + 1}: ${error.timestamp}\n`;
    });

    return output;
}

/**
 * Handle ListRuntimeErrors request
 *
 * Lists recent ABAP runtime errors (ST22 dumps) from the system.
 *
 * @requires SAP Authorization: S_ABAPDUMP with activity 03 (Display) for dump access
 * @requires SAP Authorization: S_DEVELOP may be required in older SAP releases
 */
export async function handleListRuntimeErrors(args: any) {
    try {
        const typedArgs: ListRuntimeErrorsArgs = args;
        const baseUrl = await getBaseUrl();

        // Build query parameters
        const queryParams: string[] = [];

        // User filter (using FQL format required by ADT)
        if (typedArgs.user) {
            const upperUser = typedArgs.user.toUpperCase();
            // Validate user contains only alphanumeric characters, underscores, hyphens, dollar signs, and asterisks (SAP username format)
            if (!/^[A-Z0-9_$*-]+$/.test(upperUser)) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    'Invalid user parameter: must contain only alphanumeric characters, underscores, hyphens, dollar signs, and asterisks'
                );
            }
            queryParams.push(`$query=and( equals( user, ${upperUser} ) )`);
        }

        // Time range filters
        if (typedArgs.from) {
            const abapFrom = toAbapTimestamp(typedArgs.from);
            queryParams.push(`from=${abapFrom}`);
        }

        if (typedArgs.to) {
            const abapTo = toAbapTimestamp(typedArgs.to);
            queryParams.push(`to=${abapTo}`);
        }

        // Max results (default 50, max 100)
        const maxResults = Math.min(typedArgs.max_results || 50, 100);
        queryParams.push(`$top=${maxResults}`);

        // Build URL
        const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
        const url = `${baseUrl}/sap/bc/adt/runtime/dumps${queryString}`;

        // Make request with Atom feed accept header
        const response = await makeAdtRequest(url, 'GET', 30000, undefined, {
            Accept: 'application/atom+xml;type=feed',
        });

        if (!response.data) {
            throw new McpError(ErrorCode.InternalError, 'Empty response from runtime errors list');
        }

        // Parse Atom feed
        const errors = await parseAtomFeed(response.data);

        // Format output
        const formattedOutput = formatRuntimeErrors(errors);

        return {
            content: [
                {
                    type: 'text',
                    text: formattedOutput,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
