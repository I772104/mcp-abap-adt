/**
 * Unit Tests for handleGetServiceDefinition
 */

import { handleGetServiceDefinition } from '../../../../src/handlers/handleGetServiceDefinition';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetServiceDefinition', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockSource = `define service ZSD_SALESORDER {
  expose C_SalesOrderTP as SalesOrder;
}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  test('should reject missing service_name', async () => {
    const result = await handleGetServiceDefinition({}) as any;
    expect(result.isError).toBe(true);
  });

  test('should accept valid service_name', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockSource } as any);
    const result = await handleGetServiceDefinition({ service_name: 'ZSD_SALESORDER' });
    expect(result.isError).toBeFalsy();
  });

  test('should handle network errors', async () => {
    mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
    const result = await handleGetServiceDefinition({ service_name: 'Z_TEST' }) as any;
    expect(result.isError).toBe(true);
  });
});