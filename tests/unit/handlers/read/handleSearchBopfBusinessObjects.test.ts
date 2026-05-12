import { handleSearchBopfBusinessObjects } from '../../../../src/handlers/handleSearchBopfBusinessObjects';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
    ...jest.requireActual('../../../../src/lib/utils'),
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn(),
}));

const mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
const mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;

function makeTableXml(columns: Record<string, string[]>): string {
    const colNames = Object.keys(columns);
    const colXml = colNames
        .map((name) => {
            const values = columns[name];
            const dataXml = values.map((v) => `<dataPreview:data>${v}</dataPreview:data>`).join('');
            return (
                `<dataPreview:columns>` +
                `<dataPreview:metadata dataPreview:name="${name}"/>` +
                `<dataPreview:dataSet>${dataXml}</dataPreview:dataSet>` +
                `</dataPreview:columns>`
            );
        })
        .join('');
    return `<?xml version="1.0"?><dataPreview:tableData xmlns:dataPreview="http://www.sap.com/adt/dataPreview">${colXml}</dataPreview:tableData>`;
}

// Empty response: no columns → runSql returns []
const EMPTY_XML = makeTableXml({});

const TADIR_XML = makeTableXml({
    OBJ_NAME: ['/IAM/ACTIVITY', '/IAM/ISSUE'],
    DEVCLASS: ['/IAM/ACTIVITY', '/IAM/ISSUE'],
});

const BO_XML = makeTableXml({
    BO_NAME: ['/IAM/ACTIVITY', '/IAM/ISSUE'],
    OBJCAT: ['0', '0'],
    BO_GENERATED: ['', ''],
});

const TDEVC_XML = makeTableXml({
    DEVCLASS: ['/IAM/ACTIVITY', '/IAM/ISSUE'],
});

beforeEach(() => {
    jest.clearAllMocks();
    mockGetBaseUrl.mockResolvedValue('https://mock-sap.example.com:443');
});

describe('handleSearchBopfBusinessObjects', () => {
    describe('parameter validation', () => {
        test('rejects missing query', async () => {
            const result = (await handleSearchBopfBusinessObjects({} as any)) as any;
            expect(result.isError).toBe(true);
        });

        test('rejects empty query string', async () => {
            const result = (await handleSearchBopfBusinessObjects({ query: '' } as any)) as any;
            expect(result.isError).toBe(true);
        });
    });

    describe('basic search without filters', () => {
        beforeEach(() => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: TADIR_XML } as any)
                .mockResolvedValueOnce({ status: 200, data: BO_XML } as any);
        });

        test('returns results with name, objcat, objectCategory, generated, package', async () => {
            const result = (await handleSearchBopfBusinessObjects({ query: '/IAM/*' })) as any;
            expect(result.isError).toBeFalsy();
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.total).toBe(2);
            expect(parsed.results[0]).toMatchObject({
                name: '/IAM/ACTIVITY',
                objcat: '0',
                objectCategory: 'Business Process Object',
                generated: false,
                package: '/IAM/ACTIVITY',
            });
        });

        test('results are sorted by name', async () => {
            const result = (await handleSearchBopfBusinessObjects({ query: '/IAM/*' })) as any;
            const parsed = JSON.parse(result.content[0].text);
            const names = parsed.results.map((r: any) => r.name);
            expect(names).toEqual([...names].sort());
        });

        test('output includes query field', async () => {
            const result = (await handleSearchBopfBusinessObjects({ query: '/IAM/*' })) as any;
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.query).toBe('/IAM/*');
        });

        test('output does not include objcat_filter or package_filter when not provided', async () => {
            const result = (await handleSearchBopfBusinessObjects({ query: '/IAM/*' })) as any;
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed).not.toHaveProperty('objcat_filter');
            expect(parsed).not.toHaveProperty('package_filter');
        });

        test('sends two requests: TADIR then /BOBF/OBM_BO', async () => {
            await handleSearchBopfBusinessObjects({ query: '/IAM/*' });
            expect(mockMakeAdtRequest).toHaveBeenCalledTimes(2);
            const [url1] = mockMakeAdtRequest.mock.calls[0];
            const [url2] = mockMakeAdtRequest.mock.calls[1];
            expect(url1).toContain('ddicEntityName=TADIR');
            expect(url2).toContain('ddicEntityName=%2FBOBF%2FOBM_BO');
        });

        test('TADIR SQL contains OBJ_NAME LIKE pattern for /IAM/* query', async () => {
            await handleSearchBopfBusinessObjects({ query: '/IAM/*' });
            const body = mockMakeAdtRequest.mock.calls[0][3] as string;
            // /IAM/* has %, so no wrapping: /IAM/% (uppercased, * replaced by %)
            expect(body).toContain("OBJ_NAME LIKE '/IAM/%'");
        });

        test('/BOBF/OBM_BO SQL contains IN clause with BO names', async () => {
            await handleSearchBopfBusinessObjects({ query: '/IAM/*' });
            const body = mockMakeAdtRequest.mock.calls[1][3] as string;
            expect(body).toContain('BO_NAME IN (');
            expect(body).toContain("'/IAM/ACTIVITY'");
        });
    });

    describe('objcat filter', () => {
        beforeEach(() => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: TADIR_XML } as any)
                .mockResolvedValueOnce({ status: 200, data: BO_XML } as any);
        });

        test('includes objcat_filter in output', async () => {
            const result = (await handleSearchBopfBusinessObjects({ query: '/IAM/*', objcat: '0' })) as any;
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.objcat_filter).toBe('0');
        });

        test('adds OBJCAT condition to /BOBF/OBM_BO SQL', async () => {
            await handleSearchBopfBusinessObjects({ query: '/IAM/*', objcat: '0' });
            const body = mockMakeAdtRequest.mock.calls[1][3] as string;
            expect(body).toContain("OBJCAT = '0'");
        });
    });

    describe('package filter', () => {
        beforeEach(() => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: TDEVC_XML } as any)
                .mockResolvedValueOnce({ status: 200, data: TADIR_XML } as any)
                .mockResolvedValueOnce({ status: 200, data: BO_XML } as any);
        });

        test('sends three requests: TDEVC, TADIR, /BOBF/OBM_BO', async () => {
            await handleSearchBopfBusinessObjects({ query: '/IAM/*', package: '/IAM/*' });
            expect(mockMakeAdtRequest).toHaveBeenCalledTimes(3);
            const urls = mockMakeAdtRequest.mock.calls.map(([url]) => url as string);
            expect(urls[0]).toContain('ddicEntityName=TDEVC');
            expect(urls[1]).toContain('ddicEntityName=TADIR');
            expect(urls[2]).toContain('ddicEntityName=%2FBOBF%2FOBM_BO');
        });

        test('includes package_filter in output', async () => {
            const result = (await handleSearchBopfBusinessObjects({
                query: '/IAM/*',
                package: '/IAM/*',
            })) as any;
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.package_filter).toBe('/IAM/*');
        });

        test('TDEVC SQL uses DEVCLASS LIKE pattern', async () => {
            await handleSearchBopfBusinessObjects({ query: '/IAM/*', package: '/IAM/*' });
            const body = mockMakeAdtRequest.mock.calls[0][3] as string;
            expect(body).toContain('FROM TDEVC');
            expect(body).toContain("DEVCLASS LIKE '/IAM/%'");
        });

        test('filters TADIR results client-side by matching packages', async () => {
            // TDEVC returns only /IAM/ACTIVITY; TADIR returns both → only /IAM/ACTIVITY survives
            mockMakeAdtRequest.mockReset();
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: makeTableXml({ DEVCLASS: ['/IAM/ACTIVITY'] }) } as any)
                .mockResolvedValueOnce({ status: 200, data: TADIR_XML } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    data: makeTableXml({ BO_NAME: ['/IAM/ACTIVITY'], OBJCAT: ['0'], BO_GENERATED: [''] }),
                } as any);

            const result = (await handleSearchBopfBusinessObjects({
                query: '/IAM/*',
                package: '/IAM/ACTIVITY',
            })) as any;
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.total).toBe(1);
            expect(parsed.results[0].name).toBe('/IAM/ACTIVITY');
        });

        test('returns empty result and skips TADIR+BO query when no packages match', async () => {
            mockMakeAdtRequest.mockReset();
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);

            const result = (await handleSearchBopfBusinessObjects({
                query: '/IAM/*',
                package: 'NONEXISTENT*',
            })) as any;
            expect(result.isError).toBeFalsy();
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.total).toBe(0);
            expect(parsed.package_filter).toBe('NONEXISTENT*');
            expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1); // only TDEVC
        });
    });

    describe('empty results', () => {
        test('returns empty result and skips BO query when TADIR finds nothing', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);
            const result = (await handleSearchBopfBusinessObjects({ query: 'NONEXISTENT*' })) as any;
            expect(result.isError).toBeFalsy();
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.total).toBe(0);
            expect(parsed.results).toEqual([]);
            expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1); // no /BOBF/OBM_BO query
        });

        test('returns empty result when /BOBF/OBM_BO finds nothing (e.g. all filtered by objcat)', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: TADIR_XML } as any)
                .mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);
            const result = (await handleSearchBopfBusinessObjects({ query: '/IAM/*', objcat: '9' })) as any;
            expect(result.isError).toBeFalsy();
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.total).toBe(0);
        });
    });

    describe('generated flag', () => {
        test('maps BO_GENERATED X to true', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({
                    status: 200,
                    data: makeTableXml({ OBJ_NAME: ['MY_BO'], DEVCLASS: ['PKG'] }),
                } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    data: makeTableXml({ BO_NAME: ['MY_BO'], OBJCAT: ['3'], BO_GENERATED: ['X'] }),
                } as any);
            const result = (await handleSearchBopfBusinessObjects({ query: 'MY_BO' })) as any;
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.results[0].generated).toBe(true);
        });

        test('maps empty BO_GENERATED to false', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({
                    status: 200,
                    data: makeTableXml({ OBJ_NAME: ['MY_BO'], DEVCLASS: ['PKG'] }),
                } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    data: makeTableXml({ BO_NAME: ['MY_BO'], OBJCAT: ['0'], BO_GENERATED: [''] }),
                } as any);
            const result = (await handleSearchBopfBusinessObjects({ query: 'MY_BO' })) as any;
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.results[0].generated).toBe(false);
        });
    });

    describe('objcat label mapping', () => {
        test.each([
            ['0', 'Business Process Object'],
            ['1', 'Dependent Object'],
            ['3', 'Master Data Object'],
            ['D', 'Draft Object'],
            ['', 'not classified'],
        ])('maps objcat "%s" to "%s"', async (objcat, label) => {
            mockMakeAdtRequest.mockReset();
            mockMakeAdtRequest
                .mockResolvedValueOnce({
                    status: 200,
                    data: makeTableXml({ OBJ_NAME: ['X'], DEVCLASS: ['P'] }),
                } as any)
                .mockResolvedValueOnce({
                    status: 200,
                    data: makeTableXml({ BO_NAME: ['X'], OBJCAT: [objcat], BO_GENERATED: [''] }),
                } as any);
            const result = (await handleSearchBopfBusinessObjects({ query: 'X' })) as any;
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.results[0].objectCategory).toBe(label);
        });
    });

    describe('query pattern conversion', () => {
        test('wildcard * is converted to SQL %', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);
            await handleSearchBopfBusinessObjects({ query: 'FOO*BAR' });
            const body = mockMakeAdtRequest.mock.calls[0][3] as string;
            // FOO*BAR → FOO%BAR, already has %, so no wrapping
            expect(body).toContain("LIKE 'FOO%BAR'");
        });

        test('query without wildcard is wrapped with %', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);
            await handleSearchBopfBusinessObjects({ query: 'SALES' });
            const body = mockMakeAdtRequest.mock.calls[0][3] as string;
            expect(body).toContain("LIKE '%SALES%'");
        });

        test('query is uppercased', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);
            await handleSearchBopfBusinessObjects({ query: 'sales_order' });
            const body = mockMakeAdtRequest.mock.calls[0][3] as string;
            expect(body).toContain('SALES_ORDER');
            expect(body).not.toContain('sales_order');
        });
    });

    describe('max_results', () => {
        test('defaults to 50 rows', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);
            await handleSearchBopfBusinessObjects({ query: '*' });
            const [url] = mockMakeAdtRequest.mock.calls[0];
            expect(url).toContain('rowNumber=50');
        });

        test('respects max_results parameter', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);
            await handleSearchBopfBusinessObjects({ query: '*', max_results: 10 });
            const [url] = mockMakeAdtRequest.mock.calls[0];
            expect(url).toContain('rowNumber=10');
        });

        test('caps max_results at 500', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);
            await handleSearchBopfBusinessObjects({ query: '*', max_results: 9999 });
            const [url] = mockMakeAdtRequest.mock.calls[0];
            expect(url).toContain('rowNumber=500');
        });
    });

    describe('SQL injection prevention', () => {
        test('escapes single quotes in query', async () => {
            mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: EMPTY_XML } as any);
            await handleSearchBopfBusinessObjects({ query: "O'REILLY" });
            const body = mockMakeAdtRequest.mock.calls[0][3] as string;
            expect(body).toContain("O''REILLY");
        });
    });

    describe('error handling', () => {
        test('returns error on network failure', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
            const result = (await handleSearchBopfBusinessObjects({ query: '*' })) as any;
            expect(result.isError).toBe(true);
        });

        test('returns error when getBaseUrl fails', async () => {
            mockGetBaseUrl.mockRejectedValue(new Error('No system configured'));
            const result = (await handleSearchBopfBusinessObjects({ query: '*' })) as any;
            expect(result.isError).toBe(true);
        });
    });
});
