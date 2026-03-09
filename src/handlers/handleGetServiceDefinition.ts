import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetServiceDefinition(args: any) {
    try {
        if (!args?.service_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Service name is required');
        }

        const encodedServiceName = encodeURIComponent(args.service_name);

        // Try different ADT endpoints for service definitions
        const baseUrl = await getBaseUrl();
        const endpoints = [
            `/sap/bc/adt/businessservices/odatav4/${encodedServiceName}`, // OData V4 service definition
            `/sap/bc/adt/businessservices/odatav2/${encodedServiceName}`, // OData V2 service definition
            `/sap/bc/adt/ddic/services/${encodedServiceName}`, // Generic service definition
            `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodedServiceName}&objectType=SRVD/SV`,
        ];

        let lastError: any;

        for (const endpoint of endpoints) {
            try {
                const url = `${baseUrl}${endpoint}`;
                const response = await makeAdtRequest(url, 'GET', 30000);

                // If we got a successful response, parse and enhance it
                if (response.data) {
                    let result = {
                        service_name: args.service_name,
                        source_code: response.data,
                        service_type: detectServiceType(response.data, endpoint),
                        exposed_entities: extractExposedEntities(response.data),
                        service_version: extractServiceVersion(response.data),
                        namespace: extractNamespace(response.data),
                        annotations: extractServiceAnnotations(response.data),
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
                // Continue to next endpoint
                continue;
            }
        }

        // If all endpoints failed, throw the last error
        throw lastError || new Error('Failed to retrieve service definition from any endpoint');
    } catch (error) {
        return return_error(error);
    }
}

function detectServiceType(sourceCode: string, endpoint: string): string {
    if (endpoint.includes('odatav4')) {
        return 'OData V4';
    } else if (endpoint.includes('odatav2')) {
        return 'OData V2';
    }

    const source = sourceCode.toLowerCase();

    if (source.includes('@odata.service.version')) {
        const versionMatch = source.match(/@odata\.service\.version\s*:\s*['"]([^'"]+)['"]/i);
        if (versionMatch) {
            return `OData ${versionMatch[1]}`;
        }
    }

    if (source.includes('define service')) {
        return 'RAP Service Definition';
    }

    return 'Unknown';
}

function extractExposedEntities(sourceCode: string): any[] {
    const entities: any[] = [];
    const lines = sourceCode.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Match expose patterns like: expose C_SalesOrderTP as SalesOrder;
        const exposeMatch = trimmed.match(/expose\s+(\w+)(?:\s+as\s+(\w+))?/i);
        if (exposeMatch) {
            entities.push({
                cds_entity: exposeMatch[1].trim(),
                exposed_name: exposeMatch[2] ? exposeMatch[2].trim() : exposeMatch[1].trim(),
                entity_type: 'entity',
            });
        }

        // Match function/action exposures
        const functionMatch = trimmed.match(/expose\s+function\s+(\w+)(?:\s+as\s+(\w+))?/i);
        if (functionMatch) {
            entities.push({
                cds_entity: functionMatch[1].trim(),
                exposed_name: functionMatch[2] ? functionMatch[2].trim() : functionMatch[1].trim(),
                entity_type: 'function',
            });
        }

        const actionMatch = trimmed.match(/expose\s+action\s+(\w+)(?:\s+as\s+(\w+))?/i);
        if (actionMatch) {
            entities.push({
                cds_entity: actionMatch[1].trim(),
                exposed_name: actionMatch[2] ? actionMatch[2].trim() : actionMatch[1].trim(),
                entity_type: 'action',
            });
        }
    }

    return entities;
}

function extractServiceVersion(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Match version annotations
        const versionMatch = trimmed.match(/@odata\.service\.version\s*:\s*['"]([^'"]+)['"]/i);
        if (versionMatch) {
            return versionMatch[1].trim();
        }

        // Match version in service name
        const serviceVersionMatch = trimmed.match(/define\s+service\s+\w+_v(\d+)/i);
        if (serviceVersionMatch) {
            return serviceVersionMatch[1].trim();
        }
    }

    return null;
}

function extractNamespace(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Match namespace declarations
        const namespaceMatch = trimmed.match(/@namespace\s*:\s*['"]([^'"]+)['"]/i);
        if (namespaceMatch) {
            return namespaceMatch[1].trim();
        }

        // Extract from service definition name
        const serviceMatch = trimmed.match(/define\s+service\s+([A-Z]+)_/i);
        if (serviceMatch) {
            return serviceMatch[1].trim();
        }
    }

    return null;
}

function extractServiceAnnotations(sourceCode: string): any[] {
    const annotations: any[] = [];
    const lines = sourceCode.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('@')) {
            const match = trimmed.match(/@([^:]+):\s*(.+)/);
            if (match) {
                annotations.push({
                    name: match[1].trim(),
                    value: match[2].trim(),
                });
            } else {
                // Simple annotation without value
                const simpleMatch = trimmed.match(/@([^\s]+)/);
                if (simpleMatch) {
                    annotations.push({
                        name: simpleMatch[1].trim(),
                        value: true,
                    });
                }
            }
        }
    }

    return annotations;
}
