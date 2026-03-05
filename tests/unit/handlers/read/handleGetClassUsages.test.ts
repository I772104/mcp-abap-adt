/**
 * Unit Tests for handleGetClassUsages
 * 
 * Tests the GetClassUsages tool handler (DEPRECATED - use GetObjectUsages instead)
 * which retrieves where-used list for ABAP classes.
 */

import { handleGetClassUsages } from '../../../../src/handlers/handleGetClassUsages';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetClassUsages', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockUsagesResponse = `<?xml version="1.0" encoding="UTF-8"?>
<usages>
  <usage>
    <object>ZCL_CONSUMER</object>
    <type>CLAS/OC</type>
  </usage>
</usages>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing class_name', async () => {
      const result = await handleGetClassUsages({}) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Class name');
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid class_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockUsagesResponse
      } as any);
      const result = await handleGetClassUsages({ class_name: 'ZCL_TEST' });
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Class Name Processing', () => {
    test('should convert class name to uppercase', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockUsagesResponse
      } as any);
      await handleGetClassUsages({ class_name: 'zcl_test' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZCL_TEST'),
        'POST',
        30000,
        expect.any(String),
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('Basic Usages Retrieval', () => {
    test('should retrieve class usages', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockUsagesResponse
      } as any);
      const result = await handleGetClassUsages({ class_name: 'ZCL_TEST' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockUsagesResponse);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
      const result = await handleGetClassUsages({ class_name: 'ZCL_TEST' }) as any;
      expect(result.isError).toBe(true);
    });
  });

  describe('API Request Details', () => {
    test('should use POST method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockUsagesResponse
      } as any);
      await handleGetClassUsages({ class_name: 'ZCL_TEST' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        30000,
        expect.any(String),
        undefined,
        expect.objectContaining({
          'Content-Type': 'application/vnd.sap.adt.repository.usagereferences.request.v1+xml'
        })
      );
    });

    test('should include XML payload', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockUsagesResponse
      } as any);
      await handleGetClassUsages({ class_name: 'ZCL_TEST' });
      const xmlPayload = mockMakeAdtRequest.mock.calls[0][3] as string;
      expect(xmlPayload).toContain('usageReferenceRequest');
      expect(xmlPayload).toContain('ZCL_TEST');
    });
  });
});