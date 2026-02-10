import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { parseStringPromise } from 'xml2js';

interface ColumnMetadata {
    name: string;
    type: string;
    description: string;
    length: string;
}

interface WhereOperator {
    eq?: string;                    // Equals (=) - Only supported operator in ADT Data Preview API
}

interface SingleQuery {
    id?: string;
    table_name: string;
    columns?: string[];
    max_rows?: number;
    where_conditions?: Record<string, string | WhereOperator>;
    order_by?: string[];
    offset?: number;
}

interface TableContentsArgs extends SingleQuery {
    include_column_metadata?: boolean;
    queries?: SingleQuery[];
}

interface QueryStats {
    metadata_fetch_ms: number;
    query_time_ms: number;
    rows_returned: number;
    total_time_ms: number;
}

/**
 * Parse metadata XML response to extract column information
 */
async function parseMetadataResponse(xmlResponse: string): Promise<ColumnMetadata[]> {
    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });
    const tableData = parsed?.['dataPreview:tableData'];
    
    if (!tableData || !tableData['dataPreview:columns']) {
        throw new McpError(ErrorCode.InternalError, 'Invalid metadata response format');
    }

    const columns = Array.isArray(tableData['dataPreview:columns']) 
        ? tableData['dataPreview:columns'] 
        : [tableData['dataPreview:columns']];

    return columns.map((col: any) => {
        const metadata = col['dataPreview:metadata']?.$;
        if (!metadata) {
            throw new McpError(ErrorCode.InternalError, 'Missing column metadata');
        }
        return {
            name: metadata['dataPreview:name'],
            type: metadata['dataPreview:type'],
            description: metadata['dataPreview:description'],
            length: metadata['dataPreview:length']
        };
    });
}

/**
 * Parse table contents XML response and convert to structured JSON
 */
async function parseTableContentsResponse(
    xmlResponse: string,
    includeColumnMetadata: boolean
): Promise<any> {
    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });
    const tableData = parsed?.['dataPreview:tableData'];
    
    if (!tableData) {
        throw new McpError(ErrorCode.InternalError, 'Invalid table contents response format');
    }

    const columns = Array.isArray(tableData['dataPreview:columns']) 
        ? tableData['dataPreview:columns'] 
        : [tableData['dataPreview:columns']];

    // Extract column metadata
    const columnInfo = columns.map((col: any) => {
        const metadata = col['dataPreview:metadata']?.$;
        return {
            name: metadata['dataPreview:name'],
            type: metadata['dataPreview:type'],
            description: metadata['dataPreview:description']
        };
    });

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

    const result: any = {
        table: tableData['dataPreview:name'],
        total_rows: parseInt(tableData['dataPreview:totalRows']) || 0,
        execution_time: tableData['dataPreview:queryExecutionTime'] || '0'
    };

    // Only include column metadata if requested
    if (includeColumnMetadata) {
        result.columns = columnInfo;
    }

    result.rows = rows;

    return result;
}

/**
 * Validate column names against available table columns
 */
function validateColumns(requestedColumns: string[], availableColumns: ColumnMetadata[]): void {
    const availableColumnNames = new Set(availableColumns.map(c => c.name));
    
    for (const col of requestedColumns) {
        if (!availableColumnNames.has(col)) {
            const columnList = Array.from(availableColumnNames).sort().join('\n  - ');
            throw new McpError(
                ErrorCode.InvalidParams, 
                `Invalid column name: ${col}\n\nAvailable columns:\n  - ${columnList}`
            );
        }
    }
}

/**
 * Validate WHERE condition column names
 */
function validateWhereConditions(
    conditions: Record<string, string | WhereOperator>,
    availableColumns: ColumnMetadata[]
): void {
    const availableColumnNames = new Set(availableColumns.map(c => c.name));
    
    for (const col of Object.keys(conditions)) {
        if (!availableColumnNames.has(col)) {
            const columnList = Array.from(availableColumnNames).sort().join('\n  - ');
            throw new McpError(
                ErrorCode.InvalidParams, 
                `Invalid column in WHERE condition: ${col}\n\nAvailable columns:\n  - ${columnList}`
            );
        }
    }
}

/**
 * Escape SQL special characters in value
 */
function escapeSqlValue(value: string): string {
    return value.replace(/'/g, "''");
}

/**
 * Build WHERE clause from condition operators
 * 
 * Note: ADT Data Preview API only supports equality (=) operator.
 * Other operators (>, >=, <, <=, IN, LIKE, BETWEEN) are NOT supported by the API.
 */
function buildWhereClause(
    tableName: string,
    conditions: Record<string, string | WhereOperator>
): string {
    const clauses: string[] = [];

    for (const [col, condition] of Object.entries(conditions)) {
        const colRef = `${tableName}~${col}`;

        if (typeof condition === 'string') {
            // Simple equality
            clauses.push(`${colRef} = '${escapeSqlValue(condition)}'`);
        } else {
            // Operator-based condition - only eq is supported
            if (condition.eq !== undefined) {
                clauses.push(`${colRef} = '${escapeSqlValue(condition.eq)}'`);
            }
        }
    }

    return clauses.join(' AND ');
}

/**
 * Build safe SELECT statement
 */
function buildSelectStatement(
    tableName: string, 
    columns: string[], 
    whereConditions?: Record<string, string | WhereOperator>,
    orderBy?: string[],
    maxRows?: number,
    offset?: number
): string {
    // Build column list
    const columnList = columns.length > 0 
        ? columns.map(col => `${tableName}~${col}`).join(', ')
        : `${tableName}~*`;

    let sql = `SELECT ${columnList} FROM ${tableName}`;

    // Add WHERE clause if provided
    if (whereConditions && Object.keys(whereConditions).length > 0) {
        const whereClause = buildWhereClause(tableName, whereConditions);
        sql += ` WHERE ${whereClause}`;
    }

    // Add ORDER BY clause if provided
    if (orderBy && orderBy.length > 0) {
        const orderCols = orderBy.map(col => `${tableName}~${col}`).join(', ');
        sql += ` ORDER BY ${orderCols}`;
    }

    // Note: OFFSET/LIMIT in ABAP SQL uses UP TO n ROWS syntax
    // ADT API handles row limiting via query parameter, not SQL

    return sql;
}

/**
 * Execute a single table query
 */
async function executeSingleQuery(
    query: SingleQuery,
    includeColumnMetadata: boolean,
    baseUrl: string
): Promise<{ result: any; stats: QueryStats }> {
    const startTime = Date.now();
    
    // Validate required parameters
    if (!query.table_name) {
        throw new McpError(ErrorCode.InvalidParams, 'table_name is required');
    }

    const maxRows = query.max_rows || 100;
    const offset = query.offset || 0;

    // Validate max_rows limit
    if (maxRows > 500) {
        throw new McpError(ErrorCode.InvalidParams, 'max_rows cannot exceed 500');
    }

    // Validate offset
    if (offset < 0) {
        throw new McpError(ErrorCode.InvalidParams, 'offset cannot be negative');
    }

    const encodedTableName = encodeURIComponent(query.table_name);

    // Step 1: Fetch table metadata
    const metadataStartTime = Date.now();
    const metadataUrl = `${baseUrl}/sap/bc/adt/datapreview/ddic/${encodedTableName}/metadata`;
    const metadataResponse = await makeAdtRequest(metadataUrl, 'GET', 30000);
    
    if (!metadataResponse.data) {
        throw new McpError(ErrorCode.InvalidRequest, `Table ${query.table_name} not found or no access`);
    }

    const availableColumns = await parseMetadataResponse(metadataResponse.data);
    const metadataFetchTime = Date.now() - metadataStartTime;
    
    if (availableColumns.length === 0) {
        throw new McpError(ErrorCode.InternalError, `No columns found for table ${query.table_name}`);
    }

    // Step 2: Validate requested columns
    if (query.columns && query.columns.length > 0) {
        validateColumns(query.columns, availableColumns);
    }

    // Step 3: Validate WHERE condition columns
    if (query.where_conditions) {
        validateWhereConditions(query.where_conditions, availableColumns);
    }

    // Step 4: Validate ORDER BY columns
    if (query.order_by && query.order_by.length > 0) {
        validateColumns(query.order_by, availableColumns);
    }

    // Step 5: Build safe SELECT statement
    const selectStatement = buildSelectStatement(
        query.table_name,
        query.columns || [],
        query.where_conditions,
        query.order_by,
        maxRows,
        offset
    );

    // Step 6: Execute query
    const queryStartTime = Date.now();
    // Note: ADT API doesn't support OFFSET directly, we handle it via row numbers
    const actualMaxRows = maxRows + offset;
    const queryUrl = `${baseUrl}/sap/bc/adt/datapreview/ddic?rowNumber=${actualMaxRows}&ddicEntityName=${encodedTableName}`;
    const queryResponse = await makeAdtRequest(queryUrl, 'POST', 60000, selectStatement);

    if (!queryResponse.data) {
        throw new McpError(ErrorCode.InternalError, 'Empty response from table contents query');
    }

    const queryTime = Date.now() - queryStartTime;

    // Step 7: Parse and format response
    let formattedResult = await parseTableContentsResponse(queryResponse.data, includeColumnMetadata);

    // Step 8: Apply offset by slicing rows
    if (offset > 0 && formattedResult.rows) {
        formattedResult.rows = formattedResult.rows.slice(offset);
    }

    // Step 9: Add pagination info
    const rowsReturned = formattedResult.rows?.length || 0;
    formattedResult.pagination = {
        offset: offset,
        limit: maxRows,
        has_more: rowsReturned === maxRows
    };

    // Step 10: Add stats
    const totalTime = Date.now() - startTime;
    const stats: QueryStats = {
        metadata_fetch_ms: metadataFetchTime,
        query_time_ms: queryTime,
        rows_returned: rowsReturned,
        total_time_ms: totalTime
    };

    formattedResult.stats = stats;

    return { result: formattedResult, stats };
}

/**
 * Handle GetTableContents request
 * 
 * Supports both single and batch queries with advanced filtering and pagination.
 */
export async function handleGetTableContents(args: any) {
    try {
        const typedArgs: TableContentsArgs = args;
        const includeColumnMetadata = typedArgs.include_column_metadata ?? false;
        const baseUrl = await getBaseUrl();

        // Check if this is a batch query
        if (typedArgs.queries && Array.isArray(typedArgs.queries)) {
            // Batch query mode
            if (typedArgs.queries.length === 0) {
                throw new McpError(ErrorCode.InvalidParams, 'queries array cannot be empty');
            }
            if (typedArgs.queries.length > 10) {
                throw new McpError(ErrorCode.InvalidParams, 'Cannot execute more than 10 queries in a batch');
            }

            const batchStartTime = Date.now();
            const results: Record<string, any> = {};
            let successCount = 0;
            let failCount = 0;

            for (const query of typedArgs.queries) {
                const queryId = query.id || query.table_name;
                try {
                    const { result } = await executeSingleQuery(query, includeColumnMetadata, baseUrl);
                    results[queryId] = result;
                    successCount++;
                } catch (error: any) {
                    results[queryId] = {
                        error: true,
                        message: error.message || 'Query failed'
                    };
                    failCount++;
                }
            }

            const batchTotalTime = Date.now() - batchStartTime;

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        batch_results: results,
                        stats: {
                            total_queries: typedArgs.queries.length,
                            successful: successCount,
                            failed: failCount,
                            total_time_ms: batchTotalTime
                        }
                    }, null, 2)
                }]
            };
        } else {
            // Single query mode
            const { result } = await executeSingleQuery(typedArgs, includeColumnMetadata, baseUrl);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }]
            };
        }

    } catch (error) {
        return return_error(error);
    }
}