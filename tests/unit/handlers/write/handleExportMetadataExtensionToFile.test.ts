import { handleExportMetadataExtensionToFile } from '../../../../src/handlers/handleExportMetadataExtensionToFile';
import { makeAdtRequest, getBaseUrl } from '../../../../src/lib/utils';
import * as fileUtils from '../../../../src/lib/fileUtils';

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

describe('handleExportMetadataExtensionToFile', () => {
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
        it('should return error when extension_name is missing', async () => {
            const result = await handleExportMetadataExtensionToFile({} as any);
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Metadata extension name is required');
        });

        it('should return error when extension_name is null', async () => {
            const result = await handleExportMetadataExtensionToFile({ extension_name: null } as any);
            expect(result.isError).toBe(true);
        });

        it('should return error when extension_name is empty', async () => {
            const result = await handleExportMetadataExtensionToFile({ extension_name: '' });
            expect(result.isError).toBe(true);
        });
    });

    describe('Successful Export', () => {
        const mockMetadataExtSource = `@Metadata.layer: #CORE
@UI: {
  headerInfo: {
    typeName: 'Sales Order',
    typeNamePlural: 'Sales Orders'
  }
}
annotate view C_SalesOrder with
{
  @UI.facet: [ {
    id: 'GeneralInfo',
    type: #IDENTIFICATION_REFERENCE
  } ]
  SalesOrder;
}`;

        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: mockMetadataExtSource,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/ZC_SALESORDER.ddlx.asddlxs',
                metadata: {
                    path: '/project/tmp/ZC_SALESORDER.ddlx.asddlxs',
                    fileName: 'ZC_SALESORDER.ddlx.asddlxs',
                    size: 300,
                    lines: 12,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should export metadata extension with C_ prefix', async () => {
            const result = await handleExportMetadataExtensionToFile({ extension_name: 'C_SalesOrder' });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('Metadata Extension exported successfully');
            expect(result.content[0].text).toContain('Original Extension: C_SalesOrder');
            expect(result.content[0].text).toContain('Exported Extension: ZC_SALESORDER');
        });

        it('should call ADT API with correct endpoint', async () => {
            await handleExportMetadataExtensionToFile({ extension_name: 'C_SalesOrder' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://sap.example.com:443/sap/bc/adt/ddic/ddlx/sources/C_SalesOrder/source/main',
                'GET',
                30000
            );
        });

        it('should write file with correct DDLX extension', async () => {
            await handleExportMetadataExtensionToFile({ extension_name: 'C_SalesOrder' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZC_SALESORDER', 'DDLX', expect.any(String));
        });

        it('should include warning about annotate view statements', async () => {
            const result = await handleExportMetadataExtensionToFile({ extension_name: 'C_SalesOrder' });

            expect(result.content[0].text).toContain('annotated CDS view reference may need manual updating');
            expect(result.content[0].text).toContain('annotate view');
            expect(result.content[0].text).toContain('Z-views');
        });

        it('should handle already Z-prefixed extension', async () => {
            const result = await handleExportMetadataExtensionToFile({ extension_name: 'ZC_Custom' });

            expect(result.content[0].text).not.toContain('Auto-converted');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZC_CUSTOM', 'DDLX', expect.any(String));
        });

        it('should convert extension name in source code', async () => {
            await handleExportMetadataExtensionToFile({ extension_name: 'C_SalesOrder' });

            const writtenSource = mockWriteObjectSourceFile.mock.calls[0][2];
            expect(writtenSource).toContain('ZC_SALESORDER');
            expect(writtenSource).not.toContain('C_SalesOrder');
        });
    });

    describe('Name Conversions', () => {
        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: '@Metadata.layer: #CORE\nannotate view Test with { }',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.ddlx.asddlxs',
                metadata: {
                    path: '/project/tmp/test.ddlx.asddlxs',
                    fileName: 'test.ddlx.asddlxs',
                    size: 100,
                    lines: 2,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should convert C_ prefix (consumption view)', async () => {
            const result = await handleExportMetadataExtensionToFile({ extension_name: 'C_Product' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZC_PRODUCT', 'DDLX', expect.any(String));
        });

        it('should convert I_ prefix (interface view)', async () => {
            const result = await handleExportMetadataExtensionToFile({ extension_name: 'I_Material' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZI_MATERIAL', 'DDLX', expect.any(String));
        });

        it('should convert R_ prefix (RAP root view)', async () => {
            const result = await handleExportMetadataExtensionToFile({ extension_name: 'R_Customer' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZR_CUSTOMER', 'DDLX', expect.any(String));
        });

        it('should handle Y-prefixed extension (no conversion)', async () => {
            const result = await handleExportMetadataExtensionToFile({ extension_name: 'YC_Custom' });

            expect(result.content[0].text).not.toContain('Auto-converted');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('YC_CUSTOM', 'DDLX', expect.any(String));
        });

        it('should handle case-insensitive replacement', async () => {
            const extensionSource = '@Metadata.layer: #CORE\nannotate view C_Product with { }\n-- C_Product reference';

            mockMakeAdtRequest.mockResolvedValue({
                data: extensionSource,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            await handleExportMetadataExtensionToFile({ extension_name: 'C_Product' });

            const writtenSource = mockWriteObjectSourceFile.mock.calls[0][2];
            expect(writtenSource).not.toContain('C_Product');
            expect(writtenSource).toContain('ZC_PRODUCT');
        });
    });

    describe('Long Name Truncation', () => {
        it('should warn about truncated name', async () => {
            const longName = 'C_VeryLongMetadataExtensionNameThatExceedsLimit';

            mockMakeAdtRequest.mockResolvedValue({
                data: '@Metadata.layer: #CORE',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.ddlx.asddlxs',
                metadata: {
                    path: '/project/tmp/test.ddlx.asddlxs',
                    fileName: 'test.ddlx.asddlxs',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            const result = await handleExportMetadataExtensionToFile({ extension_name: longName });
            expect(result.content[0].text).toContain('Name truncated to 30 characters');
        });
    });

    describe('Error Handling', () => {
        it('should handle ADT API errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('Connection failed'));
            const result = await handleExportMetadataExtensionToFile({ extension_name: 'C_Test' });
            expect(result.isError).toBe(true);
        });

        it('should handle file write errors', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: '@Metadata.layer: #CORE',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockImplementation(() => {
                throw new Error('Disk full');
            });

            const result = await handleExportMetadataExtensionToFile({ extension_name: 'C_Test' });
            expect(result.isError).toBe(true);
        });

        it('should handle URL encoding for special characters', async () => {
            await handleExportMetadataExtensionToFile({ extension_name: 'C_Test/Special' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('C_Test%2FSpecial'),
                'GET',
                30000
            );
        });
    });
});
