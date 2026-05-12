import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { parseDataPreviewXml } from '../lib/dataPreviewUtils';

/**
 * Escape SQL special characters in value
 */
function escapeSqlValue(value: string): string {
    return value.replace(/'/g, "''");
}

export async function handleSearchRapBo(args: any) {
    try {
        if (!args?.search_term) {
            throw new McpError(ErrorCode.InvalidParams, 'Search term is required');
        }

        const searchTerm = args.search_term.trim();
        if (searchTerm.length === 0) {
            throw new McpError(ErrorCode.InvalidParams, 'Search term cannot be empty');
        }

        const baseUrl = await getBaseUrl();

        // Use the same approach as GetTableContents - send SQL as request body
        const encodedTableName = encodeURIComponent('RONT_HEADER_T');
        const url = `${baseUrl}/sap/bc/adt/datapreview/ddic?rowNumber=100&ddicEntityName=${encodedTableName}`;

        // Build SQL query with LIKE pattern for fuzzy search
        // Note: ADT API requires table~column format and proper escaping
        // Use the same approach as GetBehaviorForRapBo with proper SQL escaping
        const tableName = 'RONT_HEADER_T';
        const escapedSearchTerm = escapeSqlValue(searchTerm.toUpperCase());
        const sqlQuery = `SELECT ${tableName}~RONT_NAME, ${tableName}~DESCRIPTION FROM ${tableName} WHERE ${tableName}~DESCRIPTION LIKE '%${escapedSearchTerm}%'`;

        const response = await makeAdtRequest(url, 'POST', 30000, sqlQuery, {
            'Content-Type': 'text/plain',
        });

        if (!response.data) {
            throw new McpError(ErrorCode.InternalError, 'Empty response from RONT_HEADER_T query');
        }

        const rows = await parseDataPreviewXml(response.data);

        if (rows.length > 0) {
            // Sort by description length to get best matches first
            rows.sort((a, b) => (a.DESCRIPTION || '').length - (b.DESCRIPTION || '').length);

            return {
                isError: false,
                content: [{ type: 'text', text: rows[0].RONT_NAME }],
            };
        } else {
            throw new McpError(
                ErrorCode.InvalidRequest,
                `No RAP Business Objects found matching the search term: ${searchTerm}`
            );
        }
    } catch (error) {
        return return_error(error);
    }
}
