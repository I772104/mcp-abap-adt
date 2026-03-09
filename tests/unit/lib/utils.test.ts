/**
 * Unit Tests for utils.ts - Pure Functions Only
 *
 * Tests pure utility functions that don't require SAP connection.
 * Mocks are used to isolate tests from external dependencies.
 */

import { AxiosError, AxiosResponse } from 'axios';

// We need to mock before importing
jest.mock('../../../src/index', () => ({
    getConfig: jest.fn(() => ({
        url: 'https://mock-sap.com:443',
        client: '100',
        username: 'testuser',
        password: 'testpass',
    })),
}));

jest.mock('../../../src/infrastructure/auth', () => ({
    createAuthProvider: jest.fn(() => ({
        getName: jest.fn(() => 'MockAuth'),
        getAuthHeaders: jest.fn(() => Promise.resolve({ Authorization: 'Basic mock' })),
        getSystemUrl: jest.fn(() => 'https://mock-sap.com:443'),
        getClient: jest.fn(() => '100'),
    })),
    CookieAuthProvider: jest.fn(),
}));

import { return_response, return_error, cleanup } from '../../../src/lib/utils';

describe('utils - Pure Functions', () => {
    afterEach(() => {
        cleanup();
    });

    // =========================================================================
    // return_response
    // =========================================================================
    describe('return_response', () => {
        test('should return formatted success response', () => {
            const mockResponse = {
                data: 'Test response data',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            } as AxiosResponse;

            const result = return_response(mockResponse);

            expect(result.isError).toBe(false);
            expect(result.content).toHaveLength(1);
            expect(result.content[0].type).toBe('text');
            expect(result.content[0].text).toBe('Test response data');
        });

        test('should handle object data', () => {
            const mockResponse = {
                data: { key: 'value', nested: { prop: 123 } },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            } as AxiosResponse;

            const result = return_response(mockResponse);

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toEqual({ key: 'value', nested: { prop: 123 } });
        });

        test('should handle empty data', () => {
            const mockResponse = {
                data: '',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            } as AxiosResponse;

            const result = return_response(mockResponse);

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe('');
        });

        test('should handle null data', () => {
            const mockResponse = {
                data: null,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            } as AxiosResponse;

            const result = return_response(mockResponse);

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBeNull();
        });
    });

    // =========================================================================
    // return_error
    // =========================================================================
    describe('return_error', () => {
        describe('Error type handling', () => {
            test('should handle standard Error', () => {
                const error = new Error('Something went wrong');
                const result = return_error(error);

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Something went wrong');
            });

            test('should handle string error', () => {
                const result = return_error('Simple string error');

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Simple string error');
            });

            test('should handle undefined error', () => {
                const result = return_error(undefined);

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Undefined error');
            });

            test('should handle null error', () => {
                const result = return_error(null);

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Null error');
            });

            test('should handle object error by stringifying', () => {
                const result = return_error({ code: 500, message: 'Server error' });

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('500');
                expect(result.content[0].text).toContain('Server error');
            });
        });

        describe('AxiosError handling', () => {
            test('should handle AxiosError with response', () => {
                const axiosError = new AxiosError('Request failed');
                axiosError.response = {
                    status: 404,
                    statusText: 'Not Found',
                    data: 'Resource not found',
                    headers: {},
                    config: {} as any,
                };

                const result = return_error(axiosError);

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('404');
                expect(result.content[0].text).toContain('Resource not found');
            });

            test('should handle AxiosError with request but no response (network error)', () => {
                const axiosError = new AxiosError('Network Error');
                axiosError.request = {}; // Request was made but no response
                axiosError.code = 'ECONNREFUSED';

                const result = return_error(axiosError);

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Network error');
                expect(result.content[0].text).toContain('ECONNREFUSED');
            });

            test('should handle AxiosError without request (setup error)', () => {
                const axiosError = new AxiosError('Invalid URL');
                // No request or response set

                const result = return_error(axiosError);

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Request setup error');
            });
        });

        describe('Authentication error messages', () => {
            test('should provide helpful message for 401 errors', () => {
                const axiosError = new AxiosError('Unauthorized');
                axiosError.response = {
                    status: 401,
                    statusText: 'Unauthorized',
                    data: 'Invalid credentials',
                    headers: {},
                    config: {} as any,
                };

                const result = return_error(axiosError);

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Authentication Failed');
                expect(result.content[0].text).toContain('401');
                expect(result.content[0].text).toContain('Troubleshooting');
            });

            test('should provide helpful message for CSRF 403 errors', () => {
                const axiosError = new AxiosError('Forbidden');
                axiosError.response = {
                    status: 403,
                    statusText: 'Forbidden',
                    data: 'CSRF token validation failed',
                    headers: {},
                    config: {} as any,
                };

                const result = return_error(axiosError);

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('CSRF');
                expect(result.content[0].text).toContain('403');
                expect(result.content[0].text).toContain('Troubleshooting');
            });

            test('should not show CSRF message for non-CSRF 403 errors', () => {
                const axiosError = new AxiosError('Forbidden');
                axiosError.response = {
                    status: 403,
                    statusText: 'Forbidden',
                    data: 'Access denied - insufficient authorization',
                    headers: {},
                    config: {} as any,
                };

                const result = return_error(axiosError);

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('403');
                expect(result.content[0].text).not.toContain('CSRF Token Validation Failed');
            });
        });

        describe('Response format', () => {
            test('should always return isError true', () => {
                const errors = [new Error('test'), 'string', null, undefined, { obj: true }];

                errors.forEach((error) => {
                    const result = return_error(error);
                    expect(result.isError).toBe(true);
                });
            });

            test('should always return content array with one element', () => {
                const result = return_error(new Error('test'));

                expect(Array.isArray(result.content)).toBe(true);
                expect(result.content).toHaveLength(1);
            });

            test('should always return text type in content', () => {
                const result = return_error(new Error('test'));

                expect(result.content[0].type).toBe('text');
            });

            test('should always prefix message with "Error:"', () => {
                const result = return_error(new Error('test'));

                expect(result.content[0].text).toMatch(/^Error:/);
            });
        });
    });

    // =========================================================================
    // cleanup
    // =========================================================================
    describe('cleanup', () => {
        test('should not throw when called', () => {
            expect(() => cleanup()).not.toThrow();
        });

        test('should be idempotent (safe to call multiple times)', () => {
            expect(() => {
                cleanup();
                cleanup();
                cleanup();
            }).not.toThrow();
        });
    });
});
