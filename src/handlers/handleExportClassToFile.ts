import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { convertToZClassName, writeAbapSourceFile } from '../lib/fileUtils';
import {
    fetchIncludes,
    formatMultiIncludeOutput,
    getIncludeSuffix,
    getIncludeLabel,
    escapeRegex,
} from '../lib/classUtils';

/**
 * Parameters for exporting a class to file
 */
interface ExportClassParams {
    class_name: string;
    include_types?: string[]; // Optional: ['main', 'definitions', 'implementations', 'macros', 'testclasses', 'all']
    single_file?: boolean; // Optional: default false (separate files)
}

/**
 * File metadata for export response
 */
interface ExportedFile {
    path: string;
    type: string;
    size: number;
    lines: number;
}

export async function handleExportClassToFile(args: ExportClassParams) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }

        const originalClassName = args.class_name;
        const includeTypes = args.include_types || ['main'];
        const singleFile = args.single_file === true;

        // Convert class name to Z-prefixed version
        const { zClassName, wasConverted, wasTruncated } = convertToZClassName(originalClassName);

        // Fast path: main only (backward compatible)
        if (includeTypes.length === 1 && includeTypes[0] === 'main') {
            return await exportMainOnly(originalClassName, zClassName, wasConverted, wasTruncated);
        }

        // Multi-include path: fetch all includes
        const includes = await fetchIncludes(originalClassName, includeTypes);

        // Apply Z-name conversion to all includes
        if (wasConverted) {
            const classNamePattern = new RegExp(`\\b${escapeRegex(originalClassName)}\\b`, 'gi');
            includes.forEach((inc) => {
                if (inc.source) {
                    inc.source = inc.source.replace(classNamePattern, zClassName);
                }
            });
        }

        // Export files
        const exportedFiles: ExportedFile[] = [];

        if (singleFile) {
            // Combine all includes into single file
            const combined = formatMultiIncludeOutput(includes);
            const { filePath, metadata } = writeAbapSourceFile(zClassName, combined);
            exportedFiles.push({
                path: filePath,
                type: 'combined',
                size: metadata.size,
                lines: metadata.lines,
            });
        } else {
            // Write separate file per include
            for (const inc of includes) {
                if (!inc.source) continue; // Skip missing includes

                const suffix = getIncludeSuffix(inc.type);
                const fileName = `${zClassName}.clas${suffix}`;
                const { filePath, metadata } = writeAbapSourceFile(fileName, inc.source);
                exportedFiles.push({
                    path: filePath,
                    type: inc.type,
                    size: metadata.size,
                    lines: metadata.lines,
                });
            }
        }

        // Build response message
        const message = formatExportResponse(
            originalClassName,
            zClassName,
            wasConverted,
            wasTruncated,
            exportedFiles,
            singleFile
        );

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

/**
 * Exports main source only (backward compatible fast path)
 */
async function exportMainOnly(
    originalClassName: string,
    zClassName: string,
    wasConverted: boolean,
    wasTruncated: boolean
) {
    const encodedClassName = encodeURIComponent(originalClassName);
    const url = `${await getBaseUrl()}/sap/bc/adt/oo/classes/${encodedClassName}/source/main`;
    const response = await makeAdtRequest(url, 'GET', 30000);
    let sourceCode = response.data;

    // Replace class name in source code
    if (wasConverted) {
        const classNamePattern = new RegExp(`\\b${escapeRegex(originalClassName)}\\b`, 'gi');
        sourceCode = sourceCode.replace(classNamePattern, zClassName);
    }

    // Write the modified class source to file
    const { filePath, metadata } = writeAbapSourceFile(zClassName, sourceCode);

    // Build response message
    let message =
        '✅ Class exported successfully!\n\n' +
        `Original Class: ${originalClassName}\n` +
        `Exported Class: ${zClassName}\n`;

    if (wasConverted) {
        message += '\n📝 Name Conversion:\n' + `   🔄 Auto-converted: ${originalClassName} → ${zClassName}\n`;
        if (wasTruncated) {
            message += '   ⚠️  Name truncated to 30 characters (ABAP limit)\n';
        }
    }

    message +=
        '\n📁 File Details:\n' +
        `   Path: ${filePath}\n` +
        `   Size: ${metadata.size} bytes\n` +
        `   Lines: ${metadata.lines}\n` +
        `   Modified: ${metadata.modified}\n\n` +
        `💡 The class name in the file has been automatically updated to ${zClassName}.\n` +
        '   Ready for import with ImportClassFromFile tool.';

    return {
        isError: false,
        content: [
            {
                type: 'text',
                text: message,
            },
        ],
    };
}

/**
 * Formats the export response message
 */
function formatExportResponse(
    originalClassName: string,
    zClassName: string,
    wasConverted: boolean,
    wasTruncated: boolean,
    exportedFiles: ExportedFile[],
    singleFile: boolean
): string {
    let message =
        '✅ Class exported successfully!\n\n' +
        `Original Class: ${originalClassName}\n` +
        `Exported Class: ${zClassName}\n`;

    if (wasConverted) {
        message += '\n📝 Name Conversion:\n' + `   🔄 Auto-converted: ${originalClassName} → ${zClassName}\n`;
        if (wasTruncated) {
            message += '   ⚠️  Name truncated to 30 characters (ABAP limit)\n';
        }
    }

    message += '\n📁 Exported Files:\n';

    if (singleFile) {
        if (exportedFiles.length === 0) {
            message += '   No files exported.\n';
        } else {
            const file = exportedFiles[0];
            message +=
                `   Combined File: ${file.path}\n` + `   Size: ${file.size} bytes\n` + `   Lines: ${file.lines}\n`;
        }
    } else {
        for (const file of exportedFiles) {
            const label = getIncludeLabel(file.type);
            message +=
                `\n   ${label}:\n` + `   Path: ${file.path}\n` + `   Size: ${file.size} bytes | Lines: ${file.lines}\n`;
        }
    }

    message +=
        '\n💡 The class name in all files has been automatically updated to ' +
        zClassName +
        '.\n' +
        '   Ready for import with ImportClassFromFile tool.';

    return message;
}
