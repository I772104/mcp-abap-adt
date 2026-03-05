/**
 * Unit Tests for handleGetCDSViewDependencies
 */

import { handleGetCDSViewDependencies } from '../../../../src/handlers/handleGetCDSViewDependencies';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetCDSViewDependencies', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockSource = `define view I_SalesOrder as select from vbak
  association [0..*] to I_SalesOrderItem as _Item on $projection.SalesOrder = _Item.SalesOrder
{
  key vbeln as SalesOrder
}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  test('should reject missing view_name', async () => {
    const result = await handleGetCDSViewDependencies({}) as any;
    expect(result.isError).toBe(true);
  });

  test('should accept valid view_name', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockSource } as any);
    const result = await handleGetCDSViewDependencies({ view_name: 'I_SalesOrder' });
    expect(result.isError).toBeFalsy();
  });

  test('should handle network errors', async () => {
    mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
    const result = await handleGetCDSViewDependencies({ view_name: 'I_Test' }) as any;
    expect(result.isError).toBe(true);
  });
});