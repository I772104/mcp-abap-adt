import { handleExportProgramToFile } from '../../../../src/handlers/handleExportProgramToFile';
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

describe('handleExportProgramToFile', () => {
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
        it('should return error when program_name is missing', async () => {
            const result = await handleExportProgramToFile({} as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Program name is required');
        });

        it('should return error when program_name is null', async () => {
            const result = await handleExportProgramToFile({ program_name: null } as any);

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Program name is required');
        });

        it('should return error when program_name is empty string', async () => {
            const result = await handleExportProgramToFile({ program_name: '' });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Program name is required');
        });
    });

    describe('Successful Program Export', () => {
        const mockProgramSource = `REPORT MY_PROGRAM.
WRITE: / 'Hello World'.`;

        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: mockProgramSource,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/ZMY_PROGRAM.prog.abap',
                metadata: {
                    path: '/project/tmp/ZMY_PROGRAM.prog.abap',
                    fileName: 'ZMY_PROGRAM.prog.abap',
                    size: 200,
                    lines: 2,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should export program successfully', async () => {
            const result = await handleExportProgramToFile({ program_name: 'MY_PROGRAM' });

            expect(result.isError).toBe(false);
            expect(result.content[0].text).toContain('Program exported successfully');
            expect(result.content[0].text).toContain('Original Program: MY_PROGRAM');
            expect(result.content[0].text).toContain('Exported Program: ZMY_PROGRAM');
        });

        it('should call ADT API with correct endpoint', async () => {
            await handleExportProgramToFile({ program_name: 'MY_PROGRAM' });

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://sap.example.com:443/sap/bc/adt/programs/programs/MY_PROGRAM/source/main',
                'GET',
                30000
            );
        });

        it('should write file with correct PROG extension', async () => {
            await handleExportProgramToFile({ program_name: 'MY_PROGRAM' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZMY_PROGRAM', 'PROG', expect.any(String));
        });

        it('should convert program name in source code', async () => {
            await handleExportProgramToFile({ program_name: 'MY_PROGRAM' });

            const writtenSource = mockWriteObjectSourceFile.mock.calls[0][2];
            expect(writtenSource.toUpperCase()).toContain('ZMY_PROGRAM');
        });

        it('should include file metadata in response', async () => {
            const result = await handleExportProgramToFile({ program_name: 'MY_PROGRAM' });

            const response = result.content[0].text;
            expect(response).toContain('File: ZMY_PROGRAM.prog.abap');
            expect(response).toContain('Size: 200 bytes');
            expect(response).toContain('Lines: 2');
        });

        it('should handle already Z-prefixed program', async () => {
            const result = await handleExportProgramToFile({ program_name: 'ZCUSTOM_PROGRAM' });

            expect(result.content[0].text).not.toContain('Name Conversion:');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZCUSTOM_PROGRAM', 'PROG', expect.any(String));
        });
    });

    describe('Name Conversions', () => {
        beforeEach(() => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'REPORT test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.prog.abap',
                metadata: {
                    path: '/project/tmp/test.prog.abap',
                    fileName: 'test.prog.abap',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });
        });

        it('should add Z_ prefix to program without prefix', async () => {
            const result = await handleExportProgramToFile({ program_name: 'MYPROGRAM' });

            expect(result.content[0].text).toContain('MYPROGRAM → Z_MYPROGRAM');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('Z_MYPROGRAM', 'PROG', expect.any(String));
        });

        it('should handle program with RP_ prefix', async () => {
            const result = await handleExportProgramToFile({ program_name: 'RP_CALCULATE' });

            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('ZRP_CALCULATE', 'PROG', expect.any(String));
        });

        it('should handle Y-prefixed program (no conversion)', async () => {
            const result = await handleExportProgramToFile({ program_name: 'YCUSTOM' });

            expect(result.content[0].text).not.toContain('Auto-converted');
            expect(mockWriteObjectSourceFile).toHaveBeenCalledWith('YCUSTOM', 'PROG', expect.any(String));
        });
    });

    describe('Long Name Truncation', () => {
        it('should warn about truncated program name', async () => {
            const longName = 'VERY_LONG_PROGRAM_NAME_THAT_EXCEEDS_THE_LIMIT';

            mockMakeAdtRequest.mockResolvedValue({
                data: 'REPORT test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.prog.abap',
                metadata: {
                    path: '/project/tmp/test.prog.abap',
                    fileName: 'test.prog.abap',
                    size: 100,
                    lines: 1,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            const result = await handleExportProgramToFile({ program_name: longName });

            expect(result.content[0].text).toContain('Name truncated to 30 characters');
        });
    });

    describe('Error Handling', () => {
        it('should handle ADT API errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('Connection failed'));

            const result = await handleExportProgramToFile({ program_name: 'TEST' });

            expect(result.isError).toBe(true);
        });

        it('should handle file write errors', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                data: 'REPORT test.',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockImplementation(() => {
                throw new Error('Disk full');
            });

            const result = await handleExportProgramToFile({ program_name: 'TEST' });

            expect(result.isError).toBe(true);
        });

        it('should handle case-insensitive replacement', async () => {
            const programSource = 'REPORT MYPROGRAM.\nCALL myprogram.';

            mockMakeAdtRequest.mockResolvedValue({
                data: programSource,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            });

            mockWriteObjectSourceFile.mockReturnValue({
                filePath: '/project/tmp/test.prog.abap',
                metadata: {
                    path: '/project/tmp/test.prog.abap',
                    fileName: 'test.prog.abap',
                    size: 100,
                    lines: 2,
                    modified: '2026-03-12T10:00:00.000Z',
                },
            });

            await handleExportProgramToFile({ program_name: 'MYPROGRAM' });

            const writtenSource = mockWriteObjectSourceFile.mock.calls[0][2];
            expect(writtenSource).toContain('Z_MYPROGRAM');
            // The conversion should replace all instances
            const originalCount = (programSource.match(/MYPROGRAM/gi) || []).length;
            const convertedCount = (writtenSource.match(/Z_MYPROGRAM/gi) || []).length;
            expect(convertedCount).toBe(originalCount);
        });
    });
});
