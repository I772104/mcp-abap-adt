import { handleExportCDSViewToFile } from '../../../../src/handlers/handleExportCDSViewToFile';
import { makeAdtRequest, getBaseUrl } from '../../../../src/lib/utils';
import * as fileUtils from '../../../../src/lib/fileUtils';

// Mock dependencies
jest.mock('../../../../src/lib/utils', () => ({
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn(),
    return_error: jest.fn((error) => ({
        isError: true,
        content: [{ type: 'text', text: error.message || String(error) }],
    })),
    McpError: class McpError extends Error {
        constructor(public code: number, message: string) {
            super(message);
            this.name = 'McpError';
        }
    },
    ErrorCode: {
        InvalidParams: -32602,
        InternalError: -32603,
    },
}));

jest.mock('../../../../src/lib/fileUtils', () => {
    const actual = jest.requireActual('../../../../src/lib/fileUtils');
    return {
        ...actual,
        writeObjectSourceFile: jest.fn(),
    };
});

describe('handleExportCDSViewToFile', () => {
    const mockMakeAdtRequest = makeAdtRequest as jest.MockedFunction<typeof makeAdtRequest>;
    const mockGetBaseUrl = getBaseUrl as jest.MockedFunction<typeof getBaseUrl>;
    const mockWriteObjectSourceFile = fileUtils.writeObjectSourceFile as jest.MockedFunction<
        typeof fileUtils.writeObjectSourceFile
    >;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetBaseUrl.mockResolvedValue('https://sap.example.com:443');
    });

    describe('Parameter Validation', () => {
        it('should return error when view_name is missing', async () => {
            const result = await handleExportCDSViewToFile({} as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('CDS view name is required');
        });

        it('should return error when view_name is null', async () => {
            const result = await handleExportCDSViewToFile({ view_name: null } as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('CDS view name is required');
        });

        it('should return error when view_name is empty string', async () => {
            const result = await handleExportCDSViewToFile({ view_name: '' });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('CDS view name is required');
        });
    });

    describe('Successful CDS View Export', () => {
        const mockCDSSource = `@AbapCatalog.sqlViewName: 'IMATERIAL'
@EndUserText.label: 'Material Master'
define view entity I_Material
  as select from mara
{
  key matnr as Material,
      mtart as MaterialType,
      meins as BaseUnit
}`;

        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: mockCDSSource,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/ZI_Material.ddls.asddls',
                metadata: {
                    path: '/project/tmp/ZI_Material.ddls.asddls',
                    fileName: 'ZI_Material.ddls.asddls',
                    size: 250,
                    lines: 8,
                    modified: '2026-03-11T15:00:00.000Z',
                },
            });
        });

        it('should export CDS view with I_ prefix', async () => {
            const result = await handleExportCDSViewToFile({ view_name: 'I_Material' });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('CDS View exported successfully');
            expect(result.content[0].text).toContain('Original View: I_Material');
            expect(result.content[0].text).toContain('Exported View: ZI_MATERIAL');
        });

        it('should call ADT API with correct endpoint', async () => {
            await handleExportCDSViewToFile({ view_name: 'I_Material' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://sap.example.com:443/sap/bc/adt/ddic/ddl/sources/I_Material/source/main',
                'GET',
                30000
            );
        });

        it('should write file with correct DDLS extension', async () => {
            await handleExportCDSViewToFile({ view_name: 'I_Material' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith(
                'ZI_MATERIAL',
                'DDLS',
                expect.stringContaining('define view entity ZI_MATERIAL')
            );
        });

        it('should convert view name in source code', async () => {
            await handleExportCDSViewToFile({ view_name: 'I_Material' });

            const writtenSource = mockWriteObjectSourceFile.mock.calls[0][2];
            expect(writtenSource).toContain('define view entity ZI_MATERIAL');
            expect(writtenSource).not.toContain('define view entity I_Material');
        });

        it('should convert SQL view name in annotation', async () => {
            await handleExportCDSViewToFile({ view_name: 'I_Material' });

            const writtenSource = mockWriteObjectSourceFile.mock.calls[0][2];
            expect(writtenSource).toContain("@AbapCatalog.sqlViewName: 'ZIMATERIAL'");
            expect(writtenSource).not.toContain("'IMATERIAL'");
        });

        it('should include SQL view conversion in response', async () => {
            const result = await handleExportCDSViewToFile({ view_name: 'I_Material' });

            expect(result.content[0].text).toContain('SQL View: IMATERIAL → ZIMATERIAL');
        });

        it('should include file metadata in response', async () => {
            const result = await handleExportCDSViewToFile({ view_name: 'I_Material' });

            const response = result.content[0].text;
            expect(response).toContain('File: ZI_Material.ddls.asddls');
            expect(response).toContain('Size: 250 bytes');
            expect(response).toContain('Lines: 8');
        });
    });

    describe('CDS View Name Conversions', () => {
        beforeEach(() => {
            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.ddls.asddls',
                metadata: {
                    path: '/project/tmp/test.ddls.asddls',
                    fileName: 'test.ddls.asddls',
                    size: 100,
                    lines: 5,
                    modified: '2026-03-11T15:00:00.000Z',
                },
            });
        });

        it('should convert C_ prefix (Consumption view)', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'define view entity C_SalesOrder',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleExportCDSViewToFile({ view_name: 'C_SalesOrder' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith(
                'ZC_SALESORDER',
                'DDLS',
                expect.stringContaining('ZC_SALESORDER')
            );
        });

        it('should convert A_ prefix (API view)', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'define view entity A_Product',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleExportCDSViewToFile({ view_name: 'A_Product' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith(
                'ZA_PRODUCT',
                'DDLS',
                expect.any(String)
            );
        });

        it('should preserve TP suffix', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'define view entity I_SalesOrderTP',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleExportCDSViewToFile({ view_name: 'I_SalesOrderTP' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith(
                'ZI_SALESORDERTP',
                'DDLS',
                expect.any(String)
            );
        });

        it('should not convert already Z-prefixed view', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'define view entity ZI_CustomView',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            const result = await handleExportCDSViewToFile({ view_name: 'ZI_CustomView' });

            expect(result.content[0].text).not.toContain('Name Conversions:');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith(
                'ZI_CUSTOMVIEW',
                'DDLS',
                expect.any(String)
            );
        });
    });

    describe('CDS View Without SQL View Name', () => {
        it('should handle CDS view without @AbapCatalog.sqlViewName annotation', async () => {
            const sourceWithoutSQL = `@EndUserText.label: 'Material'
define view entity I_Material
  as select from mara
{
  key matnr as Material
}`;

            mockMakeAdtRequest.mockResolvedValue({
                data: sourceWithoutSQL,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/ZI_Material.ddls.asddls',
                metadata: {
                    path: '/project/tmp/ZI_Material.ddls.asddls',
                    fileName: 'ZI_Material.ddls.asddls',
                    size: 100,
                    lines: 5,
                    modified: '2026-03-11T15:00:00.000Z',
                },
            });

            const result = await handleExportCDSViewToFile({ view_name: 'I_Material' });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).not.toContain('SQL View:');
        });
    });

    describe('Long Name Truncation', () => {
        it('should warn about truncated CDS view name', async () => {
            const longName = 'I_VeryLongMaterialMasterDataViewWithDetailedInformation';

            mockMakeAdtRequest.mockResolvedValue({
                data: `define view entity ${longName}`,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.ddls.asddls',
                metadata: {
                    path: '/project/tmp/test.ddls.asddls',
                    fileName: 'test.ddls.asddls',
                    size: 100,
                    lines: 5,
                    modified: '2026-03-11T15:00:00.000Z',
                },
            });

            const result = await handleExportCDSViewToFile({ view_name: longName });

            expect(result.content[0].text).toContain('View name truncated to 30 characters');
        });

        it('should warn about truncated SQL view name', async () => {
            const sourceWithLongSQL = `@AbapCatalog.sqlViewName: 'IVERYLONGSQLVIEWNAME'
define view entity I_Test`;

            mockMakeAdtRequest.mockResolvedValue({
                data: sourceWithLongSQL,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.ddls.asddls',
                metadata: {
                    path: '/project/tmp/test.ddls.asddls',
                    fileName: 'test.ddls.asddls',
                    size: 100,
                    lines: 5,
                    modified: '2026-03-11T15:00:00.000Z',
                },
            });

            const result = await handleExportCDSViewToFile({ view_name: 'I_Test' });

            expect(result.content[0].text).toContain('SQL view name truncated to 16 characters');
        });
    });

    describe('Error Handling', () => {
        it('should handle ADT API errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('Connection failed'));

            const result = await handleExportCDSViewToFile({ view_name: 'I_Material' });

            expect(result.isError).toBe(true);
        });

        it('should handle file write errors', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'define view entity I_Material',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockImplementation(() => {
                throw new Error('Disk full');
            });

            const result = await handleExportCDSViewToFile({ view_name: 'I_Material' });

            expect(result.isError).toBe(true);
        });
    });
});
