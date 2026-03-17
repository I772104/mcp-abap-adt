import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { convertToZClassName, writeObjectSourceFile } from '../lib/fileUtils';

/**
 * Parameters for exporting an interface to file
 */
interface ExportInterfaceParams {
    interface_name: string;
}

export async function handleExportInterfaceToFile(args: ExportInterfaceParams) {
    try {
        if (!args?.interface_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Interface name is required');
        }

        const originalInterfaceName = args.interface_name;
        const encodedInterfaceName = encodeURIComponent(originalInterfaceName);

        // Fetch interface source from ABAP system
        const url = `${await getBaseUrl()}/sap/bc/adt/oo/interfaces/${encodedInterfaceName}/source/main`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        let sourceCode = response.data;

        // Convert interface name to Z-prefixed version
        const { zObjectName: zInterfaceName, wasConverted, wasTruncated } = convertToZClassName(originalInterfaceName);

        // Replace interface name in source code
        if (wasConverted) {
            const interfaceNamePattern = new RegExp(`\\b${originalInterfaceName}\\b`, 'gi');
            sourceCode = sourceCode.replace(interfaceNamePattern, zInterfaceName);
        }

        // Write the modified interface source to file with correct extension
        const { filePath, metadata } = writeObjectSourceFile(zInterfaceName, 'INTF', sourceCode);

        // Build response message
        let message =
            '✅ Interface exported successfully!\n\n' +
            `Original Interface: ${originalInterfaceName}\n` +
            `Exported Interface: ${zInterfaceName}\n`;

        if (wasConverted) {
            message +=
                '\n📝 Name Conversion:\n' + `   🔄 Auto-converted: ${originalInterfaceName} → ${zInterfaceName}\n`;
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
            `💡 The interface name has been automatically updated to ${zInterfaceName}.\n` +
            '   Ready for import with ImportInterfaceFromFile tool (when available).';

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
