/**
 * Unit Tests for handleDeleteLocalClass
 * 
 * Tests the DeleteLocalClass tool handler which deletes local ABAP classes
 * (Z/Y classes in local packages like $TMP).
 */

import { handleDeleteLocalClass } from '../../../../src/handlers/handleDeleteLocalClass';
import * as utils from '../../../../src/lib/utils';

// Mock the utility functions
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleDeleteLocalClass', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Get references to mocked functions
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;

    // Setup default mock implementations
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing class_name', async () => {
      const result = await handleDeleteLocalClass({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('class_name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty class_name', async () => {
      const result = await handleDeleteLocalClass({ class_name: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject class not starting with Z or Y', async () => {
      const result = await handleDeleteLocalClass({ class_name: 'CL_STANDARD' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Z or Y');
    });

    test('should accept class starting with Z', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any) // Check
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any); // Delete

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
    });

    test('should accept class starting with Y', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="YCL_TEST"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'YCL_TEST' });

      expect(result.isError).toBe(false);
    });

    test('should handle case insensitive class names', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'zcl_test' });

      expect(result.isError).toBe(false);
      // Should convert to uppercase in URI
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        expect.any(Number),
        expect.stringContaining('zcl_test'),
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('Successful Deletion', () => {
    test('should successfully delete a local class', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.details.className).toBe('ZCL_TEST');
    });

    test('should include deletion timestamp', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.details.timestamp).toBeDefined();
    });

    test('should use correct ADT endpoints', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      // Check endpoint
      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/sap/bc/adt/deletion/check'),
        'POST',
        expect.any(Number),
        expect.any(String),
        undefined,
        expect.any(Object)
      );

      // Delete endpoint
      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/sap/bc/adt/deletion/delete'),
        'POST',
        expect.any(Number),
        expect.any(String),
        undefined,
        expect.any(Object)
      );
    });

    test('should use POST HTTP method for both check and delete', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(2);
      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        'POST',
        expect.any(Number),
        expect.any(String),
        undefined,
        expect.any(Object)
      );
      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        'POST',
        expect.any(Number),
        expect.any(String),
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent class', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 404 Not Found')
      );

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_NONEXISTENT' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    test('should handle authorization errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 403 Forbidden')
      );

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('authorization');
    });

    test('should handle class in use errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 409 Conflict - Class is in use')
      );

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('locked');
    });

    test('should handle network errors', async () => {
      mockGetBaseUrl.mockRejectedValueOnce(new Error('Network error'));

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle server errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 500 Internal Server Error')
      );

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('500');
    });

    test('should handle locked class errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 423 Locked - Class is locked by another user')
      );

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('locked');
    });

    test('should handle non-deletable class', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({ 
        status: 200,
        data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="false" adtcore:packageName="$TMP"/>'
      } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      // The error message mentions locked/dependencies/in use
      expect(result.content[0].text).toMatch(/cannot be deleted|locked|dependencies|in use/i);
    });

    test('should handle non-local package', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({ 
        status: 200,
        data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="ZPACKAGE"/>'
      } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not a local package');
    });
  });


  describe('Response Format', () => {
    test('should include operation details', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.details.className).toBe('ZCL_TEST');
    });

    test('should include message', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.message).toBeDefined();
      expect(response.message).toContain('deleted successfully');
    });

    test('should include package information', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.details.package).toBe('$TMP');
    });
  });

  describe('Edge Cases', () => {
    test('should handle class name with underscores', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_MY_TEST_CLASS"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_MY_TEST_CLASS' });

      expect(result.isError).toBe(false);
    });

    test('should handle class name with numbers', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST123"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST123' });

      expect(result.isError).toBe(false);
    });

    test('should reject class name exceeding 30 characters', async () => {
      const longName = 'Z' + 'A'.repeat(30); // 31 chars total (exceeds ABAP limit)
      const result = await handleDeleteLocalClass({ class_name: longName });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('30 characters');
    });

    test('should handle class name with mixed case', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      const result = await handleDeleteLocalClass({ class_name: 'ZcL_TeSt' });

      expect(result.isError).toBe(false);
    });
  });

  describe('Timeout Handling', () => {
    test('should use appropriate timeout for check and delete', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:checkResponse del:isDeletable="true" adtcore:packageName="$TMP"/>'
        } as any)
        .mockResolvedValueOnce({ 
          status: 200,
          data: '<?xml version="1.0"?><del:deleteResponse del:isDeleted="true" adtcore:name="ZCL_TEST"/>'
        } as any);

      await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      // Check call with 10s timeout
      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        'POST',
        10000,
        expect.any(String),
        undefined,
        expect.any(Object)
      );

      // Delete call with 30s timeout
      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        'POST',
        30000,
        expect.any(String),
        undefined,
        expect.any(Object)
      );
    });

    test('should handle timeout errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const result = await handleDeleteLocalClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });
  });
});