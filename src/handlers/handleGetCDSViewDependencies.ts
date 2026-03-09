import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetCDSViewDependencies(args: any) {
    try {
        if (!args?.view_name) {
            throw new McpError(ErrorCode.InvalidParams, 'CDS view name is required');
        }

        const encodedViewName = encodeURIComponent(args.view_name);

        // Try different ADT endpoints for CDS view dependencies
        const baseUrl = await getBaseUrl();
        const endpoints = [
            `/sap/bc/adt/repository/informationsystem/dependencies?uri=/sap/bc/adt/ddic/ddls/sources/${encodedViewName}`, // Dependencies endpoint
            `/sap/bc/adt/ddic/ddls/sources/${encodedViewName}/dependencies`, // Alternative dependencies
            `/sap/bc/adt/repository/informationsystem/usages?uri=/sap/bc/adt/ddic/ddls/sources/${encodedViewName}`, // Usage information
        ];

        let lastError: any;
        let dependencyData: any = null;

        // First, try to get the CDS view source to analyze dependencies
        try {
            const sourceUrl = `${baseUrl}/sap/bc/adt/ddic/ddls/sources/${encodedViewName}`;
            const sourceResponse = await makeAdtRequest(sourceUrl, 'GET', 30000);
            if (sourceResponse.data) {
                dependencyData = analyzeSourceDependencies(sourceResponse.data, args.view_name);
            }
        } catch (error) {
            // Continue with other methods if source analysis fails
        }

        // Try ADT dependency endpoints
        for (const endpoint of endpoints) {
            try {
                const url = `${baseUrl}${endpoint}`;
                const response = await makeAdtRequest(url, 'GET', 30000);

                if (response.data) {
                    // Merge with source analysis if available
                    const adtDependencies = parseAdtDependencies(response.data);

                    let result = {
                        view_name: args.view_name,
                        base_views: dependencyData?.base_views || adtDependencies.base_views || [],
                        associations: dependencyData?.associations || adtDependencies.associations || [],
                        used_by_views: adtDependencies.used_by_views || [],
                        database_tables: dependencyData?.database_tables || adtDependencies.database_tables || [],
                        functions: dependencyData?.functions || adtDependencies.functions || [],
                        parameters: dependencyData?.parameters || [],
                        dependency_tree: buildDependencyTree(dependencyData, adtDependencies),
                    };

                    return {
                        isError: false,
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    };
                }
            } catch (error) {
                lastError = error;
                continue;
            }
        }

        // If ADT endpoints failed but we have source analysis, return that
        if (dependencyData) {
            let result = {
                view_name: args.view_name,
                base_views: dependencyData.base_views || [],
                associations: dependencyData.associations || [],
                used_by_views: [],
                database_tables: dependencyData.database_tables || [],
                functions: dependencyData.functions || [],
                parameters: dependencyData.parameters || [],
                dependency_tree: dependencyData,
            };

            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }

        // If all methods failed, throw the last error
        throw lastError || new Error('Failed to retrieve CDS view dependencies from any source');
    } catch (error) {
        return return_error(error);
    }
}

function analyzeSourceDependencies(sourceCode: string, viewName: string): any {
    const dependencies = {
        view_name: viewName,
        base_views: [] as string[],
        associations: [] as any[],
        database_tables: [] as string[],
        functions: [] as string[],
        parameters: [] as any[],
    };

    const lines = sourceCode.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Extract base views from SELECT FROM clauses
        const selectFromMatch = trimmed.match(/as\s+select\s+from\s+(\w+)/i);
        if (selectFromMatch) {
            const baseName = selectFromMatch[1].trim();
            if (!dependencies.base_views.includes(baseName)) {
                dependencies.base_views.push(baseName);

                // Classify as CDS view or database table
                if (baseName.startsWith('I_') || baseName.startsWith('R_') || baseName.startsWith('C_')) {
                    // Likely a CDS view
                } else {
                    dependencies.database_tables.push(baseName);
                }
            }
        }

        // Extract projection base
        const projectionMatch = trimmed.match(/as\s+projection\s+on\s+(\w+)/i);
        if (projectionMatch) {
            const baseName = projectionMatch[1].trim();
            if (!dependencies.base_views.includes(baseName)) {
                dependencies.base_views.push(baseName);
            }
        }

        // Extract associations
        const associationMatch = trimmed.match(/association\s*\[([^\]]+)\]\s*to\s+(\w+)\s+as\s+(\w+)/i);
        if (associationMatch) {
            dependencies.associations.push({
                cardinality: associationMatch[1].trim(),
                target_entity: associationMatch[2].trim(),
                alias: associationMatch[3].trim(),
            });
        }

        // Extract JOIN references
        const joinMatch = trimmed.match(/(?:left\s+outer\s+join|inner\s+join|join)\s+(\w+)/i);
        if (joinMatch) {
            const joinTable = joinMatch[1].trim();
            if (!dependencies.base_views.includes(joinTable) && !dependencies.database_tables.includes(joinTable)) {
                if (joinTable.startsWith('I_') || joinTable.startsWith('R_') || joinTable.startsWith('C_')) {
                    dependencies.base_views.push(joinTable);
                } else {
                    dependencies.database_tables.push(joinTable);
                }
            }
        }

        // Extract function calls
        const functionMatch = trimmed.match(/(\w+)\s*\(/);
        if (functionMatch && !trimmed.toLowerCase().includes('select') && !trimmed.toLowerCase().includes('from')) {
            const funcName = functionMatch[1].trim();
            if (funcName.length > 2 && !dependencies.functions.includes(funcName)) {
                dependencies.functions.push(funcName);
            }
        }

        // Extract parameters
        const paramMatch = trimmed.match(/with\s+parameters?\s+parameter\s+(\w+)\s*:\s*(\w+)/i);
        if (paramMatch) {
            dependencies.parameters.push({
                name: paramMatch[1].trim(),
                type: paramMatch[2].trim(),
            });
        }
    }

    return dependencies;
}

function parseAdtDependencies(adtResponse: string): any {
    const dependencies = {
        base_views: [] as string[],
        associations: [] as any[],
        used_by_views: [] as string[],
        database_tables: [] as string[],
        functions: [] as string[],
    };

    try {
        // Try to parse as XML (common ADT response format)
        if (adtResponse.includes('<')) {
            const entityMatches = adtResponse.match(/<[^>]*name="([^"]+)"[^>]*type="([^"]+)"/g);
            if (entityMatches) {
                entityMatches.forEach((match) => {
                    const nameMatch = match.match(/name="([^"]+)"/);
                    const typeMatch = match.match(/type="([^"]+)"/);

                    if (nameMatch && typeMatch) {
                        const name = nameMatch[1];
                        const type = typeMatch[1];

                        switch (type.toLowerCase()) {
                            case 'ddls':
                            case 'view':
                                dependencies.base_views.push(name);
                                break;
                            case 'tabl':
                            case 'table':
                                dependencies.database_tables.push(name);
                                break;
                            case 'func':
                            case 'function':
                                dependencies.functions.push(name);
                                break;
                        }
                    }
                });
            }
        }

        // Try to parse as JSON
        if (adtResponse.startsWith('{') || adtResponse.startsWith('[')) {
            const jsonData = JSON.parse(adtResponse);
            if (jsonData.dependencies) {
                return jsonData.dependencies;
            }
        }
    } catch (error) {
        // If parsing fails, return empty dependencies
    }

    return dependencies;
}

function buildDependencyTree(sourceDeps: any, adtDeps: any): any {
    const tree = {
        direct_dependencies: [] as any[],
        indirect_dependencies: [] as any[],
        dependency_levels: {} as any,
    };

    if (sourceDeps) {
        // Level 1: Direct dependencies from source analysis
        sourceDeps.base_views?.forEach((view: string) => {
            tree.direct_dependencies.push({
                name: view,
                type: 'CDS_VIEW',
                level: 1,
            });
        });

        sourceDeps.database_tables?.forEach((table: string) => {
            tree.direct_dependencies.push({
                name: table,
                type: 'DATABASE_TABLE',
                level: 1,
            });
        });

        sourceDeps.associations?.forEach((assoc: any) => {
            tree.direct_dependencies.push({
                name: assoc.target_entity,
                type: 'ASSOCIATION',
                level: 1,
                cardinality: assoc.cardinality,
                alias: assoc.alias,
            });
        });
    }

    if (adtDeps) {
        // Add ADT-discovered dependencies as indirect
        adtDeps.base_views?.forEach((view: string) => {
            if (!tree.direct_dependencies.find((d) => d.name === view)) {
                tree.indirect_dependencies.push({
                    name: view,
                    type: 'CDS_VIEW',
                    level: 2,
                });
            }
        });
    }

    // Group by levels
    tree.dependency_levels = {
        level_1: tree.direct_dependencies,
        level_2: tree.indirect_dependencies,
    };

    return tree;
}
