/**
 * Unit Tests for handleGetMetadataExtension
 */

import { handleGetMetadataExtension } from '../../../../src/handlers/handleGetMetadataExtension';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetMetadataExtension', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockSource = `@Metadata.layer: #CORE
annotate view C_SalesOrderTP with
{
  @UI.lineItem: [{ position: 10 }]
  SalesOrder;
}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  test('should reject missing extension_name', async () => {
    const result = await handleGetMetadataExtension({}) as any;
    expect(result.isError).toBe(true);
  });

  test('should accept valid extension_name', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockSource } as any);
    const result = await handleGetMetadataExtension({ extension_name: 'C_SALESORDERTP' });
    expect(result.isError).toBeFalsy();
  });

  test('should handle network errors', async () => {
    mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
    const result = await handleGetMetadataExtension({ extension_name: 'C_TEST' }) as any;
    expect(result.isError).toBe(true);
  });
});