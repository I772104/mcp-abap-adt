/**
 * Unit Tests for handleGetInclude
 * 
 * Tests the GetInclude tool handler which retrieves ABAP include
 * program source code used in reports, function groups, and classes.
 */

import { handleGetInclude } from '../../../../src/handlers/handleGetInclude';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetInclude', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockTopInclude = `*&---------------------------------------------------------------------*
*& Include          Z_INCLUDE_TOP
*&---------------------------------------------------------------------*

TABLES: mara, makt.

DATA: gv_matnr TYPE matnr,
      gt_data  TYPE TABLE OF mara.`;

  const mockFormInclude = `*&---------------------------------------------------------------------*
*& Include          Z_INCLUDE_FORMS
*&---------------------------------------------------------------------*

FORM process_data.
  SELECT * FROM mara INTO TABLE gt_data UP TO 100 ROWS.
ENDFORM.

FORM display_data.
  LOOP AT gt_data INTO DATA(ls_data).
    WRITE: / ls_data-matnr.
  ENDLOOP.
ENDFORM.`;

  const mockClassInclude = `*"* use this source file for the definition and implementation of
*"* local helper classes, interface definitions and type
*"* declarations

CLASS lcl_helper DEFINITION.
  PUBLIC SECTION.
    METHODS: process RETURNING VALUE(rv_result) TYPE string.
ENDCLASS.

CLASS lcl_helper IMPLEMENTATION.
  METHOD process.
    rv_result = 'Processed'.
  ENDMETHOD.
ENDCLASS.`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing include_name', async () => {
      const result = await handleGetInclude({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Include name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null include_name', async () => {
      const result = await handleGetInclude({ include_name: null }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined include_name', async () => {
      const result = await handleGetInclude({ include_name: undefined }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid include_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE_TOP' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Include Name Encoding', () => {
    test('should encode include name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      await handleGetInclude({ include_name: 'Z/INCLUDE TOP' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FINCLUDE%20TOP'),
        'GET',
        30000
      );
    });

    test('should handle include names with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      await handleGetInclude({ include_name: 'Z_INCLUDE_TOP' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z_INCLUDE_TOP'),
        'GET',
        30000
      );
    });

    test('should handle lowercase include names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      await handleGetInclude({ include_name: 'z_include_top' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('z_include_top'),
        'GET',
        30000
      );
    });
  });

  describe('Basic Include Retrieval', () => {
    test('should retrieve TOP include source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE_TOP' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockTopInclude);
    });

    test('should retrieve FORMS include source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFormInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE_FORMS' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('FORM');
      expect(result.content[0].text).toContain('ENDFORM');
    });

    test('should retrieve class include source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockClassInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'ZCL_TEST_LOCALS' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('CLASS');
      expect(result.content[0].text).toContain('ENDCLASS');
    });

    test('should handle empty include', async () => {
      const emptyInclude = `*&---------------------------------------------------------------------*
*& Include Z_EMPTY
*&---------------------------------------------------------------------*`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: emptyInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_EMPTY' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(emptyInclude);
    });
  });

  describe('Include Type Variations', () => {
    test('should handle TOP includes (data declarations)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_PROGRAM_TOP' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('TABLES:');
      expect(result.content[0].text).toContain('DATA:');
    });

    test('should handle FORM includes (subroutines)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFormInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_PROGRAM_FORMS' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('FORM');
    });

    test('should handle PBO includes (screen logic)', async () => {
      const pboInclude = `*&---------------------------------------------------------------------*
*& Include Z_MODULE_PBO
*&---------------------------------------------------------------------*

MODULE status_0100 OUTPUT.
  SET PF-STATUS 'MAIN'.
ENDMODULE.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: pboInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_MODULE_PBO' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('MODULE');
      expect(result.content[0].text).toContain('OUTPUT');
    });

    test('should handle PAI includes (screen logic)', async () => {
      const paiInclude = `*&---------------------------------------------------------------------*
*& Include Z_MODULE_PAI
*&---------------------------------------------------------------------*

MODULE user_command_0100 INPUT.
  CASE sy-ucomm.
    WHEN 'BACK'.
      LEAVE TO SCREEN 0.
  ENDCASE.
ENDMODULE.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: paiInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_MODULE_PAI' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('MODULE');
      expect(result.content[0].text).toContain('INPUT');
    });

    test('should handle function group includes', async () => {
      const fgInclude = `*&---------------------------------------------------------------------*
*& Include LZFG_TESTTOP
*&---------------------------------------------------------------------*

FUNCTION-POOL zfg_test.

DATA: gv_initialized TYPE abap_bool.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: fgInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'LZFG_TESTTOP' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('FUNCTION-POOL');
    });
  });

  describe('Include Name Patterns', () => {
    test('should handle Z_ prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle Y_ prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Y_INCLUDE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle L prefix (function group)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'LZFG_TESTTOP' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle class local includes', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockClassInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'ZCL_TEST_LOCALS' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Include not found'
      });

      const result = await handleGetInclude({ include_name: 'Z_NONEXISTENT' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 500 server error', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error'
      });

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle timeout', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Request timeout'));

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    test('should handle empty response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: ''
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('');
    });
  });

  describe('Response Format', () => {
    test('should return text response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    test('should preserve source code formatting', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_INCLUDE' });

      expect(result.content[0].text).toContain('Include');
      expect(result.content[0].text).toContain('TABLES:');
      expect(result.content[0].text).toContain('DATA:');
    });

    test('should include all include components', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFormInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_FORMS' });

      expect(result.content[0].text).toContain('FORM');
      expect(result.content[0].text).toContain('SELECT');
      expect(result.content[0].text).toContain('LOOP');
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      await handleGetInclude({ include_name: 'Z_INCLUDE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/programs/includes/Z_INCLUDE/source/main',
        'GET',
        30000
      );
    });

    test('should use GET method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      await handleGetInclude({ include_name: 'Z_INCLUDE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should use 30 second timeout', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      await handleGetInclude({ include_name: 'Z_INCLUDE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });

    test('should call makeAdtRequest once', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      await handleGetInclude({ include_name: 'Z_INCLUDE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Include Content Validation', () => {
    test('should retrieve include with global data', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTopInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_TOP' });

      expect(result.content[0].text).toContain('TABLES:');
      expect(result.content[0].text).toContain('DATA:');
    });

    test('should retrieve include with subroutines', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockFormInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_FORMS' });

      expect(result.content[0].text).toContain('FORM');
      expect(result.content[0].text).toContain('ENDFORM');
    });

    test('should retrieve include with local classes', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockClassInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'ZCL_LOCALS' });

      expect(result.content[0].text).toContain('CLASS');
      expect(result.content[0].text).toContain('DEFINITION');
      expect(result.content[0].text).toContain('IMPLEMENTATION');
    });
  });

  describe('Common Include Patterns', () => {
    test('should handle selection screen include', async () => {
      const selectionInclude = `*&---------------------------------------------------------------------*
*& Include Z_SELECTION
*&---------------------------------------------------------------------*

SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE TEXT-001.
PARAMETERS: p_matnr TYPE matnr.
SELECT-OPTIONS: s_werks FOR mara-werks.
SELECTION-SCREEN END OF BLOCK b1.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: selectionInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_SELECTION' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('SELECTION-SCREEN');
    });

    test('should handle event include', async () => {
      const eventInclude = `*&---------------------------------------------------------------------*
*& Include Z_EVENTS
*&---------------------------------------------------------------------*

AT SELECTION-SCREEN.
  PERFORM validate_input.

START-OF-SELECTION.
  PERFORM process_data.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: eventInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'Z_EVENTS' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('AT SELECTION-SCREEN');
    });

    test('should handle class definition include', async () => {
      const classDefInclude = `*"* public components of class ZCL_TEST
*"* do not include other source files here!!!

CLASS zcl_test DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS: process.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: classDefInclude
      } as any);

      const result = await handleGetInclude({ include_name: 'ZCL_TEST_DEFINITION' });

      expect(result.isError).toBeFalsy();
    });
  });
});