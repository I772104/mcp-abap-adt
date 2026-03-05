/**
 * Unit Tests for handleGetClassTests
 * 
 * Tests the GetClassTests tool handler which retrieves local test class
 * source code from ABAP classes for unit testing.
 */

import { handleGetClassTests } from '../../../../src/handlers/handleGetClassTests';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetClassTests', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockTestClassSource = `*"* use this source file for your ABAP unit test classes

CLASS ltc_test DEFINITION FINAL FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.

  PRIVATE SECTION.
    DATA: mo_cut TYPE REF TO zcl_calculator.

    METHODS:
      setup,
      test_addition FOR TESTING,
      test_subtraction FOR TESTING.
ENDCLASS.

CLASS ltc_test IMPLEMENTATION.

  METHOD setup.
    mo_cut = NEW #( ).
  ENDMETHOD.

  METHOD test_addition.
    DATA(lv_result) = mo_cut->add( iv_a = 5 iv_b = 3 ).
    cl_abap_unit_assert=>assert_equals(
      act = lv_result
      exp = 8
      msg = 'Addition failed' ).
  ENDMETHOD.

  METHOD test_subtraction.
    DATA(lv_result) = mo_cut->subtract( iv_a = 5 iv_b = 3 ).
    cl_abap_unit_assert=>assert_equals(
      act = lv_result
      exp = 2
      msg = 'Subtraction failed' ).
  ENDMETHOD.

ENDCLASS.`;

  const mockMultipleTestClasses = `CLASS ltc_unit_test DEFINITION FINAL FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.
  PRIVATE SECTION.
    METHODS: test_method1 FOR TESTING.
ENDCLASS.

CLASS ltc_unit_test IMPLEMENTATION.
  METHOD test_method1.
    cl_abap_unit_assert=>assert_true( abap_true ).
  ENDMETHOD.
ENDCLASS.

CLASS ltc_integration_test DEFINITION FINAL FOR TESTING
  DURATION MEDIUM
  RISK LEVEL DANGEROUS.
  PRIVATE SECTION.
    METHODS: test_integration FOR TESTING.
ENDCLASS.

CLASS ltc_integration_test IMPLEMENTATION.
  METHOD test_integration.
    " Integration test logic
  ENDMETHOD.
ENDCLASS.`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing class_name', async () => {
      const result = await handleGetClassTests({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Class name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null class_name', async () => {
      const result = await handleGetClassTests({ class_name: null }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined class_name', async () => {
      const result = await handleGetClassTests({ class_name: undefined }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid class_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_CALCULATOR' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Class Name Encoding', () => {
    test('should encode class name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      await handleGetClassTests({ class_name: 'ZCL/TEST CLASS' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZCL%2FTEST%20CLASS'),
        'GET',
        30000
      );
    });

    test('should handle class names with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      await handleGetClassTests({ class_name: 'ZCL_TEST_CLASS' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZCL_TEST_CLASS'),
        'GET',
        30000
      );
    });

    test('should handle lowercase class names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      await handleGetClassTests({ class_name: 'zcl_test_class' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('zcl_test_class'),
        'GET',
        30000
      );
    });
  });

  describe('Basic Test Class Retrieval', () => {
    test('should retrieve test class source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_CALCULATOR' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockTestClassSource);
    });

    test('should retrieve multiple test classes', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMultipleTestClasses
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('ltc_unit_test');
      expect(result.content[0].text).toContain('ltc_integration_test');
    });

    test('should handle class without tests', async () => {
      const emptyTests = `*"* use this source file for your ABAP unit test classes`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: emptyTests
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_NO_TESTS' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(emptyTests);
    });
  });

  describe('Class Name Variations', () => {
    test('should handle ZCL_ prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle YCL_ prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'YCL_TEST' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle CL_ prefix (SAP standard)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'CL_ABAP_UNIT_ASSERT' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle class without prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'CUSTOM_CLASS' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Class not found'
      });

      const result = await handleGetClassTests({ class_name: 'ZCL_NONEXISTENT' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 500 server error', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error'
      });

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle timeout', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Request timeout'));

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    test('should handle empty response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: ''
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('');
    });
  });

  describe('Response Format', () => {
    test('should return text response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    test('should preserve source code formatting', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content[0].text).toContain('CLASS');
      expect(result.content[0].text).toContain('DEFINITION');
      expect(result.content[0].text).toContain('FOR TESTING');
    });

    test('should include all test class components', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content[0].text).toContain('METHODS:');
      expect(result.content[0].text).toContain('FOR TESTING');
      expect(result.content[0].text).toContain('IMPLEMENTATION');
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/oo/classes/ZCL_TEST/includes/testclasses',
        'GET',
        30000
      );
    });

    test('should use GET method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should use 30 second timeout', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });

    test('should call makeAdtRequest once', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test Class Content Validation', () => {
    test('should retrieve test class with setup method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content[0].text).toContain('setup');
      expect(result.content[0].text).toContain('METHOD setup');
    });

    test('should retrieve test class with test methods', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content[0].text).toContain('FOR TESTING');
      expect(result.content[0].text).toContain('test_addition');
      expect(result.content[0].text).toContain('test_subtraction');
    });

    test('should retrieve test class with assertions', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content[0].text).toContain('cl_abap_unit_assert');
      expect(result.content[0].text).toContain('assert_equals');
    });

    test('should retrieve test class with risk level', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content[0].text).toContain('RISK LEVEL');
      expect(result.content[0].text).toContain('HARMLESS');
    });

    test('should retrieve test class with duration', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockTestClassSource
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content[0].text).toContain('DURATION');
      expect(result.content[0].text).toContain('SHORT');
    });
  });

  describe('Common Test Patterns', () => {
    test('should handle test class with test doubles', async () => {
      const testWithDoubles = `CLASS ltc_test DEFINITION FINAL FOR TESTING.
  PRIVATE SECTION.
    DATA: mo_double TYPE REF TO zif_dependency.
    METHODS: setup, test_with_double FOR TESTING.
ENDCLASS.

CLASS ltc_test IMPLEMENTATION.
  METHOD setup.
    mo_double = CAST #( cl_abap_testdouble=>create( 'ZIF_DEPENDENCY' ) ).
  ENDMETHOD.
  METHOD test_with_double.
    " Test logic
  ENDMETHOD.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: testWithDoubles
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('cl_abap_testdouble');
    });

    test('should handle test class with fixtures', async () => {
      const testWithFixtures = `CLASS ltc_test DEFINITION FINAL FOR TESTING.
  PRIVATE SECTION.
    CLASS-DATA: go_environment TYPE REF TO if_osql_test_environment.
    CLASS-METHODS: class_setup, class_teardown.
    METHODS: test_method FOR TESTING.
ENDCLASS.

CLASS ltc_test IMPLEMENTATION.
  METHOD class_setup.
    go_environment = cl_osql_test_environment=>create( VALUE #( ( 'MARA' ) ) ).
  ENDMETHOD.
  METHOD class_teardown.
    go_environment->destroy( ).
  ENDMETHOD.
  METHOD test_method.
    " Test logic
  ENDMETHOD.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: testWithFixtures
      } as any);

      const result = await handleGetClassTests({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('class_setup');
      expect(result.content[0].text).toContain('class_teardown');
    });
  });
});