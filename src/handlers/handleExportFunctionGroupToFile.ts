import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { convertToZClassName, writeObjectSourceFile } from '../lib/fileUtils';

/**
 * Parameters for exporting a function group to file
 */
interface ExportFunctionGroupParams {
    function_group: string;
}

export async function handleExportFunctionGroupToFile(args: ExportFunctionGroupParams) {
    try {
        if (!args?.function_group) {
            throw new McpError(ErrorCode.InvalidParams, 'Function group name is required');
        }

        const originalFunctionGroup = args.function_group;
        const encodedFunctionGroup = encodeURIComponent(originalFunctionGroup);

        // Fetch function group source from ABAP system
        const url = `${await getBaseUrl()}/sap/bc/adt/functions/groups/${encodedFunctionGroup}/source/main`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        let sourceCode = response.data;

        // Convert function group name to Z-prefixed version
        const { zObjectName: zFunctionGroup, wasConverted, wasTruncated } = convertToZClassName(originalFunctionGroup);

        // Replace function group name in source code
        if (wasConverted) {
            const functionGroupPattern = new RegExp(`\\b${originalFunctionGroup}\\b`, 'gi');
            sourceCode = sourceCode.replace(functionGroupPattern, zFunctionGroup);
        }

        // Write the modified function group source to file with correct extension
        const { filePath, metadata } = writeObjectSourceFile(zFunctionGroup, 'FUGR', sourceCode);

        // Build response message
        let message =
            '✅ Function Group exported successfully!\n\n' +
            `Original Function Group: ${originalFunctionGroup}\n` +
            `Exported Function Group: ${zFunctionGroup}\n`;

        if (wasConverted) {
            message += '\n📝 Name Conversion:\n' + `   🔄 Auto-converted: ${originalFunctionGroup} → ${zFunctionGroup}\n`;
            if (wasTruncated) {
                message += '   ⚠️  Name truncated to 30 characters (ABAP limit)\n';
            }
        }

        message +=
            '\n📁 File Details:\n' +
            `   Path: ${filePath}\n` +
            `   File: ${metadata.fileName}\n` +
            `   Size: ${metadata.size} bytes\n` +
            `   Lines: ${metadata.lines}\n` +
            `   Modified: ${metadata.modified}\n\n` +
            `💡 The function group name has been automatically updated to ${zFunctionGroup}.\n` +
            '   Ready for import with ImportFunctionGroupFromFile tool (when available).\n\n' +
            '⚠️  Note: Individual function modules are not included in this export.\n' +
            '   Use GetFunction to export individual function modules separately.';

        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: message,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
