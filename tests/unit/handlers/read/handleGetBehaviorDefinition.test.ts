/**
 * Unit Tests for handleGetBehaviorDefinition
 */

import { handleGetBehaviorDefinition } from '../../../../src/handlers/handleGetBehaviorDefinition';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetBehaviorDefinition', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockBehaviorSource = `managed implementation in class zbp_r_salesordertp unique;
strict ( 2 );
with draft;

define behavior for R_SalesOrderTP alias SalesOrder
{
  create;
  update;
  delete;
  
  field ( readonly ) SalesOrder;
  field ( mandatory ) SalesOrderType;
  
  validation ValidateSoldToParty on save { create; field SoldToParty; }
  determination CalculateNetAmount on modify { field Quantity, Price; }
  
  action Release result [1] $self;
}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing cds_view_name', async () => {
      const result = await handleGetBehaviorDefinition({}) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('CDS view name');
    });

    test('should accept valid cds_view_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBehaviorSource } as any);
      const result = await handleGetBehaviorDefinition({ cds_view_name: 'R_SALESORDERTP' });
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Basic Retrieval', () => {
    test('should retrieve and parse behavior definition', async () => {
      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBehaviorSource } as any);
      const result = await handleGetBehaviorDefinition({ cds_view_name: 'R_SALESORDERTP' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('source_code');
      expect(parsed).toHaveProperty('implementation_type');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
      const result = await handleGetBehaviorDefinition({ cds_view_name: 'R_TEST' }) as any;
      expect(result.isError).toBe(true);
    });
  });
});