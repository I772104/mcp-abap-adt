/**
 * Unit Tests for handleRunATC
 *
 * Tests the RunATC tool handler which runs ABAP Test Cockpit static code
 * analysis on ABAP objects.
 */

import { handleRunATC } from '../../../../src/handlers/handleRunATC';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
    ...jest.requireActual('../../../../src/lib/utils'),
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn(),
}));

describe('handleRunATC', () => {
    let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
    let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

    const mockWorklistId = '42010AEF4D521FE188D590CE3E0FB808';
    const mockRunId = 'RUN123456';

    const mockWorklistResultsXml = `<?xml version="1.0" encoding="utf-8"?>
<atcworklist:worklist xmlns:atcworklist="http://www.sap.com/adt/atc/worklist">
  <atcworklist:objects>
    <atcobject:object xmlns:atcobject="http://www.sap.com/adt/atc/object">
      <atcobject:findings>
        <atcfinding:finding
          xmlns:atcfinding="http://www.sap.com/adt/atc/finding"
          atcfinding:priority="1"
          atcfinding:checkId="CHECK_001"
          atcfinding:messageTitle="Unused variable detected"
          atcfinding:location="/sap/bc/adt/oo/classes/cl_test#start=10,0"/>
        <atcfinding:finding
          atcfinding:priority="2"
          atcfinding:checkId="CHECK_002"
          atcfinding:messageTitle="Missing documentation"
          atcfinding:location="/sap/bc/adt/oo/classes/cl_test#start=50,0"/>
      </atcobject:findings>
    </atcobject:object>
  </atcworklist:objects>
</atcworklist:worklist>`;

    const mockEmptyResultsXml = `<?xml version="1.0" encoding="utf-8"?>
<atcworklist:worklist xmlns:atcworklist="http://www.sap.com/adt/atc/worklist">
  <atcworklist:objects>
  </atcworklist:objects>
</atcworklist:worklist>`;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
        mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
        mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
    });

    describe('Input Validation', () => {
        test('should reject missing object_name', async () => {
            const result = (await handleRunATC({ object_type: 'class' })) as any;
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('object_name');
            expect(result.content[0].text).toContain('required');
        });

        test('should reject missing object_type', async () => {
            const result = (await handleRunATC({ object_name: 'CL_TEST' })) as any;
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('object_type');
            expect(result.content[0].text).toContain('required');
        });

        test('should accept valid parameters', async () => {
            // Mock the complete ATC workflow (with customizing since no check_variant provided)
            const mockCustomizingXml = `<?xml version="1.0"?>
<customizing>
  <property name="systemCheckVariant" value="DEFAULT_VARIANT"/>
</customizing>`;

            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockCustomizingXml } as any) // Get default variant
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any) // Worklist creation
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any) // Run submission
                .mockResolvedValueOnce({
                    status: 200,
                    data: '<run status="finished"/>',
                } as any) // Status check
                .mockResolvedValueOnce({ status: 200, data: mockEmptyResultsXml } as any); // Results

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
            })) as any;
            expect(result.isError).toBeFalsy();
        });
    });

    describe('Object Type Handling', () => {
        const objectTypes = ['class', 'interface', 'program', 'function_group', 'include', 'package'];

        objectTypes.forEach((objectType) => {
            test(`should support ${objectType} object type`, async () => {
                const mockCustomizingXml = `<?xml version="1.0"?>
<customizing>
  <property name="systemCheckVariant" value="DEFAULT_VARIANT"/>
</customizing>`;

                mockMakeAdtRequest
                    .mockResolvedValueOnce({ status: 200, data: mockCustomizingXml } as any) // Get default variant
                    .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                    .mockResolvedValueOnce({
                        status: 200,
                        headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                    } as any)
                    .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any)
                    .mockResolvedValueOnce({ status: 200, data: mockEmptyResultsXml } as any);

                const result = (await handleRunATC({
                    object_name: 'TEST_OBJECT',
                    object_type: objectType,
                })) as any;
                expect(result.isError).toBeFalsy();
            });
        });

        test('should reject unsupported object type', async () => {
            // Mock worklist creation (will succeed before hitting object type validation)
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any);

            const result = (await handleRunATC({
                object_name: 'TEST',
                object_type: 'invalid_type',
                check_variant: 'TEST_VARIANT', // Provide variant to skip customizing call
            })) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Unsupported object type');
        });
    });

    describe('Check Variant Handling', () => {
        test('should use provided check variant', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any)
                .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any)
                .mockResolvedValueOnce({ status: 200, data: mockEmptyResultsXml } as any);

            await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'CUSTOM_VARIANT',
            });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('checkVariant=CUSTOM_VARIANT'),
                'POST',
                30000
            );
        });

        test('should fetch system default variant if not provided', async () => {
            const mockCustomizingXml = `<?xml version="1.0"?>
<customizing>
  <property name="systemCheckVariant" value="DEFAULT_VARIANT"/>
</customizing>`;

            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockCustomizingXml } as any) // Get default variant
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any) // Worklist
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any) // Run
                .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any) // Status
                .mockResolvedValueOnce({ status: 200, data: mockEmptyResultsXml } as any); // Results

            await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
            });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('/atc/customizing'),
                'GET',
                30000,
                undefined,
                expect.any(Object)
            );
        });

        test('should error if no variant found and none provided', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: '<customizing/>' } as any);

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
            })) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('No check_variant specified');
        });
    });

    describe('ATC Workflow', () => {
        test('should complete full ATC workflow successfully', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any)
                .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any)
                .mockResolvedValueOnce({ status: 200, data: mockWorklistResultsXml } as any);

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
            })) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('ATC Check Results');
            expect(result.content[0].text).toContain('CL_TEST');
            expect(result.content[0].text).toContain(mockWorklistId);
        });

        test('should retry worklist creation on first failure', async () => {
            mockMakeAdtRequest
                .mockRejectedValueOnce(new Error('HTTP 415')) // First attempt fails
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any) // Retry succeeds
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any)
                .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any)
                .mockResolvedValueOnce({ status: 200, data: mockEmptyResultsXml } as any);

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
            })) as any;

            expect(result.isError).toBeFalsy();
            expect(mockMakeAdtRequest).toHaveBeenCalledTimes(5); // 2 for worklist + 3 for workflow
        });

        test('should handle cancelled ATC run', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any)
                .mockResolvedValue({ status: 200, data: '<run status="cancelled"/>' } as any);

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
            })) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('cancelled');
        });
    });

    describe('Findings Parsing', () => {
        test('should parse and format ATC findings', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any)
                .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any)
                .mockResolvedValueOnce({ status: 200, data: mockWorklistResultsXml } as any);

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
            })) as any;

            expect(result.content[0].text).toContain('Total Findings: 2');
            expect(result.content[0].text).toContain('Unused variable detected');
            expect(result.content[0].text).toContain('Missing documentation');
            expect(result.content[0].text).toContain('Line 10');
            expect(result.content[0].text).toContain('Line 50');
        });

        test('should handle empty findings list', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any)
                .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any)
                .mockResolvedValueOnce({ status: 200, data: mockEmptyResultsXml } as any);

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
            })) as any;

            expect(result.content[0].text).toContain('No findings');
            expect(result.content[0].text).toContain('Code quality looks good');
        });

        test('should group findings by priority', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any)
                .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any)
                .mockResolvedValueOnce({ status: 200, data: mockWorklistResultsXml } as any);

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
            })) as any;

            expect(result.content[0].text).toContain('Errors:   1');
            expect(result.content[0].text).toContain('Warnings: 1');
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid worklist ID', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: 'INVALID' } as any);

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
            })) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Invalid worklist ID');
        });

        test('should handle missing Location header', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                .mockResolvedValueOnce({ status: 200, headers: {}, data: '' } as any);

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
            })) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('No Location header');
        });

        test('should handle network errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('ECONNREFUSED'));

            const result = (await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
            })) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('Parameters', () => {
        test('should respect max_findings parameter', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                    data: '',
                } as any)
                .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any)
                .mockResolvedValueOnce({ status: 200, data: mockEmptyResultsXml } as any);

            await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
                max_findings: 50,
            });

            // Check the POST request body contains maximumVerdicts
            const runRequestCall = mockMakeAdtRequest.mock.calls.find(
                (call) => call[0].includes('/atc/runs') && call[1] === 'POST'
            );
            expect(runRequestCall![3]).toContain('maximumVerdicts="50"'); // call[3] is the request body
        });

        test('should respect with_exemptions parameter', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: mockWorklistId } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    headers: { location: `/sap/bc/adt/atc/runs/${mockRunId}` },
                } as any)
                .mockResolvedValueOnce({ status: 200, data: '<run status="finished"/>' } as any)
                .mockResolvedValueOnce({ status: 200, data: mockEmptyResultsXml } as any);

            await handleRunATC({
                object_name: 'CL_TEST',
                object_type: 'class',
                check_variant: 'TEST_VARIANT',
                with_exemptions: true,
            });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('includeExemptedFindings=true'),
                'GET',
                30000,
                undefined,
                expect.any(Object)
            );
        });
    });
});
