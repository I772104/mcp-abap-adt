/**
 * Unit Tests for handleGetClassInclude
 *
 * Tests the GetClassInclude tool handler which retrieves specific class includes
 */

import { handleGetClassInclude } from '../../../../src/handlers/handleGetClassInclude';
import * as utils from '../../../../src/lib/utils';
import * as classUtils from '../../../../src/lib/classUtils';

// Mock the utility functions
jest.mock('../../../../src/lib/utils', () => ({
    ...jest.requireActual('../../../../src/lib/utils'),
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn(),
}));

jest.mock('../../../../src/lib/classUtils');

describe('handleGetClassInclude', () => {
    let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
    let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;
    let mockFetchClassMetadata: jest.MockedFunction<typeof classUtils.fetchClassMetadata>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();

        mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
        mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
        mockFetchClassMetadata = classUtils.fetchClassMetadata as jest.MockedFunction<
            typeof classUtils.fetchClassMetadata
        >;

        mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
    });

    describe('Input Validation', () => {
        test('should reject missing class_name', async () => {
            const result = await handleGetClassInclude({} as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Class name');
            expect(result.content[0].text).toContain('required');
        });

        test('should reject missing include_type', async () => {
            const result = await handleGetClassInclude({ class_name: 'CL_TEST' } as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Include type');
            expect(result.content[0].text).toContain('required');
        });

        test('should reject invalid include_type', async () => {
            const result = await handleGetClassInclude({
                class_name: 'CL_TEST',
                include_type: 'invalid' as any,
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Invalid include type');
            expect(result.content[0].text).toContain('definitions');
            expect(result.content[0].text).toContain('implementations');
        });

        test('should accept valid include types', async () => {
            const validTypes = ['definitions', 'implementations', 'macros', 'testclasses', 'main'];

            mockFetchClassMetadata.mockResolvedValue({
                className: 'CL_TEST',
                includes: [{ type: 'main', uri: 'source/main', includeType: 'main' }],
            });

            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: 'SOURCE CODE',
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            for (const type of validTypes) {
                const result = await handleGetClassInclude({
                    class_name: 'CL_TEST',
                    include_type: type as any,
                });

                expect(result.isError).toBe(false);
            }
        });
    });

    describe('Successful Include Fetching', () => {
        beforeEach(() => {
            mockFetchClassMetadata.mockResolvedValue({
                className: 'CL_TEST_CLASS',
                includes: [
                    { type: 'main', uri: 'source/main', includeType: 'main' },
                    { type: 'definitions', uri: 'includes/definitions', includeType: 'definitions' },
                    { type: 'implementations', uri: 'includes/implementations', includeType: 'implementations' },
                    { type: 'macros', uri: 'includes/macros', includeType: 'macros' },
                    { type: 'testclasses', uri: 'includes/testclasses', includeType: 'testclasses' },
                ],
            });
        });

        test('should fetch main include', async () => {
            const mainSource = 'CLASS cl_test_class DEFINITION PUBLIC.\nENDCLASS.';

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: mainSource,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST_CLASS',
                include_type: 'main',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe(mainSource);
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://mock-sap-system.com:443/sap/bc/adt/oo/classes/CL_TEST_CLASS/source/main',
                'GET',
                30000,
                undefined,
                undefined,
                { Accept: 'text/plain' }
            );
        });

        test('should fetch definitions include', async () => {
            const defsSource = 'CLASS lcl_helper DEFINITION.';

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: defsSource,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST_CLASS',
                include_type: 'definitions',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe(defsSource);
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://mock-sap-system.com:443/sap/bc/adt/oo/classes/CL_TEST_CLASS/includes/definitions',
                'GET',
                30000,
                undefined,
                undefined,
                { Accept: 'text/plain' }
            );
        });

        test('should fetch implementations include', async () => {
            const implSource = 'CLASS lcl_helper IMPLEMENTATION.';

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: implSource,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST_CLASS',
                include_type: 'implementations',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe(implSource);
        });

        test('should fetch macros include', async () => {
            const macroSource = 'DEFINE test_macro.';

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: macroSource,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST_CLASS',
                include_type: 'macros',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe(macroSource);
        });

        test('should fetch testclasses include', async () => {
            const testSource = 'CLASS ltcl_test DEFINITION FOR TESTING.';

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: testSource,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST_CLASS',
                include_type: 'testclasses',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe(testSource);
        });

        test('should encode special characters in class name', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: 'SOURCE',
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            await handleGetClassInclude({
                class_name: 'ZCL_TEST/WITH/SLASHES',
                include_type: 'main',
            });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('ZCL_TEST%2FWITH%2FSLASHES'),
                'GET',
                30000,
                undefined,
                undefined,
                expect.any(Object)
            );
        });
    });

    describe('Missing Include Handling (404)', () => {
        beforeEach(() => {
            mockFetchClassMetadata.mockResolvedValue({
                className: 'CL_SIMPLE_CLASS',
                includes: [{ type: 'main', uri: 'source/main', includeType: 'main' }],
            });
        });

        test('should handle 404 gracefully with helpful message', async () => {
            mockMakeAdtRequest.mockRejectedValueOnce({
                response: { status: 404 },
                message: '404 Not Found',
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_SIMPLE_CLASS',
                include_type: 'implementations',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('not found');
            expect(result.content[0].text).toContain('implementations');
            expect(result.content[0].text).toContain('normal');
        });

        test('should handle 404 from metadata fallback', async () => {
            mockFetchClassMetadata.mockResolvedValue({
                className: 'CL_TEST',
                includes: [], // No includes in metadata
            });

            mockMakeAdtRequest.mockRejectedValueOnce({
                response: { status: 404 },
                message: '404 Not Found',
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST',
                include_type: 'definitions',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('not found');
        });

        test('should try standard URI when include not in metadata', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: 'FOUND VIA FALLBACK',
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST',
                include_type: 'implementations',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe('FOUND VIA FALLBACK');
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://mock-sap-system.com:443/sap/bc/adt/oo/classes/CL_TEST/includes/implementations',
                'GET',
                30000,
                undefined,
                undefined,
                { Accept: 'text/plain' }
            );
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            mockFetchClassMetadata.mockResolvedValue({
                className: 'CL_TEST',
                includes: [{ type: 'main', uri: 'source/main', includeType: 'main' }],
            });
        });

        test('should handle 401 authentication error', async () => {
            mockMakeAdtRequest.mockRejectedValueOnce({
                response: { status: 401 },
                message: 'Authentication required',
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST',
                include_type: 'main',
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Authentication');
        });

        test('should handle 403 authorization error', async () => {
            mockMakeAdtRequest.mockRejectedValueOnce({
                response: { status: 403 },
                message: 'Access denied',
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST',
                include_type: 'main',
            });

            expect(result.isError).toBe(true);
        });

        test('should handle 500 server error', async () => {
            mockMakeAdtRequest.mockRejectedValueOnce({
                response: { status: 500 },
                message: 'Internal server error',
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST',
                include_type: 'main',
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('500');
        });

        test('should handle network errors', async () => {
            mockMakeAdtRequest.mockRejectedValueOnce(new Error('Network timeout'));

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST',
                include_type: 'main',
            });

            expect(result.isError).toBe(true);
        });

        test('should handle metadata fetch errors', async () => {
            mockFetchClassMetadata.mockRejectedValueOnce(new Error('Metadata error'));

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST',
                include_type: 'main',
            });

            expect(result.isError).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty source code', async () => {
            mockFetchClassMetadata.mockResolvedValue({
                className: 'CL_TEST',
                includes: [{ type: 'main', uri: 'source/main', includeType: 'main' }],
            });

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: '',
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_TEST',
                include_type: 'main',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe('');
        });

        test('should handle very large source code', async () => {
            const largeSource = 'A'.repeat(1000000); // 1MB

            mockFetchClassMetadata.mockResolvedValue({
                className: 'CL_LARGE',
                includes: [{ type: 'main', uri: 'source/main', includeType: 'main' }],
            });

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: largeSource,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_LARGE',
                include_type: 'main',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toHaveLength(1000000);
        });

        test('should handle Unicode characters', async () => {
            const unicodeSource = 'DATA: lv_text TYPE string VALUE `Übermittlung äöü`.\n* Kommentar: über';

            mockFetchClassMetadata.mockResolvedValue({
                className: 'CL_UNICODE',
                includes: [{ type: 'main', uri: 'source/main', includeType: 'main' }],
            });

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: unicodeSource,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleGetClassInclude({
                class_name: 'CL_UNICODE',
                include_type: 'main',
            });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('Übermittlung äöü');
        });
    });
});
