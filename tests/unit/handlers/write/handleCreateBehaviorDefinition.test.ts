import { handleCreateBehaviorDefinition } from '../../../../src/handlers/handleCreateBehaviorDefinition';
import * as utils from '../../../../src/lib/utils';
import * as activationUtils from '../../../../src/lib/activation-utils';

describe('handleCreateBehaviorDefinition', () => {
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

    describe('Input validation', () => {
        test('should reject missing behavior_name', async () => {
            const result = await handleCreateBehaviorDefinition({
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('behavior_name');
        });

        test('should reject missing source_code', async () => {
            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                bdef_type: 'managed',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('source_code');
        });

        test('should reject missing bdef_type', async () => {
            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('bdef_type');
        });

        test('should reject bdef_type mismatch with source_code', async () => {
            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'unmanaged implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain("bdef_type is 'managed'");
            expect(result.content[0].text).toContain("'managed'");
        });

        test('should reject behavior_name not starting with Z or Y', async () => {
            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'I_INVALID',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('must start with Z or Y');
        });

        test('should reject non-local package', async () => {
            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
                package: 'ZPRODUCTION',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('must be local');
        });
    });

    describe('Create new BDEF', () => {
        test('should create a new BDEF when it does not exist', async () => {
            const notFoundError: any = new Error('404');
            notFoundError.response = { status: 404 };

            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)
                .mockResolvedValueOnce({ status: 201, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({
                status: 'success',
                message: 'ZBP_TEST activated successfully',
                activatedClasses: [],
                summary: { totalClasses: 1, successCount: 1, errorCount: 0, warningCount: 0 },
                timestamp: new Date().toISOString(),
            });
            mockCreateWorkflowResponse.mockReturnValueOnce({
                creation: { status: 'success' },
                activation: { status: 'success' },
                workflow: { overall_status: 'success', creation_successful: true, activation_successful: true, auto_activated: true },
            } as any);

            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;\ndefine behavior for ZBP_TEST { }',
                bdef_type: 'managed',
                package: '$TMP',
            });

            expect(result.isError).toBe(false);

            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            expect(postCall).toBeDefined();
            expect(postCall![5]).toMatchObject({ 'Content-Type': 'application/vnd.sap.adt.blues.v1+xml' });
            expect(postCall![3]).toContain('ZBP_TEST');
            expect(postCall![3]).toContain('$TMP');
            expect(postCall![3]).toContain('BDEF/BDO');

            expect(mockAttemptObjectActivation).toHaveBeenCalledWith(
                'ZBP_TEST',
                expect.stringContaining('/sap/bc/adt/bo/behaviordefinitions/'),
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

            await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });

            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            expect(postCall![3]).toContain('$TMP');
        });
    });

    describe('Replace existing BDEF', () => {
        test('should replace source when BDEF already exists', async () => {
            // 3 calls: GET check (outer), GET ETag (inside uploadBdefSource), PUT
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: 'existing source', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: 'existing source', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({ status: 'success', timestamp: '' } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });

            expect(result.isError).toBe(false);

            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            expect(postCall).toBeUndefined();

            const putCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'PUT');
            expect(putCall).toBeDefined();
        });

        test('should return structured error on 412 during replace', async () => {
            const etagError: any = new Error('HTTP 412 Precondition Failed');
            // GET check (outer), GET ETag (inside uploadBdefSource), then PUT throws 412
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: 'existing', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: 'existing', headers: { etag: '"abc"' } } as any)
                .mockRejectedValueOnce(etagError);

            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });

            expect(result.isError).toBe(false);
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.status).toBe('error');
            expect(parsed.details.errorType).toBe('ETag_Mismatch_Likely_Syntax');

            const deleteCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'DELETE');
            expect(deleteCall).toBeUndefined();
        });

        test('should transform ETag charset before PUT If-Match header', async () => {
            // SAP BDEF GET returns ETag without charset, PUT needs charset in the ETag
            const rawEtag = '"W/text/plain_20260512120000"';
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: 'existing source', headers: { etag: rawEtag } } as any)  // GET check
                .mockResolvedValueOnce({ status: 200, data: 'existing source', headers: { etag: rawEtag } } as any)  // GET ETag inside uploadBdefSource
                .mockResolvedValueOnce({ status: 200, data: '' } as any); // PUT source

            mockAttemptObjectActivation.mockResolvedValueOnce({ status: 'success', timestamp: '' } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

            await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });

            const putCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'PUT');
            expect(putCall).toBeDefined();
            const putHeaders = putCall![5] as Record<string, string>;
            expect(putHeaders['If-Match']).toBe('"W/text/plain; charset=utf-8_20260512120000"');
        });
    });

    describe('Cleanup on create failure', () => {
        test('should attempt DELETE cleanup when POST succeeds but PUT fails with 412', async () => {
            const notFoundError: any = new Error('404');
            notFoundError.response = { status: 404 };
            const etagError: any = new Error('HTTP 412 Precondition Failed');

            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)           // outer GET → 404
                .mockResolvedValueOnce({ status: 201, data: '' } as any)  // POST → created
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any) // GET ETag inside uploadBdefSource
                .mockRejectedValueOnce(etagError)               // PUT → 412
                .mockResolvedValueOnce({ status: 200, data: '' } as any); // DELETE cleanup

            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });

            expect(result.isError).toBe(false);
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.status).toBe('error');

            const deleteCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'DELETE');
            expect(deleteCall).toBeDefined();
            expect(deleteCall![0]).toContain('/sap/bc/adt/bo/behaviordefinitions/ZBP_TEST');
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

            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
                auto_activate: false,
            });

            expect(result.isError).toBe(false);
            expect(mockAttemptObjectActivation).not.toHaveBeenCalled();
        });

        test('should return partial_success when activation fails', async () => {
            const notFoundError: any = new Error('404');
            notFoundError.response = { status: 404 };

            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)
                .mockResolvedValueOnce({ status: 201, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({
                status: 'error',
                error_message: 'Activation failed',
                details: { error_code: 'ACTIVATION_FAILED', suggested_action: 'Fix syntax', raw_response: '' },
                timestamp: new Date().toISOString(),
            });
            mockCreateWorkflowResponse.mockReturnValueOnce({
                creation: { status: 'success' },
                activation: { status: 'error' },
                workflow: { overall_status: 'partial_success', creation_successful: true, activation_successful: false, auto_activated: true },
            } as any);

            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });

            expect(result.isError).toBe(false);
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.workflow.overall_status).toBe('partial_success');
        });
    });

    describe('Authorization error', () => {
        test('should return authorization error on 403', async () => {
            const authError: any = new Error('HTTP 403 Forbidden: authorization failed');
            mockGetBaseUrl.mockRejectedValueOnce(authError);

            const result = await handleCreateBehaviorDefinition({
                behavior_name: 'ZBP_TEST',
                source_code: 'managed implementation in class zbp_z_test unique;',
                bdef_type: 'managed',
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('authorization');
        });
    });
});
