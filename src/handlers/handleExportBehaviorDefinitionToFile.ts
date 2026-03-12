import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { convertToZCDSViewName, writeObjectSourceFile } from '../lib/fileUtils';

/**
 * Parameters for exporting a behavior definition to file
 */
interface ExportBehaviorDefinitionParams {
    behavior_name: string;
}

export async function handleExportBehaviorDefinitionToFile(args: ExportBehaviorDefinitionParams) {
    try {
        if (!args?.behavior_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Behavior definition name is required');
        }

        const originalBehaviorName = args.behavior_name;
        const encodedBehaviorName = encodeURIComponent(originalBehaviorName);

        // Fetch behavior definition source from ABAP system
        const url = `${await getBaseUrl()}/sap/bc/adt/bo/behaviordefinitions/${encodedBehaviorName}/source/main`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        let sourceCode = response.data;

        // Convert behavior definition name to Z-prefixed version (uses CDS naming convention)
        const { zObjectName: zBehaviorName, wasConverted, wasTruncated } = convertToZCDSViewName(originalBehaviorName);

        // Replace behavior definition name in source code
        if (wasConverted) {
            // Match patterns like: managed implementation in class zbp_i_material unique;
            const behaviorNamePattern = new RegExp(`\\b${originalBehaviorName}\\b`, 'gi');
            sourceCode = sourceCode.replace(behaviorNamePattern, zBehaviorName);
        }

        // Write the modified behavior definition source to file with correct extension
        const { filePath, metadata } = writeObjectSourceFile(zBehaviorName, 'BDEF', sourceCode);

        // Build response message
        let message =
            '✅ Behavior Definition exported successfully!\n\n' +
            `Original Behavior: ${originalBehaviorName}\n` +
            `Exported Behavior: ${zBehaviorName}\n`;

        if (wasConverted) {
            message += '\n📝 Name Conversion:\n' + `   🔄 Auto-converted: ${originalBehaviorName} → ${zBehaviorName}\n`;
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
            `💡 The behavior definition name has been automatically updated to ${zBehaviorName}.\n` +
            '   Ready for import with ImportBehaviorDefinitionFromFile tool (when available).\n\n' +
            '⚠️  Note: Associated CDS views and behavior implementation class are not exported.\n' +
            '   Export them separately using ExportCDSViewToFile and ExportClassToFile.';

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
