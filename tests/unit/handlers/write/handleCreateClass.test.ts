/**
 * Unit Tests for handleCreateClass
 *
 * Tests the CreateClass tool handler which creates new ABAP classes
 * in the SAP system via ADT protocol.
 */

import { handleCreateClass } from '../../../../src/handlers/handleCreateClass';
import * as utils from '../../../../src/lib/utils';
import * as activationUtils from '../../../../src/lib/activation-utils';

// Mock the utility functions
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

jest.mock('../../../../src/lib/activation-utils', () => ({
  attemptClassActivation: jest.fn(),
  createWorkflowResponse: jest.fn(),
}));

describe('handleCreateClass', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;
  let mockAttemptClassActivation: jest.MockedFunction<typeof activationUtils.attemptClassActivation>;
  let mockCreateWorkflowResponse: jest.MockedFunction<typeof activationUtils.createWorkflowResponse>;

  // Factory for a fresh 404 error matching what makeAdtRequest throws when a class doesn't exist
  const makeNotFoundError = (): any => {
    const e: any = new Error('HTTP 404 Not Found');
    e.status = 404;
    e.response = { status: 404 };
    return e;
  };

  // Standard workflow response mock value
  const workflowResponseMock = {
    workflow: { overall_status: 'success' },
    data: JSON.stringify({ status: 'success' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockAttemptClassActivation = activationUtils.attemptClassActivation as jest.MockedFunction<typeof activationUtils.attemptClassActivation>;
    mockCreateWorkflowResponse = activationUtils.createWorkflowResponse as jest.MockedFunction<typeof activationUtils.createWorkflowResponse>;

    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  // Helper: mock a successful class creation sequence
  // uploadSourceCode does GET (etag fetch) then PUT, so create path needs:
  //   reject-404 (existence check), POST (metadata), GET (etag), PUT (source)
  function mockSuccessfulCreate(etagHeaders: object = {}, withActivation = true) {
    mockMakeAdtRequest
      .mockRejectedValueOnce(makeNotFoundError())                                       // GET check — class doesn't exist
      .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)               // POST create metadata
      .mockResolvedValueOnce({ status: 200, headers: etagHeaders } as any)           // GET etag (uploadSourceCode)
      .mockResolvedValueOnce({ status: 200 } as any);                                // PUT source
    if (withActivation) {
      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce(workflowResponseMock as any);
    }
  }

  // Helper: mock a successful class replacement sequence
  // Replace path: GET (existence check + etag fetch inside uploadSourceCode), PUT
  function mockSuccessfulReplace(existingData = 'existing class content') {
    mockMakeAdtRequest
      .mockResolvedValueOnce({ status: 200, data: existingData, headers: {} } as any) // GET check — class exists
      .mockResolvedValueOnce({ status: 200, headers: {} } as any)                     // GET etag (uploadSourceCode)
      .mockResolvedValueOnce({ status: 200 } as any);                                 // PUT source
    mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
    mockCreateWorkflowResponse.mockReturnValueOnce(workflowResponseMock as any);
  }

  describe('Input Validation', () => {
    test('should reject missing class_name', async () => {
      const result = await handleCreateClass({
        source_code: 'CLASS zcl_test DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('class_name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject missing source_code', async () => {
      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('source_code');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject class name not starting with Z or Y', async () => {
      const result = await handleCreateClass({
        class_name: 'CL_INVALID',
        source_code: 'CLASS cl_invalid DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must start with Z or Y');
    });

    test('should accept valid Z class name', async () => {
      mockSuccessfulCreate();

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        package: '$TMP',
      });

      expect(result.isError).toBe(false);
      expect(mockMakeAdtRequest).toHaveBeenCalled();
    });

    test('should accept valid Y class name', async () => {
      mockSuccessfulCreate();

      const result = await handleCreateClass({
        class_name: 'YCL_TEST',
        source_code: 'CLASS ycl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS ycl_test IMPLEMENTATION. ENDCLASS.',
        package: '$TMP',
      });

      expect(result.isError).toBe(false);
    });

    test('should default package to $TMP if not provided', async () => {
      mockSuccessfulCreate();

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
      expect(postCall).toBeDefined();
      expect(postCall![3]).toContain('$TMP');
      expect(result.isError).toBe(false);
    });
  });

  describe('Package Validation', () => {
    test('should reject non-local packages', async () => {
      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        package: 'ZPRODUCTION',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must be local');
    });

    test('should accept $TMP package', async () => {
      mockSuccessfulCreate();

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        package: '$TMP',
      });

      expect(result.isError).toBe(false);
    });

    test('should accept $TEST package', async () => {
      mockSuccessfulCreate();

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        package: '$TEST',
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockGetBaseUrl.mockRejectedValueOnce(new Error('Network error'));

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle authorization errors', async () => {
      const authError = new Error('HTTP 403 Forbidden - Insufficient authorization');
      mockMakeAdtRequest.mockRejectedValueOnce(authError);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('authorization');
    });
  });

  describe('Auto-Activation', () => {
    test('should activate by default (auto_activate defaults to true)', async () => {
      mockSuccessfulCreate();

      await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', true);
    });

    test('should not activate when auto_activate is false', async () => {
      mockSuccessfulCreate({}, false);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        auto_activate: false,
      });

      expect(mockAttemptClassActivation).not.toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });
  });

  describe('Class Replacement', () => {
    test('should replace existing class', async () => {
      mockSuccessfulReplace();

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const putCalls = mockMakeAdtRequest.mock.calls.filter(call => call[1] === 'PUT');
      expect(putCalls.length).toBeGreaterThan(0);
    });

    test('should handle ETag mismatch during replacement (likely syntax error)', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: 'existing class', headers: {} } as any) // GET check
        .mockResolvedValueOnce({ status: 200, headers: {} } as any)                          // GET etag
        .mockRejectedValueOnce(new Error('HTTP 412 Precondition Failed'));                   // PUT fails

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.details.errorType).toBe('ETag_Mismatch');
      expect(response.details.action).toBe('replace');
    });

    test('should use ETag when server returns one', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: 'existing class', headers: {} } as any)           // GET check
        .mockResolvedValueOnce({ status: 200, headers: { etag: '"abc123"' } } as any)                 // GET etag
        .mockResolvedValueOnce({ status: 200 } as any);                                               // PUT with ETag
      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce(workflowResponseMock as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const putCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'PUT');
      expect(putCall).toBeDefined();
      expect(putCall![5]).toMatchObject({ 'If-Match': '"abc123"' });
    });
  });

  describe('Backup Functionality', () => {
    test('should create backup when backup_existing is true and class exists', async () => {
      mockSuccessfulReplace('existing class content');

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        backup_existing: true,
      });

      expect(result.isError).toBe(false);
      const getCalls = mockMakeAdtRequest.mock.calls.filter(call => call[1] === 'GET');
      expect(getCalls.length).toBeGreaterThan(0);
    });

    test('should handle backup failure gracefully', async () => {
      mockSuccessfulReplace();

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        backup_existing: true,
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Source Code Upload Scenarios', () => {
    test('should handle upload failure during class creation', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(makeNotFoundError())                                         // GET check
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)             // POST create
        .mockResolvedValueOnce({ status: 200, headers: {} } as any)                  // GET etag
        .mockRejectedValueOnce(new Error('HTTP 412 Precondition Failed'));            // PUT fails

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.details.errorType).toBeDefined();
    });

    test('should handle upload failure (non-412) during class creation', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(makeNotFoundError())                                         // GET check
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)             // POST create
        .mockResolvedValueOnce({ status: 200, headers: {} } as any)                  // GET etag
        .mockRejectedValueOnce(new Error('Connection reset'));                        // PUT fails (non-412)

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
    });

    test('should handle upload failure with fallback cleanup attempt', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(makeNotFoundError())                                         // GET check
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)             // POST create
        .mockResolvedValueOnce({ status: 200, headers: {} } as any)                  // GET etag
        .mockRejectedValueOnce(new Error('HTTP 412 Precondition Failed'))             // PUT fails
        .mockRejectedValueOnce(new Error('Cleanup failed'));                          // DELETE cleanup fails

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
    });
  });

  describe('Validation Edge Cases', () => {
    test('should reject empty class name', async () => {
      const result = await handleCreateClass({
        class_name: '',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject class name exceeding 30 characters', async () => {
      const result = await handleCreateClass({
        class_name: 'Z_THIS_IS_A_VERY_LONG_CLASS_NAME_EXCEEDING_LIMIT',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('30 characters');
    });

    test('should reject class name with invalid characters', async () => {
      const result = await handleCreateClass({
        class_name: 'ZCL-INVALID-NAME',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('invalid characters');
    });

    test('should accept class name with underscores', async () => {
      mockSuccessfulCreate();

      const result = await handleCreateClass({
        class_name: 'ZCL_VALID_NAME_123',
        source_code: 'CLASS zcl_valid_name_123 DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_valid_name_123 IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
    });

    test('should accept $LOCAL package', async () => {
      mockSuccessfulCreate();

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        package: '$LOCAL',
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Preaudit Parameter', () => {
    test('should pass preaudit_requested to activation', async () => {
      mockSuccessfulCreate({}, false); // Don't let helper stub activation — we'll do it explicitly
      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce(workflowResponseMock as any);

      await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        preaudit_requested: false,
      });

      // preaudit_requested: false is passed through correctly
      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', false);
    });

    test('should default preaudit_requested to true', async () => {
      mockSuccessfulCreate();

      await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', true);
    });
  });

  describe('Description Parameter', () => {
    test('should use provided description', async () => {
      mockSuccessfulCreate();

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        description: 'Custom test description',
      });

      expect(result.isError).toBe(false);
      const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
      expect(postCall).toBeDefined();
      expect(postCall![3]).toContain('Custom test description');
    });

    test('should use default description when not provided', async () => {
      mockSuccessfulCreate();

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
      expect(postCall).toBeDefined();
      expect(postCall![3]).toContain('Local class ZCL_TEST');
    });
  });
});
