/**
 * Unit Tests for handleGetFunctionGroup
 * 
 * Tests the GetFunctionGroup tool handler which retrieves ABAP function group
 * main program source code.
 */

import { handleGetFunctionGroup } from '../../../../src/handlers/handleGetFunctionGroup';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetFunctionGroup', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockFunctionGroupSource = `FUNCTION-POOL ztest_fg.

INCLUDE lztest_fgtop.
INCLUDE lztest_fguxx.`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing function_group', async () => {
      const result = await handleGetFunctionGroup({}) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Function Group');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null function_group', async () => {
      const result = await handleGetFunctionGroup({ function_group: null }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid function_group', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFunctionGroupSource
      } as any);
      const result = await handleGetFunctionGroup({ function_group: 'ZTEST_FG' });
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Function Group Name Encoding', () => {
    test('should encode function group with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFunctionGroupSource
      } as any);
      await handleGetFunctionGroup({ function_group: 'Z/TEST FG' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FTEST%20FG'),
        'GET',
        30000
      );
    });
  });

  describe('Basic Function Group Retrieval', () => {
    test('should retrieve function group source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFunctionGroupSource
      } as any);
      const result = await handleGetFunctionGroup({ function_group: 'ZTEST_FG' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockFunctionGroupSource);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
      const result = await handleGetFunctionGroup({ function_group: 'ZTEST' }) as any;
      expect(result.isError).toBe(true);
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Function group not found'
      });
      const result = await handleGetFunctionGroup({ function_group: 'ZNONEXISTENT' }) as any;
      expect(result.isError).toBe(true);
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFunctionGroupSource
      } as any);
      await handleGetFunctionGroup({ function_group: 'ZTEST' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/functions/groups/ZTEST/source/main',
        'GET',
        30000
      );
    });
  });
});