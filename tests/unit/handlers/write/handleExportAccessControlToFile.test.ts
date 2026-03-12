import { handleExportAccessControlToFile } from '../../../../src/handlers/handleExportAccessControlToFile';
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

describe('handleExportAccessControlToFile', () => {
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
        it('should return error when dcl_name is missing', async () => {
            const result = await handleExportAccessControlToFile({} as any);
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Access control (DCL) name is required');
        });

        it('should return error when dcl_name is null', async () => {
            const result = await handleExportAccessControlToFile({ dcl_name: null } as any);
            expect(result.isError).toBe(true);
        });

        it('should return error when dcl_name is empty', async () => {
            const result = await handleExportAccessControlToFile({ dcl_name: '' });
            expect(result.isError).toBe(true);
        });
    });

    describe('Successful Export', () => {
        const mockDclSource = `@EndUserText.label: 'Access Control for Sales Order'
@MappingRole: true
define role ZI_SalesOrder {
    grant select on I_SalesOrder
        where (SalesOrganization) = aspect pfcg_auth(V_VBAK_VKO, VKORG, ACTVT = '03');
}`;

        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: mockDclSource,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/ZI_SALESORDER.dcls.asdcls',
                metadata: {
                    path: '/project/tmp/ZI_SALESORDER.dcls.asdcls',
                    fileName: 'ZI_SALESORDER.dcls.asdcls',
                    size: 250,
                    lines: 5,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should export access control with I_ prefix', async () => {
            const result = await handleExportAccessControlToFile({ dcl_name: 'I_SalesOrder' });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('Access Control (DCL) exported successfully');
            expect(result.content[0].text).toContain('Original DCL: I_SalesOrder');
            expect(result.content[0].text).toContain('Exported DCL: ZI_SALESORDER');
        });

        it('should call ADT API with correct endpoint', async () => {
            await handleExportAccessControlToFile({ dcl_name: 'I_SalesOrder' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://sap.example.com:443/sap/bc/adt/acm/dcl/sources/I_SalesOrder/source/main',
                'GET',
                30000
            );
        });

        it('should write file with correct DCL extension', async () => {
            await handleExportAccessControlToFile({ dcl_name: 'I_SalesOrder' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZI_SALESORDER', 'DCLS', expect.any(String));
        });

        it('should include warning about associated CDS view', async () => {
            const result = await handleExportAccessControlToFile({ dcl_name: 'I_SalesOrder' });

            expect(result.content[0].text).toContain('Associated CDS view must be exported separately');
            expect(result.content[0].text).toContain('ExportCDSViewToFile');
        });

        it('should handle already Z-prefixed DCL', async () => {
            const result = await handleExportAccessControlToFile({ dcl_name: 'ZI_Custom' });

            expect(result.content[0].text).not.toContain('Auto-converted');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZI_CUSTOM', 'DCLS', expect.any(String));
        });
    });

    describe('Name Conversions', () => {
        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'define role test { }',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.dcls.asdcls',
                metadata: {
                    path: '/project/tmp/test.dcls.asdcls',
                    fileName: 'test.dcls.asdcls',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should convert I_ prefix (interface view)', async () => {
            const result = await handleExportAccessControlToFile({ dcl_name: 'I_Product' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZI_PRODUCT', 'DCLS', expect.any(String));
        });

        it('should convert R_ prefix (RAP root view)', async () => {
            const result = await handleExportAccessControlToFile({ dcl_name: 'R_Material' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZR_MATERIAL', 'DCLS', expect.any(String));
        });

        it('should convert C_ prefix (consumption view)', async () => {
            const result = await handleExportAccessControlToFile({ dcl_name: 'C_Customer' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZC_CUSTOMER', 'DCLS', expect.any(String));
        });

        it('should handle Y-prefixed DCL (no conversion)', async () => {
            const result = await handleExportAccessControlToFile({ dcl_name: 'YI_Custom' });

            expect(result.content[0].text).not.toContain('Auto-converted');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('YI_CUSTOM', 'DCLS', expect.any(String));
        });
    });

    describe('Long Name Truncation', () => {
        it('should warn about truncated name', async () => {
            const longName = 'I_VeryLongAccessControlNameThatExceedsLimit';

            mockMakeAdtRequest.mockResolvedValue({
                data: 'define role test { }',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.dcls.asdcls',
                metadata: {
                    path: '/project/tmp/test.dcls.asdcls',
                    fileName: 'test.dcls.asdcls',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            const result = await handleExportAccessControlToFile({ dcl_name: longName });
            expect(result.content[0].text).toContain('Name truncated to 30 characters');
        });
    });

    describe('Error Handling', () => {
        it('should handle ADT API errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('Connection failed'));
            const result = await handleExportAccessControlToFile({ dcl_name: 'I_Test' });
            expect(result.isError).toBe(true);
        });

        it('should handle file write errors', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'define role test { }',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockImplementation(() => {
                throw new Error('Disk full');
            });

            const result = await handleExportAccessControlToFile({ dcl_name: 'I_Test' });
            expect(result.isError).toBe(true);
        });

        it('should handle URL encoding for special characters', async () => {
            await handleExportAccessControlToFile({ dcl_name: 'I_Test/Special' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('I_Test%2FSpecial'),
                'GET',
                30000
            );
        });
    });
});
