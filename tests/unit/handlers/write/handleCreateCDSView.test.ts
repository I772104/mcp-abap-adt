import { handleCreateCDSView } from '../../../../src/handlers/handleCreateCDSView';
import * as utils from '../../../../src/lib/utils';
import * as activationUtils from '../../../../src/lib/activation-utils';

describe('handleCreateCDSView', () => {
    let mockMakeAdtRequest: jest.SpyInstance;
    let mockGetBaseUrl: jest.SpyInstance;
    let mockAttemptObjectActivation: jest.SpyInstance;
    let mockCreateWorkflowResponse: jest.SpyInstance;

    beforeEach(() => {
        mockMakeAdtRequest = jest.spyOn(utils, 'makeAdtRequest');
        mockGetBaseUrl = jest.spyOn(utils, 'getBaseUrl').mockResolvedValue('https://mock-sap.com:443');
        mockAttemptObjectActivation = jest.spyOn(activationUtils, 'attemptObjectActivation');
        mockCreateWorkflowResponse = jest.spyOn(activationUtils, 'createWorkflowResponse');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Input Validation', () => {
        test('should reject missing view_name', async () => {
            const result = await handleCreateCDSView({
                source_code: 'define view entity ZMY_VIEW as select from I_SomeBase { key field1 }',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('view_name');
            expect(result.content[0].text).toContain('required');
        });

        test('should reject missing source_code', async () => {
            const result = await handleCreateCDSView({ view_name: 'ZMY_VIEW' });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('source_code');
            expect(result.content[0].text).toContain('required');
        });

        test('should reject view_name not starting with Z or Y', async () => {
            const result = await handleCreateCDSView({
                view_name: 'I_INVALID',
                source_code: 'define view entity I_INVALID as select from I_Base { key f }',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('must start with Z or Y');
        });

        test('should reject non-local package', async () => {
            const result = await handleCreateCDSView({
                view_name: 'ZMY_VIEW',
                source_code: 'define view entity ZMY_VIEW as select from I_Base { key f }',
                package: 'ZPRODUCTION',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('must be local');
        });
    });

    describe('Create new view', () => {
        test('should create a new CDS view when it does not exist', async () => {
            const notFoundError: any = new Error('404');
            notFoundError.response = { status: 404 };

            // Calls: outer GET → 404, POST, GET ETag (uploadViewSource), PUT
            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)
                .mockResolvedValueOnce({ status: 201, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({
                status: 'success',
                message: 'ZMY_VIEW activated successfully',
                activatedClasses: [],
                summary: { totalClasses: 1, successCount: 1, errorCount: 0, warningCount: 0 },
                timestamp: new Date().toISOString(),
            });
            mockCreateWorkflowResponse.mockReturnValueOnce({
                creation: { status: 'success' },
                activation: { status: 'success' },
                workflow: { overall_status: 'success', creation_successful: true, activation_successful: true, auto_activated: true },
            } as any);

            const result = await handleCreateCDSView({
                view_name: 'ZMY_VIEW',
                source_code: 'define view entity ZMY_VIEW as select from I_Base { key field1 }',
                package: '$TMP',
            });

            expect(result.isError).toBe(false);

            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            expect(postCall).toBeDefined();
            expect(postCall![5]).toMatchObject({ 'Content-Type': 'application/vnd.sap.adt.ddlSource+xml' });
            expect(postCall![3]).toContain('ZMY_VIEW');
            expect(postCall![3]).toContain('$TMP');

            expect(mockAttemptObjectActivation).toHaveBeenCalledWith(
                'ZMY_VIEW',
                expect.stringContaining('/sap/bc/adt/ddic/ddl/sources/'),
                expect.any(Boolean),
            );
        });

        test('should default package to $TMP', async () => {
            const notFoundError: any = new Error('404');
            notFoundError.response = { status: 404 };

            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)
                .mockResolvedValueOnce({ status: 201, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({ status: 'success', timestamp: '' } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

            await handleCreateCDSView({
                view_name: 'ZMY_VIEW',
                source_code: 'define view entity ZMY_VIEW as select from I_Base { key f }',
            });

            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            expect(postCall![3]).toContain('$TMP');
        });
    });

    describe('Replace existing view', () => {
        test('should replace source when view already exists', async () => {
            // Calls: outer GET (exists), GET ETag (uploadViewSource), PUT
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: 'existing source', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: 'existing source', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({ status: 'success', timestamp: '' } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

            const result = await handleCreateCDSView({
                view_name: 'ZMY_VIEW',
                source_code: 'define view entity ZMY_VIEW as select from I_Base { key field1 }',
            });

            expect(result.isError).toBe(false);

            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            expect(postCall).toBeUndefined();

            const putCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'PUT');
            expect(putCall).toBeDefined();
        });
    });

    describe('Auto-activation', () => {
        test('should skip activation when auto_activate is false', async () => {
            const notFoundError: any = new Error('404');
            notFoundError.response = { status: 404 };

            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)
                .mockResolvedValueOnce({ status: 201, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            const result = await handleCreateCDSView({
                view_name: 'ZMY_VIEW',
                source_code: 'define view entity ZMY_VIEW as select from I_Base { key f }',
                auto_activate: false,
            });

            expect(result.isError).toBe(false);
            expect(mockAttemptObjectActivation).not.toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        test('should return error on network failure', async () => {
            mockGetBaseUrl.mockRejectedValueOnce(new Error('Network error'));

            const result = await handleCreateCDSView({
                view_name: 'ZMY_VIEW',
                source_code: 'define view entity ZMY_VIEW as select from I_Base { key f }',
            });

            expect(result.isError).toBe(true);
        });

        test('should attempt cleanup when POST succeeds but PUT fails with 412', async () => {
            const notFoundError: any = new Error('404');
            notFoundError.response = { status: 404 };
            const etagError: any = new Error('HTTP 412 Precondition Failed');

            // Calls: outer GET → 404, POST, GET ETag → 412 on PUT, DELETE cleanup
            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)
                .mockResolvedValueOnce({ status: 201, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any)
                .mockRejectedValueOnce(etagError)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            const result = await handleCreateCDSView({
                view_name: 'ZMY_VIEW',
                source_code: 'define view entity ZMY_VIEW as select from I_Base { key f }',
            });

            expect(result.isError).toBe(false);
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.status).toBe('error');

            const deleteCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'DELETE');
            expect(deleteCall).toBeDefined();
            expect(deleteCall![0]).toContain('/sap/bc/adt/ddic/ddl/sources/ZMY_VIEW');
        });

        test('should return authorization error on 403', async () => {
            const authError: any = new Error('HTTP 403 Forbidden');
            mockGetBaseUrl.mockRejectedValueOnce(authError);

            const result = await handleCreateCDSView({
                view_name: 'ZMY_VIEW',
                source_code: 'define view entity ZMY_VIEW as select from I_Base { key f }',
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('authorization');
        });
    });
});
