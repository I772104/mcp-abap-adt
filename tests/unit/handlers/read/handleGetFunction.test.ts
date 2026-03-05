/**
 * Unit Tests for handleGetFunction
 * 
 * Tests the GetFunction tool handler which retrieves ABAP function module
 * source code from function groups.
 */

import { handleGetFunction } from '../../../../src/handlers/handleGetFunction';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetFunction', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockFunctionSource = `FUNCTION z_test_function.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING
*"     VALUE(IV_INPUT) TYPE  STRING
*"  EXPORTING
*"     VALUE(EV_OUTPUT) TYPE  STRING
*"----------------------------------------------------------------------
  ev_output = iv_input.
ENDFUNCTION.`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing both parameters', async () => {
      const result = await handleGetFunction({}) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Function name and group');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject missing function_name', async () => {
      const result = await handleGetFunction({ function_group: 'ZTEST' }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject missing function_group', async () => {
      const result = await handleGetFunction({ function_name: 'Z_TEST_FUNCTION' }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid parameters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFunctionSource
      } as any);
      const result = await handleGetFunction({ 
        function_name: 'Z_TEST_FUNCTION',
        function_group: 'ZTEST'
      });
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Parameter Encoding', () => {
    test('should encode function name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFunctionSource
      } as any);
      await handleGetFunction({ 
        function_name: 'Z/TEST FUNCTION',
        function_group: 'ZTEST'
      });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FTEST%20FUNCTION'),
        'GET',
        30000
      );
    });

    test('should encode function group with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFunctionSource
      } as any);
      await handleGetFunction({ 
        function_name: 'Z_TEST',
        function_group: 'Z/TEST GROUP'
      });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FTEST%20GROUP'),
        'GET',
        30000
      );
    });
  });

  describe('Basic Function Retrieval', () => {
    test('should retrieve function source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFunctionSource
      } as any);
      const result = await handleGetFunction({ 
        function_name: 'Z_TEST_FUNCTION',
        function_group: 'ZTEST'
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockFunctionSource);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
      const result = await handleGetFunction({ 
        function_name: 'Z_TEST',
        function_group: 'ZTEST'
      }) as any;
      expect(result.isError).toBe(true);
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Function not found'
      });
      const result = await handleGetFunction({ 
        function_name: 'Z_NONEXISTENT',
        function_group: 'ZTEST'
      }) as any;
      expect(result.isError).toBe(true);
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFunctionSource
      } as any);
      await handleGetFunction({ 
        function_name: 'Z_TEST',
        function_group: 'ZTEST'
      });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/functions/groups/ZTEST/fmodules/Z_TEST/source/main',
        'GET',
        30000
      );
    });
  });
});