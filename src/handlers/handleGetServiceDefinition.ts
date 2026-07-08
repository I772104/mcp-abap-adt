import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';

export async function handleGetServiceDefinition(args: any) {
    try {
        if (!args?.service_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Service name is required');
        }

        const encodedServiceName = encodeURIComponent(args.service_name.toLowerCase());

        // Try different ADT endpoints for service definitions (SRVD objects)
        const baseUrl = await getBaseUrl();
        const endpoints = [
            `/sap/bc/adt/ddic/srvd/sources/${encodedServiceName}/source/main?version=active`, // Primary: SRVD DDL source
            `/sap/bc/adt/ddic/srvb/sources/${encodedServiceName}/source/main?version=active`, // Fallback: SRVB (service binding) DDL source
        ];

        let lastError: any;

        for (const endpoint of endpoints) {
            try {
                const url = `${baseUrl}${endpoint}`;
                const response = await makeAdtRequest(url, 'GET', 30000);

                // Only treat as success if response contains actual DDL source code (not an XML list)
                const data: string = typeof response.data === 'string' ? response.data : '';
                if (data && !data.trimStart().startsWith('<?xml') && data.trim().length > 0) {
                    const result = {
                        service_name: args.service_name,
                        source_code: data,
                        service_type: detectServiceType(data, endpoint),
                        exposed_entities: extractExposedEntities(data),
                        service_version: extractServiceVersion(data),
                        namespace: extractNamespace(data),
                        annotations: extractServiceAnnotations(data),
                    };

                    return {
                        isError: false,
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                } else {
                    lastError = new Error(`Endpoint ${endpoint} returned an XML response instead of DDL source code`);
                }
            } catch (error) {
                lastError = error;
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
    if (endpoint.includes('/srvb/')) {
        return 'Service Binding';
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

        const versionMatch = trimmed.match(/@odata\.service\.version\s*:\s*['"]([^'"]+)['"]/i);
        if (versionMatch) {
            return versionMatch[1].trim();
        }

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

        const namespaceMatch = trimmed.match(/@namespace\s*:\s*['"]([^'"]+)['"]/i);
        if (namespaceMatch) {
            return namespaceMatch[1].trim();
        }

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
