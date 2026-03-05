/**
 * Unit Tests for handleRunPackageTests
 */

import { handleRunPackageTests } from '../../../../src/handlers/handleRunPackageTests';
import * as utils from '../../../../src/lib/utils';
import * as testRunnerUtils from '../../../../src/lib/test-runner-utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

jest.mock('../../../../src/lib/test-runner-utils', () => ({
  runAbapUnitTests: jest.fn(),
  createPackageObjectSet: jest.fn(),
}));

describe('handleRunPackageTests', () => {
  let mockRunAbapUnitTests: jest.MockedFunction<typeof testRunnerUtils.runAbapUnitTests>;
  let mockCreatePackageObjectSet: jest.MockedFunction<typeof testRunnerUtils.createPackageObjectSet>;

  const mockResults = {
    package_name: 'ZTEST',
    total_tests: 10,
    passed: 10,
    failed: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunAbapUnitTests = testRunnerUtils.runAbapUnitTests as jest.MockedFunction<typeof testRunnerUtils.runAbapUnitTests>;
    mockCreatePackageObjectSet = testRunnerUtils.createPackageObjectSet as jest.MockedFunction<typeof testRunnerUtils.createPackageObjectSet>;
    mockCreatePackageObjectSet.mockReturnValue('<objectSet/>');
  });

  test('should reject missing package_name', async () => {
    const result = await handleRunPackageTests({}) as any;
    expect(result.isError).toBe(true);
  });

  test('should accept valid package_name', async () => {
    mockRunAbapUnitTests.mockResolvedValue(mockResults as any);
    const result = await handleRunPackageTests({ package_name: 'ZTEST' });
    expect(result.isError).toBeFalsy();
  });

  test('should handle network errors', async () => {
    mockRunAbapUnitTests.mockRejectedValue(new Error('Network error'));
    const result = await handleRunPackageTests({ package_name: 'ZTEST' }) as any;
    expect(result.isError).toBe(true);
  });
});