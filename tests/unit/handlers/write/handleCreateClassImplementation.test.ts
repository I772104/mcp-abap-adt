import { handleCreateClassImplementation } from '../../../../src/handlers/handleCreateClassImplementation';
import * as utils from '../../../../src/lib/utils';
import * as activationUtils from '../../../../src/lib/activation-utils';

describe('handleCreateClassImplementation', () => {
    let mockMakeAdtRequest: jest.SpyInstance;
    let mockGetBaseUrl: jest.SpyInstance;
    let mockAttemptClassActivation: jest.SpyInstance;
    let mockCreateWorkflowResponse: jest.SpyInstance;

    beforeEach(() => {
        mockMakeAdtRequest = jest.spyOn(utils, 'makeAdtRequest');
        mockGetBaseUrl = jest.spyOn(utils, 'getBaseUrl').mockResolvedValue('https://mock-sap.com:443');
        mockAttemptClassActivation = jest.spyOn(activationUtils, 'attemptClassActivation');
        mockCreateWorkflowResponse = jest.spyOn(activationUtils, 'createWorkflowResponse');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Input validation', () => {
        test('should reject missing class_name', async () => {
            const result = await handleCreateClassImplementation({
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('class_name');
        });

        test('should reject missing source_code', async () => {
            const result = await handleCreateClassImplementation({
                class_name: 'ZCL_TEST',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('source_code');
        });

        test('should reject class_name not starting with Z or Y', async () => {
            const result = await handleCreateClassImplementation({
                class_name: 'CL_STANDARD',
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('must start with Z or Y');
        });

        test('should reject when class does not exist (404)', async () => {
            const notFoundError: any = new Error('404 Not Found');
            notFoundError.response = { status: 404 };
            mockMakeAdtRequest.mockRejectedValueOnce(notFoundError);

            const result = await handleCreateClassImplementation({
                class_name: 'ZCL_NONEXISTENT',
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('ZCL_NONEXISTENT');
        });
    });

    describe('Update implementation (wildcard ETag succeeds)', () => {
        test('should upload implementation when wildcard ETag is accepted', async () => {
            // Call 1: GET class metadata (exists check)
            // Call 2: PUT with If-Match: * → success
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptClassActivation.mockResolvedValueOnce({
                status: 'success',
                message: 'ZCL_TEST activated',
                timestamp: new Date().toISOString(),
            } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({
                workflow: { overall_status: 'success', creation_successful: true, activation_successful: true },
            } as any);

            const result = await handleCreateClassImplementation({
                class_name: 'ZCL_TEST',
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
            });

            expect(result.isError).toBe(false);

            const putCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'PUT');
            expect(putCall).toBeDefined();
            expect(putCall![0]).toContain('/includes/implementations');
            expect(putCall![5]).toMatchObject({ 'If-Match': '*' });
        });

        test('should fall back to real ETag when wildcard PUT returns 412', async () => {
            const wildcardError: any = new Error('HTTP 412 Precondition Failed');
            const realEtag = '"real-etag-value"';

            // Call 1: GET class metadata
            // Call 2: PUT with * → 412
            // Call 3: GET ETag fallback
            // Call 4: PUT with real ETag → success
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: '' } as any)
                .mockRejectedValueOnce(wildcardError)
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: realEtag } } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptClassActivation.mockResolvedValueOnce({ status: 'success', timestamp: '' } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

            const result = await handleCreateClassImplementation({
                class_name: 'ZCL_TEST',
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
            });

            expect(result.isError).toBe(false);

            const putCalls = mockMakeAdtRequest.mock.calls.filter(call => call[1] === 'PUT');
            expect(putCalls).toHaveLength(2);
            // Second PUT uses real ETag
            expect(putCalls[1][5]).toMatchObject({ 'If-Match': realEtag });
        });

        test('should uppercase class_name before sending to ADT', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptClassActivation.mockResolvedValueOnce({ status: 'success', timestamp: '' } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

            await handleCreateClassImplementation({
                class_name: 'zcl_test',
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
            });

            const getClassCall = mockMakeAdtRequest.mock.calls[0];
            expect(getClassCall[0]).toContain('ZCL_TEST');
        });
    });

    describe('Auto-activation', () => {
        test('should skip activation when auto_activate is false', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            const result = await handleCreateClassImplementation({
                class_name: 'ZCL_TEST',
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
                auto_activate: false,
            });

            expect(result.isError).toBe(false);
            expect(mockAttemptClassActivation).not.toHaveBeenCalled();

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.status).toBe('success');
        });

        test('should return partial_success when activation fails', async () => {
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: '' } as any)
                .mockResolvedValueOnce({ status: 200, data: '' } as any);

            mockAttemptClassActivation.mockResolvedValueOnce({
                status: 'error',
                error_message: 'Syntax error',
                details: { error_code: 'ACTIVATION_FAILED', suggested_action: 'Fix syntax', raw_response: '' },
                timestamp: new Date().toISOString(),
            } as any);
            mockCreateWorkflowResponse.mockReturnValueOnce({
                workflow: { overall_status: 'partial_success', creation_successful: true, activation_successful: false },
            } as any);

            const result = await handleCreateClassImplementation({
                class_name: 'ZCL_TEST',
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
            });

            expect(result.isError).toBe(false);
            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.workflow.overall_status).toBe('partial_success');
        });
    });

    describe('Error handling', () => {
        test('should return authorization error on 403 during upload', async () => {
            const authError: any = new Error('HTTP 403 Forbidden: authorization failed');
            // 403 is not a 412, so uploadImplementationSource bubbles it immediately without ETag fallback
            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: '' } as any)  // GET class exists
                .mockRejectedValueOnce(authError);                         // PUT wildcard → 403 (bubbles up)

            const result = await handleCreateClassImplementation({
                class_name: 'ZCL_TEST',
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('authorization');
        });

        test('should return concurrent modification error on 412 after ETag fallback fails', async () => {
            const wildcardError: any = new Error('HTTP 412');
            const etagError: any = new Error('HTTP 412 ETag mismatch');

            mockMakeAdtRequest
                .mockResolvedValueOnce({ status: 200, data: '' } as any)       // GET class
                .mockRejectedValueOnce(wildcardError)                           // PUT * → 412
                .mockResolvedValueOnce({ status: 200, data: '', headers: { etag: '"abc"' } } as any) // GET ETag
                .mockRejectedValueOnce(etagError);                              // PUT real ETag → 412

            const result = await handleCreateClassImplementation({
                class_name: 'ZCL_TEST',
                source_code: 'CLASS lcl_impl IMPLEMENTATION. ENDCLASS.',
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Concurrent modification');
        });
    });
});
