/**
 * Unit Tests for handleGetClass
 * 
 * Tests the GetClass tool handler which retrieves ABAP class source code
 * including definition and implementation sections.
 */

import { handleGetClass } from '../../../../src/handlers/handleGetClass';
import * as utils from '../../../../src/lib/utils';

// Mock the utility functions
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetClass', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;

    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing class_name', async () => {
      const result = await handleGetClass({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Class name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty class_name', async () => {
      const result = await handleGetClass({ class_name: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid class_name', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS zcl_test DEFINITION. ENDCLASS.',
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
    });

    test('should handle case insensitive class names', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS zcl_test DEFINITION. ENDCLASS.',
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'zcl_test' });

      expect(result.isError).toBe(false);
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('zcl_test'),
        'GET',
        expect.any(Number)
      );
    });
  });

  describe('Successful Retrieval', () => {
    test('should successfully retrieve class source code', async () => {
      const classSource = `CLASS zcl_test DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS constructor.
ENDCLASS.

CLASS zcl_test IMPLEMENTATION.
  METHOD constructor.
  ENDMETHOD.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: classSource,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe(classSource);
    });

    test('should use correct ADT endpoint', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS zcl_test DEFINITION. ENDCLASS.',
        headers: {}
      } as any);

      await handleGetClass({ class_name: 'ZCL_TEST' });

      // Handler uses encodeURIComponent which preserves case
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/sap/bc/adt/oo/classes/ZCL_TEST/source/main'),
        'GET',
        30000
      );
    });

    test('should use GET HTTP method', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS zcl_test DEFINITION. ENDCLASS.',
        headers: {}
      } as any);

      await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should retrieve class with definition and implementation', async () => {
      const fullClass = `CLASS zcl_calculator DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS add
      IMPORTING iv_a TYPE i
                iv_b TYPE i
      RETURNING VALUE(rv_result) TYPE i.
ENDCLASS.

CLASS zcl_calculator IMPLEMENTATION.
  METHOD add.
    rv_result = iv_a + iv_b.
  ENDMETHOD.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: fullClass,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_CALCULATOR' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('DEFINITION');
      expect(result.content[0].text).toContain('IMPLEMENTATION');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent class', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 404 Not Found')
      );

      const result = await handleGetClass({ class_name: 'ZCL_NONEXISTENT' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('404');
    });

    test('should handle authorization errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 403 Forbidden')
      );

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('403');
    });

    test('should handle network errors', async () => {
      mockGetBaseUrl.mockRejectedValueOnce(new Error('Network error'));

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle server errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 500 Internal Server Error')
      );

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('500');
    });

    test('should handle timeout errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    test('should handle locked class', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 423 Locked')
      );

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('423');
    });
  });

  describe('Class Types', () => {
    test('should retrieve standard class', async () => {
      const standardClass = `CLASS zcl_standard DEFINITION PUBLIC CREATE PUBLIC.
  PUBLIC SECTION.
ENDCLASS.

CLASS zcl_standard IMPLEMENTATION.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: standardClass,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_STANDARD' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('PUBLIC');
    });

    test('should retrieve abstract class', async () => {
      const abstractClass = `CLASS zcl_abstract DEFINITION PUBLIC ABSTRACT CREATE PUBLIC.
  PUBLIC SECTION.
ENDCLASS.

CLASS zcl_abstract IMPLEMENTATION.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: abstractClass,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_ABSTRACT' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('ABSTRACT');
    });

    test('should retrieve final class', async () => {
      const finalClass = `CLASS zcl_final DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
ENDCLASS.

CLASS zcl_final IMPLEMENTATION.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: finalClass,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_FINAL' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('FINAL');
    });

    test('should retrieve class with interfaces', async () => {
      const classWithInterface = `CLASS zcl_with_interface DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS zcl_with_interface IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
  ENDMETHOD.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: classWithInterface,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_WITH_INTERFACE' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('INTERFACES');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large class source', async () => {
      const largeClass = 'CLASS zcl_large DEFINITION.\n' + 
        '  PUBLIC SECTION.\n' +
        '    METHODS method.\n'.repeat(100) +
        'ENDCLASS.\n' +
        'CLASS zcl_large IMPLEMENTATION.\n' +
        '  METHOD method.\n  ENDMETHOD.\n'.repeat(100) +
        'ENDCLASS.';

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: largeClass,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_LARGE' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text.length).toBeGreaterThan(1000);
    });

    test('should handle class with special characters', async () => {
      const classWithSpecialChars = `CLASS zcl_special DEFINITION.
  PUBLIC SECTION.
    DATA lv_text TYPE string VALUE 'Test with "quotes" and <brackets>'.
ENDCLASS.

CLASS zcl_special IMPLEMENTATION.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: classWithSpecialChars,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_SPECIAL' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('"quotes"');
      expect(result.content[0].text).toContain('<brackets>');
    });

    test('should handle class with Unicode characters', async () => {
      const classWithUnicode = `CLASS zcl_unicode DEFINITION.
  PUBLIC SECTION.
    DATA lv_text TYPE string VALUE 'Test with Ümläüts and 日本語'.
ENDCLASS.

CLASS zcl_unicode IMPLEMENTATION.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: classWithUnicode,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_UNICODE' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Ümläüts');
    });

    test('should handle empty class', async () => {
      const emptyClass = `CLASS zcl_empty DEFINITION.
ENDCLASS.

CLASS zcl_empty IMPLEMENTATION.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: emptyClass,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_EMPTY' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('DEFINITION');
    });

    test('should handle class name with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS zcl_my_test_class DEFINITION. ENDCLASS.',
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_MY_TEST_CLASS' });

      expect(result.isError).toBe(false);
    });

    test('should handle class name with numbers', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS zcl_test123 DEFINITION. ENDCLASS.',
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_TEST123' });

      expect(result.isError).toBe(false);
    });
  });

  describe('Response Format', () => {
    test('should return plain text content', async () => {
      const classSource = 'CLASS zcl_test DEFINITION. ENDCLASS.';

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: classSource,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(classSource);
    });

    test('should preserve line breaks', async () => {
      const multiLineClass = `CLASS zcl_test DEFINITION.
  PUBLIC SECTION.
    METHODS test.
ENDCLASS.

CLASS zcl_test IMPLEMENTATION.
  METHOD test.
  ENDMETHOD.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: multiLineClass,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('\n');
      expect(result.content[0].text.split('\n').length).toBeGreaterThan(1);
    });

    test('should preserve indentation', async () => {
      const indentedClass = `CLASS zcl_test DEFINITION.
  PUBLIC SECTION.
    METHODS test.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: indentedClass,
        headers: {}
      } as any);

      const result = await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('  PUBLIC SECTION');
      expect(result.content[0].text).toContain('    METHODS');
    });
  });

  describe('Timeout Handling', () => {
    test('should use appropriate timeout', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS zcl_test DEFINITION. ENDCLASS.',
        headers: {}
      } as any);

      await handleGetClass({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number) // Timeout parameter
      );
    });
  });
});