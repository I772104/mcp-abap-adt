import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { convertToZCDSViewName, convertToZSQLViewName, writeObjectSourceFile } from '../lib/fileUtils';

/**
 * Parameters for exporting a CDS view to file
 */
interface ExportCDSViewParams {
    view_name: string;
}

/**
 * Extract SQL view name from @AbapCatalog.sqlViewName annotation
 */
function extractSQLViewName(sourceCode: string): string | null {
    // Match patterns like:
    // @AbapCatalog.sqlViewName: 'IMATERIAL'
    // @AbapCatalog.sqlViewName : 'IMATERIAL'
    const match = sourceCode.match(/@AbapCatalog\.sqlViewName\s*:\s*'([^']+)'/i);
    return match ? match[1] : null;
}

export async function handleExportCDSViewToFile(args: ExportCDSViewParams) {
    try {
        if (!args?.view_name) {
            throw new McpError(ErrorCode.InvalidParams, 'CDS view name is required');
        }

        const originalViewName = args.view_name;
        const encodedViewName = encodeURIComponent(originalViewName);

        // Fetch CDS view source from ABAP system
        const url = `${await getBaseUrl()}/sap/bc/adt/ddic/ddl/sources/${encodedViewName}/source/main`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        let sourceCode = response.data;

        // Convert CDS view name to Z-prefixed version
        const { zObjectName: zViewName, wasConverted, wasTruncated } = convertToZCDSViewName(originalViewName);

        // Extract and convert SQL view name if present
        const originalSQLViewName = extractSQLViewName(sourceCode);
        let sqlConversionNotes: string[] = [];
        let zSQLViewName: string | null = null;

        if (originalSQLViewName) {
            const sqlConversion = convertToZSQLViewName(originalSQLViewName);
            zSQLViewName = sqlConversion.zObjectName;

            // Replace SQL view name in annotation
            sourceCode = sourceCode.replace(
                new RegExp(`(@AbapCatalog\\.sqlViewName\\s*:\\s*)'${originalSQLViewName}'`, 'gi'),
                `$1'${zSQLViewName}'`
            );

            sqlConversionNotes.push(`   SQL View: ${originalSQLViewName} → ${zSQLViewName}`);
            if (sqlConversion.wasTruncated) {
                sqlConversionNotes.push('   ⚠️  SQL view name truncated to 16 characters (SQL view limit)');
            }
        }

        // Replace CDS view entity name in source code
        if (wasConverted) {
            // Match patterns like:
            // - define view entity I_Material
            // - define root view entity I_Material
            // - define view I_Material (legacy syntax)
            // - define abstract entity I_Material
            // Case-insensitive replacement for view entity name
            const viewNamePattern = new RegExp(`\\b${originalViewName}\\b`, 'gi');
            sourceCode = sourceCode.replace(viewNamePattern, zViewName);
        }

        // Write the modified CDS view source to file with correct extension
        const { filePath, metadata } = writeObjectSourceFile(zViewName, 'DDLS', sourceCode);

        // Build response message
        let message =
            '✅ CDS View exported successfully!\n\n' +
            `Original View: ${originalViewName}\n` +
            `Exported View: ${zViewName}\n`;

        if (wasConverted || originalSQLViewName) {
            message += '\n📝 Name Conversions:\n';
            if (wasConverted) {
                message += `   CDS View: ${originalViewName} → ${zViewName}\n`;
            }
            if (wasTruncated) {
                message += '   ⚠️  View name truncated to 30 characters (ABAP limit)\n';
            }
            if (sqlConversionNotes.length > 0) {
                message += sqlConversionNotes.join('\n') + '\n';
            }
        }

        message +=
            '\n📁 File Details:\n' +
            `   Path: ${filePath}\n` +
            `   File: ${metadata.fileName}\n` +
            `   Size: ${metadata.size} bytes\n` +
            `   Lines: ${metadata.lines}\n` +
            `   Modified: ${metadata.modified}\n\n` +
            '💡 The view and SQL view names have been automatically updated.\n' +
            '   Ready for import with ImportCDSViewFromFile tool (when available).\n\n' +
            '⚠️  Note: Associations and compositions still reference original views.\n' +
            '   Review and update references as needed after import.';

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
