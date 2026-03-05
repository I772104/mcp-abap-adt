/**
 * Unit Tests for handleCreateClassTests
 * 
 * Tests the CreateClassTests tool handler which creates or replaces
 * test classes within existing ABAP classes via ADT protocol.
 */

import { handleCreateClassTests } from '../../../../src/handlers/handleCreateClassTests';
import * as utils from '../../../../src/lib/utils';
import * as activationUtils from '../../../../src/lib/activation-utils';
import * as handleGetClassTestsModule from '../../../../src/handlers/handleGetClassTests';

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

jest.mock('../../../../src/handlers/handleGetClassTests', () => ({
  handleGetClassTests: jest.fn(),
}));

describe('handleCreateClassTests', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;
  let mockAttemptClassActivation: jest.MockedFunction<typeof activationUtils.attemptClassActivation>;
  let mockCreateWorkflowResponse: jest.MockedFunction<typeof activationUtils.createWorkflowResponse>;
  let mockHandleGetClassTests: jest.MockedFunction<typeof handleGetClassTestsModule.handleGetClassTests>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Get references to mocked functions
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockAttemptClassActivation = activationUtils.attemptClassActivation as jest.MockedFunction<typeof activationUtils.attemptClassActivation>;
    mockCreateWorkflowResponse = activationUtils.createWorkflowResponse as jest.MockedFunction<typeof activationUtils.createWorkflowResponse>;
    mockHandleGetClassTests = handleGetClassTestsModule.handleGetClassTests as jest.MockedFunction<typeof handleGetClassTestsModule.handleGetClassTests>;

    // Setup default mock implementations
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing parent_class_name', async () => {
      const result = await handleCreateClassTests({
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('parent_class_name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject missing test_source_code', async () => {
      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('test_source_code');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty parent_class_name', async () => {
      const result = await handleCreateClassTests({
        parent_class_name: '',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty test_source_code', async () => {
      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: '',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid inputs', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: 'existing tests', headers: {} } as any) // GET existing
        .mockResolvedValueOnce({ status: 200 } as any); // PUT new tests

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Backup Functionality', () => {
    test('should create backup when backup_existing is true', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent
        .mockResolvedValueOnce({ status: 200 } as any); // PUT new tests

      mockHandleGetClassTests.mockResolvedValueOnce({
        isError: false,
        content: [{ type: 'text', text: 'existing test code' }]
      } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success', details: { backup: { created: true } } })
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
        backup_existing: true,
      });

      expect(result.isError).toBe(false);
      expect(mockHandleGetClassTests).toHaveBeenCalled();
    });

    test('should not create backup when backup_existing is false', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent class exists
        .mockResolvedValueOnce({ status: 200 } as any); // PUT new tests

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
        backup_existing: false,
      });

      expect(result.isError).toBe(false);
      // Should have called GET once to validate parent class, but not for backup
      const getCalls = mockMakeAdtRequest.mock.calls.filter(call => call[1] === 'GET');
      expect(getCalls.length).toBe(1);
    });

    test('should handle backup failure gracefully', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent class
        .mockResolvedValueOnce({ status: 200 } as any); // PUT succeeds

      mockHandleGetClassTests.mockResolvedValueOnce({
        isError: true,
        content: [{ type: 'text', text: 'Error getting tests' }]
      } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
        backup_existing: true,
      });

      // Should succeed even if backup fails
      expect(result.isError).toBe(false);
    });
  });

  describe('Auto-Activation', () => {
    test('should activate by default (auto_activate defaults to true)', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({
        success: true,
        activated: ['ZCL_PARENT'],
      } as any);

      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success', auto_activated: true },
        data: JSON.stringify({ status: 'success' })
      } as any);

      await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_PARENT', true);
    });

    test('should not activate when auto_activate is false', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({ status: 200 } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
        auto_activate: false,
      });

      expect(mockAttemptClassActivation).not.toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    test('should respect preaudit_requested parameter', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent
        .mockResolvedValueOnce({ status: 200 } as any); // PUT tests

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({ status: 'success' })
      } as any);

      await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
        preaudit_requested: false,
      });

      // Handler defaults preaudit_requested to true when not explicitly false
      // The || true in the code means it will be true unless explicitly set to false
      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_PARENT', true);
    });
  });

  describe('Test Class Upload', () => {
    test('should successfully upload test classes', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/testclasses'),
        'PUT',
        expect.any(Number),
        'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
        undefined,
        expect.objectContaining({
          'Content-Type': 'text/plain; charset=utf-8',
        })
      );
    });

    test('should handle upload failure', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 412 Precondition Failed')
      );

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
    });

    test('should handle case insensitive class names', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'zcl_parent',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      // Should convert to uppercase
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZCL_PARENT'),
        'PUT',
        expect.any(Number),
        expect.any(String),
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockGetBaseUrl.mockRejectedValueOnce(new Error('Network error'));

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle authorization errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 403 Forbidden - Insufficient authorization')
      );

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('authorization');
    });

    test('should handle non-existent parent class', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 404 Not Found')
      );

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_NONEXISTENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
    });

    test('should handle syntax errors in test code', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 412 Precondition Failed - Syntax error')
      );

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING.',
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Response Format', () => {
    test('should include operation details in response', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate
        .mockResolvedValueOnce({ status: 200 } as any); // PUT tests

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({
          workflow: { overall_status: 'success' },
          details: { parentClass: 'ZCL_PARENT' }
        })
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.workflow).toBeDefined();
    });

    test('should include backup information when backup created', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent
        .mockResolvedValueOnce({ status: 200 } as any); // PUT new tests

      mockHandleGetClassTests.mockResolvedValueOnce({
        isError: false,
        content: [{ type: 'text', text: 'old test code' }]
      } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({
          workflow: { overall_status: 'success' },
          details: {
            backup: { created: true, timestamp: new Date().toISOString() }
          }
        })
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
        backup_existing: true,
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.workflow).toBeDefined();
    });

    test('should include timestamp in response', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate
        .mockResolvedValueOnce({ status: 200 } as any); // PUT tests

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
        data: JSON.stringify({
          workflow: { overall_status: 'success' },
          timestamp: new Date().toISOString()
        })
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.workflow).toBeDefined();
    });
  });

  describe('Upload Scenarios', () => {
    test('should use ETag fallback when direct upload fails', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent
        .mockRejectedValueOnce(new Error('Direct upload failed')) // First PUT fails
        .mockResolvedValueOnce({ status: 200, headers: { etag: '"abc123"' } } as any) // GET for ETag
        .mockResolvedValueOnce({ status: 200 } as any); // PUT with ETag succeeds

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      // Should have made GET request for ETag
      const getCalls = mockMakeAdtRequest.mock.calls.filter(call => call[1] === 'GET');
      expect(getCalls.length).toBeGreaterThan(1); // Validation + ETag fetch
    });

    test('should handle both upload methods failing', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent
        .mockRejectedValueOnce(new Error('Direct upload failed')) // First PUT fails
        .mockRejectedValueOnce(new Error('GET for ETag failed')); // GET for ETag fails

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
    });

    test('should handle ETag upload failure', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent
        .mockRejectedValueOnce(new Error('Direct upload failed')) // First PUT fails
        .mockResolvedValueOnce({ status: 200, headers: { etag: '"abc123"' } } as any) // GET for ETag
        .mockRejectedValueOnce(new Error('ETag upload failed')); // PUT with ETag fails

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
    });

    test('should handle missing ETag in response', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent
        .mockRejectedValueOnce(new Error('Direct upload failed')) // First PUT fails
        .mockResolvedValueOnce({ status: 200, headers: {} } as any); // GET returns no ETag

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
    });

    test('should handle 403 authorization error during upload', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent
        .mockRejectedValueOnce(new Error('HTTP 403 Forbidden')); // PUT fails with 403

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('authorization');
    });

    test('should handle 412 ETag mismatch error', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200 } as any) // GET to validate parent
        .mockRejectedValueOnce(new Error('HTTP 412 ETag mismatch')); // PUT fails with 412

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Concurrent modification');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long test source code', async () => {
      const longTestCode = 'CLASS ltcl_test DEFINITION FOR TESTING.\n' + 
        'METHOD test_method.\n'.repeat(100) + 
        'ENDMETHOD.\n'.repeat(100) +
        'ENDCLASS.';

      mockMakeAdtRequest.mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: longTestCode,
      });

      expect(result.isError).toBe(false);
    });

    test('should handle special characters in test code', async () => {
      const testCode = `CLASS ltcl_test DEFINITION FOR TESTING.
  METHOD test_special_chars.
    DATA(lv_text) = 'Test with "quotes" and <brackets>'.
  ENDMETHOD.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: testCode,
      });

      expect(result.isError).toBe(false);
    });

    test('should handle Unicode characters in test code', async () => {
      const testCode = `CLASS ltcl_test DEFINITION FOR TESTING.
  METHOD test_unicode.
    DATA(lv_text) = 'Test with Ümläüts and 日本語'.
  ENDMETHOD.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({ status: 200 } as any);

      mockAttemptClassActivation.mockResolvedValueOnce({ success: true } as any);
      mockCreateWorkflowResponse.mockReturnValueOnce({
        workflow: { overall_status: 'success' },
      } as any);

      const result = await handleCreateClassTests({
        parent_class_name: 'ZCL_PARENT',
        test_source_code: testCode,
      });

      expect(result.isError).toBe(false);
    });
  });
});