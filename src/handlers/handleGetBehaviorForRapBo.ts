import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { parseStringPromise } from 'xml2js';

interface BehaviorForRapBoArgs {
    rap_bo_name: string;
}

interface BehaviorDefinitionResult {
    ront_name: string;
    interface_behavior_definition: string;
}

/**
 * Parse table contents XML response and extract RONT_NODE data
 */
async function parseRontNodeResponse(xmlResponse: string): Promise<any[]> {
    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });
    const tableData = parsed?.['dataPreview:tableData'];
    
    if (!tableData) {
        throw new McpError(ErrorCode.InternalError, 'Invalid table contents response format');
    }

    const columns = Array.isArray(tableData['dataPreview:columns']) 
        ? tableData['dataPreview:columns'] 
        : [tableData['dataPreview:columns']];

    // Extract row data
    const rows: any[] = [];
    if (columns.length > 0 && columns[0]['dataPreview:dataSet']?.['dataPreview:data']) {
        const firstColData = columns[0]['dataPreview:dataSet']['dataPreview:data'];
        const numRows = Array.isArray(firstColData) ? firstColData.length : 1;

        for (let i = 0; i < numRows; i++) {
            const row: any = {};
            columns.forEach((col: any) => {
                const metadata = col['dataPreview:metadata']?.$;
                const colName = metadata['dataPreview:name'];
                const dataSet = col['dataPreview:dataSet']?.['dataPreview:data'];
                
                if (dataSet) {
                    row[colName] = Array.isArray(dataSet) ? dataSet[i] : dataSet;
                } else {
                    row[colName] = null;
                }
            });
            rows.push(row);
        }
    }

    return rows;
}

/**
 * Escape SQL special characters in value
 */
function escapeSqlValue(value: string): string {
    return value.replace(/'/g, "''");
}

/**
 * Handle GetBehaviorForRapBo request
 * 
 * Queries RONT_NODE table to find RAP BO behavior definitions by searching for entries
 * where RONT_NAME contains the provided RAP BO name (in uppercase) and returns the
 * INTERFACE_BEHAVIOR_DEFINITION field content when it's not empty.
 */
export async function handleGetBehaviorForRapBo(args: any) {
    try {
        const typedArgs: BehaviorForRapBoArgs = args;
        
        // Validate required parameters
        if (!typedArgs.rap_bo_name) {
            throw new McpError(ErrorCode.InvalidParams, 'rap_bo_name is required');
        }

        const baseUrl = await getBaseUrl();
        const searchTerm = typedArgs.rap_bo_name.toUpperCase();
        const tableName = 'RONT_NODE';
        const encodedTableName = encodeURIComponent(tableName);

        // Build SQL query to search for RAP BO in RONT_NODE table
        // We search for RONT_NAME containing the RAP BO name and select both RONT_NAME and INTERFACE_BEHAVIOR_DEFINITION
        const selectStatement = `SELECT ${tableName}~RONT_NAME, ${tableName}~INTERFACE_BEHAVIOR_DEFINITION FROM ${tableName} WHERE ${tableName}~RONT_NAME LIKE '%${escapeSqlValue(searchTerm)}%'`;

        // Execute query
        const queryUrl = `${baseUrl}/sap/bc/adt/datapreview/ddic?rowNumber=100&ddicEntityName=${encodedTableName}`;
        const queryResponse = await makeAdtRequest(queryUrl, 'POST', 60000, selectStatement);

        if (!queryResponse.data) {
            throw new McpError(ErrorCode.InternalError, 'Empty response from RONT_NODE table query');
        }

        // Parse response
        const rows = await parseRontNodeResponse(queryResponse.data);

        // Filter results to only include rows where INTERFACE_BEHAVIOR_DEFINITION is not empty
        const behaviorDefinitions: BehaviorDefinitionResult[] = rows
            .filter(row => row.INTERFACE_BEHAVIOR_DEFINITION && row.INTERFACE_BEHAVIOR_DEFINITION.trim() !== '')
            .map(row => ({
                ront_name: row.RONT_NAME || '',
                interface_behavior_definition: row.INTERFACE_BEHAVIOR_DEFINITION || ''
            }));

        const result = {
            rap_bo_name: typedArgs.rap_bo_name,
            search_term: searchTerm,
            matches_found: behaviorDefinitions.length,
            behavior_definitions: behaviorDefinitions
        };

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }]
        };

    } catch (error) {
        return return_error(error);
    }
}