import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { Agent } from 'https';
import { AxiosResponse } from 'axios';
import { getConfig, SapConfig } from '../index'; // getConfig needs to be exported from index.ts

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
    
    if (error instanceof AxiosError) {
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
    csrfToken = null;
    cookies = null;
}

let config: SapConfig | undefined;
let csrfToken: string | null = null;
let cookies: string | null = null; // Variable to store cookies

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
    if (!config) {
        config = getConfig();
    }
    const { username, password, client } = config;
    const auth = Buffer.from(`${username}:${password}`).toString('base64'); // Create Basic Auth string
    return {
        'Authorization': `Basic ${auth}`, // Basic Authentication header
        'X-SAP-Client': client            // SAP client header
    };
}

async function fetchCsrfToken(url: string): Promise<string> {
    const baseUrl = await getBaseUrl();
    
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

    const config: any = {
        method,
        url,
        headers: requestHeaders,
        timeout,
        params: params
    };

    // Include data in the request configuration if provided
    if (data) {
        config.data = data;
    }

    try {
        const response = await createAxiosInstance()(config);
        return response;
    } catch (error) {
        // If we get a 403 with "CSRF token validation failed", try to fetch a new token and retry
        if (error instanceof AxiosError && error.response?.status === 403 &&
            error.response.data?.includes('CSRF')) {
            csrfToken = await fetchCsrfToken(url);
            config.headers['x-csrf-token'] = csrfToken;
            return await createAxiosInstance()(config);
        }
        throw error;
    }
}
