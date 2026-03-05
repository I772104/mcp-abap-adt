/**
 * Unit Tests for handleSearchRapBo
 */

import { handleSearchRapBo } from '../../../../src/handlers/handleSearchRapBo';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleSearchRapBo', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockXml = `<?xml version="1.0"?><dataPreview:tableData xmlns:dataPreview="http://www.sap.com/adt/dataPreview"><dataPreview:columns><dataPreview:metadata dataPreview:name="RONT_NAME"/><dataPreview:dataSet><dataPreview:data>I_SalesOrder</dataPreview:data></dataPreview:dataSet></dataPreview:columns></dataPreview:tableData>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  test('should reject missing search_term', async () => {
    const result = await handleSearchRapBo({}) as any;
    expect(result.isError).toBe(true);
  });

  test('should accept valid search_term', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockXml } as any);
    const result = await handleSearchRapBo({ search_term: 'Sales' });
    expect(result.isError).toBeFalsy();
  });

  test('should handle network errors', async () => {
    mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
    const result = await handleSearchRapBo({ search_term: 'Test' }) as any;
    expect(result.isError).toBe(true);
  });
});