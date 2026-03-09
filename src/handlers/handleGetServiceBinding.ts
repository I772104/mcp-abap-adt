import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetServiceBinding(args: any) {
    try {
        if (!args?.binding_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Service binding name is required');
        }

        const encodedBindingName = encodeURIComponent(args.binding_name);

        // Try different ADT endpoints for service bindings
        const baseUrl = await getBaseUrl();
        const endpoints = [
            `/sap/bc/adt/businessservices/bindings/${encodedBindingName}`, // Service binding endpoint
            `/sap/bc/adt/businessservices/odatav4/bindings/${encodedBindingName}`, // OData V4 binding
            `/sap/bc/adt/businessservices/odatav2/bindings/${encodedBindingName}`, // OData V2 binding
            `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodedBindingName}&objectType=SRVB/SB`,
        ];

        let lastError: any;

        for (const endpoint of endpoints) {
            try {
                const url = `${baseUrl}${endpoint}`;
                const response = await makeAdtRequest(url, 'GET', 30000);

                // If we got a successful response, parse and enhance it
                if (response.data) {
                    let result = {
                        binding_name: args.binding_name,
                        source_code: response.data,
                        service_definition: extractServiceDefinition(response.data),
                        binding_type: extractBindingType(response.data, endpoint),
                        service_url: extractServiceUrl(response.data),
                        service_version: extractServiceVersion(response.data),
                        protocol: extractProtocol(response.data),
                        authentication: extractAuthentication(response.data),
                        status: extractBindingStatus(response.data),
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
        throw lastError || new Error('Failed to retrieve service binding from any endpoint');
    } catch (error) {
        return return_error(error);
    }
}

function extractServiceDefinition(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Match service definition references
        const serviceDefMatch = trimmed.match(/service\s+definition\s*:\s*(\w+)/i);
        if (serviceDefMatch) {
            return serviceDefMatch[1].trim();
        }

        // Match in binding definition
        const bindingMatch = trimmed.match(/bind\s+service\s+(\w+)/i);
        if (bindingMatch) {
            return bindingMatch[1].trim();
        }
    }

    return null;
}

function extractBindingType(sourceCode: string, endpoint: string): string {
    if (endpoint.includes('odatav4')) {
        return 'OData V4';
    } else if (endpoint.includes('odatav2')) {
        return 'OData V2';
    }

    const source = sourceCode.toLowerCase();

    if (source.includes('odata_v4')) {
        return 'OData V4';
    } else if (source.includes('odata_v2')) {
        return 'OData V2';
    } else if (source.includes('rest')) {
        return 'REST';
    } else if (source.includes('soap')) {
        return 'SOAP';
    }

    return 'Unknown';
}

function extractServiceUrl(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Match URL patterns
        const urlMatch = trimmed.match(/url\s*:\s*['"]([^'"]+)['"]/i);
        if (urlMatch) {
            return urlMatch[1].trim();
        }

        // Match endpoint patterns
        const endpointMatch = trimmed.match(/endpoint\s*:\s*['"]([^'"]+)['"]/i);
        if (endpointMatch) {
            return endpointMatch[1].trim();
        }
    }

    return null;
}

function extractServiceVersion(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Match version annotations
        const versionMatch = trimmed.match(/version\s*:\s*['"]([^'"]+)['"]/i);
        if (versionMatch) {
            return versionMatch[1].trim();
        }

        // Match OData version
        const odataVersionMatch = trimmed.match(/@odata\.version\s*:\s*['"]([^'"]+)['"]/i);
        if (odataVersionMatch) {
            return odataVersionMatch[1].trim();
        }
    }

    return null;
}

function extractProtocol(sourceCode: string): string {
    const source = sourceCode.toLowerCase();

    if (source.includes('https')) {
        return 'HTTPS';
    } else if (source.includes('http')) {
        return 'HTTP';
    } else if (source.includes('odata')) {
        return 'OData';
    } else if (source.includes('rest')) {
        return 'REST';
    } else if (source.includes('soap')) {
        return 'SOAP';
    }

    return 'Unknown';
}

function extractAuthentication(sourceCode: string): any {
    const authentication = {
        type: 'Unknown',
        required: false,
        methods: [] as string[],
    };

    const source = sourceCode.toLowerCase();

    if (source.includes('basic auth')) {
        authentication.type = 'Basic Authentication';
        authentication.required = true;
        authentication.methods.push('Basic');
    }

    if (source.includes('oauth')) {
        authentication.type = 'OAuth';
        authentication.required = true;
        authentication.methods.push('OAuth');
    }

    if (source.includes('saml')) {
        authentication.type = 'SAML';
        authentication.required = true;
        authentication.methods.push('SAML');
    }

    if (source.includes('x509')) {
        authentication.type = 'Certificate';
        authentication.required = true;
        authentication.methods.push('X.509');
    }

    if (source.includes('no auth') || source.includes('anonymous')) {
        authentication.type = 'None';
        authentication.required = false;
    }

    return authentication;
}

function extractBindingStatus(sourceCode: string): string {
    const source = sourceCode.toLowerCase();

    if (source.includes('active') || source.includes('published')) {
        return 'Active';
    } else if (source.includes('inactive') || source.includes('unpublished')) {
        return 'Inactive';
    } else if (source.includes('draft')) {
        return 'Draft';
    } else if (source.includes('error')) {
        return 'Error';
    }

    return 'Unknown';
}
