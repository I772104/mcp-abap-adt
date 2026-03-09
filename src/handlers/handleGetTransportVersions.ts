import { McpError, ErrorCode } from '../lib/utils';
import { return_error } from '../lib/utils';
import { handleGetTransportRequest } from './handleGetTransportRequest';
import { handleGetVersionHistory } from './handleGetVersionHistory';

/**
 * Handler for GetTransportVersions - combines transport lookup with version history.
 * This helper tool simplifies the workflow of finding which version(s) of an object
 * are in a specific transport, handling task/request hierarchy automatically.
 *
 * @param args - Arguments object
 * @param args.transport_number - Transport number (can be task or request)
 * @param args.object_name - Name of the ABAP object
 * @param args.object_type - Type of object (CLAS, PROG, FUGR, INTF, DDLS, BDEF, DCLS)
 * @returns Formatted output with transport hierarchy, version information, and comparison guidance
 */
export async function handleGetTransportVersions(args: any) {
    try {
        const transportNumber = args?.transport_number;
        const objectName = args?.object_name;
        const objectType = args?.object_type;

        if (!transportNumber || !objectName || !objectType) {
            throw new McpError(
                ErrorCode.InvalidParams,
                'Missing required parameters: transport_number, object_name, and object_type are all required'
            );
        }

        let output = '';
        output += `${'='.repeat(80)}\n`;
        output += 'TRANSPORT VERSION ANALYSIS\n';
        output += `${'='.repeat(80)}\n\n`;

        // Step 1: Get transport details
        output += `STEP 1: Analyzing transport ${transportNumber}...\n\n`;

        const transportResult = await handleGetTransportRequest({ transport_number: transportNumber });
        if (transportResult.isError) {
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get transport details: ${transportResult.content?.[0]?.text || 'Unknown error'}`
            );
        }

        const transportXml = transportResult.content[0].text;

        // Extract transport hierarchy info
        const taskMatch = transportXml.match(/<tm:task[^>]*tm:number="([^"]+)"[^>]*tm:parent="([^"]+)"/);
        const requestMatch = transportXml.match(/<tm:request[^>]*tm:number="([^"]+)"/);

        let isTask = false;
        let parentRequest = '';
        let searchTransport = transportNumber;

        if (taskMatch) {
            isTask = true;
            parentRequest = taskMatch[2];
            searchTransport = parentRequest;

            output += 'Transport Type: TASK\n';
            output += `Task Number: ${transportNumber}\n`;
            output += `Parent Request: ${parentRequest}\n`;
            output += '\nNOTE: Versions are typically recorded under the parent request.\n';
            output += `      Searching for versions in: ${parentRequest}\n\n`;
        } else if (requestMatch) {
            output += 'Transport Type: REQUEST (parent transport)\n';
            output += `Request Number: ${transportNumber}\n\n`;
        } else {
            output += 'Transport Type: UNKNOWN (unable to determine hierarchy)\n';
            output += `Transport Number: ${transportNumber}\n\n`;
        }

        // Check if object is in this transport
        const objectInTransport = transportXml.includes(objectName);
        if (objectInTransport) {
            output += `✓ Object ${objectName} (${objectType}) is included in this transport\n\n`;
        } else {
            output += `✗ WARNING: Object ${objectName} (${objectType}) NOT found in this transport\n`;
            output += '  The object may not be part of this transport or may use a different name.\n\n';
        }

        // Step 2: Get version history
        output += `${'='.repeat(80)}\n`;
        output += `STEP 2: Retrieving version history for ${objectName}...\n\n`;

        const versionResult = await handleGetVersionHistory({
            object_type: objectType,
            object_name: objectName,
        });

        if (versionResult.isError) {
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get version history: ${versionResult.content?.[0]?.text || 'Unknown error'}`
            );
        }

        const versionHistory = versionResult.content[0].text;

        // Parse version history to find relevant versions
        const lines = versionHistory.split('\n');
        const versionLines = lines.filter((line) => {
            // Match lines that contain version data (have date pattern YYYY-MM-DD)
            return (
                line.match(/\d{4}-\d{2}-\d{2}/) && (line.includes(searchTransport) || line.includes(transportNumber))
            );
        });

        if (versionLines.length > 0) {
            output += `VERSIONS IN TRANSPORT ${searchTransport}:\n`;
            output += `${'='.repeat(80)}\n`;

            versionLines.forEach((line) => {
                output += `${line}\n`;
            });

            output += '\n';

            // Find the version ID from the first matching line
            const firstMatch = versionLines[0];
            const versionIdMatch = firstMatch.match(/^(\S+)/);

            if (versionIdMatch) {
                const versionId = versionIdMatch[1];
                output += `VERSION FOUND: ${versionId}\n\n`;

                // Find previous version for comparison (skip test transports and untransported versions)
                const allVersionLines = lines.filter((line) => {
                    if (!line.match(/\d{4}-\d{2}-\d{2}/)) return false;
                    if (line.includes('[TEST]') || line.includes('Generated test transport')) return false;

                    // Check if line has a transport number (not empty transport field)
                    // Format: "version date author   transport   description"
                    // Split by 2+ spaces to get fields
                    const parts = line.split(/\s{2,}/);
                    if (parts.length >= 3) {
                        const transportField = parts[2].trim(); // parts[0]=version+date, parts[1]=author, parts[2]=transport
                        // Skip if transport field is empty or very short (less than 5 chars like "ER1...")
                        if (!transportField || transportField.length < 5) return false;
                    }

                    return true;
                });
                const currentIndex = allVersionLines.findIndex(
                    (line) => line.includes(searchTransport) || line.includes(transportNumber)
                );

                if (currentIndex >= 0 && currentIndex < allVersionLines.length - 1) {
                    const previousLine = allVersionLines[currentIndex + 1];
                    const previousVersionMatch = previousLine.match(/^(\S+)/);

                    if (previousVersionMatch) {
                        const previousVersion = previousVersionMatch[1];
                        output += `PREVIOUS VERSION (for comparison): ${previousVersion}\n`;
                        output += `${previousLine}\n\n`;

                        output += `${'='.repeat(80)}\n`;
                        output += 'NEXT STEPS TO SEE CHANGES:\n';
                        output += `${'='.repeat(80)}\n\n`;
                        output += 'Compare versions using CompareObjectVersions:\n';
                        output += `   CompareObjectVersions(object_type="${objectType}", object_name="${objectName}", version_old="${previousVersion}", version_new="${versionId}", format="unified")\n\n`;
                    }
                } else if (currentIndex >= 0) {
                    output +=
                        '\nNOTE: This appears to be the oldest version in history (no previous version available).\n\n';
                    output += `${'='.repeat(80)}\n`;
                    output += 'NEXT STEPS:\n';
                    output += `${'='.repeat(80)}\n\n`;
                    output += 'View this version (no comparison available):\n';
                    output += '   This is the first version recorded in history.\n\n';
                } else {
                    output +=
                        '\nNOTE: This appears to be the first version or most recent version with no prior comparison available.\n\n';
                    output += `${'='.repeat(80)}\n`;
                    output += 'NEXT STEPS:\n';
                    output += `${'='.repeat(80)}\n\n`;
                    output += 'View version history:\n';
                    output += `   GetVersionHistory(object_type="${objectType}", object_name="${objectName}")\n\n`;
                }
            }
        } else {
            output += `✗ NO VERSIONS FOUND in transport ${searchTransport}\n\n`;

            if (isTask) {
                output += 'TROUBLESHOOTING:\n';
                output += `  - Checked parent request ${parentRequest} (versions usually recorded there)\n`;
                output += '  - Object may have been added without activation\n';
                output += '  - Object may be in a different transport\n\n';
            }

            output += `Showing all available versions for ${objectName}:\n\n`;

            // Show first few lines of version history for context
            const versionHeaderEnd = lines.findIndex((l) => l.includes('---'));
            const dataLines = lines.slice(versionHeaderEnd + 1, versionHeaderEnd + 11);
            dataLines.forEach((line) => {
                if (line.trim() && !line.includes('='.repeat(10))) {
                    output += `  ${line}\n`;
                }
            });
        }

        output += `\n${'='.repeat(80)}\n`;
        output += '\nFULL VERSION HISTORY:\n';
        output += `${'='.repeat(80)}\n\n`;
        output += versionHistory;

        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: output,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
