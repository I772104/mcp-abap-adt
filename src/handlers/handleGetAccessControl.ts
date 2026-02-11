import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetAccessControl(args: any) {
    try {
        if (!args?.dcl_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Access control (DCL) name is required');
        }

        const encodedDclName = encodeURIComponent(args.dcl_name);
        
        // Try different ADT endpoints for access control definitions
        const baseUrl = await getBaseUrl();
        const endpoints = [
            `/sap/bc/adt/ddic/dcls/sources/${encodedDclName}`, // DCL source endpoint
            `/sap/bc/adt/ddic/accesscontrols/${encodedDclName}`, // Alternative access control endpoint
            `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodedDclName}&objectType=DCLS/AC`
        ];

        let lastError: any;
        
        for (const endpoint of endpoints) {
            try {
                const url = `${baseUrl}${endpoint}`;
                const response = await makeAdtRequest(url, 'GET', 30000);
                
                // If we got a successful response, parse and enhance it
                if (response.data) {
                    let result = {
                        dcl_name: args.dcl_name,
                        source_code: response.data,
                        protected_view: extractProtectedView(response.data),
                        roles: extractRoles(response.data),
                        authorization_checks: extractAuthorizationChecks(response.data),
                        conditions: extractConditions(response.data),
                        mapping_role: extractMappingRole(response.data),
                        access_type: extractAccessType(response.data),
                        grant_statements: extractGrantStatements(response.data)
                    };
                    
                    return {
                        isError: false,
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                }
            } catch (error) {
                lastError = error;
                // Continue to next endpoint
                continue;
            }
        }
        
        // If all endpoints failed, throw the last error
        throw lastError || new Error('Failed to retrieve access control definition from any endpoint');
        
    } catch (error) {
        return return_error(error);
    }
}

function extractProtectedView(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Match define role patterns like: define role ZMyRole {
        const roleMatch = trimmed.match(/define\s+role\s+(\w+)/i);
        if (roleMatch) {
            // Look for grant select on in the following lines
            continue;
        }
        
        // Match grant select patterns like: grant select on R_SalesOrderTP
        const grantMatch = trimmed.match(/grant\s+select\s+on\s+(\w+)/i);
        if (grantMatch) {
            return grantMatch[1].trim();
        }
    }
    
    return null;
}

function extractRoles(sourceCode: string): any[] {
    const roles: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Match define role patterns like: define role ZMyRole {
        const roleMatch = trimmed.match(/define\s+role\s+(\w+)/i);
        if (roleMatch) {
            roles.push({
                name: roleMatch[1].trim(),
                type: 'custom'
            });
        }
    }
    
    return roles;
}

function extractAuthorizationChecks(sourceCode: string): any[] {
    const authChecks: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Match aspect pfcg_auth patterns
        const pfcgAuthMatch = trimmed.match(/aspect\s+pfcg_auth\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/i);
        if (pfcgAuthMatch) {
            authChecks.push({
                type: 'pfcg_auth',
                authorization_object: pfcgAuthMatch[1].trim(),
                field: pfcgAuthMatch[2].trim(),
                activity: pfcgAuthMatch[3].trim()
            });
        }
        
        // Match aspect pfcg_mapping patterns
        const pfcgMappingMatch = trimmed.match(/aspect\s+pfcg_mapping\s*\(\s*([^)]+)\s*\)/i);
        if (pfcgMappingMatch) {
            authChecks.push({
                type: 'pfcg_mapping',
                mapping: pfcgMappingMatch[1].trim()
            });
        }
        
        // Match aspect user patterns
        const userMatch = trimmed.match(/aspect\s+user\s*\(\s*([^)]+)\s*\)/i);
        if (userMatch) {
            authChecks.push({
                type: 'user',
                condition: userMatch[1].trim()
            });
        }
    }
    
    return authChecks;
}

function extractConditions(sourceCode: string): any[] {
    const conditions: any[] = [];
    const lines = sourceCode.split('\n');
    let inWhereClause = false;
    let currentCondition = '';
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.toLowerCase().startsWith('where')) {
            inWhereClause = true;
            currentCondition = trimmed.substring(5).trim(); // Remove 'where'
            continue;
        }
        
        if (inWhereClause) {
            if (trimmed === ';' || trimmed === '}') {
                if (currentCondition) {
                    conditions.push({
                        type: 'where_clause',
                        condition: currentCondition.trim()
                    });
                    currentCondition = '';
                }
                inWhereClause = false;
            } else {
                currentCondition += ' ' + trimmed;
            }
        }
        
        // Match literal conditions
        const literalMatch = trimmed.match(/\(\s*([^)]+)\s*\)\s*=\s*(.+)/);
        if (literalMatch) {
            conditions.push({
                type: 'literal',
                field: literalMatch[1].trim(),
                value: literalMatch[2].trim()
            });
        }
    }
    
    return conditions;
}

function extractMappingRole(sourceCode: string): boolean {
    const source = sourceCode.toLowerCase();
    return source.includes('@mappingrole: true') || source.includes('mappingrole');
}

function extractAccessType(sourceCode: string): string {
    const source = sourceCode.toLowerCase();
    
    if (source.includes('grant select')) {
        return 'SELECT';
    } else if (source.includes('grant update')) {
        return 'UPDATE';
    } else if (source.includes('grant insert')) {
        return 'INSERT';
    } else if (source.includes('grant delete')) {
        return 'DELETE';
    } else if (source.includes('grant all')) {
        return 'ALL';
    }
    
    return 'UNKNOWN';
}

function extractGrantStatements(sourceCode: string): any[] {
    const grantStatements: any[] = [];
    const lines = sourceCode.split('\n');
    let inGrantBlock = false;
    let currentGrant: any = null;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Match grant statements
        const grantMatch = trimmed.match(/grant\s+(\w+)\s+on\s+(\w+)/i);
        if (grantMatch) {
            currentGrant = {
                operation: grantMatch[1].trim().toUpperCase(),
                entity: grantMatch[2].trim(),
                conditions: [],
                aspects: []
            };
            inGrantBlock = true;
            continue;
        }
        
        if (inGrantBlock) {
            if (trimmed === ';' || (trimmed === '}' && currentGrant)) {
                if (currentGrant) {
                    grantStatements.push(currentGrant);
                    currentGrant = null;
                }
                inGrantBlock = false;
            } else if (trimmed.startsWith('where')) {
                if (currentGrant) {
                    currentGrant.conditions.push({
                        type: 'where',
                        condition: trimmed.substring(5).trim()
                    });
                }
            } else if (trimmed.includes('aspect')) {
                if (currentGrant) {
                    currentGrant.aspects.push(trimmed);
                }
            }
        }
    }
    
    return grantStatements;
}