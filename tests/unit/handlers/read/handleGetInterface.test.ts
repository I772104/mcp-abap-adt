/**
 * Unit Tests for handleGetInterface
 * 
 * Tests the GetInterface tool handler which retrieves ABAP interface
 * source code including method signatures and constants.
 */

import { handleGetInterface } from '../../../../src/handlers/handleGetInterface';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetInterface', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockInterfaceSource = `INTERFACE zif_test_interface
  PUBLIC.

  CONSTANTS:
    c_status_active TYPE char1 VALUE 'A',
    c_status_inactive TYPE char1 VALUE 'I'.

  METHODS:
    process
      IMPORTING
        iv_input TYPE string
      RETURNING
        VALUE(rv_result) TYPE string,
    
    validate
      IMPORTING
        iv_data TYPE string
      RETURNING
        VALUE(rv_valid) TYPE abap_bool.

ENDINTERFACE.`;

  const mockComplexInterface = `INTERFACE zif_complex_interface
  PUBLIC.

  TYPES:
    BEGIN OF ty_data,
      field1 TYPE string,
      field2 TYPE i,
    END OF ty_data,
    ty_data_table TYPE STANDARD TABLE OF ty_data WITH DEFAULT KEY.

  CONSTANTS:
    c_version TYPE string VALUE '1.0.0'.

  METHODS:
    get_data
      EXPORTING
        et_data TYPE ty_data_table
      RAISING
        cx_static_check,
    
    set_data
      IMPORTING
        it_data TYPE ty_data_table
      RAISING
        cx_static_check.

ENDINTERFACE.`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing interface_name', async () => {
      const result = await handleGetInterface({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Interface name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null interface_name', async () => {
      const result = await handleGetInterface({ interface_name: null }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined interface_name', async () => {
      const result = await handleGetInterface({ interface_name: undefined }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid interface_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST_INTERFACE' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Interface Name Encoding', () => {
    test('should encode interface name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      await handleGetInterface({ interface_name: 'ZIF/TEST INTERFACE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZIF%2FTEST%20INTERFACE'),
        'GET',
        30000
      );
    });

    test('should handle interface names with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      await handleGetInterface({ interface_name: 'ZIF_TEST_INTERFACE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZIF_TEST_INTERFACE'),
        'GET',
        30000
      );
    });

    test('should handle lowercase interface names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      await handleGetInterface({ interface_name: 'zif_test_interface' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('zif_test_interface'),
        'GET',
        30000
      );
    });
  });

  describe('Basic Interface Retrieval', () => {
    test('should retrieve interface source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST_INTERFACE' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockInterfaceSource);
    });

    test('should retrieve complex interface', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockComplexInterface
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_COMPLEX_INTERFACE' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('TYPES:');
      expect(result.content[0].text).toContain('RAISING');
    });

    test('should handle empty interface', async () => {
      const emptyInterface = `INTERFACE zif_empty
  PUBLIC.
ENDINTERFACE.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: emptyInterface
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_EMPTY' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(emptyInterface);
    });
  });

  describe('Interface Name Variations', () => {
    test('should handle ZIF_ prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle YIF_ prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'YIF_TEST' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle IF_ prefix (SAP standard)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'IF_BADI_INTERFACE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle interface without prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'CUSTOM_INTERFACE' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Interface not found'
      });

      const result = await handleGetInterface({ interface_name: 'ZIF_NONEXISTENT' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 500 server error', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error'
      });

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle timeout', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Request timeout'));

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    test('should handle empty response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: ''
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('');
    });
  });

  describe('Response Format', () => {
    test('should return text response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    test('should preserve source code formatting', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(result.content[0].text).toContain('INTERFACE');
      expect(result.content[0].text).toContain('METHODS:');
      expect(result.content[0].text).toContain('ENDINTERFACE');
    });

    test('should include all interface components', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockComplexInterface
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_COMPLEX' });

      expect(result.content[0].text).toContain('TYPES:');
      expect(result.content[0].text).toContain('CONSTANTS:');
      expect(result.content[0].text).toContain('METHODS:');
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/oo/interfaces/ZIF_TEST/source/main',
        'GET',
        30000
      );
    });

    test('should use GET method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should use 30 second timeout', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });

    test('should call makeAdtRequest once', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interface Content Validation', () => {
    test('should retrieve interface with method signatures', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(result.content[0].text).toContain('METHODS:');
      expect(result.content[0].text).toContain('IMPORTING');
      expect(result.content[0].text).toContain('RETURNING');
    });

    test('should retrieve interface with constants', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceSource
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_TEST' });

      expect(result.content[0].text).toContain('CONSTANTS:');
      expect(result.content[0].text).toContain('c_status_active');
    });

    test('should retrieve interface with type definitions', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockComplexInterface
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_COMPLEX' });

      expect(result.content[0].text).toContain('TYPES:');
      expect(result.content[0].text).toContain('BEGIN OF');
      expect(result.content[0].text).toContain('END OF');
    });

    test('should retrieve interface with exception raising', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockComplexInterface
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_COMPLEX' });

      expect(result.content[0].text).toContain('RAISING');
      expect(result.content[0].text).toContain('cx_static_check');
    });
  });

  describe('Common Interface Patterns', () => {
    test('should handle BAdI interface', async () => {
      const badiInterface = `INTERFACE if_ex_badi_test
  PUBLIC.
  METHODS execute.
ENDINTERFACE.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: badiInterface
      } as any);

      const result = await handleGetInterface({ interface_name: 'IF_EX_BADI_TEST' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('if_ex_badi_test');
    });

    test('should handle service interface', async () => {
      const serviceInterface = `INTERFACE zif_service
  PUBLIC.
  METHODS get_data RETURNING VALUE(rv_data) TYPE string.
ENDINTERFACE.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: serviceInterface
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_SERVICE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle repository interface', async () => {
      const repoInterface = `INTERFACE zif_repository
  PUBLIC.
  METHODS save IMPORTING iv_data TYPE string.
  METHODS load RETURNING VALUE(rv_data) TYPE string.
ENDINTERFACE.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: repoInterface
      } as any);

      const result = await handleGetInterface({ interface_name: 'ZIF_REPOSITORY' });

      expect(result.isError).toBeFalsy();
    });
  });
});