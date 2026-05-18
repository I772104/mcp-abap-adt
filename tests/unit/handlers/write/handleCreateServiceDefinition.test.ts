import { handleCreateServiceDefinition } from '../../../../src/handlers/handleCreateServiceDefinition';
import * as utils from '../../../../src/lib/utils';
import * as activationUtils from '../../../../src/lib/activation-utils';

describe('handleCreateServiceDefinition', () => {
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
        test('should reject missing service_name', async () => {
            const result = await handleCreateServiceDefinition({
                source_code: "define service Z_TEST { expose Z_TEST; }",
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('service_name');
        });

        test('should reject missing source_code', async () => {
            const result = await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('source_code');
        });

        test('should reject service_name not starting with Z or Y', async () => {
            const result = await handleCreateServiceDefinition({
                service_name: 'I_INVALID_SRVD',
                source_code: "define service I_INVALID_SRVD { expose I_TEST; }",
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('must start with Z or Y');
        });

        test('should reject non-local package', async () => {
            const result = await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
                package: 'ZPRODUCTION',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('must be local');
        });
    });

    describe('Create new service definition', () => {
        test('should create a new SRVD when it does not exist', async () => {
            const notFoundError: any = new Error('404 Not Found');
            notFoundError.response = { status: 404 };

            // Calls: outer GET → 404, POST, GET ETag, PUT
            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)
                .mockResolvedValueOnce({ status: 201, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '19710401text/plain_abc' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({
                status: 'success',
                message: 'Z_TEST_SRVD activated successfully',
                activatedClasses: [],
                summary: { totalClasses: 1, successCount: 1, errorCount: 0, warningCount: 0 },
                timestamp: new Date().toISOString(),
            });
            mockCreateWorkflowResponse.mockReturnValueOnce({
                creation: { status: 'success' },
                activation: { status: 'success' },
                workflow: { overall_status: 'success', creation_successful: true, activation_successful: true, auto_activated: true },
            } as any);

            const result = await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
                package: '$TMP',
            });

            expect(result.isError).toBe(false);

            // Verify POST uses correct Content-Type and XML namespace
            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            expect(postCall).toBeDefined();
            expect(postCall![5]).toMatchObject({ 'Content-Type': 'application/vnd.sap.adt.ddic.srvd.v1+xml' });
            expect(postCall![3]).toContain('Z_TEST_SRVD');
            expect(postCall![3]).toContain('SRVD/SRV');
            expect(postCall![3]).toContain('http://www.sap.com/adt/ddic/srvdsources');

            expect(mockAttemptObjectActivation).toHaveBeenCalledWith(
                'Z_TEST_SRVD',
                expect.stringContaining('/sap/bc/adt/ddic/srvd/sources/'),
                expect.any(Boolean),
            );
        });

        test('should XML-escape $ in package name in POST payload', async () => {
            const notFoundError: any = new Error('404');
            notFoundError.response = { status: 404 };

            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)
                .mockResolvedValueOnce({ status: 201, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({ status: 'success', timestamp: '' } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

            await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
                package: '$TMP',
            });

            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            // $ must be escaped as &#36; so the XML parser doesn't treat it as entity
            expect(postCall![3]).toContain('&#36;TMP');
            expect(postCall![3]).not.toContain('name="$TMP"');
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

            await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
            });

            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            expect(postCall![3]).toContain('&#36;TMP');
        });
    });

    describe('Replace existing service definition', () => {
        test('should replace source when SRVD already exists', async () => {
            // Calls: outer GET (exists), GET ETag (uploadSrvdSource), PUT
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: 'existing', headers: { etag: '19710401text/plain_abc' } } as any)
                .mockResolvedValueOnce({ status: 200, data: 'existing', headers: { etag: '19710401text/plain_abc' } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({ status: 'success', timestamp: '' } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

            const result = await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
            });

            expect(result.isError).toBe(false);

            // No POST on replace
            const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
            expect(postCall).toBeUndefined();

            const putCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'PUT');
            expect(putCall).toBeDefined();
        });

        test('should return structured error on 412 during replace', async () => {
            const etagError: any = new Error('HTTP 412 Precondition Failed');

            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: 'existing', headers: { etag: '"abc"' } } as any)
                .mockResolvedValueOnce({ status: 200, data: 'existing', headers: { etag: '"abc"' } } as any)
                .mockRejectedValueOnce(etagError);

            const result = await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
            });

            expect(result.isError).toBe(false);
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.status).toBe('error');
            expect(parsed.details.errorType).toBe('ETag_Mismatch_Likely_Syntax');

            // No DELETE on replace error
            const deleteCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'DELETE');
            expect(deleteCall).toBeUndefined();
        });

        test('should apply ETag charset fix before PUT If-Match', async () => {
            // SAP returns ETag as "...text/plain_..." but PUT needs "text/plain; charset=utf-8_..."
            const rawEtag = '19710401000000000text/plain_LrZVAuKK61hnXRCJRr5ga4L3KJA=';

            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: 'existing', headers: { etag: rawEtag } } as any)
                .mockResolvedValueOnce({ status: 200, data: 'existing', headers: { etag: rawEtag } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptObjectActivation.mockResolvedValueOnce({ status: 'success', timestamp: '' } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

            await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
            });

            const putCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'PUT');
            expect(putCall).toBeDefined();
            const putHeaders = putCall![5] as Record<string, string>;
            expect(putHeaders['If-Match']).toBe('19710401000000000text/plain; charset=utf-8_LrZVAuKK61hnXRCJRr5ga4L3KJA=');
        });
    });

    describe('Cleanup on create failure', () => {
        test('should attempt DELETE cleanup when POST succeeds but PUT fails with 412', async () => {
            const notFoundError: any = new Error('404');
            notFoundError.response = { status: 404 };
            const etagError: any = new Error('HTTP 412 Precondition Failed');

            mockMakeAdtRequest
                .mockRejectedValueOnce(notFoundError)                                                                   // outer GET → 404
                .mockResolvedValueOnce({ status: 201, data: '' } as any)                                               // POST → created
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any)                   // GET ETag
                .mockRejectedValueOnce(etagError)                                                                       // PUT → 412
                .mockResolvedValueOnce({ status: 200, data: '' } as any);                                              // DELETE cleanup

            const result = await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
            });

            expect(result.isError).toBe(false);
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.status).toBe('error');

            const deleteCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'DELETE');
            expect(deleteCall).toBeDefined();
            expect(deleteCall![0]).toContain('/sap/bc/adt/ddic/srvd/sources/Z_TEST_SRVD');
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

            const result = await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
                auto_activate: false,
            });

            expect(result.isError).toBe(false);
            expect(mockAttemptObjectActivation).not.toHaveBeenCalled();

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.status).toBe('success');
            expect(parsed.details.action).toBe('create');
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

            const result = await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
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

            const result = await handleCreateServiceDefinition({
                service_name: 'Z_TEST_SRVD',
                source_code: "define service Z_TEST_SRVD { expose Z_TEST; }",
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('authorization');
        });
    });
});
