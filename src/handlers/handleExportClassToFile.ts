import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { convertToZClassName, writeAbapSourceFile } from '../lib/fileUtils';

/**
 * Parameters for exporting a class to file
 */
interface ExportClassParams {
    class_name: string;
}

export async function handleExportClassToFile(args: ExportClassParams) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }

        const originalClassName = args.class_name;
        const encodedClassName = encodeURIComponent(originalClassName);

        // Fetch class source from ABAP system
        const url = `${await getBaseUrl()}/sap/bc/adt/oo/classes/${encodedClassName}/source/main`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        let sourceCode = response.data;

        // Convert class name to Z-prefixed version
        const { zClassName, wasConverted, wasTruncated } = convertToZClassName(originalClassName);

        // Replace class name in source code (both definition and implementation)
        if (wasConverted) {
            // Case-insensitive replacement for class definition and implementation
            const classNamePattern = new RegExp(`\\b${originalClassName}\\b`, 'gi');
            sourceCode = sourceCode.replace(classNamePattern, zClassName);
        }

        // Write the modified class source to file
        const { filePath, metadata } = writeAbapSourceFile(zClassName, sourceCode);

        // Build response message
        let message = `✅ Class exported successfully!\n\n` +
                     `Original Class: ${originalClassName}\n` +
                     `Exported Class: ${zClassName}\n`;

        if (wasConverted) {
            message += `\n📝 Name Conversion:\n` +
                      `   🔄 Auto-converted: ${originalClassName} → ${zClassName}\n`;
            if (wasTruncated) {
                message += `   ⚠️  Name truncated to 30 characters (ABAP limit)\n`;
            }
        }

        message += `\n📁 File Details:\n` +
                  `   Path: ${filePath}\n` +
                  `   Size: ${metadata.size} bytes\n` +
                  `   Lines: ${metadata.lines}\n` +
                  `   Modified: ${metadata.modified}\n\n` +
                  `💡 The class name in the file has been automatically updated to ${zClassName}.\n` +
                  `   Ready for import with ImportClassFromFile tool.`;

        return {
            isError: false,
            content: [{
                type: 'text',
                text: message
            }]
        };
    } catch (error) {
        return return_error(error);
    }
}
