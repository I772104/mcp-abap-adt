import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { parseDataPreviewXml } from '../lib/dataPreviewUtils';

interface SearchBopfBusinessObjectsParams {
    query: string;
    objcat?: string;
    package?: string;
    max_results?: number;
}

const BO_TABLE = '/BOBF/OBM_BO';
const TADIR_TABLE = 'TADIR';

const OBJCAT_LABELS: Record<string, string> = {
    '0': 'Business Process Object',
    '1': 'Dependent Object',
    '2': 'Mass Data Run Object',
    '3': 'Master Data Object',
    '4': 'Meta Data Object',
    '5': 'Controller Object',
    '6': 'Technical Object',
    '7': 'Message Object',
    '8': 'Test Object',
    '9': 'Configuration Object',
    D: 'Draft Object',
    '': 'not classified',
};

function escapeSqlValue(value: string): string {
    return value.replace(/'/g, "''");
}

function toSqlPattern(input: string): string {
    const escaped = escapeSqlValue(input.toUpperCase().replace(/\*/g, '%'));
    return escaped.includes('%') ? escaped : `%${escaped}%`;
}

async function runSql(
    baseUrl: string,
    anchorTable: string,
    sql: string,
    maxRows: number
): Promise<Record<string, string>[]> {
    const encodedTable = encodeURIComponent(anchorTable);
    const url = `${baseUrl}/sap/bc/adt/datapreview/ddic?rowNumber=${maxRows}&ddicEntityName=${encodedTable}`;
    const response = await makeAdtRequest(url, 'POST', 30000, sql, {
        'Content-Type': 'text/plain',
    });
    if (!response.data) return [];
    return parseDataPreviewXml(response.data);
}

export async function handleSearchBopfBusinessObjects(args: SearchBopfBusinessObjectsParams) {
    try {
        if (!args?.query) {
            throw new McpError(ErrorCode.InvalidParams, 'query is required');
        }

        const maxResults = Math.min(args.max_results ?? 50, 500);
        const baseUrl = await getBaseUrl();

        // ── Step 1 (optional): resolve package pattern → set of package names via TDEVC ──
        // TADIR.DEVCLASS has a foreign key to TDEVC; the ADT Data Preview tool resolves
        // foreign keys as internal JOINs, which it then rejects. We therefore resolve the
        // package pattern separately and filter TADIR results client-side.
        let matchingPackages: Set<string> | null = null;
        if (args.package) {
            const pkgPattern = toSqlPattern(args.package);
            const tdevcSql =
                `SELECT TDEVC~DEVCLASS FROM TDEVC ` +
                `WHERE TDEVC~DEVCLASS LIKE '${pkgPattern}' ` +
                `ORDER BY TDEVC~DEVCLASS`;
            const pkgRows = await runSql(baseUrl, 'TDEVC', tdevcSql, 500);
            if (pkgRows.length === 0) {
                return {
                    isError: false,
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    query: args.query,
                                    package_filter: args.package,
                                    total: 0,
                                    results: [],
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
            }
            matchingPackages = new Set(pkgRows.map((r) => r['DEVCLASS']));
        }

        // ── Step 2: search TADIR for BOBF objects matching name pattern ──
        // DEVCLASS is only used in SELECT (to build the package lookup); it must NOT appear
        // in WHERE because of the foreign-key JOIN restriction described above.
        const namePattern = toSqlPattern(args.query);
        const tadirSql =
            `SELECT ${TADIR_TABLE}~OBJ_NAME, ${TADIR_TABLE}~DEVCLASS ` +
            `FROM ${TADIR_TABLE} ` +
            `WHERE ${TADIR_TABLE}~PGMID = 'R3TR' ` +
            `AND ${TADIR_TABLE}~OBJECT = 'BOBF' ` +
            `AND ${TADIR_TABLE}~OBJ_NAME LIKE '${namePattern}' ` +
            `ORDER BY ${TADIR_TABLE}~OBJ_NAME`;

        let tadirRows = await runSql(baseUrl, TADIR_TABLE, tadirSql, maxResults);

        // Client-side package filter (avoids DEVCLASS in WHERE)
        if (matchingPackages) {
            tadirRows = tadirRows.filter((r) => matchingPackages!.has(r['DEVCLASS']));
        }

        if (tadirRows.length === 0) {
            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                query: args.query,
                                ...(args.package ? { package_filter: args.package } : {}),
                                total: 0,
                                results: [],
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        }

        // Build package lookup: BO_NAME → DEVCLASS
        const packageByName: Record<string, string> = {};
        for (const r of tadirRows) {
            packageByName[r['OBJ_NAME']] = r['DEVCLASS'] ?? '';
        }
        const boNames = Object.keys(packageByName);

        // ── Step 3: fetch OBJCAT from /BOBF/OBM_BO using IN clause ──
        const inList = boNames.map((n) => `'${escapeSqlValue(n)}'`).join(', ');
        const boWhere: string[] = [
            `${BO_TABLE}~BO_NAME IN (${inList})`,
            `${BO_TABLE}~EXTENSION = ''`,
            `${BO_TABLE}~BO_DELETED = ''`,
        ];
        if (args.objcat !== undefined && args.objcat !== null) {
            boWhere.push(`${BO_TABLE}~OBJCAT = '${escapeSqlValue(args.objcat)}'`);
        }

        const boSql =
            `SELECT ${BO_TABLE}~BO_NAME, ${BO_TABLE}~OBJCAT, ${BO_TABLE}~BO_GENERATED ` +
            `FROM ${BO_TABLE} ` +
            `WHERE ${boWhere.join(' AND ')}`;

        const boRows = await runSql(baseUrl, BO_TABLE, boSql, maxResults);

        // ── Step 3: merge and build results ──
        const results = boRows
            .map((r) => {
                const name = r['BO_NAME'];
                const objcatCode = r['OBJCAT'] ?? '';
                return {
                    name,
                    objcat: objcatCode,
                    objectCategory: OBJCAT_LABELS[objcatCode] ?? objcatCode,
                    generated: r['BO_GENERATED'] === 'X',
                    package: packageByName[name] ?? '',
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            query: args.query,
                            ...(args.objcat !== undefined && args.objcat !== null
                                ? { objcat_filter: args.objcat }
                                : {}),
                            ...(args.package ? { package_filter: args.package } : {}),
                            total: results.length,
                            results,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
