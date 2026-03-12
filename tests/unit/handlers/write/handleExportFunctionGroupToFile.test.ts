import { handleExportFunctionGroupToFile } from '../../../../src/handlers/handleExportFunctionGroupToFile';
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

describe('handleExportFunctionGroupToFile', () => {
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
        it('should return error when function_group is missing', async () => {
            const result = await handleExportFunctionGroupToFile({} as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Function group name is required');
        });

        it('should return error when function_group is null', async () => {
            const result = await handleExportFunctionGroupToFile({ function_group: null } as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Function group name is required');
        });

        it('should return error when function_group is empty string', async () => {
            const result = await handleExportFunctionGroupToFile({ function_group: '' });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Function group name is required');
        });
    });

    describe('Successful Function Group Export', () => {
        const mockFunctionGroupSource = `FUNCTION-POOL MYFUNC.
DATA: gv_counter TYPE i.`;

        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: mockFunctionGroupSource,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/Z_MYFUNC.fugr.abap',
                metadata: {
                    path: '/project/tmp/Z_MYFUNC.fugr.abap',
                    fileName: 'Z_MYFUNC.fugr.abap',
                    size: 250,
                    lines: 2,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should export function group successfully', async () => {
            const result = await handleExportFunctionGroupToFile({ function_group: 'MYFUNC' });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('Function Group exported successfully');
            expect(result.content[0].text).toContain('Original Function Group: MYFUNC');
            expect(result.content[0].text).toContain('Exported Function Group: Z_MYFUNC');
        });

        it('should call ADT API with correct endpoint', async () => {
            await handleExportFunctionGroupToFile({ function_group: 'MYFUNC' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://sap.example.com:443/sap/bc/adt/functions/groups/MYFUNC/source/main',
                'GET',
                30000
            );
        });

        it('should write file with correct FUGR extension', async () => {
            await handleExportFunctionGroupToFile({ function_group: 'MYFUNC' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('Z_MYFUNC', 'FUGR', expect.any(String));
        });

        it('should convert function group name in source code', async () => {
            await handleExportFunctionGroupToFile({ function_group: 'MYFUNC' });

            const writtenSource = mockWriteObjectSourceFile.mock.calls[0][2];
            expect(writtenSource.toLowerCase()).toContain('z_myfunc');
        });

        it('should include warning about function modules', async () => {
            const result = await handleExportFunctionGroupToFile({ function_group: 'MYFUNC' });

            expect(result.content[0].text).toContain('Individual function modules are not included');
            expect(result.content[0].text).toContain('Use GetFunction to export individual function modules');
        });

        it('should include file metadata in response', async () => {
            const result = await handleExportFunctionGroupToFile({ function_group: 'MYFUNC' });

            const response = result.content[0].text;
            expect(response).toContain('File: Z_MYFUNC.fugr.abap');
            expect(response).toContain('Size: 250 bytes');
            expect(response).toContain('Lines: 2');
        });

        it('should handle already Z-prefixed function group', async () => {
            const result = await handleExportFunctionGroupToFile({ function_group: 'ZCUSTOM_FUNC' });

            expect(result.content[0].text).not.toContain('Name Conversion:');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZCUSTOM_FUNC', 'FUGR', expect.any(String));
        });
    });

    describe('Name Conversions', () => {
        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'FUNCTION-POOL test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.fugr.abap',
                metadata: {
                    path: '/project/tmp/test.fugr.abap',
                    fileName: 'test.fugr.abap',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should add Z_ prefix to function group without prefix', async () => {
            const result = await handleExportFunctionGroupToFile({ function_group: 'MYFUNCTIONS' });

            expect(result.content[0].text).toContain('MYFUNCTIONS → Z_MYFUNCTIONS');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('Z_MYFUNCTIONS', 'FUGR', expect.any(String));
        });

        it('should handle function group with SAP prefix', async () => {
            const result = await handleExportFunctionGroupToFile({ function_group: 'FG_UTILS' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZFG_UTILS', 'FUGR', expect.any(String));
        });

        it('should handle Y-prefixed function group (no conversion)', async () => {
            const result = await handleExportFunctionGroupToFile({ function_group: 'YCUSTOM' });

            expect(result.content[0].text).not.toContain('Auto-converted');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('YCUSTOM', 'FUGR', expect.any(String));
        });
    });

    describe('Long Name Truncation', () => {
        it('should warn about truncated function group name', async () => {
            const longName = 'VERY_LONG_FUNCTION_GROUP_NAME_EXCEEDS';

            mockMakeAdtRequest.mockResolvedValue({
                data: 'FUNCTION-POOL test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.fugr.abap',
                metadata: {
                    path: '/project/tmp/test.fugr.abap',
                    fileName: 'test.fugr.abap',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            const result = await handleExportFunctionGroupToFile({ function_group: longName });

            expect(result.content[0].text).toContain('Name truncated to 30 characters');
        });
    });

    describe('Error Handling', () => {
        it('should handle ADT API errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('Connection failed'));

            const result = await handleExportFunctionGroupToFile({ function_group: 'TEST' });

            expect(result.isError).toBe(true);
        });

        it('should handle file write errors', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'FUNCTION-POOL test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockImplementation(() => {
                throw new Error('Disk full');
            });

            const result = await handleExportFunctionGroupToFile({ function_group: 'TEST' });

            expect(result.isError).toBe(true);
        });

        it('should handle special characters in function group name', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'FUNCTION-POOL test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.fugr.abap',
                metadata: {
                    path: '/project/tmp/test.fugr.abap',
                    fileName: 'test.fugr.abap',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            await handleExportFunctionGroupToFile({ function_group: 'TEST/GROUP' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('TEST%2FGROUP'),
                'GET',
                30000
            );
        });
    });

    describe('Response Content', () => {
        it('should include guidance about importing', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'FUNCTION-POOL test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.fugr.abap',
                metadata: {
                    path: '/project/tmp/test.fugr.abap',
                    fileName: 'test.fugr.abap',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            const result = await handleExportFunctionGroupToFile({ function_group: 'TEST' });

            expect(result.content[0].text).toContain('Ready for import with ImportFunctionGroupFromFile');
        });
    });
});
