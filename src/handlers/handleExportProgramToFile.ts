import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { convertToZClassName, writeObjectSourceFile } from '../lib/fileUtils';

/**
 * Parameters for exporting a program to file
 */
interface ExportProgramParams {
    program_name: string;
}

export async function handleExportProgramToFile(args: ExportProgramParams) {
    try {
        if (!args?.program_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Program name is required');
        }

        const originalProgramName = args.program_name;
        const encodedProgramName = encodeURIComponent(originalProgramName);

        // Fetch program source from ABAP system
        const url = `${await getBaseUrl()}/sap/bc/adt/programs/programs/${encodedProgramName}/source/main`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        let sourceCode = response.data;

        // Convert program name to Z-prefixed version
        const { zObjectName: zProgramName, wasConverted, wasTruncated } = convertToZClassName(originalProgramName);

        // Replace program name in source code
        if (wasConverted) {
            const programNamePattern = new RegExp(`\\b${originalProgramName}\\b`, 'gi');
            sourceCode = sourceCode.replace(programNamePattern, zProgramName);
        }

        // Write the modified program source to file with correct extension
        const { filePath, metadata } = writeObjectSourceFile(zProgramName, 'PROG', sourceCode);

        // Build response message
        let message =
            '✅ Program exported successfully!\n\n' +
            `Original Program: ${originalProgramName}\n` +
            `Exported Program: ${zProgramName}\n`;

        if (wasConverted) {
            message += '\n📝 Name Conversion:\n' + `   🔄 Auto-converted: ${originalProgramName} → ${zProgramName}\n`;
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
            `💡 The program name has been automatically updated to ${zProgramName}.\n` +
            '   Ready for import with ImportProgramFromFile tool (when available).';

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
