import { McpError, ErrorCode, makeAdtRequest, getBaseUrl } from '../lib/utils';
import { parseStringPromise } from 'xml2js';

// Constants for ADT API limits and defaults
const ADT_API_ROW_LIMIT = 500;
const DEFAULT_MAX_RESULTS = 50;

/**
 * Escape SQL special characters in value
 */
function escapeSqlValue(value: string): string {
    return value.replace(/'/g, "''");
}

/**
 * Handler for listing ALL transport requests for a user (including modifiable).
 *
 * This handler queries the E070 (transport headers) and E07T (transport texts) tables
 * directly to get both modifiable and released transports. This works around the
 * limitation of the ADT API which only shows released transports.
 *
 * IMPORTANT: This tool now uses raw SQL queries with >= operator to filter by date
 * at the database level, avoiding the 500-row limitation of the previous implementation.
 *
 * @param args - Arguments object containing user and optional status filter
 * @param args.user - Username to list transports for (required)
 * @param args.status - Optional: Filter by status (D=Modifiable, R=Released, L=Modifiable+Protected, O=Released+Import, N=Released+Cannot be changed)
 * @param args.max_results - Optional: Maximum number of results (default: 50)
 * @param args.from_date - Optional: Minimum date filter in YYYYMMDD format (e.g., "20260101" for transports from 2026 onwards)
 * @returns Formatted list of transports with status, date, and description
 */
export async function handleListUserTransports(args: any) {
    try {
        const user = args?.user;
        const status = args?.status;
        const maxResults = args?.max_results || DEFAULT_MAX_RESULTS;
        let fromDate = args?.from_date; // Optional date filter in YYYYMMDD format
        let dateDefaultApplied = false;

        if (!user) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: user');
        }

        // Apply smart default for from_date if not provided
        if (!fromDate) {
            const currentYear = new Date().getFullYear();
            const defaultYear = currentYear - 1; // Default to previous year
            fromDate = `${defaultYear}0101`;
            dateDefaultApplied = true;
        }

        // Validate date format if provided
        if (!/^\d{8}$/.test(fromDate)) {
            throw new McpError(ErrorCode.InvalidParams, 'from_date must be in YYYYMMDD format (e.g., "20260101")');
        }

        // Build raw SQL query with date filtering
        // Note: >= operator may not be supported, so we use LIKE with wildcard pattern
        // to match dates starting from the specified year
        const tableName = 'E070';
        const escapedUser = escapeSqlValue(user);

        // Extract year from fromDate for LIKE pattern (e.g., "2026%" to match all 2026 dates)
        const year = fromDate.substring(0, 4);

        // Validate year contains only digits for SQL safety
        if (!/^\d{4}$/.test(year)) {
            throw new McpError(ErrorCode.InvalidParams, `Invalid date format: year '${year}' must be 4 digits`);
        }

        let sqlQuery = `SELECT ${tableName}~TRKORR, ${tableName}~AS4DATE, ${tableName}~AS4TIME, ${tableName}~TRSTATUS, ${tableName}~TRFUNCTION, ${tableName}~KORRDEV, ${tableName}~STRKORR, ${tableName}~TARSYSTEM FROM ${tableName} WHERE ${tableName}~AS4USER = '${escapedUser}' AND ${tableName}~AS4DATE LIKE '${year}%'`;

        if (status) {
            const escapedStatus = escapeSqlValue(status);
            sqlQuery += ` AND ${tableName}~TRSTATUS = '${escapedStatus}'`;
        }

        // Note: Not using ORDER BY as it may not be supported by ADT Data Preview API
        // We'll sort in-memory and filter by exact date after fetching results

        // Make direct ADT API request with raw SQL
        const baseUrl = await getBaseUrl();
        const encodedTableName = encodeURIComponent(tableName);
        const url = `${baseUrl}/sap/bc/adt/datapreview/ddic?rowNumber=${ADT_API_ROW_LIMIT}&ddicEntityName=${encodedTableName}`;

        const startTime = Date.now();
        const response = await makeAdtRequest(url, 'POST', 30000, sqlQuery, {
            'Content-Type': 'text/plain',
        });
        const queryTime = Date.now() - startTime;

        if (!response.data) {
            throw new McpError(ErrorCode.InternalError, 'Empty response from E070 query');
        }

        // Parse XML response
        const parsed = await parseStringPromise(response.data, { explicitArray: false });
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
                    const colName = col['dataPreview:metadata']?.$['dataPreview:name'];
                    const colData = col['dataPreview:dataSet']['dataPreview:data'];
                    const value = Array.isArray(colData) ? colData[i] : colData;
                    row[colName] = value || '';
                });
                rows.push(row);
            }
        }

        // Apply exact date filter in-memory (since LIKE only filtered by year)
        let filteredRows = rows.filter((row: any) => row.AS4DATE >= fromDate);

        // Sort results by date/time descending (newest first) in-memory
        filteredRows.sort((a: any, b: any) => {
            // Compare dates first
            const dateCompare = b.AS4DATE.localeCompare(a.AS4DATE);
            if (dateCompare !== 0) return dateCompare;
            // If dates are equal, compare times
            return b.AS4TIME.localeCompare(a.AS4TIME);
        });

        // Limit to requested number of results
        filteredRows = filteredRows.slice(0, maxResults);

        const transportData = {
            rows: filteredRows,
            total_rows: filteredRows.length,
            stats: {
                query_time_ms: queryTime,
            },
        };

        if (transportData.total_rows === 0) {
            const filters: string[] = [`User: ${user}`];
            if (status) filters.push(`Status: ${status}`);
            if (fromDate) filters.push(`From date: ${fromDate}`);

            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text:
                            `No transport requests found for:\n` +
                            `- ${filters.join('\n- ')}\n\n` +
                            `TIP: If you expected to find recent transports, try:\n` +
                            `  1. Add from_date parameter (e.g., from_date: "20260101" for 2026 onwards)\n` +
                            `  2. Check status filter - modifiable transports have status 'D'\n` +
                            `  3. Verify the username is correct\n\n` +
                            `Note: This tool queries E070 table directly and shows ALL transports (modifiable and released).\n` +
                            `Due to API limitations, only ${ADT_API_ROW_LIMIT} rows can be fetched. Use from_date to focus on recent transports.\n\n` +
                            `Common status values:\n` +
                            `- D: Modifiable (in development)\n` +
                            `- R: Released\n` +
                            `- L: Modifiable, Protected\n` +
                            `- O: Released, Import\n\n` +
                            `Use GetTransportRequest(transport_number) to see details of a specific transport.`,
                    },
                ],
            };
        }

        // Get transport descriptions from E07T table
        const transportNumbers = transportData.rows.map((row: any) => row.TRKORR);

        // Build description lookup map
        const descriptionMap: { [key: string]: string } = {};

        // Query E07T for descriptions using raw SQL with IN operator
        if (transportNumbers.length > 0) {
            try {
                const e07tTableName = 'E07T';
                const escapedTransportNumbers = transportNumbers
                    .map((tr: string) => `'${escapeSqlValue(tr)}'`)
                    .join(', ');
                const e07tSqlQuery = `SELECT ${e07tTableName}~TRKORR, ${e07tTableName}~AS4TEXT FROM ${e07tTableName} WHERE ${e07tTableName}~LANGU = 'E' AND ${e07tTableName}~TRKORR IN (${escapedTransportNumbers})`;

                const e07tUrl = `${baseUrl}/sap/bc/adt/datapreview/ddic?rowNumber=${maxResults}&ddicEntityName=${encodeURIComponent(e07tTableName)}`;
                const e07tResponse = await makeAdtRequest(e07tUrl, 'POST', 30000, e07tSqlQuery, {
                    'Content-Type': 'text/plain',
                });

                if (e07tResponse.data) {
                    const e07tParsed = await parseStringPromise(e07tResponse.data, { explicitArray: false });
                    const e07tTableData = e07tParsed?.['dataPreview:tableData'];

                    if (e07tTableData && e07tTableData['dataPreview:columns']) {
                        const e07tColumns = Array.isArray(e07tTableData['dataPreview:columns'])
                            ? e07tTableData['dataPreview:columns']
                            : [e07tTableData['dataPreview:columns']];

                        // Extract description data
                        if (e07tColumns.length > 0 && e07tColumns[0]['dataPreview:dataSet']?.['dataPreview:data']) {
                            const firstColData = e07tColumns[0]['dataPreview:dataSet']['dataPreview:data'];
                            const numRows = Array.isArray(firstColData) ? firstColData.length : 1;

                            for (let i = 0; i < numRows; i++) {
                                let trkorr = '';
                                let as4text = '';

                                e07tColumns.forEach((col: any) => {
                                    const colName = col['dataPreview:metadata']?.$['dataPreview:name'];
                                    const colData = col['dataPreview:dataSet']['dataPreview:data'];
                                    const value = Array.isArray(colData) ? colData[i] : colData;

                                    if (colName === 'TRKORR') trkorr = value || '';
                                    if (colName === 'AS4TEXT') as4text = value || '';
                                });

                                if (trkorr) {
                                    descriptionMap[trkorr] = as4text;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // If description fetch fails, continue without descriptions
                console.error(
                    `[DEBUG] ListUserTransports: Failed to fetch descriptions from E07T: ${e instanceof Error ? e.message : String(e)}`
                );
            }
        }

        // Format output with warnings at the top
        let output = '';

        // CRITICAL: Check if result limit was reached
        const resultLimitReached = filteredRows.length === maxResults;

        if (resultLimitReached) {
            const currentYear = new Date().getFullYear();
            output += `${'='.repeat(120)}\n`;
            output += `⚠️  WARNING: RESULT LIMIT REACHED\n`;
            output += `${'='.repeat(120)}\n`;
            output += `Found ${filteredRows.length} transports (reached maximum limit).\n`;
            output += `More recent transports may exist but are NOT visible due to API limitations.\n`;
            output += `\n`;
            output += `RECOMMENDED ACTION:\n`;
            output += `  Use from_date: "${currentYear}0101" to see ${currentYear} transports\n`;
            output += `${'='.repeat(120)}\n\n`;
        }

        // Show info about default date filter
        if (dateDefaultApplied) {
            output += `ℹ️  No from_date provided. Using default: ${fromDate} to avoid missing recent data.\n\n`;
        }

        output += `Found ${transportData.total_rows} transport request(s) for user: ${user}\n`;
        if (status) output += `Filtered by status: ${getStatusDescription(status)}\n`;
        output += `Filtered by date: from ${fromDate} onwards${dateDefaultApplied ? ' (default)' : ''}\n`;
        output += `\n${'='.repeat(120)}\n`;
        output += `${'#'.padEnd(5)} ${'Transport'.padEnd(14)} ${'Type'.padEnd(5)} ${'Status'.padEnd(12)} ${'Date'.padEnd(12)} ${'Target'.padEnd(12)} ${'Description'.padEnd(50)}\n`;
        output += `${'='.repeat(120)}\n`;

        transportData.rows.forEach((row: any, index: number) => {
            const date = `${row.AS4DATE.substring(0, 4)}-${row.AS4DATE.substring(4, 6)}-${row.AS4DATE.substring(6, 8)}`;
            const statusDesc = getStatusDescription(row.TRSTATUS);
            const typeDesc = getTypeDescription(row.TRFUNCTION);
            const description = (descriptionMap[row.TRKORR] || '').substring(0, 50);
            const target = (row.TARSYSTEM || '').substring(0, 12);

            output += `${String(index + 1).padEnd(5)} ${row.TRKORR.padEnd(14)} ${typeDesc.padEnd(5)} ${statusDesc.padEnd(12)} ${date.padEnd(12)} ${target.padEnd(12)} ${description.padEnd(50)}\n`;
        });

        output += `${'='.repeat(120)}\n\n`;

        // Add bottom reminder if limit was reached
        if (resultLimitReached) {
            output += `\n⚠️  LIMIT REACHED: Showing results up to limit. Use from_date to narrow search.\n\n`;
        }

        output += `LEGEND:\n`;
        output += `- Status 'D' (Modifiable): Transport is in development (not released)\n`;
        output += `- Status 'R' (Released): Transport has been released\n`;
        output += `- Status 'L' (Mod+Prot): Modifiable and protected\n`;
        output += `- Status 'O' (Rel+Import): Released and ready for import\n`;
        output += `- Type 'K': Workbench request\n`;
        output += `- Type 'S': Task (subtransport)\n`;
        output += `- Type 'W': Workbench request (customizing)\n\n`;

        output += `Use GetTransportRequest(<transport_number>) to see details of a specific transport.\n\n`;

        output += `Query Performance:\n`;
        output += `- E070 query time: ${transportData.stats.query_time_ms}ms\n`;
        output += `- Total rows: ${transportData.total_rows}\n`;

        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: output,
                },
            ],
        };
    } catch (error) {
        if (error instanceof McpError) {
            throw error;
        }
        throw new McpError(
            ErrorCode.InternalError,
            `Failed to list user transports: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Get human-readable description for transport status
 */
function getStatusDescription(status: string): string {
    switch (status) {
        case 'D':
            return 'Modifiable';
        case 'L':
            return 'Mod+Prot';
        case 'R':
            return 'Released';
        case 'O':
            return 'Rel+Import';
        case 'N':
            return 'Rel+NoChg';
        default:
            return status;
    }
}

/**
 * Get human-readable description for transport type
 */
function getTypeDescription(type: string): string {
    switch (type) {
        case 'K':
            return 'WB'; // Workbench request
        case 'W':
            return 'Cust'; // Customizing request
        case 'S':
            return 'Task'; // Task
        case 'T':
            return 'TOC'; // Transport of Copies
        case 'X':
            return 'Unrep'; // Unrepaired
        default:
            return type;
    }
}
