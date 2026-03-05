/**
 * Unit Tests for handleGetProgram
 * 
 * Tests the GetProgram tool handler which retrieves ABAP program
 * source code including reports, module pools, and function groups.
 */

import { handleGetProgram } from '../../../../src/handlers/handleGetProgram';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetProgram', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockReportSource = `REPORT z_test_report.

DATA: lv_result TYPE string.

START-OF-SELECTION.
  lv_result = 'Hello World'.
  WRITE: / lv_result.`;

  const mockModulePoolSource = `PROGRAM z_module_pool.

TABLES: mara.

MODULE status_0100 OUTPUT.
  SET PF-STATUS 'MAIN'.
  SET TITLEBAR 'TITLE'.
ENDMODULE.

MODULE user_command_0100 INPUT.
  CASE sy-ucomm.
    WHEN 'BACK' OR 'EXIT' OR 'CANCEL'.
      LEAVE PROGRAM.
  ENDCASE.
ENDMODULE.`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing program_name', async () => {
      const result = await handleGetProgram({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Program name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null program_name', async () => {
      const result = await handleGetProgram({ program_name: null }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined program_name', async () => {
      const result = await handleGetProgram({ program_name: undefined }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid program_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_TEST_REPORT' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Program Name Encoding', () => {
    test('should encode program name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      await handleGetProgram({ program_name: 'Z/TEST REPORT' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FTEST%20REPORT'),
        'GET',
        30000
      );
    });

    test('should handle program names with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      await handleGetProgram({ program_name: 'Z_TEST_REPORT' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z_TEST_REPORT'),
        'GET',
        30000
      );
    });

    test('should handle lowercase program names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      await handleGetProgram({ program_name: 'z_test_report' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('z_test_report'),
        'GET',
        30000
      );
    });
  });

  describe('Basic Program Retrieval', () => {
    test('should retrieve report source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_TEST_REPORT' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockReportSource);
    });

    test('should retrieve module pool source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockModulePoolSource
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_MODULE_POOL' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('MODULE');
      expect(result.content[0].text).toContain('ENDMODULE');
    });

    test('should handle empty program', async () => {
      const emptyProgram = `REPORT z_empty.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: emptyProgram
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_EMPTY' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(emptyProgram);
    });
  });

  describe('Program Type Variations', () => {
    test('should handle executable programs (reports)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_REPORT' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('REPORT');
    });

    test('should handle module pools', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockModulePoolSource
      } as any);

      const result = await handleGetProgram({ program_name: 'SAPMZ_MODULE' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('PROGRAM');
    });

    test('should handle function group main programs', async () => {
      const functionGroupProgram = `FUNCTION-POOL z_function_group.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: functionGroupProgram
      } as any);

      const result = await handleGetProgram({ program_name: 'SAPLZ_FUNCTION_GROUP' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('FUNCTION-POOL');
    });

    test('should handle include programs', async () => {
      const includeProgram = `*&---------------------------------------------------------------------*
*& Include Z_INCLUDE_TOP
*&---------------------------------------------------------------------*

DATA: gv_variable TYPE string.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: includeProgram
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_INCLUDE_TOP' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Include');
    });
  });

  describe('Program Name Prefixes', () => {
    test('should handle Z_ prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_TEST' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle Y_ prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      const result = await handleGetProgram({ program_name: 'Y_TEST' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle SAPM prefix (module pools)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockModulePoolSource
      } as any);

      const result = await handleGetProgram({ program_name: 'SAPMZ_TEST' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle SAPL prefix (function groups)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: 'FUNCTION-POOL z_test.'
      } as any);

      const result = await handleGetProgram({ program_name: 'SAPLZ_TEST' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetProgram({ program_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Program not found'
      });

      const result = await handleGetProgram({ program_name: 'Z_NONEXISTENT' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await handleGetProgram({ program_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 500 server error', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error'
      });

      const result = await handleGetProgram({ program_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle timeout', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Request timeout'));

      const result = await handleGetProgram({ program_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    test('should handle empty response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: ''
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_TEST' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('');
    });
  });

  describe('Response Format', () => {
    test('should return text response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_TEST' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    test('should preserve source code formatting', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_TEST' });

      expect(result.content[0].text).toContain('REPORT');
      expect(result.content[0].text).toContain('DATA:');
      expect(result.content[0].text).toContain('START-OF-SELECTION');
    });

    test('should include all program components', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockModulePoolSource
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_MODULE' });

      expect(result.content[0].text).toContain('PROGRAM');
      expect(result.content[0].text).toContain('TABLES:');
      expect(result.content[0].text).toContain('MODULE');
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      await handleGetProgram({ program_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/programs/programs/Z_TEST/source/main',
        'GET',
        30000
      );
    });

    test('should use GET method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      await handleGetProgram({ program_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should use 30 second timeout', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      await handleGetProgram({ program_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });

    test('should call makeAdtRequest once', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockReportSource
      } as any);

      await handleGetProgram({ program_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Program Content Validation', () => {
    test('should retrieve program with selection screen', async () => {
      const programWithSelection = `REPORT z_test.

PARAMETERS: p_input TYPE string.
SELECT-OPTIONS: s_matnr FOR mara-matnr.

START-OF-SELECTION.
  WRITE: / p_input.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: programWithSelection
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_TEST' });

      expect(result.content[0].text).toContain('PARAMETERS:');
      expect(result.content[0].text).toContain('SELECT-OPTIONS:');
    });

    test('should retrieve program with subroutines', async () => {
      const programWithForms = `REPORT z_test.

START-OF-SELECTION.
  PERFORM process_data.

FORM process_data.
  WRITE: / 'Processing'.
ENDFORM.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: programWithForms
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_TEST' });

      expect(result.content[0].text).toContain('PERFORM');
      expect(result.content[0].text).toContain('FORM');
      expect(result.content[0].text).toContain('ENDFORM');
    });

    test('should retrieve program with events', async () => {
      const programWithEvents = `REPORT z_test.

INITIALIZATION.
  WRITE: / 'Init'.

START-OF-SELECTION.
  WRITE: / 'Start'.

END-OF-SELECTION.
  WRITE: / 'End'.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: programWithEvents
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_TEST' });

      expect(result.content[0].text).toContain('INITIALIZATION');
      expect(result.content[0].text).toContain('START-OF-SELECTION');
      expect(result.content[0].text).toContain('END-OF-SELECTION');
    });
  });

  describe('Common Program Patterns', () => {
    test('should handle ALV report', async () => {
      const alvReport = `REPORT z_alv_report.

DATA: gt_data TYPE TABLE OF mara.

START-OF-SELECTION.
  SELECT * FROM mara INTO TABLE gt_data UP TO 100 ROWS.
  
  CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
    EXPORTING
      i_structure_name = 'MARA'
    TABLES
      t_outtab         = gt_data.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: alvReport
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_ALV_REPORT' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('REUSE_ALV_GRID_DISPLAY');
    });

    test('should handle batch input program', async () => {
      const batchProgram = `REPORT z_batch_input.

DATA: bdcdata TYPE TABLE OF bdcdata.

START-OF-SELECTION.
  PERFORM bdc_dynpro.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: batchProgram
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_BATCH_INPUT' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle background job program', async () => {
      const backgroundProgram = `REPORT z_background.

START-OF-SELECTION.
  " Background processing
  WRITE: / 'Running in background'.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: backgroundProgram
      } as any);

      const result = await handleGetProgram({ program_name: 'Z_BACKGROUND' });

      expect(result.isError).toBeFalsy();
    });
  });
});