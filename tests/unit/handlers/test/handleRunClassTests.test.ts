/**
 * Unit Tests for handleRunClassTests
 * 
 * Tests the RunClassTests tool handler which executes ABAP unit tests
 * for a class and returns formatted results.
 */

import { handleRunClassTests } from '../../../../src/handlers/handleRunClassTests';
import * as activationUtils from '../../../../src/lib/activation-utils';
import * as testRunnerUtils from '../../../../src/lib/test-runner-utils';

// Mock the utility modules
jest.mock('../../../../src/lib/activation-utils');
jest.mock('../../../../src/lib/test-runner-utils');

describe('handleRunClassTests', () => {
  let mockAttemptClassActivation: jest.MockedFunction<typeof activationUtils.attemptClassActivation>;
  let mockRunAbapUnitTests: jest.MockedFunction<typeof testRunnerUtils.runAbapUnitTests>;
  let mockCreateClassObjectSet: jest.MockedFunction<typeof testRunnerUtils.createClassObjectSet>;

  const mockTestResults = {
    class_name: 'ZCL_TEST',
    test_summary: {
      total_tests: 5,
      passed: 4,
      failed: 1,
      skipped: 0,
      errors: 0,
      warnings: 0
    },
    test_classes: [
      {
        class_name: 'LTC_TEST',
        test_methods: [
          {
            method_name: 'TEST_SUCCESS',
            status: 'passed',
            duration_ms: 10
          },
          {
            method_name: 'TEST_FAILURE',
            status: 'failed',
            duration_ms: 15,
            error_message: 'Assertion failed'
          }
        ]
      }
    ]
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    mockAttemptClassActivation = activationUtils.attemptClassActivation as jest.MockedFunction<typeof activationUtils.attemptClassActivation>;
    mockRunAbapUnitTests = testRunnerUtils.runAbapUnitTests as jest.MockedFunction<typeof testRunnerUtils.runAbapUnitTests>;
    mockCreateClassObjectSet = testRunnerUtils.createClassObjectSet as jest.MockedFunction<typeof testRunnerUtils.createClassObjectSet>;

    mockCreateClassObjectSet.mockReturnValue('<objectSet>...</objectSet>');
    mockRunAbapUnitTests.mockResolvedValue(mockTestResults);
  });

  describe('Input Validation', () => {
    test('should reject missing class_name', async () => {
      const result = await handleRunClassTests({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Class name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty class_name', async () => {
      const result = await handleRunClassTests({ class_name: '' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid class_name', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
    });
  });

  describe('Basic Test Execution', () => {
    test('should successfully run tests', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
      const response = JSON.parse(result.content[0].text);
      expect(response.class_name).toBe('ZCL_TEST');
      expect(response.test_summary).toBeDefined();
    });

    test('should call createClassObjectSet with class name', async () => {
      await handleRunClassTests({ class_name: 'ZCL_TEST' });

      expect(mockCreateClassObjectSet).toHaveBeenCalledWith('ZCL_TEST');
    });

    test('should call runAbapUnitTests with correct parameters', async () => {
      await handleRunClassTests({ class_name: 'ZCL_TEST' });

      expect(mockRunAbapUnitTests).toHaveBeenCalledWith(
        '<objectSet>...</objectSet>',
        'ZCL_TEST',
        'ZCL_TEST',
        null
      );
    });

    test('should not activate by default', async () => {
      await handleRunClassTests({ class_name: 'ZCL_TEST' });

      expect(mockAttemptClassActivation).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Activation', () => {
    test('should activate when auto_activate is true', async () => {
      mockAttemptClassActivation.mockResolvedValue({
        status: 'success',
        message: 'Activated successfully',
        timestamp: new Date().toISOString()
      });

      await handleRunClassTests({ 
        class_name: 'ZCL_TEST',
        auto_activate: true
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', true);
    });

    test('should not activate when auto_activate is false', async () => {
      await handleRunClassTests({ 
        class_name: 'ZCL_TEST',
        auto_activate: false
      });

      expect(mockAttemptClassActivation).not.toHaveBeenCalled();
    });

    test('should pass activation result to runAbapUnitTests', async () => {
      const activationResult = {
        status: 'success' as const,
        message: 'Activated successfully',
        timestamp: new Date().toISOString()
      };
      mockAttemptClassActivation.mockResolvedValue(activationResult);

      await handleRunClassTests({ 
        class_name: 'ZCL_TEST',
        auto_activate: true
      });

      expect(mockRunAbapUnitTests).toHaveBeenCalledWith(
        expect.any(String),
        'ZCL_TEST',
        'ZCL_TEST',
        activationResult
      );
    });

    test('should continue with tests even if activation fails', async () => {
      mockAttemptClassActivation.mockResolvedValue({
        status: 'error',
        message: 'Activation failed',
        timestamp: new Date().toISOString()
      });

      const result = await handleRunClassTests({ 
        class_name: 'ZCL_TEST',
        auto_activate: true
      });

      expect(result.isError).toBe(false);
      expect(mockRunAbapUnitTests).toHaveBeenCalled();
    });
  });

  describe('Preaudit Parameter', () => {
    test('should use preaudit by default', async () => {
      mockAttemptClassActivation.mockResolvedValue({
        status: 'success',
        message: 'Activated',
        timestamp: new Date().toISOString()
      });

      await handleRunClassTests({ 
        class_name: 'ZCL_TEST',
        auto_activate: true
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', true);
    });

    test('should respect preaudit_requested false', async () => {
      mockAttemptClassActivation.mockResolvedValue({
        status: 'success',
        message: 'Activated',
        timestamp: new Date().toISOString()
      });

      await handleRunClassTests({ 
        class_name: 'ZCL_TEST',
        auto_activate: true,
        preaudit_requested: false
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', false);
    });

    test('should respect preaudit_requested true', async () => {
      mockAttemptClassActivation.mockResolvedValue({
        status: 'success',
        message: 'Activated',
        timestamp: new Date().toISOString()
      });

      await handleRunClassTests({ 
        class_name: 'ZCL_TEST',
        auto_activate: true,
        preaudit_requested: true
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', true);
    });
  });

  describe('Test Results Format', () => {
    test('should return JSON formatted results', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content[0].type).toBe('text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    test('should include test summary', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.test_summary).toBeDefined();
      expect(response.test_summary.total_tests).toBe(5);
      expect(response.test_summary.passed).toBe(4);
      expect(response.test_summary.failed).toBe(1);
    });

    test('should include test classes', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.test_classes).toBeDefined();
      expect(Array.isArray(response.test_classes)).toBe(true);
      expect(response.test_classes.length).toBeGreaterThan(0);
    });

    test('should include class name in response', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.class_name).toBe('ZCL_TEST');
    });
  });

  describe('Test Scenarios', () => {
    test('should handle all tests passing', async () => {
      mockRunAbapUnitTests.mockResolvedValue({
        class_name: 'ZCL_TEST',
        test_summary: {
          total_tests: 3,
          passed: 3,
          failed: 0,
          skipped: 0,
          errors: 0,
          warnings: 0
        },
        test_classes: []
      } as any);

      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.test_summary.passed).toBe(3);
      expect(response.test_summary.failed).toBe(0);
    });

    test('should handle all tests failing', async () => {
      mockRunAbapUnitTests.mockResolvedValue({
        class_name: 'ZCL_TEST',
        test_summary: {
          total_tests: 3,
          passed: 0,
          failed: 3,
          skipped: 0,
          errors: 0,
          warnings: 0
        },
        test_classes: []
      } as any);

      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.test_summary.failed).toBe(3);
    });

    test('should handle mixed test results', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.test_summary.passed).toBeGreaterThan(0);
      expect(response.test_summary.failed).toBeGreaterThan(0);
    });

    test('should handle no tests found', async () => {
      mockRunAbapUnitTests.mockResolvedValue({
        class_name: 'ZCL_TEST',
        test_summary: {
          total_tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          errors: 0,
          warnings: 0
        },
        test_classes: []
      } as any);

      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.test_summary.total_tests).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle test execution errors', async () => {
      mockRunAbapUnitTests.mockRejectedValue(new Error('Test execution failed'));

      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Test execution failed');
    });

    test('should handle activation errors gracefully', async () => {
      mockAttemptClassActivation.mockRejectedValue(new Error('Activation error'));

      const result = await handleRunClassTests({ 
        class_name: 'ZCL_TEST',
        auto_activate: true
      }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle network errors', async () => {
      mockRunAbapUnitTests.mockRejectedValue(new Error('Network error'));

      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle timeout errors', async () => {
      mockRunAbapUnitTests.mockRejectedValue(new Error('Request timeout'));

      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });
  });

  describe('Class Name Variations', () => {
    test('should handle Z class names', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_MY_CLASS' });

      expect(result.isError).toBe(false);
      expect(mockCreateClassObjectSet).toHaveBeenCalledWith('ZCL_MY_CLASS');
    });

    test('should handle Y class names', async () => {
      const result = await handleRunClassTests({ class_name: 'YCL_MY_CLASS' });

      expect(result.isError).toBe(false);
      expect(mockCreateClassObjectSet).toHaveBeenCalledWith('YCL_MY_CLASS');
    });

    test('should handle class names with underscores', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_MY_TEST_CLASS' });

      expect(result.isError).toBe(false);
    });

    test('should handle class names with numbers', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST123' });

      expect(result.isError).toBe(false);
    });
  });

  describe('Response Structure', () => {
    test('should have isError false on success', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBe(false);
    });

    test('should have content array', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
    });

    test('should have text type content', async () => {
      const result = await handleRunClassTests({ class_name: 'ZCL_TEST' });

      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });
  });
});