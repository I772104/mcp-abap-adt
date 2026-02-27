import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetClass(args: any) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }
        const encodedClassName = encodeURIComponent(args.class_name);
        const url = `${await getBaseUrl()}/sap/bc/adt/oo/classes/${encodedClassName}/source/main`;
        const response = await makeAdtRequest(url, 'GET', 30000);

        // Format the source code with line numbers for easier comparison
        const sourceCode = response.data;
        const lines = sourceCode.split(/\r?\n/);
        const maxLineNumWidth = String(lines.length).length;

        const formattedSource = lines
            .map((line: string, index: number) => {
                const lineNum = (index + 1).toString().padStart(maxLineNumWidth, ' ');
                return `${lineNum}│${line}`;
            })
            .join('\n');

        // Return formatted source with metadata
        return {
            isError: false,
            content: [{
                type: 'text',
                text: `Source code for class ${args.class_name}:\n` +
                      `Lines: ${lines.length}\n` +
                      `${'='.repeat(80)}\n` +
                      formattedSource
            }]
        };
    } catch (error) {
        return return_error(error);
    }
}
