import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetCDSView(args: any) {
    try {
        if (!args?.view_name) {
            throw new McpError(ErrorCode.InvalidParams, 'CDS view name is required');
        }

        const encodedViewName = encodeURIComponent(args.view_name);
        const includeAnnotations = args.include_annotations !== false; // Default to true
        
        // Try different ADT endpoints for CDS views
        const baseUrl = await getBaseUrl();
        const endpoints = [
            `/sap/bc/adt/ddic/ddlx/sources/${encodedViewName}`, // CDS view source with annotations
            `/sap/bc/adt/ddic/ddls/sources/${encodedViewName}`, // CDS view source
            `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodedViewName}&objectType=DDLS/DF`
        ];

        let lastError: any;
        
        for (const endpoint of endpoints) {
            try {
                const url = `${baseUrl}${endpoint}`;
                const response = await makeAdtRequest(url, 'GET', 30000);
                
                // If we got a successful response, try to parse and enhance it
                if (response.data) {
                    let result = {
                        view_name: args.view_name,
                        source_code: response.data,
                        view_type: detectViewType(response.data),
                        annotations: includeAnnotations ? extractAnnotations(response.data) : [],
                        associations: extractAssociations(response.data),
                        parameters: extractParameters(response.data),
                        base_entity: extractBaseEntity(response.data)
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
        throw lastError || new Error('Failed to retrieve CDS view from any endpoint');
        
    } catch (error) {
        return return_error(error);
    }
}

function detectViewType(sourceCode: string): string {
    const source = sourceCode.toLowerCase();
    
    if (source.includes('define view entity') && source.includes('as projection on')) {
        return 'PROJECTION';
    } else if (source.includes('define view entity') && source.includes('composition')) {
        return 'COMPOSITE';
    } else if (source.includes('define view entity') && source.includes('@analytics')) {
        return 'ANALYTICAL';
    } else if (source.includes('define view entity')) {
        return 'BASIC';
    } else if (source.includes('define view') && source.includes('as select from')) {
        return 'INTERFACE';
    } else if (source.includes('define abstract entity')) {
        return 'ABSTRACT';
    }
    
    return 'UNKNOWN';
}

function extractAnnotations(sourceCode: string): any[] {
    const annotations: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('@')) {
            const match = trimmed.match(/@([^:]+):\s*(.+)/);
            if (match) {
                annotations.push({
                    name: match[1].trim(),
                    value: match[2].trim()
                });
            } else {
                // Simple annotation without value
                const simpleMatch = trimmed.match(/@([^\s]+)/);
                if (simpleMatch) {
                    annotations.push({
                        name: simpleMatch[1].trim(),
                        value: true
                    });
                }
            }
        }
    }
    
    return annotations;
}

function extractAssociations(sourceCode: string): any[] {
    const associations: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Match association patterns like: association [0..*] to I_SalesOrder as _Order
        const match = trimmed.match(/association\s*\[([^\]]+)\]\s*to\s+(\w+)\s+as\s+(\w+)/i);
        if (match) {
            associations.push({
                cardinality: match[1].trim(),
                target_entity: match[2].trim(),
                alias: match[3].trim()
            });
        }
    }
    
    return associations;
}

function extractParameters(sourceCode: string): any[] {
    const parameters: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Match parameter patterns like: with parameters parameter p_param : type
        const match = trimmed.match(/with\s+parameters?\s+parameter\s+(\w+)\s*:\s*(\w+)/i);
        if (match) {
            parameters.push({
                name: match[1].trim(),
                type: match[2].trim()
            });
        }
    }
    
    return parameters;
}

function extractBaseEntity(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Match patterns like: as select from I_SalesOrder or as projection on R_SalesOrderTP
        const selectMatch = trimmed.match(/as\s+select\s+from\s+(\w+)/i);
        if (selectMatch) {
            return selectMatch[1].trim();
        }
        
        const projectionMatch = trimmed.match(/as\s+projection\s+on\s+(\w+)/i);
        if (projectionMatch) {
            return projectionMatch[1].trim();
        }
    }
    
    return null;
}