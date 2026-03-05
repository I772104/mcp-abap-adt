/**
 * Unit Tests for handleGetTransaction
 * 
 * Tests the GetTransaction tool handler which retrieves ABAP transaction
 * details including package, application component, and properties.
 */

import { handleGetTransaction } from '../../../../src/handlers/handleGetTransaction';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetTransaction', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockTransactionData = `<?xml version="1.0" encoding="UTF-8"?>
<properties>
  <transaction>SE38</transaction>
  <package>SYST</package>
  <application>BC</application>
  <description>ABAP Editor</description>
</properties>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing transaction_name', async () => {
      const result = await handleGetTransaction({}) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Transaction name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null transaction_name', async () => {
      const result = await handleGetTransaction({ transaction_name: null }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined transaction_name', async () => {
      const result = await handleGetTransaction({ transaction_name: undefined }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid transaction_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTransactionData
      } as any);
      const result = await handleGetTransaction({ transaction_name: 'SE38' });
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Transaction Name Encoding', () => {
    test('should encode transaction name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTransactionData
      } as any);
      await handleGetTransaction({ transaction_name: 'Z/TEST' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FTEST'),
        'GET',
        30000
      );
    });

    test('should handle transaction names with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTransactionData
      } as any);
      await handleGetTransaction({ transaction_name: 'Z_TEST' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z_TEST'),
        'GET',
        30000
      );
    });
  });

  describe('Basic Transaction Retrieval', () => {
    test('should retrieve transaction data', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTransactionData
      } as any);
      const result = await handleGetTransaction({ transaction_name: 'SE38' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockTransactionData);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
      const result = await handleGetTransaction({ transaction_name: 'SE38' }) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Transaction not found'
      });
      const result = await handleGetTransaction({ transaction_name: 'ZNONEXISTENT' }) as any;
      expect(result.isError).toBe(true);
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTransactionData
      } as any);
      await handleGetTransaction({ transaction_name: 'SE38' });
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/sap/bc/adt/repository/informationsystem/objectproperties/values'),
        'GET',
        30000
      );
    });
  });
});