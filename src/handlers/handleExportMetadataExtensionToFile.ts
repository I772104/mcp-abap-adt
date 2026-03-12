import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { convertToZCDSViewName, writeObjectSourceFile } from '../lib/fileUtils';

/**
 * Parameters for exporting a metadata extension to file
 */
interface ExportMetadataExtensionParams {
    extension_name: string;
}

export async function handleExportMetadataExtensionToFile(args: ExportMetadataExtensionParams) {
    try {
        if (!args?.extension_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Metadata extension name is required');
        }

        const originalExtensionName = args.extension_name;
        const encodedExtensionName = encodeURIComponent(originalExtensionName);

        // Fetch metadata extension source from ABAP system
        const url = `${await getBaseUrl()}/sap/bc/adt/ddic/ddlx/sources/${encodedExtensionName}/source/main`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        let sourceCode = response.data;

        // Convert metadata extension name to Z-prefixed version (uses CDS naming convention)
        const { zObjectName: zExtensionName, wasConverted, wasTruncated } = convertToZCDSViewName(originalExtensionName);

        // Replace metadata extension name in source code
        if (wasConverted) {
            // Match patterns like: @Metadata.layer: #CORE
            // annotate view C_Material with { ... }
            const extensionNamePattern = new RegExp(`\\b${originalExtensionName}\\b`, 'gi');
            sourceCode = sourceCode.replace(extensionNamePattern, zExtensionName);
        }

        // Write the modified metadata extension source to file with correct extension
        const { filePath, metadata } = writeObjectSourceFile(zExtensionName, 'DDLX', sourceCode);

        // Build response message
        let message =
            '✅ Metadata Extension exported successfully!\n\n' +
            `Original Extension: ${originalExtensionName}\n` +
            `Exported Extension: ${zExtensionName}\n`;

        if (wasConverted) {
            message += '\n📝 Name Conversion:\n' + `   🔄 Auto-converted: ${originalExtensionName} → ${zExtensionName}\n`;
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
            `💡 The metadata extension name has been automatically updated to ${zExtensionName}.\n` +
            '   Ready for import with ImportMetadataExtensionFromFile tool (when available).\n\n' +
            '⚠️  Note: The annotated CDS view reference may need manual updating.\n' +
            '   Review "annotate view" statements to ensure they reference Z-views.';

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
