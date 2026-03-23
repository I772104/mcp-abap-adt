import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';

interface GetRuntimeErrorArgs {
    dump_id: string;
    content?: 'formatted' | 'metadata' | 'summary';
}

/**
 * Handle GetRuntimeError request
 *
 * Retrieves detailed information about a specific runtime error dump (ST22).
 *
 * @requires SAP Authorization: S_ABAPDUMP with activity 03 (Display) for dump details
 * @requires SAP Authorization: S_DEVELOP may be required in older SAP releases
 */
export async function handleGetRuntimeError(args: any) {
    try {
        const typedArgs: GetRuntimeErrorArgs = args;

        if (!typedArgs.dump_id) {
            throw new McpError(ErrorCode.InvalidParams, 'dump_id is required');
        }

        const baseUrl = await getBaseUrl();
        const contentMode = typedArgs.content || 'formatted';

        // Dump ID should be URL-encoded. Apply defensive encoding to handle direct calls.
        // Decode first to avoid double-encoding, then encode to ensure proper format.
        const dumpId = encodeURIComponent(decodeURIComponent(typedArgs.dump_id));

        let url: string;
        let acceptHeader: string;

        switch (contentMode) {
            case 'metadata':
                url = `${baseUrl}/sap/bc/adt/runtime/dump/${dumpId}`;
                acceptHeader = 'application/vnd.sap.adt.runtime.dump.v1+xml';
                break;
            case 'summary':
                url = `${baseUrl}/sap/bc/adt/runtime/dump/${dumpId}/summary`;
                acceptHeader = 'text/html';
                break;
            case 'formatted':
            default:
                url = `${baseUrl}/sap/bc/adt/runtime/dump/${dumpId}/formatted`;
                acceptHeader = 'text/plain';
                break;
        }

        // Make request
        const response = await makeAdtRequest(url, 'GET', 30000, undefined, {
            Accept: acceptHeader,
        });

        if (!response.data) {
            throw new McpError(ErrorCode.InternalError, 'Empty response from runtime error dump');
        }

        // Format output based on content mode
        let output = `Runtime Error Dump: ${typedArgs.dump_id}\n`;
        output += `Mode: ${contentMode}\n`;
        output += '='.repeat(80) + '\n\n';
        output += response.data;

        return {
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
