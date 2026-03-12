import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { convertToZCDSViewName, writeObjectSourceFile } from '../lib/fileUtils';

/**
 * Parameters for exporting an access control (DCL) to file
 */
interface ExportAccessControlParams {
    dcl_name: string;
}

export async function handleExportAccessControlToFile(args: ExportAccessControlParams) {
    try {
        if (!args?.dcl_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Access control (DCL) name is required');
        }

        const originalDclName = args.dcl_name;
        const encodedDclName = encodeURIComponent(originalDclName);

        // Fetch access control source from ABAP system
        const url = `${await getBaseUrl()}/sap/bc/adt/acm/dcl/sources/${encodedDclName}/source/main`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        let sourceCode = response.data;

        // Convert DCL name to Z-prefixed version (uses CDS naming convention)
        const { zObjectName: zDclName, wasConverted, wasTruncated } = convertToZCDSViewName(originalDclName);

        // Replace DCL name in source code
        if (wasConverted) {
            // Match patterns like: @MappingRole: true
            // define role I_Material { ... }
            const dclNamePattern = new RegExp(`\\b${originalDclName}\\b`, 'gi');
            sourceCode = sourceCode.replace(dclNamePattern, zDclName);
        }

        // Write the modified access control source to file with correct extension
        const { filePath, metadata } = writeObjectSourceFile(zDclName, 'DCLS', sourceCode);

        // Build response message
        let message =
            '✅ Access Control (DCL) exported successfully!\n\n' +
            `Original DCL: ${originalDclName}\n` +
            `Exported DCL: ${zDclName}\n`;

        if (wasConverted) {
            message += '\n📝 Name Conversion:\n' + `   🔄 Auto-converted: ${originalDclName} → ${zDclName}\n`;
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
            `💡 The access control name has been automatically updated to ${zDclName}.\n` +
            '   Ready for import with ImportAccessControlFromFile tool (when available).\n\n' +
            '⚠️  Note: Associated CDS view must be exported separately.\n' +
            '   Use ExportCDSViewToFile to export the related view.';

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
