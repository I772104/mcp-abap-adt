import { handleExportInterfaceToFile } from '../../../../src/handlers/handleExportInterfaceToFile';
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

describe('handleExportInterfaceToFile', () => {
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
        it('should return error when interface_name is missing', async () => {
            const result = await handleExportInterfaceToFile({} as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Interface name is required');
        });

        it('should return error when interface_name is null', async () => {
            const result = await handleExportInterfaceToFile({ interface_name: null } as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Interface name is required');
        });

        it('should return error when interface_name is empty string', async () => {
            const result = await handleExportInterfaceToFile({ interface_name: '' });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Interface name is required');
        });
    });

    describe('Successful Interface Export', () => {
        const mockInterfaceSource = `INTERFACE if_my_interface PUBLIC.
  METHODS: my_method.
ENDINTERFACE.`;

        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: mockInterfaceSource,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/ZIF_MY_INTERFACE.intf.abap',
                metadata: {
                    path: '/project/tmp/ZIF_MY_INTERFACE.intf.abap',
                    fileName: 'ZIF_MY_INTERFACE.intf.abap',
                    size: 150,
                    lines: 3,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should export interface with IF_ prefix', async () => {
            const result = await handleExportInterfaceToFile({ interface_name: 'IF_MY_INTERFACE' });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('Interface exported successfully');
            expect(result.content[0].text).toContain('Original Interface: IF_MY_INTERFACE');
            expect(result.content[0].text).toContain('Exported Interface: ZIF_MY_INTERFACE');
        });

        it('should call ADT API with correct endpoint', async () => {
            await handleExportInterfaceToFile({ interface_name: 'IF_MY_INTERFACE' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://sap.example.com:443/sap/bc/adt/oo/interfaces/IF_MY_INTERFACE/source/main',
                'GET',
                30000
            );
        });

        it('should write file with correct INTF extension', async () => {
            await handleExportInterfaceToFile({ interface_name: 'IF_MY_INTERFACE' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith(
                'ZIF_MY_INTERFACE',
                'INTF',
                expect.stringContaining('ZIF_MY_INTERFACE')
            );
        });

        it('should convert interface name in source code', async () => {
            await handleExportInterfaceToFile({ interface_name: 'IF_MY_INTERFACE' });

            const writtenSource = mockWriteObjectSourceFile.mock.calls[0][2];
            expect(writtenSource.toLowerCase()).toContain('zif_my_interface');
            expect(writtenSource).toContain('ZIF_MY_INTERFACE');
        });

        it('should include file metadata in response', async () => {
            const result = await handleExportInterfaceToFile({ interface_name: 'IF_MY_INTERFACE' });

            const response = result.content[0].text;
            expect(response).toContain('File: ZIF_MY_INTERFACE.intf.abap');
            expect(response).toContain('Size: 150 bytes');
            expect(response).toContain('Lines: 3');
        });

        it('should handle already Z-prefixed interface', async () => {
            const result = await handleExportInterfaceToFile({ interface_name: 'ZIF_CUSTOM' });

            expect(result.content[0].text).not.toContain('Name Conversion:');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZIF_CUSTOM', 'INTF', expect.any(String));
        });
    });

    describe('Name Conversions', () => {
        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'INTERFACE test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.intf.abap',
                metadata: {
                    path: '/project/tmp/test.intf.abap',
                    fileName: 'test.intf.abap',
                    size: 100,
                    lines: 5,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should convert IF_ prefix correctly', async () => {
            const result = await handleExportInterfaceToFile({ interface_name: 'IF_BAPI_INTERFACE' });

            expect(result.content[0].text).toContain('IF_BAPI_INTERFACE → ZIF_BAPI_INTERFACE');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZIF_BAPI_INTERFACE', 'INTF', expect.any(String));
        });

        it('should handle interface without standard prefix', async () => {
            const result = await handleExportInterfaceToFile({ interface_name: 'MYINTERFACE' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('Z_MYINTERFACE', 'INTF', expect.any(String));
        });

        it('should handle Y-prefixed interface (no conversion)', async () => {
            const result = await handleExportInterfaceToFile({ interface_name: 'YIF_CUSTOM' });

            expect(result.content[0].text).not.toContain('Auto-converted');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('YIF_CUSTOM', 'INTF', expect.any(String));
        });
    });

    describe('Long Name Truncation', () => {
        it('should warn about truncated interface name', async () => {
            const longName = 'IF_VERY_LONG_INTERFACE_NAME_THAT_EXCEEDS_LIMIT';

            mockMakeAdtRequest.mockResolvedValue({
                data: 'INTERFACE test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.intf.abap',
                metadata: {
                    path: '/project/tmp/test.intf.abap',
                    fileName: 'test.intf.abap',
                    size: 100,
                    lines: 5,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            const result = await handleExportInterfaceToFile({ interface_name: longName });

            expect(result.content[0].text).toContain('Name truncated to 30 characters');
        });
    });

    describe('Error Handling', () => {
        it('should handle ADT API errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('Connection failed'));

            const result = await handleExportInterfaceToFile({ interface_name: 'IF_TEST' });

            expect(result.isError).toBe(true);
        });

        it('should handle file write errors', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'INTERFACE test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockImplementation(() => {
                throw new Error('Disk full');
            });

            const result = await handleExportInterfaceToFile({ interface_name: 'IF_TEST' });

            expect(result.isError).toBe(true);
        });

        it('should handle URL encoding for special characters', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'INTERFACE test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.intf.abap',
                metadata: {
                    path: '/project/tmp/test.intf.abap',
                    fileName: 'test.intf.abap',
                    size: 100,
                    lines: 5,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            await handleExportInterfaceToFile({ interface_name: 'IF_TEST+NAME' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('IF_TEST%2BNAME'),
                'GET',
                30000
            );
        });
    });
});
