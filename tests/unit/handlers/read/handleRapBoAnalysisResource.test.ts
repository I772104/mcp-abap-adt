/**
 * Unit Tests for handleRapBoAnalysisResource
 */

import { handleRapBoAnalysisResource } from '../../../../src/handlers/handleRapBoAnalysisResource';
import * as utils from '../../../../src/lib/utils';
import { RapAnalysisEngine } from '../../../../src/lib/rap-analysis-engine';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

jest.mock('../../../../src/lib/rap-analysis-engine');

describe('handleRapBoAnalysisResource', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockCdsSource = `define view I_SalesOrder as select from vbak { key vbeln as SalesOrder }`;
  const mockBehaviorSource = `managed implementation in class zbp_r_salesordertp unique;`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  test('should reject missing rap_bo_name', async () => {
    const result = await handleRapBoAnalysisResource('rap-bo-analysis:///') as any;
    expect(result.isError).toBe(true);
  });

  test('should accept valid rap_bo_name', async () => {
    mockMakeAdtRequest
      .mockResolvedValueOnce({ status: 200, data: mockCdsSource } as any)
      .mockResolvedValueOnce({ status: 200, data: mockBehaviorSource } as any);
    const result = await handleRapBoAnalysisResource('rap-bo-analysis:///I_SalesOrder');
    expect((result as any).isError).toBeFalsy();
  });

  test('should handle network errors', async () => {
    // Mock the RAP analysis engine to throw an error
    const mockAnalyzeRapBo = jest.fn().mockRejectedValue(new Error('Network error'));
    (RapAnalysisEngine as jest.MockedClass<typeof RapAnalysisEngine>).mockImplementation(() => ({
      analyzeRapBo: mockAnalyzeRapBo
    } as any));

    const result = await handleRapBoAnalysisResource('rap-bo-analysis:///I_Test') as any;
    // Resource handlers return error via return_error which has isError property
    expect(result).toBeDefined();
    expect(result.isError).toBe(true);
  });
});