/**
 * Unit Tests for handleGetClass
 * 
 * Tests the GetClass tool handler which retrieves ABAP class source code
 * including definition and implementation sections.
 */

import { handleGetClass } from '../../../../src/handlers/handleGetClass';
import * as utils from '../../../../src/lib/utils';
import * as classUtils from '../../../../src/lib/classUtils';

// Mock the utility functions
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

// Mock classUtils
jest.mock('../../../../src/lib/classUtils', () => ({
  ...jest.requireActual('../../../../src/lib/classUtils'),
  fetchIncludes: jest.fn(),
  formatMultiIncludeOutput: jest.fn(),
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
      const result = await handleGetClass({} as any);

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

  describe('Multi-Include Support (New Feature)', () => {
    let mockFetchIncludes: jest.MockedFunction<typeof classUtils.fetchIncludes>;
    let mockFormatMultiIncludeOutput: jest.MockedFunction<typeof classUtils.formatMultiIncludeOutput>;

    beforeEach(() => {
      mockFetchIncludes = classUtils.fetchIncludes as jest.MockedFunction<typeof classUtils.fetchIncludes>;
      mockFormatMultiIncludeOutput = classUtils.formatMultiIncludeOutput as jest.MockedFunction<
        typeof classUtils.formatMultiIncludeOutput
      >;
    });

    test('should use fast path for main only (backward compatible)', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS cl_test DEFINITION.',
        headers: {},
      } as any);

      const result = await handleGetClass({ class_name: 'CL_TEST' });

      expect(result.isError).toBe(false);
      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1);
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/source/main'),
        'GET',
        30000
      );
      // Should NOT call fetchIncludes for fast path
      expect(mockFetchIncludes).not.toHaveBeenCalled();
    });

    test('should support include_types parameter with single type', async () => {
      // Single ['main'] should use fast path which doesn't call fetchIncludes
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS cl_test DEFINITION.',
        headers: {},
      } as any);

      const result = await handleGetClass({
        class_name: 'CL_TEST',
        include_types: ['main'],
      });

      expect(result.isError).toBe(false);
      // Single main should use fast path
      expect(mockMakeAdtRequest).toHaveBeenCalled();
      expect(mockFetchIncludes).not.toHaveBeenCalled();
    });

    test('should fetch multiple includes when specified', async () => {
      const mockIncludes = [
        { type: 'main', source: 'MAIN SOURCE' },
        { type: 'implementations', source: 'IMPL SOURCE' },
      ];

      mockFetchIncludes.mockResolvedValueOnce(mockIncludes);
      mockFormatMultiIncludeOutput.mockReturnValueOnce('FORMATTED OUTPUT WITH BOTH');

      const result = await handleGetClass({
        class_name: 'CL_TEST',
        include_types: ['main', 'implementations'],
      });

      expect(result.isError).toBe(false);
      expect(mockFetchIncludes).toHaveBeenCalledWith('CL_TEST', ['main', 'implementations']);
      expect(mockFormatMultiIncludeOutput).toHaveBeenCalledWith(mockIncludes);
      expect(result.content[0].text).toBe('FORMATTED OUTPUT WITH BOTH');
    });

    test('should fetch all includes when type is "all"', async () => {
      const mockAllIncludes = [
        { type: 'main', source: 'MAIN' },
        { type: 'definitions', source: 'DEFS' },
        { type: 'implementations', source: 'IMPL' },
        { type: 'macros', source: 'MACROS' },
        { type: 'testclasses', source: 'TESTS' },
      ];

      mockFetchIncludes.mockResolvedValueOnce(mockAllIncludes);
      mockFormatMultiIncludeOutput.mockReturnValueOnce('ALL INCLUDES FORMATTED');

      const result = await handleGetClass({
        class_name: 'CL_TEST',
        include_types: ['all'],
      });

      expect(result.isError).toBe(false);
      expect(mockFetchIncludes).toHaveBeenCalledWith('CL_TEST', ['all']);
      expect(result.content[0].text).toBe('ALL INCLUDES FORMATTED');
    });

    test('should handle empty include_types array (default to main)', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'MAIN SOURCE',
        headers: {},
      } as any);

      const result = await handleGetClass({
        class_name: 'CL_TEST',
        include_types: [],
      });

      // Empty array should default to ['main']
      expect(result.isError).toBe(false);
    });

    test('should handle missing includes gracefully', async () => {
      const mockIncludes = [
        { type: 'main', source: 'MAIN SOURCE' },
        { type: 'definitions', source: null }, // Missing
      ];

      mockFetchIncludes.mockResolvedValueOnce(mockIncludes);
      mockFormatMultiIncludeOutput.mockReturnValueOnce('MAIN\n\n// No definitions');

      const result = await handleGetClass({
        class_name: 'CL_TEST',
        include_types: ['main', 'definitions'],
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('MAIN');
    });

    test('should format output with section separators', async () => {
      const formattedOutput = `${'='.repeat(80)}
MAIN SOURCE
${'='.repeat(80)}
CLASS cl_test DEFINITION.
ENDCLASS.

${'='.repeat(80)}
LOCAL CLASS IMPLEMENTATIONS (CCIMP)
${'='.repeat(80)}
CLASS lcl_helper IMPLEMENTATION.
ENDCLASS.`;

      mockFetchIncludes.mockResolvedValueOnce([
        { type: 'main', source: 'CLASS cl_test DEFINITION.' },
        { type: 'implementations', source: 'CLASS lcl_helper IMPLEMENTATION.' },
      ]);
      mockFormatMultiIncludeOutput.mockReturnValueOnce(formattedOutput);

      const result = await handleGetClass({
        class_name: 'CL_TEST',
        include_types: ['main', 'implementations'],
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('MAIN SOURCE');
      expect(result.content[0].text).toContain('LOCAL CLASS IMPLEMENTATIONS');
      expect(result.content[0].text).toContain('='.repeat(80));
    });

    test('should handle errors from fetchIncludes', async () => {
      mockFetchIncludes.mockRejectedValueOnce(new Error('Network error'));

      const result = await handleGetClass({
        class_name: 'CL_TEST',
        include_types: ['all'],
      });

      expect(result.isError).toBe(true);
    });

    test('should support all valid include types', async () => {
      const validTypes = ['definitions', 'implementations', 'macros', 'testclasses'];

      for (const type of validTypes) {
        mockFetchIncludes.mockResolvedValueOnce([
          { type: type, source: `${type.toUpperCase()} SOURCE` },
        ]);
        mockFormatMultiIncludeOutput.mockReturnValueOnce(`FORMATTED ${type}`);

        const result = await handleGetClass({
          class_name: 'CL_TEST',
          include_types: [type],
        });

        expect(result.isError).toBe(false);
      }
    });

    test('should maintain backward compatibility - undefined include_types', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'CLASS cl_test DEFINITION.',
        headers: {},
      } as any);

      const result = await handleGetClass({ class_name: 'CL_TEST' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('CLASS cl_test DEFINITION.');
      // Should use fast path, not call fetchIncludes
      expect(mockFetchIncludes).not.toHaveBeenCalled();
    });
  });
});
// ─────────────────────────────────────────────────────────────────────────────
// output_format: 'structured' tests
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_CLASS_SOURCE = `CLASS zcl_invoice_processing DEFINITION
  PUBLIC FINAL CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS: calculate_tax
      IMPORTING iv_amount TYPE p DECIMALS 2
      RETURNING VALUE(rv_tax) TYPE p DECIMALS 2.
    METHODS: validate_invoice
      IMPORTING iv_id TYPE string
      RETURNING VALUE(rv_valid) TYPE abap_bool.

  PRIVATE SECTION.
    DATA: mv_tax_rate TYPE p DECIMALS 2 VALUE '0.15'.

ENDCLASS.

CLASS zcl_invoice_processing IMPLEMENTATION.

  METHOD calculate_tax.
    rv_tax = iv_amount * mv_tax_rate.
  ENDMETHOD.

  METHOD validate_invoice.
    rv_valid = abap_true.
  ENDMETHOD.

ENDCLASS.`;

describe('output_format: structured', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  test('should return JSON when output_format=structured', async () => {
    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200,
      data: SAMPLE_CLASS_SOURCE,
      headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_INVOICE_PROCESSING',
      output_format: 'structured',
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.object_type).toBe('CLAS');
    expect(parsed.name).toBe('ZCL_INVOICE_PROCESSING');
  });

  test('structured output contains definition sections', async () => {
    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: SAMPLE_CLASS_SOURCE, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_INVOICE_PROCESSING',
      output_format: 'structured',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.definition.public).toContain('METHODS: calculate_tax');
    expect(parsed.definition.private).toContain('mv_tax_rate');
  });

  test('structured output contains method array', async () => {
    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: SAMPLE_CLASS_SOURCE, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_INVOICE_PROCESSING',
      output_format: 'structured',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.methods).toHaveLength(2);
    expect(parsed.methods[0].name).toBe('CALCULATE_TAX');
    expect(parsed.methods[1].name).toBe('VALIDATE_INVOICE');
    expect(parsed.methods[0].body).toContain('rv_tax = iv_amount');
    expect(parsed.methods[0].body).not.toContain('ENDMETHOD');
  });

  test('output_format=text (default) still returns plain string', async () => {
    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: SAMPLE_CLASS_SOURCE, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_INVOICE_PROCESSING',
      output_format: 'text',
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe(SAMPLE_CLASS_SOURCE);
  });

  test('omitting output_format defaults to text (backward compatible)', async () => {
    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: SAMPLE_CLASS_SOURCE, headers: {},
    } as any);

    const result = await handleGetClass({ class_name: 'ZCL_INVOICE_PROCESSING' });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe(SAMPLE_CLASS_SOURCE);
    // Must NOT be JSON — backward compatibility check
    expect(() => JSON.parse(result.content[0].text)).toThrow(); // plain ABAP text is not valid JSON
  });

  test('interface methods (IF~METHOD) parsed correctly', async () => {
    const ifSource = `CLASS zcl_handler DEFINITION PUBLIC.
  PUBLIC SECTION.
    INTERFACES: zif_handler.
ENDCLASS.
CLASS zcl_handler IMPLEMENTATION.
  METHOD zif_handler~execute.
    rv_result = 'done'.
  ENDMETHOD.
ENDCLASS.`;

    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: ifSource, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_HANDLER',
      output_format: 'structured',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.methods[0].name).toBe('ZIF_HANDLER~EXECUTE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug fix tests — covering edge cases caught in PR review
// ─────────────────────────────────────────────────────────────────────────────

describe('parser edge cases (bug fixes)', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  test('indented CLASS DEFINITION header is matched (leading whitespace)', async () => {
    const indentedSource = `  CLASS zcl_indented DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: run.
ENDCLASS.
  CLASS zcl_indented IMPLEMENTATION.
  METHOD run.
    WRITE 'hello'.
  ENDMETHOD.
ENDCLASS.`;

    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: indentedSource, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_INDENTED',
      output_format: 'structured',
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.definition.public).toContain('METHODS: run');
    expect(parsed.methods).toHaveLength(1);
    expect(parsed.methods[0].name).toBe('RUN');
  });

  test('malformed source (missing ENDMETHOD) discards unclosed buffer, does not bleed into next class', async () => {
    const malformedSource = `CLASS zcl_broken DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: broken_method, safe_method.
ENDCLASS.
CLASS zcl_broken IMPLEMENTATION.
  METHOD broken_method.
    DATA lv_x TYPE string.
ENDCLASS.
CLASS zcl_other IMPLEMENTATION.
  METHOD safe_method.
    WRITE 'safe'.
  ENDMETHOD.
ENDCLASS.`;

    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: malformedSource, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_BROKEN',
      output_format: 'structured',
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    // broken_method has no ENDMETHOD — must be discarded, not bleed
    const methodNames = parsed.methods.map((m: any) => m.name);
    expect(methodNames).not.toContain('BROKEN_METHOD');
    // safe_method from zcl_other is still captured (multi-class behaviour)
    expect(methodNames).toContain('SAFE_METHOD');
    // safe_method body must NOT contain broken_method's lines
    const safeMethod = parsed.methods.find((m: any) => m.name === 'SAFE_METHOD');
    expect(safeMethod?.body).not.toContain('DATA lv_x');
  });

  test('indented CLASS IMPLEMENTATION header is matched', async () => {
    const source = `CLASS zcl_test DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS run.
ENDCLASS.
  CLASS zcl_test IMPLEMENTATION.
  METHOD run.
    rv_result = abap_true.
  ENDMETHOD.
ENDCLASS.`;

    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: source, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_TEST',
      output_format: 'structured',
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.methods).toHaveLength(1);
    expect(parsed.methods[0].name).toBe('RUN');
  });

  test('indented ENDCLASS. is matched correctly (leading whitespace)', async () => {
    const source = `CLASS zcl_indented_end DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: run.
  ENDCLASS.
CLASS zcl_indented_end IMPLEMENTATION.
  METHOD run.
    WRITE 'test'.
  ENDMETHOD.
  ENDCLASS.`;

    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: source, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_INDENTED_END',
      output_format: 'structured',
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    // Parser must exit the DEFINITION block — not leak into IMPLEMENTATION
    expect(parsed.definition.public).toContain('METHODS: run');
    expect(parsed.definition.public).not.toContain('METHOD run');
    expect(parsed.methods).toHaveLength(1);
    expect(parsed.methods[0].name).toBe('RUN');
  });

  test('currentSection resets between CLASS DEFINITION blocks (local class bleed prevention)', async () => {
    const source = `CLASS zcl_main DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: main_method.
  PRIVATE SECTION.
    DATA mv_val TYPE string.
ENDCLASS.
CLASS lcl_helper DEFINITION.
    METHODS: helper_method.
ENDCLASS.
CLASS zcl_main IMPLEMENTATION.
  METHOD main_method.
    rv_x = mv_val.
  ENDMETHOD.
ENDCLASS.
CLASS lcl_helper IMPLEMENTATION.
  METHOD helper_method.
    WRITE 'helper'.
  ENDMETHOD.
ENDCLASS.`;

    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: source, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_MAIN',
      output_format: 'structured',
    });

    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    // Local class helper_method lines must NOT appear in the main class private section
    expect(parsed.definition.private).toContain('DATA mv_val');
    expect(parsed.definition.private).not.toContain('helper_method');
  });

  test('ENDMETHOD line is NOT included in the method body', async () => {
    const source = `CLASS zcl_clean DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: run.
ENDCLASS.
CLASS zcl_clean IMPLEMENTATION.
  METHOD run.
    WRITE 'hello'.
  ENDMETHOD.
ENDCLASS.`;

    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: source, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_CLEAN',
      output_format: 'structured',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.methods[0].body).toContain("WRITE 'hello'");
    expect(parsed.methods[0].body).not.toContain('ENDMETHOD');
  });

  test('null response.data is handled gracefully (no crash)', async () => {
    mockMakeAdtRequest.mockResolvedValueOnce({
      status: 200, data: null, headers: {},
    } as any);

    const result = await handleGetClass({
      class_name: 'ZCL_NULL',
      output_format: 'structured',
    });

    // Must not crash — returns empty structured object
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.object_type).toBe('CLAS');
    expect(parsed.methods).toHaveLength(0);
  });
});
