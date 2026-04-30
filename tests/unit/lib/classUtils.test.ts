/**
 * Unit Tests for classUtils
 *
 * Tests the class utility functions for fetching metadata and includes
 */

import {
    fetchClassMetadata,
    fetchIncludes,
    formatMultiIncludeOutput,
    getIncludeSuffix,
    getIncludeLabel,
} from '../../../src/lib/classUtils';
import * as utils from '../../../src/lib/utils';

// Mock the utility functions
jest.mock('../../../src/lib/utils', () => ({
    ...jest.requireActual('../../../src/lib/utils'),
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn(),
}));

describe('classUtils', () => {
    let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
    let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();

        mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
        mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;

        mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
    });

    describe('fetchClassMetadata', () => {
        const mockClassMetadataXml = `<?xml version="1.0" encoding="UTF-8"?>
<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes" xmlns:adtcore="http://www.sap.com/adt/core" xmlns:abapsource="http://www.sap.com/adt/abapsource">
  <class:include class:includeType="main" abapsource:sourceUri="source/main"/>
  <class:include class:includeType="definitions" abapsource:sourceUri="includes/definitions"/>
  <class:include class:includeType="implementations" abapsource:sourceUri="includes/implementations"/>
  <class:include class:includeType="macros" abapsource:sourceUri="includes/macros"/>
  <class:include class:includeType="testclasses" abapsource:sourceUri="includes/testclasses"/>
</class:abapClass>`;

        test('should fetch and parse class metadata successfully', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                statusText: 'OK',
                data: mockClassMetadataXml,
                headers: {},
                config: {} as any,
            });

            const result = await fetchClassMetadata('CL_TEST_CLASS');

            expect(result).toEqual({
                className: 'CL_TEST_CLASS',
                includes: [
                    { type: 'main', uri: 'source/main', includeType: 'main' },
                    { type: 'definitions', uri: 'includes/definitions', includeType: 'definitions' },
                    { type: 'implementations', uri: 'includes/implementations', includeType: 'implementations' },
                    { type: 'macros', uri: 'includes/macros', includeType: 'macros' },
                    { type: 'testclasses', uri: 'includes/testclasses', includeType: 'testclasses' },
                ],
            });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://mock-sap-system.com:443/sap/bc/adt/oo/classes/CL_TEST_CLASS',
                'GET',
                30000,
                undefined,
                undefined,
                { Accept: 'application/vnd.sap.adt.oo.classes.v1+xml' }
            );
        });

        test('should handle partial includes (only some includes present)', async () => {
            const partialXml = `<?xml version="1.0" encoding="UTF-8"?>
<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes" xmlns:abapsource="http://www.sap.com/adt/abapsource">
  <class:include class:includeType="main" abapsource:sourceUri="source/main"/>
  <class:include class:includeType="implementations" abapsource:sourceUri="includes/implementations"/>
</class:abapClass>`;

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                statusText: 'OK',
                data: partialXml,
                headers: {},
                config: {} as any,
            });

            const result = await fetchClassMetadata('CL_SIMPLE_CLASS');

            expect(result.includes).toHaveLength(2);
            expect(result.includes[0].type).toBe('main');
            expect(result.includes[1].type).toBe('implementations');
        });

        test('should normalize testClasses to testclasses', async () => {
            const xmlWithTestClasses = `<?xml version="1.0" encoding="UTF-8"?>
<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes" xmlns:abapsource="http://www.sap.com/adt/abapsource">
  <class:include class:includeType="testClasses" abapsource:sourceUri="includes/testclasses"/>
</class:abapClass>`;

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                statusText: 'OK',
                data: xmlWithTestClasses,
                headers: {},
                config: {} as any,
            });

            const result = await fetchClassMetadata('CL_TEST');

            expect(result.includes[0].type).toBe('testclasses');
        });

        test('should handle empty includes list', async () => {
            const xmlNoIncludes = `<?xml version="1.0" encoding="UTF-8"?>
<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes">
</class:abapClass>`;

            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                statusText: 'OK',
                data: xmlNoIncludes,
                headers: {},
                config: {} as any,
            });

            const result = await fetchClassMetadata('CL_EMPTY');

            expect(result.includes).toEqual([]);
        });

        test('should return fallback metadata on error', async () => {
            mockMakeAdtRequest.mockRejectedValueOnce(new Error('Network error'));

            const result = await fetchClassMetadata('CL_ERROR_CLASS');

            expect(result).toEqual({
                className: 'CL_ERROR_CLASS',
                includes: [
                    { type: 'main', uri: 'source/main', includeType: 'main' },
                    { type: 'definitions', uri: 'includes/definitions', includeType: 'definitions' },
                    { type: 'implementations', uri: 'includes/implementations', includeType: 'implementations' },
                    { type: 'macros', uri: 'includes/macros', includeType: 'macros' },
                    { type: 'testclasses', uri: 'includes/testclasses', includeType: 'testclasses' },
                ],
            });
        });

        test('should handle special characters in class name', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                statusText: 'OK',
                data: mockClassMetadataXml,
                headers: {},
                config: {} as any,
            });

            await fetchClassMetadata('ZCL_TEST/WITH/SLASHES');

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://mock-sap-system.com:443/sap/bc/adt/oo/classes/ZCL_TEST%2FWITH%2FSLASHES',
                'GET',
                30000,
                undefined,
                undefined,
                expect.any(Object)
            );
        });
    });

    describe('fetchIncludes', () => {
        const mockClassMetadataXml = `<?xml version="1.0" encoding="UTF-8"?>
<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes" xmlns:abapsource="http://www.sap.com/adt/abapsource">
  <class:include class:includeType="main" abapsource:sourceUri="source/main"/>
  <class:include class:includeType="implementations" abapsource:sourceUri="includes/implementations"/>
  <class:include class:includeType="testclasses" abapsource:sourceUri="includes/testclasses"/>
</class:abapClass>`;

        beforeEach(() => {
            // Mock metadata fetch
            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                statusText: 'OK',
                data: mockClassMetadataXml,
                headers: {},
                config: {} as any,
            });
        });

        test('should fetch all includes when type is "all"', async () => {
            // Mock include fetches
            mockMakeAdtRequest
                .mockResolvedValueOnce({
                    status: 200,
                    data: 'CLASS cl_test_class DEFINITION PUBLIC.',
                    statusText: 'OK',
                    headers: {},
                    config: {} as any,
                })
                .mockResolvedValueOnce({
                    status: 200,
                    data: 'CLASS cl_test_class IMPLEMENTATION.',
                    statusText: 'OK',
                    headers: {},
                    config: {} as any,
                })
                .mockResolvedValueOnce({
                    status: 200,
                    data: 'CLASS ltcl_test DEFINITION.',
                    statusText: 'OK',
                    headers: {},
                    config: {} as any,
                });

            const result = await fetchIncludes('CL_TEST_CLASS', ['all']);

            expect(result).toHaveLength(3);
            expect(result[0].type).toBe('main');
            expect(result[0].source).toContain('DEFINITION PUBLIC');
            expect(result[1].type).toBe('implementations');
            expect(result[2].type).toBe('testclasses');
        });

        test('should fetch specific includes', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: 'CLASS cl_test_class IMPLEMENTATION.',
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await fetchIncludes('CL_TEST_CLASS', ['implementations']);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('implementations');
            expect(result[0].source).toContain('IMPLEMENTATION');
        });

        test('should handle 404 errors gracefully (missing includes)', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({
                    status: 200,
                    data: 'CLASS cl_test_class DEFINITION.',
                    statusText: 'OK',
                    headers: {},
                    config: {} as any,
                })
                .mockRejectedValueOnce({
                    response: { status: 404 },
                    message: '404 Not Found',
                });

            const result = await fetchIncludes('CL_TEST_CLASS', ['main', 'implementations']);

            expect(result).toHaveLength(2);
            expect(result[0].source).toContain('DEFINITION');
            expect(result[1].source).toBeNull(); // 404 = null source
        });

        test('should fetch includes in parallel', async () => {
            const startTime = Date.now();

            mockMakeAdtRequest
                .mockImplementation(
                    () =>
                        new Promise((resolve) => {
                            setTimeout(
                                () =>
                                    resolve({
                                        status: 200,
                                        data: 'ABAP SOURCE',
                                        statusText: 'OK',
                                        headers: {},
                                        config: {} as any,
                                    }),
                                10
                            );
                        })
                )
                .mockImplementationOnce(
                    () =>
                        new Promise((resolve) => {
                            setTimeout(
                                () =>
                                    resolve({
                                        status: 200,
                                        data: 'ABAP SOURCE 2',
                                        statusText: 'OK',
                                        headers: {},
                                        config: {} as any,
                                    }),
                                10
                            );
                        })
                )
                .mockImplementationOnce(
                    () =>
                        new Promise((resolve) => {
                            setTimeout(
                                () =>
                                    resolve({
                                        status: 200,
                                        data: 'ABAP SOURCE 3',
                                        statusText: 'OK',
                                        headers: {},
                                        config: {} as any,
                                    }),
                                10
                            );
                        })
                );

            await fetchIncludes('CL_TEST', ['main', 'implementations']);

            const duration = Date.now() - startTime;

            // Parallel execution should take ~10ms, sequential would take ~20ms
            expect(duration).toBeLessThan(50); // Allow overhead
        });

        test('should propagate non-404 errors', async () => {
            mockMakeAdtRequest.mockRejectedValueOnce(new Error('Network timeout'));

            await expect(fetchIncludes('CL_TEST', ['main'])).rejects.toThrow('Network timeout');
        });

        test('should handle empty source (null)', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: null,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await fetchIncludes('CL_TEST', ['main']);

            expect(result[0].source).toBeNull();
        });

        test('should encode class name in URLs', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({
                status: 200,
                data: 'SOURCE',
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            await fetchIncludes('ZCL_TEST/NAMESPACE', ['main']);

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://mock-sap-system.com:443/sap/bc/adt/oo/classes/ZCL_TEST%2FNAMESPACE/source/main',
                'GET',
                30000,
                undefined,
                undefined,
                { Accept: 'text/plain' }
            );
        });
    });

    describe('formatMultiIncludeOutput', () => {
        test('should format multiple includes with separators', () => {
            const includes = [
                { type: 'main', source: 'CLASS cl_test DEFINITION PUBLIC.\nENDCLASS.' },
                { type: 'implementations', source: 'CLASS cl_test IMPLEMENTATION.\nENDCLASS.' },
            ];

            const result = formatMultiIncludeOutput(includes);

            expect(result).toContain('='.repeat(80));
            expect(result).toContain('MAIN SOURCE');
            expect(result).toContain('LOCAL CLASS IMPLEMENTATIONS (CCIMP)');
            expect(result).toContain('CLASS cl_test DEFINITION PUBLIC');
            expect(result).toContain('CLASS cl_test IMPLEMENTATION');
        });

        test('should order sections correctly', () => {
            const includes = [
                { type: 'testclasses', source: 'TEST' },
                { type: 'main', source: 'MAIN' },
                { type: 'implementations', source: 'IMPL' },
            ];

            const result = formatMultiIncludeOutput(includes);

            const mainIndex = result.indexOf('MAIN SOURCE');
            const implIndex = result.indexOf('LOCAL CLASS IMPLEMENTATIONS');
            const testIndex = result.indexOf('LOCAL TEST CLASSES');

            expect(mainIndex).toBeLessThan(implIndex);
            expect(implIndex).toBeLessThan(testIndex);
        });

        test('should handle missing includes with placeholder', () => {
            const includes = [
                { type: 'main', source: 'MAIN SOURCE' },
                { type: 'definitions', source: null },
            ];

            const result = formatMultiIncludeOutput(includes);

            expect(result).toContain('// No definitions include found');
        });

        test('should handle all include types', () => {
            const includes = [
                { type: 'main', source: 'MAIN' },
                { type: 'definitions', source: 'DEF' },
                { type: 'implementations', source: 'IMPL' },
                { type: 'macros', source: 'MACRO' },
                { type: 'testclasses', source: 'TEST' },
            ];

            const result = formatMultiIncludeOutput(includes);

            expect(result).toContain('MAIN SOURCE');
            expect(result).toContain('LOCAL CLASS DEFINITIONS (CCDEF)');
            expect(result).toContain('LOCAL CLASS IMPLEMENTATIONS (CCIMP)');
            expect(result).toContain('LOCAL MACROS (CCMAC)');
            expect(result).toContain('LOCAL TEST CLASSES (CCAU)');
        });

        test('should handle Unicode content', () => {
            const includes = [{ type: 'main', source: 'DATA: lv_text TYPE string VALUE `Übernahme ä ö ü`.' }];

            const result = formatMultiIncludeOutput(includes);

            expect(result).toContain('Übernahme ä ö ü');
        });

        test('should handle empty includes array', () => {
            const result = formatMultiIncludeOutput([]);

            expect(result).toBe('');
        });

        test('should separate sections with double newline', () => {
            const includes = [
                { type: 'main', source: 'MAIN' },
                { type: 'implementations', source: 'IMPL' },
            ];

            const result = formatMultiIncludeOutput(includes);

            expect(result).toContain('\n\n');
        });
    });

    describe('getIncludeSuffix', () => {
        test('should return correct suffix for main', () => {
            expect(getIncludeSuffix('main')).toBe('');
        });

        test('should return correct suffix for definitions', () => {
            expect(getIncludeSuffix('definitions')).toBe('.locals_def');
        });

        test('should return correct suffix for implementations', () => {
            expect(getIncludeSuffix('implementations')).toBe('.locals_imp');
        });

        test('should return correct suffix for macros', () => {
            expect(getIncludeSuffix('macros')).toBe('.macros');
        });

        test('should return correct suffix for testclasses', () => {
            expect(getIncludeSuffix('testclasses')).toBe('.testclasses');
        });

        test('should handle unknown type with dot prefix', () => {
            expect(getIncludeSuffix('unknown')).toBe('.unknown');
        });
    });

    describe('getIncludeLabel', () => {
        test('should return correct label for main', () => {
            expect(getIncludeLabel('main')).toBe('Main Source');
        });

        test('should return correct label for definitions', () => {
            expect(getIncludeLabel('definitions')).toBe('Local Definitions (CCDEF)');
        });

        test('should return correct label for implementations', () => {
            expect(getIncludeLabel('implementations')).toBe('Local Implementations (CCIMP)');
        });

        test('should return correct label for macros', () => {
            expect(getIncludeLabel('macros')).toBe('Local Macros (CCMAC)');
        });

        test('should return correct label for testclasses', () => {
            expect(getIncludeLabel('testclasses')).toBe('Test Classes (CCAU)');
        });

        test('should return input for unknown type', () => {
            expect(getIncludeLabel('unknown')).toBe('unknown');
        });
    });
});
