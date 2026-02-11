import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetBehaviorDefinition(args: any) {
    try {
        if (!args?.cds_view_name) {
            throw new McpError(ErrorCode.InvalidParams, 'CDS view name is required');
        }

        const encodedViewName = encodeURIComponent(args.cds_view_name);
        
        // Try different ADT endpoints for behavior definitions
        const baseUrl = await getBaseUrl();
        const endpoints = [
            `/sap/bc/adt/bo/behaviors/${encodedViewName}`, // Behavior definition endpoint
            `/sap/bc/adt/ddic/behaviors/${encodedViewName}`, // Alternative endpoint
            `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodedViewName}&objectType=BDEF/BH`
        ];

        let lastError: any;
        
        for (const endpoint of endpoints) {
            try {
                const url = `${baseUrl}${endpoint}`;
                const response = await makeAdtRequest(url, 'GET', 30000);
                
                // If we got a successful response, parse and enhance it
                if (response.data) {
                    let result = {
                        cds_view_name: args.cds_view_name,
                        source_code: response.data,
                        implementation_type: extractImplementationType(response.data),
                        implementation_class: extractImplementationClass(response.data),
                        strict_mode: extractStrictMode(response.data),
                        draft_enabled: extractDraftEnabled(response.data),
                        operations: extractOperations(response.data),
                        actions: extractActions(response.data),
                        determinations: extractDeterminations(response.data),
                        validations: extractValidations(response.data),
                        authorization: extractAuthorization(response.data),
                        side_effects: extractSideEffects(response.data),
                        field_controls: extractFieldControls(response.data)
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
        throw lastError || new Error('Failed to retrieve behavior definition from any endpoint');
        
    } catch (error) {
        return return_error(error);
    }
}

function extractImplementationType(sourceCode: string): string {
    const source = sourceCode.toLowerCase();
    
    if (source.includes('managed implementation')) {
        return 'managed';
    } else if (source.includes('unmanaged implementation')) {
        return 'unmanaged';
    }
    
    return 'unknown';
}

function extractImplementationClass(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Match patterns like: managed implementation in class zbp_r_salesordertp unique;
        const match = trimmed.match(/implementation\s+in\s+class\s+(\w+)/i);
        if (match) {
            return match[1].trim();
        }
    }
    
    return null;
}

function extractStrictMode(sourceCode: string): number {
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Match patterns like: strict ( 2 );
        const match = trimmed.match(/strict\s*\(\s*(\d+)\s*\)/i);
        if (match) {
            return parseInt(match[1], 10);
        }
    }
    
    return 0; // Default to 0 if not specified
}

function extractDraftEnabled(sourceCode: string): boolean {
    return sourceCode.toLowerCase().includes('with draft');
}

function extractOperations(sourceCode: string): any {
    const operations = {
        create: false,
        update: false,
        delete: false
    };
    
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed === 'create;') {
            operations.create = true;
        } else if (trimmed === 'update;') {
            operations.update = true;
        } else if (trimmed === 'delete;') {
            operations.delete = true;
        }
    }
    
    return operations;
}

function extractActions(sourceCode: string): any[] {
    const actions: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Match action patterns like: action Release result [1] $self;
        const match = trimmed.match(/action\s*(?:\(\s*features\s*:\s*instance\s*\))?\s*(\w+)(?:\s+result\s+\[([^\]]+)\]\s+(.+))?/i);
        if (match) {
            actions.push({
                name: match[1].trim(),
                result_cardinality: match[2] ? match[2].trim() : null,
                result_type: match[3] ? match[3].trim() : null,
                features_controlled: trimmed.includes('features : instance')
            });
        }
    }
    
    return actions;
}

function extractDeterminations(sourceCode: string): any[] {
    const determinations: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Match determination patterns like: determination CalculateNetAmount on modify { field Quantity, Price; }
        const match = trimmed.match(/determination\s+(\w+)\s+on\s+(modify|save)\s*\{([^}]+)\}/i);
        if (match) {
            const fieldsMatch = match[3].match(/field\s+([^;]+)/i);
            determinations.push({
                name: match[1].trim(),
                trigger: match[2].trim(),
                fields: fieldsMatch ? fieldsMatch[1].split(',').map(f => f.trim()) : []
            });
        }
    }
    
    return determinations;
}

function extractValidations(sourceCode: string): any[] {
    const validations: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Match validation patterns like: validation ValidateSoldToParty on save { create; field SoldToParty; }
        const match = trimmed.match(/validation\s+(\w+)\s+on\s+(save|modify)\s*\{([^}]+)\}/i);
        if (match) {
            const content = match[3];
            const fieldsMatch = content.match(/field\s+([^;]+)/i);
            validations.push({
                name: match[1].trim(),
                trigger: match[2].trim(),
                operations: content.includes('create') ? ['create'] : [],
                fields: fieldsMatch ? fieldsMatch[1].split(',').map(f => f.trim()) : []
            });
        }
    }
    
    return validations;
}

function extractAuthorization(sourceCode: string): any {
    const authorization = {
        master: false,
        dependent: false,
        global: false,
        instance: false
    };
    
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.includes('authorization master')) {
            authorization.master = true;
            if (trimmed.includes('global')) authorization.global = true;
            if (trimmed.includes('instance')) authorization.instance = true;
        } else if (trimmed.includes('authorization dependent')) {
            authorization.dependent = true;
        }
    }
    
    return authorization;
}

function extractSideEffects(sourceCode: string): any[] {
    const sideEffects: any[] = [];
    const lines = sourceCode.split('\n');
    let inSideEffects = false;
    let currentEffect: any = null;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.toLowerCase().startsWith('side effects')) {
            inSideEffects = true;
            continue;
        }
        
        if (inSideEffects) {
            if (trimmed === '}') {
                if (currentEffect) {
                    sideEffects.push(currentEffect);
                    currentEffect = null;
                }
                inSideEffects = false;
            } else if (trimmed.includes('field') && trimmed.includes('affects')) {
                // Match patterns like: field Quantity affects field NetAmount;
                const match = trimmed.match(/field\s+(\w+)\s+affects\s+field\s+(\w+)/i);
                if (match) {
                    sideEffects.push({
                        source_field: match[1].trim(),
                        target_field: match[2].trim(),
                        type: 'field_affects_field'
                    });
                }
            }
        }
    }
    
    return sideEffects;
}

function extractFieldControls(sourceCode: string): any[] {
    const fieldControls: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Match field control patterns like: field ( readonly ) SalesOrder, CreationDate;
        const readonlyMatch = trimmed.match(/field\s*\(\s*readonly\s*\)\s*([^;]+)/i);
        if (readonlyMatch) {
            const fields = readonlyMatch[1].split(',').map(f => f.trim());
            fields.forEach(field => {
                fieldControls.push({
                    field_name: field,
                    control_type: 'readonly'
                });
            });
        }
        
        // Match mandatory fields
        const mandatoryMatch = trimmed.match(/field\s*\(\s*mandatory\s*\)\s*([^;]+)/i);
        if (mandatoryMatch) {
            const fields = mandatoryMatch[1].split(',').map(f => f.trim());
            fields.forEach(field => {
                fieldControls.push({
                    field_name: field,
                    control_type: 'mandatory'
                });
            });
        }
    }
    
    return fieldControls;
}