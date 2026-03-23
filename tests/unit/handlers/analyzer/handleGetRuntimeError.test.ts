/**
 * Unit Tests for handleGetRuntimeError
 *
 * Tests the GetRuntimeError tool handler which retrieves detailed information
 * about a specific ABAP runtime error dump (ST22).
 */

import { handleGetRuntimeError } from '../../../../src/handlers/handleGetRuntimeError';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
    ...jest.requireActual('../../../../src/lib/utils'),
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn(),
}));

describe('handleGetRuntimeError', () => {
    let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
    let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

    const mockFormattedDump = `----------------------------------------------------------------------------------------------------
Category               ABAP programming error
Runtime Errors         SYNTAX_ERROR
ABAP: Program          CL_TEST_CLASS
Application Component  BC-ABA
Date and Time          18.03.2026 10:45:20 (CET)
----------------------------------------------------------------------------------------------------

What happened?
    Error in the ABAP application program.

    The current ABAP program "CL_TEST_CLASS" had to be
    terminated because it contains a statement that cannot be executed.

Error analysis
    Syntax error in program "CL_TEST_CLASS".

How to correct the error
    If the error occurred in your own program or in an SAP program,
    correct the program.

Source Code Extract
    123: DATA lv_test TYPE string.
    124: lv_test = 'invalid syntax'
    125: WRITE lv_test.

Call Stack
    CL_TEST_CLASS->METHOD1 (line 124)
    CL_CALLER->PROCESS (line 45)
`;

    const mockSummaryDump = `<html>
<head><title>Short Dump Summary</title></head>
<body>
<h1>SYNTAX_ERROR</h1>
<p>Error in program CL_TEST_CLASS at line 124</p>
</body>
</html>`;

    const mockMetadataDump = `<?xml version="1.0" encoding="utf-8"?>
<dump:dump xmlns:dump="http://www.sap.com/adt/runtime/dump">
  <dump:category>ABAP_PROGRAMMING_ERROR</dump:category>
  <dump:errorType>SYNTAX_ERROR</dump:errorType>
  <dump:program>CL_TEST_CLASS</dump:program>
  <dump:timestamp>2026-03-18T09:45:20Z</dump:timestamp>
</dump:dump>`;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
        mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
        mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
    });

    describe('Input Validation', () => {
        test('should reject missing dump_id', async () => {
            const result = (await handleGetRuntimeError({})) as any;
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('dump_id');
            expect(result.content[0].text).toContain('required');
        });

        test('should accept valid dump_id', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockFormattedDump,
            } as any);

            const result = (await handleGetRuntimeError({
                dump_id: '20260318104520test_dump_id',
            })) as any;
            expect(result.isError).toBeFalsy();
        });
    });

    describe('Content Modes', () => {
        test('should retrieve formatted dump by default', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockFormattedDump,
            } as any);

            const result = (await handleGetRuntimeError({
                dump_id: 'test_dump_id',
            })) as any;

            expect(result.isError).toBeFalsy();
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('/formatted'),
                'GET',
                30000,
                undefined,
                { Accept: 'text/plain' }
            );
            expect(result.content[0].text).toContain('SYNTAX_ERROR');
            expect(result.content[0].text).toContain('Mode: formatted');
        });

        test('should retrieve formatted dump when explicitly requested', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockFormattedDump,
            } as any);

            await handleGetRuntimeError({
                dump_id: 'test_dump_id',
                content: 'formatted',
            });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('/formatted'),
                'GET',
                30000,
                undefined,
                { Accept: 'text/plain' }
            );
        });

        test('should retrieve summary dump', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockSummaryDump,
            } as any);

            const result = (await handleGetRuntimeError({
                dump_id: 'test_dump_id',
                content: 'summary',
            })) as any;

            expect(result.isError).toBeFalsy();
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('/summary'),
                'GET',
                30000,
                undefined,
                { Accept: 'text/html' }
            );
            expect(result.content[0].text).toContain('Mode: summary');
        });

        test('should retrieve metadata dump', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockMetadataDump,
            } as any);

            const result = (await handleGetRuntimeError({
                dump_id: 'test_dump_id',
                content: 'metadata',
            })) as any;

            expect(result.isError).toBeFalsy();
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.not.stringContaining('/formatted'),
                'GET',
                30000,
                undefined,
                { Accept: 'application/vnd.sap.adt.runtime.dump.v1+xml' }
            );
            expect(result.content[0].text).toContain('Mode: metadata');
        });
    });

    describe('URL Encoding', () => {
        test('should use dump ID as-is (already URL-encoded)', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockFormattedDump,
            } as any);

            const encodedDumpId = '20260318104520ldai4er1_ER1_00%20%20%20%20TESTUSER%20%20%20715';
            await handleGetRuntimeError({ dump_id: encodedDumpId });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining(encodedDumpId),
                'GET',
                30000,
                undefined,
                expect.any(Object)
            );
        });

        test('should not double-encode dump ID', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockFormattedDump,
            } as any);

            await handleGetRuntimeError({ dump_id: 'test%20id' });

            const callUrl = mockMakeAdtRequest.mock.calls[0][0];
            expect(callUrl).toContain('test%20id');
            expect(callUrl).not.toContain('test%2520id'); // Should not double-encode
        });
    });

    describe('Error Handling', () => {
        test('should handle dump not found (404)', async () => {
            mockMakeAdtRequest.mockRejectedValue(
                new Error('HTTP 404: No short dumps match the selection criteria')
            );

            const result = (await handleGetRuntimeError({ dump_id: 'invalid_id' })) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('404');
        });

        test('should handle empty response data', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: null,
            } as any);

            const result = (await handleGetRuntimeError({ dump_id: 'test_id' })) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Empty response');
        });

        test('should handle HTTP errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('HTTP 500: Internal Server Error'));

            const result = (await handleGetRuntimeError({ dump_id: 'test_id' })) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('500');
        });

        test('should handle network errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('ECONNREFUSED'));

            const result = (await handleGetRuntimeError({ dump_id: 'test_id' })) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('Output Formatting', () => {
        test('should include dump ID in output header', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockFormattedDump,
            } as any);

            const dumpId = '20260318104520test_dump';
            const result = (await handleGetRuntimeError({ dump_id: dumpId })) as any;

            expect(result.content[0].text).toContain(`Runtime Error Dump: ${dumpId}`);
        });

        test('should include content mode in output', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockFormattedDump,
            } as any);

            const result = (await handleGetRuntimeError({
                dump_id: 'test_id',
                content: 'formatted',
            })) as any;

            expect(result.content[0].text).toContain('Mode: formatted');
        });

        test('should preserve dump content formatting', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockFormattedDump,
            } as any);

            const result = (await handleGetRuntimeError({ dump_id: 'test_id' })) as any;

            expect(result.content[0].text).toContain('What happened?');
            expect(result.content[0].text).toContain('Error analysis');
            expect(result.content[0].text).toContain('Source Code Extract');
        });
    });

    describe('Integration with ListRuntimeErrors', () => {
        test('should work with dump IDs from ListRuntimeErrors', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockFormattedDump,
            } as any);

            // Simulating a dump ID as returned by ListRuntimeErrors
            const dumpId = '20260318104520ldai4er1_ER1_00%20%20%20%20%20TESTUSER%20%20715';
            const result = (await handleGetRuntimeError({ dump_id: dumpId })) as any;

            expect(result.isError).toBeFalsy();
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining(dumpId),
                'GET',
                30000,
                undefined,
                expect.any(Object)
            );
        });
    });
});
