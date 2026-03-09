import { McpError, ErrorCode } from '../lib/utils';
import { return_error } from '../lib/utils';
import {
    convertToZClassName,
    getTmpDir,
    readAbapSourceFile,
    getFileMetadata,
    buildAbapFileName,
} from '../lib/fileUtils';
import * as path from 'path';
import { handleCreateClass } from './handleCreateClass';

/**
 * Parameters for importing a class from file
 */
interface ImportClassParams {
    class_name: string;
    description?: string;
    package?: string;
    auto_activate?: boolean;
    preaudit_requested?: boolean;
}

export async function handleImportClassFromFile(args: ImportClassParams) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }

        const originalClassName = args.class_name.toUpperCase();

        // Convert class name to Z-prefixed version
        const { zClassName, wasConverted, wasTruncated } = convertToZClassName(originalClassName);

        // Build conversion notes
        const conversionNotes: string[] = [];
        if (wasConverted) {
            conversionNotes.push(`🔄 Auto-converted: ${originalClassName} → ${zClassName}`);
        }
        if (wasTruncated) {
            conversionNotes.push(`✂️ Truncated to 30 characters (ABAP limit)`);
        }

        // Construct file path
        const tmpDir = getTmpDir();
        const fileName = buildAbapFileName(originalClassName);
        const filePath = path.join(tmpDir, fileName);

        // Read source code from file (throws McpError if not found or empty)
        const sourceCode = readAbapSourceFile(filePath);

        // Extract description from source code (look for class definition comment or use default)
        const descriptionMatch = sourceCode.match(/^\*\s*(.+?)$/m);
        const description =
            args.description || (descriptionMatch ? descriptionMatch[1].trim() : `Imported from ${fileName}`);

        // Get additional options
        const packageName = args.package || '$TMP';
        const autoActivate = args.auto_activate || false;
        const preauditRequested = args.preaudit_requested !== undefined ? args.preaudit_requested : true;

        // Use existing CreateClass handler
        const createResult = await handleCreateClass({
            class_name: zClassName,
            source_code: sourceCode,
            description: description,
            package: packageName,
            auto_activate: autoActivate,
            preaudit_requested: preauditRequested,
        });

        // Get file metadata
        const metadata = getFileMetadata(filePath, sourceCode);

        // Build conversion notes section if any conversions occurred
        const conversionSection =
            conversionNotes.length > 0
                ? `\n📝 Name Conversions:\n${conversionNotes.map((note) => `   ${note}`).join('\n')}\n`
                : '';

        // Check if the result is an error by examining the response data
        let isError = createResult.isError;
        if (!isError && createResult.content?.[0]?.text) {
            try {
                const resultData = JSON.parse(createResult.content[0].text);
                isError = resultData.status === 'error';
            } catch (e) {
                // If parsing fails, keep the original isError value
            }
        }

        if (!isError) {
            // Success case
            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text:
                            `✅ Class imported successfully from file!\n\n` +
                            `📁 Source File: ${fileName}\n` +
                            `📊 File Size: ${metadata.size} bytes\n` +
                            `📝 Lines: ${metadata.lines}\n` +
                            (wasConverted || wasTruncated ? `✨ Target Class: ${zClassName}\n` : '') +
                            conversionSection +
                            `\n${createResult.content[0].text}`,
                    },
                ],
            };
        } else {
            // Error case - provide clear feedback about failure
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text:
                            `❌ Class import from file failed!\n\n` +
                            `📁 Source File: ${fileName}\n` +
                            `📊 File Size: ${metadata.size} bytes\n` +
                            `📝 Lines: ${metadata.lines}\n` +
                            (wasConverted || wasTruncated ? `✨ Target Class: ${zClassName}\n` : '') +
                            conversionSection +
                            `\n⚠️ Import Error Details:\n${createResult.content[0].text}`,
                    },
                ],
            };
        }
    } catch (error) {
        return return_error(error);
    }
}
