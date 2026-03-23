/**
 * Unit Tests for handleListRuntimeErrors
 *
 * Tests the ListRuntimeErrors tool handler which retrieves recent ABAP runtime
 * errors (ST22 dumps) from the SAP system.
 */

import { handleListRuntimeErrors } from '../../../../src/handlers/handleListRuntimeErrors';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
    ...jest.requireActual('../../../../src/lib/utils'),
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn(),
}));

describe('handleListRuntimeErrors', () => {
    let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
    let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

    const mockAtomFeedXml = `<?xml version="1.0" encoding="utf-8"?>
<atom:feed xmlns:atom="http://www.w3.org/2005/Atom">
  <atom:author><atom:name>SAP AG</atom:name></atom:author>
  <atom:title>ABAP Short Dump Analysis</atom:title>
  <atom:updated>2026-03-18T09:40:05Z</atom:updated>
  <atom:entry xml:lang="EN">
    <atom:author FullName="Test User">
      <atom:name>TESTUSER</atom:name>
    </atom:author>
    <atom:category term="SYNTAX_ERROR" label="ABAP runtime error"/>
    <atom:category term="CL_TEST_CLASS" label="Terminated ABAP program"/>
    <atom:id>/sap/bc/adt/runtime/dumps/test_dump_id</atom:id>
    <atom:link href="adt://ER1/sap/bc/adt/runtime/dump/20260318103914test_dump_id" rel="self" type="text/plain"/>
    <atom:published>2026-03-18T09:39:14Z</atom:published>
    <atom:title>Syntax error in program</atom:title>
  </atom:entry>
  <atom:entry xml:lang="EN">
    <atom:author FullName="Another User">
      <atom:name>ANOTHERUSER</atom:name>
    </atom:author>
    <atom:category term="GETWA_NOT_ASSIGNED" label="ABAP runtime error"/>
    <atom:category term="CL_ANOTHER_CLASS" label="Terminated ABAP program"/>
    <atom:id>/sap/bc/adt/runtime/dumps/another_dump_id</atom:id>
    <atom:link href="adt://ER1/sap/bc/adt/runtime/dump/20260318103815another_dump_id" rel="self" type="text/plain"/>
    <atom:published>2026-03-18T09:38:15Z</atom:published>
    <atom:title>Field symbol not assigned</atom:title>
  </atom:entry>
</atom:feed>`;

    const mockEmptyAtomFeedXml = `<?xml version="1.0" encoding="utf-8"?>
<atom:feed xmlns:atom="http://www.w3.org/2005/Atom">
  <atom:author><atom:name>SAP AG</atom:name></atom:author>
  <atom:title>ABAP Short Dump Analysis</atom:title>
  <atom:updated>2026-03-18T09:40:05Z</atom:updated>
</atom:feed>`;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
        mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
        mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
    });

    describe('Basic Functionality', () => {
        test('should retrieve runtime errors successfully', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockAtomFeedXml,
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('Runtime Error Dumps (2 entries)');
            expect(result.content[0].text).toContain('TESTUSER');
            expect(result.content[0].text).toContain('SYNTAX_ERROR');
            expect(result.content[0].text).toContain('CL_TEST_CLASS');
        });

        test('should handle empty dump list', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockEmptyAtomFeedXml,
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('No runtime errors found');
        });
    });

    describe('Filter Parameters', () => {
        test('should filter by user', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockAtomFeedXml,
            } as any);

            await handleListRuntimeErrors({ user: 'testuser' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('$query=and( equals( user, TESTUSER ) )'),
                'GET',
                30000,
                undefined,
                { Accept: 'application/atom+xml;type=feed' }
            );
        });

        test('should filter by date range', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockEmptyAtomFeedXml,
            } as any);

            await handleListRuntimeErrors({
                from: '2026-03-18T00:00:00',
                to: '2026-03-18T23:59:59',
            });

            const callUrl = mockMakeAdtRequest.mock.calls[0][0];
            expect(callUrl).toContain('from=20260318000000');
            expect(callUrl).toContain('to=20260318235959');
        });

        test('should limit max results', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockEmptyAtomFeedXml,
            } as any);

            await handleListRuntimeErrors({ max_results: 10 });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('$top=10'),
                'GET',
                30000,
                undefined,
                { Accept: 'application/atom+xml;type=feed' }
            );
        });

        test('should cap max results at 100', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockEmptyAtomFeedXml,
            } as any);

            await handleListRuntimeErrors({ max_results: 500 });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('$top=100'),
                'GET',
                30000,
                undefined,
                { Accept: 'application/atom+xml;type=feed' }
            );
        });
    });

    describe('XML Parsing', () => {
        test('should extract dump IDs correctly', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockAtomFeedXml,
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.content[0].text).toContain('20260318103914test_dump_id');
            expect(result.content[0].text).toContain('20260318103815another_dump_id');
        });

        test('should extract timestamps correctly', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockAtomFeedXml,
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.content[0].text).toContain('2026-03-18T09:39:14Z');
            expect(result.content[0].text).toContain('2026-03-18T09:38:15Z');
        });

        test('should handle malformed XML gracefully', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: '<invalid-xml>',
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toMatch(/Error:|Unclosed root tag/i);
        });

        test('should provide helpful error for invalid feed structure', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: '<?xml version="1.0"?><root><element>test</element></root>',
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Invalid Atom feed format');
            expect(result.content[0].text).toContain('Root element keys');
        });
    });

    describe('Namespace Handling', () => {
        test('should handle atom: namespace prefix', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockAtomFeedXml,
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('TESTUSER');
        });

        test('should handle feed without namespace', async () => {
            const noNamespaceXml = mockAtomFeedXml.replace(/atom:/g, '');
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: noNamespaceXml,
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('TESTUSER');
        });
    });

    describe('Error Handling', () => {
        test('should handle HTTP errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('HTTP 500: Internal Server Error'));

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('500');
        });

        test('should handle empty response data', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: null,
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Empty response');
        });

        test('should handle network errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('ECONNREFUSED'));

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('Output Formatting', () => {
        test('should format table header correctly', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockAtomFeedXml,
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.content[0].text).toContain('Error Type');
            expect(result.content[0].text).toContain('Program');
            expect(result.content[0].text).toContain('User');
        });

        test('should include usage instructions', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockAtomFeedXml,
            } as any);

            const result = (await handleListRuntimeErrors({})) as any;

            expect(result.content[0].text).toContain('Dump IDs');
            expect(result.content[0].text).toContain('GetRuntimeError');
        });
    });
});
