import { handleExportBehaviorDefinitionToFile } from '../../../../src/handlers/handleExportBehaviorDefinitionToFile';
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

describe('handleExportBehaviorDefinitionToFile', () => {
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
        it('should return error when behavior_name is missing', async () => {
            const result = await handleExportBehaviorDefinitionToFile({} as any);
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Behavior definition name is required');
        });

        it('should return error when behavior_name is null', async () => {
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: null } as any);
            expect(result.isError).toBe(true);
        });

        it('should return error when behavior_name is empty', async () => {
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: '' });
            expect(result.isError).toBe(true);
        });
    });

    describe('Successful Export', () => {
        const mockBehaviorSource = `managed implementation in class zbp_r_salesorder unique;
define behavior for R_SalesOrder alias SalesOrder
{
  create;
  update;
}`;

        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: mockBehaviorSource,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/ZR_SALESORDER.bdef.asbdef',
                metadata: {
                    path: '/project/tmp/ZR_SALESORDER.bdef.asbdef',
                    fileName: 'ZR_SALESORDER.bdef.asbdef',
                    size: 300,
                    lines: 6,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should export behavior definition with R_ prefix', async () => {
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: 'R_SalesOrder' });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('Behavior Definition exported successfully');
            expect(result.content[0].text).toContain('Original Behavior: R_SalesOrder');
            expect(result.content[0].text).toContain('Exported Behavior: ZR_SALESORDER');
        });

        it('should call ADT API with correct endpoint', async () => {
            await handleExportBehaviorDefinitionToFile({ behavior_name: 'R_SalesOrder' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://sap.example.com:443/sap/bc/adt/bo/behaviordefinitions/R_SalesOrder/source/main',
                'GET',
                30000
            );
        });

        it('should write file with correct BDEF extension', async () => {
            await handleExportBehaviorDefinitionToFile({ behavior_name: 'R_SalesOrder' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZR_SALESORDER', 'BDEF', expect.any(String));
        });

        it('should include warning about associated objects', async () => {
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: 'R_SalesOrder' });

            expect(result.content[0].text).toContain('Associated CDS views and behavior implementation class');
            expect(result.content[0].text).toContain('ExportCDSViewToFile');
            expect(result.content[0].text).toContain('ExportClassToFile');
        });

        it('should handle already Z-prefixed behavior', async () => {
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: 'ZR_Custom' });

            expect(result.content[0].text).not.toContain('Auto-converted');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZR_CUSTOM', 'BDEF', expect.any(String));
        });
    });

    describe('Name Conversions', () => {
        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'managed;',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.bdef.asbdef',
                metadata: {
                    path: '/project/tmp/test.bdef.asbdef',
                    fileName: 'test.bdef.asbdef',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should convert R_ prefix (RAP root view)', async () => {
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: 'R_Product' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZR_PRODUCT', 'BDEF', expect.any(String));
        });

        it('should convert I_ prefix (interface view)', async () => {
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: 'I_Material' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZI_MATERIAL', 'BDEF', expect.any(String));
        });

        it('should convert C_ prefix (consumption view)', async () => {
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: 'C_SalesOrder' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZC_SALESORDER', 'BDEF', expect.any(String));
        });

        it('should handle TP suffix preservation', async () => {
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: 'R_SalesOrderTP' });
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZR_SALESORDERTP', 'BDEF', expect.any(String));
        });
    });

    describe('Long Name Truncation', () => {
        it('should warn about truncated name', async () => {
            const longName = 'R_VeryLongBehaviorDefinitionNameThatExceedsLimit';

            mockMakeAdtRequest.mockResolvedValue({
                data: 'managed;',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.bdef.asbdef',
                metadata: {
                    path: '/project/tmp/test.bdef.asbdef',
                    fileName: 'test.bdef.asbdef',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: longName });
            expect(result.content[0].text).toContain('Name truncated to 30 characters');
        });
    });

    describe('Error Handling', () => {
        it('should handle ADT API errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('Connection failed'));
            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: 'R_Test' });
            expect(result.isError).toBe(true);
        });

        it('should handle file write errors', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'managed;',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockImplementation(() => {
                throw new Error('Disk full');
            });

            const result = await handleExportBehaviorDefinitionToFile({ behavior_name: 'R_Test' });
            expect(result.isError).toBe(true);
        });
    });
});
