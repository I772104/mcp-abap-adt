import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

/**
 * Handler for retrieving transport request details including objects.
 *
 * @param args - Arguments object containing transport request number
 * @param args.transport_number - The transport request number (e.g., ER1K8AKL0L)
 * @returns Transport request details with formatted output plus raw XML
 */
export async function handleGetTransportRequest(args: any) {
    try {
        const transportNumber = args?.transport_number;

        if (!transportNumber) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: transport_number');
        }

        const baseUrl = await getBaseUrl();

        // Construct URL for specific transport request
        const url = `${baseUrl}/sap/bc/adt/cts/transportrequests/${encodeURIComponent(transportNumber)}`;

        // Make request with 30 second timeout and Accept header for SAP ADT transport organizer XML
        const response = await makeAdtRequest(url, 'GET', 30000, undefined, undefined, {
            Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
        });

        // Parse and format the response
        const formatted = formatTransportResponse(response.data, transportNumber);

        // Return formatted output
        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: formatted,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}

/**
 * Parse transport XML and return formatted output
 */
function formatTransportResponse(xml: string, transportNumber: string): string {
    let output = '';

    // Extract root element info
    const rootMatch = xml.match(
        /<tm:root[^>]*tm:object_type="([^"]+)"[^>]*adtcore:name="([^"]+)"[^>]*adtcore:description="([^"]+)"[^>]*adtcore:changedAt="([^"]+)"[^>]*adtcore:changedBy="([^"]+)"/
    );

    if (rootMatch) {
        output += `${'='.repeat(80)}\n`;
        output += `TRANSPORT DETAILS: ${transportNumber}\n`;
        output += `${'='.repeat(80)}\n\n`;
        output += `Type: ${rootMatch[1]}\n`;
        output += `Description: ${rootMatch[3]}\n`;
        output += `Last Changed: ${rootMatch[4]} by ${rootMatch[5]}\n\n`;
    }

    // Check if this is a request with tasks or a standalone task
    const requestMatch = xml.match(
        /<tm:request[^>]*tm:number="([^"]+)"[^>]*tm:owner="([^"]+)"[^>]*tm:desc="([^"]+)"[^>]*tm:type="([^"]+)"[^>]*tm:status_text="([^"]+)"[^>]*tm:target="([^"]*)"/
    );
    const taskMatch = xml.match(
        /<tm:task[^>]*tm:number="([^"]+)"[^>]*tm:parent="([^"]+)"[^>]*tm:owner="([^"]+)"[^>]*tm:desc="([^"]+)"[^>]*tm:type="([^"]+)"[^>]*tm:status_text="([^"]+)"/
    );

    if (requestMatch) {
        output += `REQUEST: ${requestMatch[1]}\n`;
        output += `  Owner: ${requestMatch[2]}\n`;
        output += `  Type: ${requestMatch[4]}\n`;
        output += `  Status: ${requestMatch[5]}\n`;
        output += `  Target: ${requestMatch[6] || 'N/A'}\n`;
        output += `  Description: ${requestMatch[3]}\n\n`;
    }

    if (taskMatch) {
        output += `TASK: ${taskMatch[1]}\n`;
        output += `  Parent Request: ${taskMatch[2]} ← This is the parent transport\n`;
        output += `  Owner: ${taskMatch[3]}\n`;
        output += `  Type: ${taskMatch[5]}\n`;
        output += `  Status: ${taskMatch[6]}\n`;
        output += `  Description: ${taskMatch[4]}\n\n`;
    }

    // Extract objects
    const objectMatches = [
        ...xml.matchAll(/<tm:abap_object[^>]*tm:name="([^"]+)"[^>]*tm:obj_info="([^"]+)"[^>]*tm:position="([^"]+)"/g),
    ];

    if (objectMatches.length > 0) {
        output += `${'='.repeat(80)}\n`;
        output += `OBJECTS IN TRANSPORT (${objectMatches.length})\n`;
        output += `${'='.repeat(80)}\n`;
        output += `${'#'.padEnd(5)} ${'Object Name'.padEnd(40)} ${'Type'}\n`;
        output += `${'-'.repeat(5)} ${'-'.repeat(40)} ${'-'.repeat(30)}\n`;

        objectMatches.forEach((match, idx) => {
            // Clean up SAP internal format (e.g., CL_MAN_CHANGELOG==============CCAU -> CL_MAN_CHANGELOG)
            const objectName = match[1].replace(/=+.*$/, '').trim();
            const objectInfo = match[2];
            const position = match[3];

            output += `${(idx + 1).toString().padStart(4)}. ${objectName.padEnd(40)} ${objectInfo}\n`;
        });

        output += '\n';
    } else {
        output += 'No objects found in this transport.\n\n';
    }

    output += `${'='.repeat(80)}\n`;
    output += '\nNEXT STEPS:\n';
    output += '  - Use GetVersionHistory(<object_name>, <object_type>) to see versions\n';
    if (taskMatch) {
        output += `  - When checking version history, look for transport: ${taskMatch[2]}\n`;
        output += '    (versions may be recorded under parent request, not the task)\n';
    }
    output += '  - Use CompareObjectVersions to compare version changes\n';

    output += `\n${'='.repeat(80)}\n`;
    output += '\nRAW XML RESPONSE (for detailed inspection):\n';
    output += `${'='.repeat(80)}\n`;
    output += xml;

    return output;
}
