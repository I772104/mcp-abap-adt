/**
 * Unit Tests for handleGetServiceBinding
 */

import { handleGetServiceBinding } from '../../../../src/handlers/handleGetServiceBinding';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetServiceBinding', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockSource = `service definition: ZSD_SALESORDER
binding type: odata_v4
status: active`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  test('should reject missing binding_name', async () => {
    const result = await handleGetServiceBinding({}) as any;
    expect(result.isError).toBe(true);
  });

  test('should accept valid binding_name', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockSource } as any);
    const result = await handleGetServiceBinding({ binding_name: 'ZUI_SALESORDER_O4' });
    expect(result.isError).toBeFalsy();
  });

  test('should handle network errors', async () => {
    mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
    const result = await handleGetServiceBinding({ binding_name: 'Z_TEST' }) as any;
    expect(result.isError).toBe(true);
  });
});