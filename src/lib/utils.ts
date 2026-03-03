import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { Agent } from 'https';
import { AxiosResponse } from 'axios';
import { getConfig, SapConfig } from '../index'; // getConfig needs to be exported from index.ts
import { AuthProvider, createAuthProvider, CookieAuthProvider } from '../infrastructure/auth';
import * as path from 'path';

export { McpError, ErrorCode, AxiosResponse };

export function return_response(response: AxiosResponse) {
    return {
        isError: false,
        content: [{
            type: 'text',
            text: response.data
        }]
    };
}
export function return_error(error: any) {
    let errorMessage = 'Unknown error occurred';
    let statusCode: number | undefined;
    let responseData: string = '';

    if (error instanceof AxiosError) {
        statusCode = error.response?.status;
        responseData = String(error.response?.data || '');

        // Handle Axios-specific errors with detailed information
        if (error.response) {
            // Server responded with error status
            errorMessage = `HTTP ${error.response.status}: ${String(error.response.data) || error.message}`;
        } else if (error.request) {
            // Request was made but no response received
            errorMessage = `Network error: ${error.message} (${error.code || 'NETWORK_ERROR'})`;
        } else {
            // Something else happened
            errorMessage = `Request setup error: ${error.message}`;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    } else if (error === undefined) {
        errorMessage = 'Undefined error - this may indicate a configuration or connection issue';
    } else if (error === null) {
        errorMessage = 'Null error occurred';
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        // Try to stringify the error for debugging
        try {
            errorMessage = JSON.stringify(error);
        } catch {
            errorMessage = `Unknown error type: ${typeof error}`;
        }
    }

    // Enhanced error messages for common authentication issues
    if (statusCode === 401) {
        // Get auth provider info if available
        let authMethod = 'Unknown';
        try {
            const provider = getAuthProviderInstance();
            authMethod = provider.getName();
        } catch {
            // Provider not initialized yet
        }

        errorMessage =
            '🔒 Authentication Failed (401)\n\n' +
            `Current authentication method: ${authMethod}\n` +
            'Credentials are invalid or expired.\n\n' +
            'Troubleshooting steps:\n' +
            '1. If using Basic Auth:\n' +
            '   - Check SAP_USERNAME and SAP_PASSWORD in .env file\n' +
            '   - Verify credentials are correct for the SAP system\n' +
            '   - Check if your password has expired\n' +
            '2. If using SSO:\n' +
            '   - Re-authenticate using sap_authenticate MCP tool\n' +
            '   - Restart MCP server: /mcp\n' +
            '3. Restart MCP server after any changes: /mcp';
    } else if (statusCode === 403 && (responseData.includes('CSRF') || responseData.includes('token validation failed'))) {
        // Get auth provider info if available
        let authMethod = 'Unknown';
        let systemUrl = '';
        let client = '';
        try {
            const provider = getAuthProviderInstance();
            authMethod = provider.getName();
            systemUrl = provider.getSystemUrl();
            client = provider.getClient();
        } catch {
            // Provider not initialized yet
        }

        errorMessage =
            '🔒 CSRF Token Validation Failed (403)\n\n' +
            `Current authentication method: ${authMethod}\n` +
            'CSRF token fetch or validation failed.\n\n' +
            'Troubleshooting steps:\n' +
            '1. If using Basic Auth:\n' +
            '   - Check if credentials are still valid\n' +
            '   - Verify SAP_USERNAME and SAP_PASSWORD in .env file\n' +
            '   - Restart MCP server: /mcp\n' +
            '2. If using SSO:\n' +
            '   - Re-authenticate using sap_authenticate MCP tool with:\n' +
            `     entry_url: ${systemUrl}/sap/bc/adt?sap-client=${client}\n` +
            '     store_path: tmp\n' +
            '   - Restart MCP server: /mcp\n' +
            '3. Check SAP system connectivity and permissions\n\n' +
            `Original error: ${responseData}`;
    }

    return {
        isError: true,
        content: [{
            type: 'text',
            text: `Error: ${errorMessage}`
        }]
    };
}

let axiosInstance: AxiosInstance | null = null;
export function createAxiosInstance() {
    if (!axiosInstance) {
        axiosInstance = axios.create({
            httpsAgent: new Agent({
                rejectUnauthorized: false // Allow self-signed certificates
            })
        });
    }
    return axiosInstance;
}

// Cleanup function for tests
export function cleanup() {
    if (axiosInstance) {
        // Clear any interceptors
        const reqInterceptor = axiosInstance.interceptors.request.use((config) => config);
        const resInterceptor = axiosInstance.interceptors.response.use((response) => response);
        axiosInstance.interceptors.request.eject(reqInterceptor);
        axiosInstance.interceptors.response.eject(resInterceptor);
    }
    axiosInstance = null;
    config = undefined;
    authProvider = null;
    csrfToken = null;
    cookies = null;
}

let config: SapConfig | undefined;
let authProvider: AuthProvider | null = null;
let csrfToken: string | null = null;
let cookies: string | null = null; // Variable to store cookies from SAP responses

export function getAuthProviderInstance(): AuthProvider {
    if (!authProvider) {
        if (!config) {
            config = getConfig();
        }
        const baseUrl = new URL(config.url).origin;
        authProvider = createAuthProvider(
            baseUrl,
            config.client,
            config.username,
            config.password
        );
    }
    return authProvider;
}

export async function getBaseUrl() {
    if (!config) {
        config = getConfig();
    }
    const { url } = config;
    try {
        const urlObj = new URL(url);
        return urlObj.origin;
    } catch (error) {
        const errorMessage = `Invalid URL in configuration: ${error instanceof Error ? error.message : error}`;
        throw new Error(errorMessage);
    }
}

export async function getAuthHeaders() {
    try {
        const provider = getAuthProviderInstance();
        return await provider.getAuthHeaders();
    } catch (error) {
        if (error instanceof Error && error.message === 'SSO_COOKIE_NOT_FOUND') {
            throw new Error(
                '🔒 Authentication Required\n\n' +
                'No authentication method available. Please authenticate using SSO:\n\n' +
                'SSO Authentication (Recommended):\n' +
                '  1. Use sap-auth-mcp-main MCP server\n' +
                '  2. Call sap_authenticate tool with your SAP system URL\n' +
                '  3. Restart MCP server: /mcp\n\n' +
                'Alternative - Basic Authentication (for dev/test):\n' +
                '  Set SAP_USERNAME and SAP_PASSWORD in .env file\n' +
                '  Then restart MCP server: /mcp'
            );
        }
        throw error;
    }
}

async function fetchCsrfToken(url: string): Promise<string> {
    const baseUrl = await getBaseUrl();

    // Get SAP client for URL parameter
    if (!config) {
        config = getConfig();
    }

    // Log authentication method being used
    const provider = getAuthProviderInstance();
    console.error(`[CSRF] Fetching token using ${provider.getName()}`);

    // Try multiple endpoints to fetch CSRF token
    const csrfEndpoints = [
        `${baseUrl}/sap/bc/adt/core/discovery`,  // ADT discovery endpoint (most reliable)
        `${baseUrl}/sap/bc/adt`,                 // ADT base endpoint
        url                                      // Original URL as fallback
    ];
    
    for (const endpoint of csrfEndpoints) {
        try {
            const response = await createAxiosInstance()({
                method: 'GET',
                url: endpoint,
                headers: {
                    ...(await getAuthHeaders()),
                    'x-csrf-token': 'fetch'
                },
                params: {
                    'sap-client': config.client
                }
            });

            const token = response.headers['x-csrf-token'];
            if (token) {
                // Extract and store cookies
                if (response.headers['set-cookie']) {
                    cookies = response.headers['set-cookie'].join('; ');
                }
                return token;
            }
        } catch (error) {
            // Even if the request fails, try to get token from error response
            if (error instanceof AxiosError && error.response?.headers['x-csrf-token']) {
                const token = error.response.headers['x-csrf-token'];
                if (token) {
                    // Extract and store cookies from the error response as well
                    if (error.response.headers['set-cookie']) {
                        cookies = error.response.headers['set-cookie'].join('; ');
                    }
                    return token;
                }
            }
            // Continue to next endpoint if this one failed
            console.error(`Failed to fetch CSRF token from ${endpoint}:`, error instanceof Error ? error.message : String(error));
        }
    }
    
    throw new Error('Failed to fetch CSRF token from any available endpoint');
}

export async function makeAdtRequest(url: string, method: string, timeout: number, data?: any, params?: any, customHeaders?: any) {
    // For POST/PUT requests, ensure we have a CSRF token
    if ((method === 'POST' || method === 'PUT') && !csrfToken) {
        try {
            csrfToken = await fetchCsrfToken(url);
        } catch (error) {
            throw new Error('CSRF token is required for POST/PUT requests but could not be fetched');
        }
    }

    const requestHeaders = {
        ...(await getAuthHeaders())
    };

    // Add CSRF token for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && csrfToken) {
        requestHeaders['x-csrf-token'] = csrfToken;
    }

    // Add custom headers if provided
    if (customHeaders) {
        Object.assign(requestHeaders, customHeaders);
    }

    // Add cookies if available
    if (cookies) {
        requestHeaders['Cookie'] = cookies;
    }

    // Add SAP client as URL parameter (required for some SAP systems)
    if (!config) {
        config = getConfig();
    }
    const requestParams = params || {};
    requestParams['sap-client'] = config.client;

    const requestConfig: any = {
        method,
        url,
        headers: requestHeaders,
        timeout,
        params: requestParams
    };

    // Include data in the request configuration if provided
    if (data) {
        requestConfig.data = data;
    }

    try {
        // DEBUG: Log the URL being requested
        console.error(`[DEBUG] Requesting URL: ${method} ${url}`);
        const response = await createAxiosInstance()(requestConfig);
        return response;
    } catch (error) {
        // DEBUG: Log the error details
        console.error(`[DEBUG] Request failed: ${method} ${url}`, error instanceof AxiosError ? { status: error.response?.status, statusText: error.response?.statusText } : error);

        // If we get a 403 with "CSRF token validation failed", try to fetch a new token and retry
        if (error instanceof AxiosError && error.response?.status === 403 &&
            error.response.data?.includes('CSRF')) {
            csrfToken = await fetchCsrfToken(url);
            requestConfig.headers['x-csrf-token'] = csrfToken;
            return await createAxiosInstance()(requestConfig);
        }
        throw error;
    }
}
