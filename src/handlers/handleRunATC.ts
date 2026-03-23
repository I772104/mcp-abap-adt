import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { parseStringPromise } from 'xml2js';

interface RunATCArgs {
    object_name: string;
    object_type: 'class' | 'interface' | 'program' | 'function_group' | 'include' | 'package';
    check_variant?: string;
    max_findings?: number;
    with_exemptions?: boolean;
}

interface ATCFinding {
    priority: string;
    check_id: string;
    message: string;
    location: string;
    line?: number;
}

/**
 * Build object URI based on type and name
 * Uses proper URL encoding for all special characters
 */
function buildObjectUri(objectType: string, objectName: string): string {
    // Use standard URL encoding for all special characters
    const encodedName = encodeURIComponent(objectName);

    switch (objectType.toLowerCase()) {
        case 'class':
            return `/sap/bc/adt/oo/classes/${encodedName}/source/main`;
        case 'interface':
            return `/sap/bc/adt/oo/interfaces/${encodedName}`;
        case 'program':
        case 'include':
            return `/sap/bc/adt/programs/programs/${encodedName}`;
        case 'function_group':
            return `/sap/bc/adt/functions/groups/${encodedName}`;
        case 'package':
            return `/sap/bc/adt/packages/${encodedName}`;
        default:
            throw new McpError(ErrorCode.InvalidParams, `Unsupported object type: ${objectType}`);
    }
}

/**
 * Build ATC run request XML
 */
function buildAtcRunRequest(objectUri: string, maxFindings: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<atc:run maximumVerdicts="${maxFindings}" xmlns:atc="http://www.sap.com/adt/atc">
    <objectSets xmlns:adtcore="http://www.sap.com/adt/core">
        <objectSet kind="inclusive">
            <adtcore:objectReferences>
                <adtcore:objectReference adtcore:uri="${objectUri}"/>
            </adtcore:objectReferences>
        </objectSet>
    </objectSets>
</atc:run>`;
}

/**
 * Get system default ATC check variant from customizing
 */
async function getSystemDefaultCheckVariant(baseUrl: string): Promise<string | null> {
    try {
        const url = `${baseUrl}/sap/bc/adt/atc/customizing`;
        const response = await makeAdtRequest(url, 'GET', 30000, undefined, {
            Accept: 'application/xml, application/vnd.sap.atc.customizing-v1+xml, application/vnd.sap.atc.customizing-v2+xml',
        });

        if (!response.data) {
            return null;
        }

        // Extract systemCheckVariant from XML
        // Example: <property name="systemCheckVariant" value="DEFAULT_VARIANT"/>
        const match = response.data.match(/name="systemCheckVariant"\s+value="([^"]+)"/);
        if (match) {
            return match[1];
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Parse ATC worklist results to extract findings
 */
async function parseAtcFindings(xmlResponse: string): Promise<ATCFinding[]> {
    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });

    const findings: ATCFinding[] = [];

    // Navigate through the XML structure: atcworklist:worklist -> atcworklist:objects -> atcobject:object
    const worklist = parsed?.['atcworklist:worklist'] || parsed?.worklist;
    if (!worklist) {
        return findings;
    }

    // Get objects container
    const objectsContainer = worklist['atcworklist:objects'] || worklist.objects;
    if (!objectsContainer) {
        return findings;
    }

    // Get objects array
    const objectElement = objectsContainer['atcobject:object'] || objectsContainer.object;
    if (!objectElement) {
        return findings;
    }
    const objects = Array.isArray(objectElement) ? objectElement : [objectElement];

    for (const obj of objects) {
        // Get findings container
        const findingsContainer = obj['atcobject:findings'] || obj.findings;
        if (!findingsContainer) {
            continue;
        }

        // Get finding elements
        const findingElement = findingsContainer['atcfinding:finding'] || findingsContainer.finding;
        if (!findingElement) {
            continue;
        }
        const objFindings = Array.isArray(findingElement) ? findingElement : [findingElement];

        for (const finding of objFindings) {
            const attrs = finding.$ || {};

            findings.push({
                priority: attrs['atcfinding:priority'] || attrs.priority || 'unknown',
                check_id: attrs['atcfinding:checkId'] || attrs.checkId || '',
                message: attrs['atcfinding:messageTitle'] || attrs.messageTitle || '',
                location: attrs['atcfinding:location'] || attrs.location || '',
                line: extractLineNumber(attrs['atcfinding:location'] || attrs.location),
            });
        }
    }

    return findings;
}

/**
 * Extract line number from location string (e.g., "/path#start=312,0")
 */
function extractLineNumber(location?: string): number | undefined {
    if (!location) return undefined;
    const match = location.match(/#start=(\d+)/);
    return match ? parseInt(match[1]) : undefined;
}

/**
 * Format ATC findings as readable output
 */
function formatAtcFindings(
    objectName: string,
    objectType: string,
    worklistId: string,
    checkVariant: string,
    findings: ATCFinding[]
): string {
    let output = `ATC Check Results: ${objectName} (${objectType})\n`;
    output += `Worklist ID: ${worklistId}\n`;
    output += `Check Variant: ${checkVariant}\n`;
    output += '='.repeat(80) + '\n\n';

    if (findings.length === 0) {
        output += 'No findings. Code quality looks good!\n';
        return output;
    }

    // Group by priority
    const byPriority = {
        error: findings.filter((f) => f.priority === '1'),
        warning: findings.filter((f) => f.priority === '2'),
        info: findings.filter((f) => f.priority === '3'),
        other: findings.filter((f) => !['1', '2', '3'].includes(f.priority)),
    };

    output += `Total Findings: ${findings.length}\n`;
    output += `  Errors:   ${byPriority.error.length}\n`;
    output += `  Warnings: ${byPriority.warning.length}\n`;
    output += `  Info:     ${byPriority.info.length}\n\n`;

    // Format each priority group
    const formatGroup = (title: string, items: ATCFinding[]) => {
        if (items.length === 0) return '';

        let section = `${title} (${items.length}):\n`;
        section += '-'.repeat(80) + '\n';

        items.forEach((finding, index) => {
            section += `\n${index + 1}. `;
            if (finding.line) {
                section += `Line ${finding.line}: `;
            }
            section += `${finding.message}\n`;
            section += `   Check: ${finding.check_id}\n`;
            if (finding.location) {
                section += `   Location: ${finding.location}\n`;
            }
        });

        section += '\n';
        return section;
    };

    if (byPriority.error.length > 0) {
        output += formatGroup('ERRORS', byPriority.error);
    }

    if (byPriority.warning.length > 0) {
        output += formatGroup('WARNINGS', byPriority.warning);
    }

    if (byPriority.info.length > 0) {
        output += formatGroup('INFORMATION', byPriority.info);
    }

    return output;
}

/**
 * Handle RunATC request
 *
 * Runs ABAP Test Cockpit checks on an ABAP object.
 * Multi-step process: create worklist → submit run → poll status → get findings.
 *
 * @requires SAP Authorization: S_DEVELOP with appropriate activities for ATC operations
 * @requires SAP Authorization: Additional object-specific authorizations may be needed
 */
export async function handleRunATC(args: any) {
    try {
        const typedArgs: RunATCArgs = args;

        if (!typedArgs.object_name) {
            throw new McpError(ErrorCode.InvalidParams, 'object_name is required');
        }
        if (!typedArgs.object_type) {
            throw new McpError(ErrorCode.InvalidParams, 'object_type is required');
        }

        const baseUrl = await getBaseUrl();
        const maxFindings = typedArgs.max_findings || 100;
        const withExemptions = typedArgs.with_exemptions || false;

        // Resolve check variant
        let checkVariant = typedArgs.check_variant;
        if (!checkVariant) {
            const defaultVariant = await getSystemDefaultCheckVariant(baseUrl);
            if (!defaultVariant) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    'No check_variant specified and no system default check variant configured. ' +
                        'Please provide a check_variant parameter or use ListATCCheckVariants to discover available variants.'
                );
            }
            checkVariant = defaultVariant;
        }

        // Step 1: Create worklist
        // Note: SAP ADT API expects no request body and no Content-Type header
        // SAP ADT API often fails on first request even with correct auth - retry once if needed
        const worklistUrl = `${baseUrl}/sap/bc/adt/atc/worklists?checkVariant=${encodeURIComponent(checkVariant)}`;
        let worklistResponse;
        try {
            worklistResponse = await makeAdtRequest(worklistUrl, 'POST', 30000);
        } catch (firstError: any) {
            // Retry once if first request fails (known SAP ADT API behavior)
            if (firstError?.message?.includes('HTTP 415') || firstError?.message?.includes('HTTP 401')) {
                console.warn(`ATC worklist creation failed (${firstError.message}), retrying once...`);
                worklistResponse = await makeAdtRequest(worklistUrl, 'POST', 30000);
            } else {
                throw firstError;
            }
        }

        const worklistId = worklistResponse.data?.trim();
        if (!worklistId || worklistId.length !== 32) {
            throw new McpError(
                ErrorCode.InternalError,
                `Invalid worklist ID returned: "${worklistId}" (expected 32-character GUID)`
            );
        }

        // Step 2: Submit ATC run
        const objectUri = buildObjectUri(typedArgs.object_type, typedArgs.object_name);
        const runRequestBody = buildAtcRunRequest(objectUri, maxFindings);

        const runsUrl = `${baseUrl}/sap/bc/adt/atc/runs?worklistId=${worklistId}&clientWait=false`;
        const runResponse = await makeAdtRequest(runsUrl, 'POST', 30000, runRequestBody, undefined, {
            'Content-Type': 'application/xml',
            Accept: 'application/xml',
        });

        // Extract run ID from Location header
        const locationHeader = runResponse.headers?.location || runResponse.headers?.Location;
        if (!locationHeader) {
            throw new McpError(ErrorCode.InternalError, 'No Location header in ATC run response');
        }

        const runIdMatch = locationHeader.match(/\/runs\/([^/]+)$/);
        if (!runIdMatch) {
            throw new McpError(ErrorCode.InternalError, `Could not extract run ID from Location: ${locationHeader}`);
        }
        const runId = runIdMatch[1];

        // Step 3: Poll for completion (max 75 polls * 4s = 5 minutes)
        let finished = false;
        for (let i = 0; i < 75; i++) {
            if (i > 0) {
                await new Promise((resolve) => setTimeout(resolve, 4000));
            }

            const statusUrl = `${baseUrl}/sap/bc/adt/atc/runs/${runId}`;
            const statusResponse = await makeAdtRequest(statusUrl, 'GET', 30000, undefined, {
                Accept: 'application/vnd.sap.adt.backgroundrun.v1+xml',
            });

            if (statusResponse.data?.includes('status="finished"')) {
                finished = true;
                break;
            }

            if (statusResponse.data?.includes('status="cancelled"')) {
                throw new McpError(ErrorCode.InternalError, 'ATC run was cancelled');
            }
        }

        if (!finished) {
            throw new McpError(
                ErrorCode.InternalError,
                `ATC run timed out after 5 minutes. WorklistID: ${worklistId}, RunID: ${runId}, Object: ${typedArgs.object_name}`
            );
        }

        // Step 4: Get worklist results
        const resultsUrl = `${baseUrl}/sap/bc/adt/atc/worklists/${worklistId}?includeExemptedFindings=${withExemptions}`;
        const resultsResponse = await makeAdtRequest(resultsUrl, 'GET', 30000, undefined, {
            Accept: 'application/atc.worklist.v1+xml',
        });

        if (!resultsResponse.data) {
            throw new McpError(ErrorCode.InternalError, 'Empty response from ATC worklist results');
        }

        // Parse findings
        const findings = await parseAtcFindings(resultsResponse.data);

        // Format output
        const formattedOutput = formatAtcFindings(
            typedArgs.object_name,
            typedArgs.object_type,
            worklistId,
            checkVariant,
            findings
        );

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
