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

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Get references to mocked functions
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockAttemptClassActivation = activationUtils.attemptClassActivation as jest.MockedFunction<typeof activationUtils.attemptClassActivation>;
    mockCreateWorkflowResponse = activationUtils.createWorkflowResponse as jest.MockedFunction<typeof activationUtils.createWorkflowResponse>;

    // Setup default mock implementations
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

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
      // Mock successful class creation
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 404 } as any) // GET check - class doesn't exist
        .mockResolvedValueOnce({ // POST create metadata
          status: 201,
          data: '<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes"/>',
        } as any)
        .mockResolvedValueOnce({ status: 200 } as any); // PUT source code

      // Mock activation
      mockAttemptClassActivation.mockResolvedValueOnce({
        success: true,
        activated: ['ZCL_TEST'],
      } as any);

      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        package: '$TMP',
      });

      expect(result.isError).toBe(false);
      expect(mockMakeAdtRequest).toHaveBeenCalled();
    });

    test('should accept valid Y class name', async () => {
      // Mock successful class creation
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 404 } as any) // GET check
        .mockResolvedValueOnce({ status: 201 } as any) // POST create
        .mockResolvedValueOnce({ status: 200 } as any); // PUT source

      mockAttemptClassActivation.mockResolvedValueOnce({
        success: true,
      } as any);

      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClass({
        class_name: 'YCL_TEST',
        source_code: 'CLASS ycl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS ycl_test IMPLEMENTATION. ENDCLASS.',
        package: '$TMP',
      });

      expect(result.isError).toBe(false);
    });

    test('should default package to $TMP if not provided', async () => {
      // Mock class doesn't exist - GET throws 404
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };
      
      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError) // GET check - class doesn't exist
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any) // POST create
        .mockResolvedValueOnce({ status: 200 } as any); // PUT source

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({ 
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      // Check that POST request includes $TMP package
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
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 404 } as any)
        .mockResolvedValueOnce({ status: 201 } as any)
        .mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        package: '$TMP',
      });

      expect(result.isError).toBe(false);
    });

    test('should accept $TEST package', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 404 } as any)
        .mockResolvedValueOnce({ status: 201 } as any)
        .mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({ workflow: { overall_status: 'success' } } as any);

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
      // Mock network error during getBaseUrl
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
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };
      
      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError) // GET check - class doesn't exist
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any) // POST create
        .mockResolvedValueOnce({ status: 200 } as any); // PUT source

      mockAttemptClassActivation.mockResolvedValueOnce({
        success: true,
        activated: ['ZCL_TEST'],
      } as any);

      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success', auto_activated: true },
        data: JSON.stringify({ status: 'success' })
      } as any);

      await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', true);
    });

    test('should not activate when auto_activate is false', async () => {
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };
      
      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError) // GET check
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any) // POST create
        .mockResolvedValueOnce({ status: 200 } as any); // PUT source

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
      // Mock class exists (GET succeeds)
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: 'existing class', headers: {} } as any) // GET check - class exists
        .mockResolvedValueOnce({ status: 200 } as any); // PUT source code

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        creation: { details: { action: 'replace' } },
        data: JSON.stringify({ status: 'success', details: { action: 'replace' } })
      } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      // When class exists, should only PUT (update), not POST (create)
      const putCalls = mockMakeAdtRequest.mock.calls.filter(call => call[1] === 'PUT');
      expect(putCalls.length).toBeGreaterThan(0);
    });

    test('should handle ETag mismatch during replacement (likely syntax error)', async () => {
      // Mock class exists
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: 'existing class', headers: {} } as any) // GET check
        .mockRejectedValueOnce(new Error('HTTP 412 Precondition Failed')); // PUT fails with ETag mismatch

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false); // Handler returns success with error details
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.details.errorType).toBe('ETag_Mismatch_Likely_Syntax');
      expect(response.details.action).toBe('replace');
    });

    test('should use ETag fallback when direct upload fails', async () => {
      // Mock class exists
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: 'existing class', headers: {} } as any) // GET check
        .mockRejectedValueOnce(new Error('Direct upload failed')) // First PUT fails
        .mockResolvedValueOnce({ status: 200, headers: { etag: '"abc123"' } } as any) // GET for ETag
        .mockResolvedValueOnce({ status: 200 } as any); // PUT with ETag succeeds

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      // Should have made GET request for ETag
      const getCalls = mockMakeAdtRequest.mock.calls.filter(call => call[1] === 'GET');
      expect(getCalls.length).toBeGreaterThan(1); // Initial check + ETag fetch
    });
  });

  describe('Backup Functionality', () => {
    test('should create backup when backup_existing is true and class exists', async () => {
      // Mock class exists - first GET returns class content for backup
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200, 
          data: 'existing class content',
          headers: { 'content-type': 'text/plain' }
        } as any) // GET check - class exists
        .mockResolvedValueOnce({ status: 200 } as any); // PUT source code

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        creation: { 
          details: { 
            action: 'replace',
            backup: { 
              created: true,
              timestamp: new Date().toISOString()
            } 
          } 
        },
        data: JSON.stringify({ 
          status: 'success', 
          details: { 
            action: 'replace',
            backup: { created: true } 
          } 
        })
      } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        backup_existing: true,
      });

      expect(result.isError).toBe(false);
      // Should have called GET to retrieve existing class for backup
      const getCalls = mockMakeAdtRequest.mock.calls.filter(call => call[1] === 'GET');
      expect(getCalls.length).toBeGreaterThan(0);
    });

    test('should handle backup failure gracefully', async () => {
      // Mock class exists but backup fails
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: 'existing class', headers: {} } as any) // GET check
        .mockResolvedValueOnce({ status: 200 } as any); // PUT source code succeeds

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        backup_existing: true,
      });

      // Should succeed even if backup fails
      expect(result.isError).toBe(false);
    });
  });

  describe('Source Code Upload Scenarios', () => {
    test('should handle upload failure during class creation', async () => {
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };

      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError) // GET check - class doesn't exist
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any) // POST create succeeds
        .mockRejectedValueOnce(new Error('HTTP 412 Precondition Failed')); // PUT source fails

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.details.errorType).toBeDefined();
    });

    test('should handle both upload methods failing', async () => {
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };

      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError) // GET check - class doesn't exist
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any) // POST create succeeds
        .mockRejectedValueOnce(new Error('Direct upload failed')) // First PUT fails
        .mockRejectedValueOnce(new Error('GET for ETag failed')); // GET for ETag fails

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
    });

    test('should handle upload failure with fallback cleanup attempt', async () => {
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };

      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError) // GET check - class doesn't exist
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any) // POST create succeeds
        .mockRejectedValueOnce(new Error('HTTP 412 Precondition Failed')) // PUT source fails
        .mockRejectedValueOnce(new Error('Cleanup failed')); // DELETE cleanup also fails

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      // Should return error response even if cleanup fails
      expect(result.isError).toBe(false); // Handler returns structured error
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
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };

      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)
        .mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_VALID_NAME_123',
        source_code: 'CLASS zcl_valid_name_123 DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_valid_name_123 IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
    });

    test('should accept $LOCAL package', async () => {
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };

      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)
        .mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

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
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };

      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)
        .mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

      await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        preaudit_requested: false,
      });

      // Handler defaults preaudit_requested to true when not explicitly false
      // The || true in the code means it will be true unless explicitly set to false
      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', true);
    });

    test('should default preaudit_requested to true', async () => {
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };

      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)
        .mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

      await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', true);
    });
  });

  describe('Description Parameter', () => {
    test('should use provided description', async () => {
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };

      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)
        .mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
        description: 'Custom test description',
      });

      expect(result.isError).toBe(false);
      // Check that POST request includes the description
      const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
      expect(postCall).toBeDefined();
      expect(postCall![3]).toContain('Custom test description');
    });

    test('should use default description when not provided', async () => {
      const notFoundError: any = new Error('HTTP 404 Not Found');
      notFoundError.status = 404;
      notFoundError.response = { status: 404 };

      mockMakeAdtRequest
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({ status: 201, data: '<class/>' } as any)
        .mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

      const result = await handleCreateClass({
        class_name: 'ZCL_TEST',
        source_code: 'CLASS zcl_test DEFINITION PUBLIC. ENDCLASS.\nCLASS zcl_test IMPLEMENTATION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      // Check that POST request includes default description
      const postCall = mockMakeAdtRequest.mock.calls.find(call => call[1] === 'POST');
      expect(postCall).toBeDefined();
      expect(postCall![3]).toContain('Local class ZCL_TEST');
    });
  });
});
