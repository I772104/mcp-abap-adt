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

  const mockSource = `@EndUserText.label: 'Sales Order'
define service ZSD_SALESORDER {
  expose C_SalesOrderTP as SalesOrder;
}`;

  const emptyXmlResponse = `<?xml version="1.0" encoding="utf-8"?><odatav2:serviceList xmlns:odatav2="http://www.sap.com/categories/odatav2"><odatav2:services odatav2:repositoryId="" odatav2:serviceId=""/></odatav2:serviceList>`;

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

  test('should call the correct SRVD source endpoint', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockSource } as any);
    await handleGetServiceDefinition({ service_name: 'ZSD_SALESORDER' });
    expect(mockMakeAdtRequest).toHaveBeenCalledWith(
      'https://mock-sap-system.com:443/sap/bc/adt/ddic/srvd/sources/zsd_salesorder/source/main?version=active',
      'GET',
      30000
    );
  });

  test('should lowercase the service name in the URL', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockSource } as any);
    await handleGetServiceDefinition({ service_name: 'ZSD_SalesOrder' });
    const calledUrl: string = mockMakeAdtRequest.mock.calls[0][0];
    expect(calledUrl).toContain('/zsd_salesorder/');
  });

  test('should return source code and parsed metadata on success', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockSource } as any);
    const result = await handleGetServiceDefinition({ service_name: 'ZSD_SALESORDER' }) as any;
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.source_code).toBe(mockSource);
    expect(parsed.service_type).toBe('RAP Service Definition');
    expect(parsed.exposed_entities).toHaveLength(1);
    expect(parsed.exposed_entities[0].cds_entity).toBe('C_SalesOrderTP');
    expect(parsed.exposed_entities[0].exposed_name).toBe('SalesOrder');
  });

  test('should not treat an XML response as valid source code', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 200, data: emptyXmlResponse } as any);
    const result = await handleGetServiceDefinition({ service_name: 'Z_TEST' }) as any;
    expect(result.isError).toBe(true);
  });

  test('should fall back to SRVB endpoint when SRVD returns XML', async () => {
    mockMakeAdtRequest
      .mockResolvedValueOnce({ status: 200, data: emptyXmlResponse } as any)
      .mockResolvedValueOnce({ status: 200, data: mockSource } as any);
    const result = await handleGetServiceDefinition({ service_name: 'ZSD_SALESORDER' }) as any;
    expect(result.isError).toBeFalsy();
    expect(mockMakeAdtRequest).toHaveBeenCalledTimes(2);
    const secondUrl: string = mockMakeAdtRequest.mock.calls[1][0];
    expect(secondUrl).toContain('/sap/bc/adt/ddic/srvb/sources/');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.service_type).toBe('Service Binding');
  });

  test('should not treat null response.data as source code', async () => {
    mockMakeAdtRequest.mockResolvedValue({ status: 204, data: null } as any);
    const result = await handleGetServiceDefinition({ service_name: 'Z_TEST' }) as any;
    expect(result.isError).toBe(true);
  });

  test('should handle network errors', async () => {
    mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
    const result = await handleGetServiceDefinition({ service_name: 'Z_TEST' }) as any;
    expect(result.isError).toBe(true);
  });
});
