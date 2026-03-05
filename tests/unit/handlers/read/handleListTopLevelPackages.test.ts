/**
 * Unit Tests for handleListTopLevelPackages
 */

import { handleListTopLevelPackages } from '../../../../src/handlers/handleListTopLevelPackages';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleListTopLevelPackages', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockXml = `<?xml version="1.0"?><packages><package name="ZTEST"/></packages>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  test('should list top-level packages', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockXml } as any);
    const result = await handleListTopLevelPackages({});
    expect(result.isError).toBeFalsy();
  });

  test('should handle network errors', async () => {
    mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
    const result = await handleListTopLevelPackages({}) as any;
    expect(result.isError).toBe(true);
  });
});