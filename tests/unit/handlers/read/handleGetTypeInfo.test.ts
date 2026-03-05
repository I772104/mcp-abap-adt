/**
 * Unit Tests for handleGetTypeInfo
 * 
 * Tests the GetTypeInfo tool handler which retrieves ABAP type information
 * including domains and data elements with fallback logic.
 */

import { handleGetTypeInfo } from '../../../../src/handlers/handleGetTypeInfo';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetTypeInfo', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockDomainData = `<?xml version="1.0" encoding="UTF-8"?>
<domain>
  <name>MATNR</name>
  <dataType>CHAR</dataType>
  <length>18</length>
  <valueTable>MARA</valueTable>
</domain>`;

  const mockDataElementData = `<?xml version="1.0" encoding="UTF-8"?>
<dataElement>
  <name>MAKTX</name>
  <domain>TEXT40</domain>
  <fieldLabel>Material Description</fieldLabel>
</dataElement>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing type_name', async () => {
      const result = await handleGetTypeInfo({}) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Type name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null type_name', async () => {
      const result = await handleGetTypeInfo({ type_name: null }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined type_name', async () => {
      const result = await handleGetTypeInfo({ type_name: undefined }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid type_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockDomainData
      } as any);
      const result = await handleGetTypeInfo({ type_name: 'MATNR' });
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Domain Retrieval (Primary)', () => {
    test('should retrieve domain information', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockDomainData
      } as any);
      const result = await handleGetTypeInfo({ type_name: 'MATNR' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockDomainData);
    });

    test('should use domain endpoint first', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockDomainData
      } as any);
      await handleGetTypeInfo({ type_name: 'MATNR' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/sap/bc/adt/ddic/domains/MATNR'),
        'GET',
        30000
      );
    });
  });

  describe('Data Element Fallback', () => {
    test('should fallback to data element when domain not found', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(new Error('Domain not found'))
        .mockResolvedValueOnce({
          status: 200,
          data: mockDataElementData
        } as any);
      
      const result = await handleGetTypeInfo({ type_name: 'MAKTX' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockDataElementData);
    });

    test('should try data element endpoint after domain fails', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(new Error('Domain not found'))
        .mockResolvedValueOnce({
          status: 200,
          data: mockDataElementData
        } as any);
      
      await handleGetTypeInfo({ type_name: 'MAKTX' });
      
      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(2);
      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/sap/bc/adt/ddic/domains/MAKTX'),
        'GET',
        30000
      );
      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/sap/bc/adt/ddic/dataelements/MAKTX'),
        'GET',
        30000
      );
    });
  });

  describe('Type Name Encoding', () => {
    test('should encode type name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockDomainData
      } as any);
      await handleGetTypeInfo({ type_name: 'Z/TYPE' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FTYPE'),
        'GET',
        30000
      );
    });

    test('should handle type names with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockDomainData
      } as any);
      await handleGetTypeInfo({ type_name: 'Z_TYPE' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z_TYPE'),
        'GET',
        30000
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors on both attempts', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));
      
      const result = await handleGetTypeInfo({ type_name: 'ZTEST' }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle 404 on both domain and data element', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce({
          response: { status: 404 },
          message: 'Domain not found'
        })
        .mockRejectedValueOnce({
          response: { status: 404 },
          message: 'Data element not found'
        });
      
      const result = await handleGetTypeInfo({ type_name: 'ZNONEXISTENT' }) as any;
      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce({
          response: { status: 401 },
          message: 'Unauthorized'
        })
        .mockRejectedValueOnce({
          response: { status: 401 },
          message: 'Unauthorized'
        });
      
      const result = await handleGetTypeInfo({ type_name: 'MATNR' }) as any;
      expect(result.isError).toBe(true);
    });

    test('should handle timeout', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Request timeout'));
      
      const result = await handleGetTypeInfo({ type_name: 'MATNR' }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });
  });

  describe('Response Format', () => {
    test('should return text response for domain', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockDomainData
      } as any);
      const result = await handleGetTypeInfo({ type_name: 'MATNR' });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    test('should return text response for data element', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({
          status: 200,
          data: mockDataElementData
        } as any);
      
      const result = await handleGetTypeInfo({ type_name: 'MAKTX' });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });
  });

  describe('API Request Details', () => {
    test('should use 30 second timeout for domain', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockDomainData
      } as any);
      await handleGetTypeInfo({ type_name: 'MATNR' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });

    test('should use 30 second timeout for data element', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({
          status: 200,
          data: mockDataElementData
        } as any);
      
      await handleGetTypeInfo({ type_name: 'MAKTX' });
      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        'GET',
        30000
      );
    });
  });

  describe('Common Type Patterns', () => {
    test('should handle standard SAP domains', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockDomainData
      } as any);
      const result = await handleGetTypeInfo({ type_name: 'MATNR' });
      expect(result.isError).toBeFalsy();
    });

    test('should handle standard SAP data elements', async () => {
      mockMakeAdtRequest
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({
          status: 200,
          data: mockDataElementData
        } as any);
      
      const result = await handleGetTypeInfo({ type_name: 'MAKTX' });
      expect(result.isError).toBeFalsy();
    });

    test('should handle custom Z types', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockDomainData
      } as any);
      const result = await handleGetTypeInfo({ type_name: 'ZTYPE' });
      expect(result.isError).toBeFalsy();
    });
  });
});