/**
 * Unit Tests for handleGetCDSView
 * 
 * Tests the GetCDSView tool handler which retrieves CDS view source code,
 * annotations, associations, parameters, and metadata.
 */

import { handleGetCDSView } from '../../../../src/handlers/handleGetCDSView';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetCDSView', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockBasicCDSView = `@AbapCatalog.sqlViewName: 'ZISALESORDER'
@AbapCatalog.compiler.compareFilter: true
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Sales Order View'
define view entity I_SalesOrder
  as select from vbak
{
  key vbeln as SalesOrder,
      erdat as CreationDate,
      ernam as CreatedBy
}`;

  const mockProjectionView = `@EndUserText.label: 'Sales Order Projection'
@AccessControl.authorizationCheck: #NOT_REQUIRED
define view entity C_SalesOrder
  as projection on R_SalesOrderTP
{
  key SalesOrder,
      SalesOrderType,
      SoldToParty
}`;

  const mockViewWithAssociations = `define view entity I_SalesOrder
  as select from vbak
  association [0..*] to I_SalesOrderItem as _Item on $projection.SalesOrder = _Item.SalesOrder
  association [1..1] to I_Customer as _Customer on $projection.SoldToParty = _Customer.Customer
{
  key vbeln as SalesOrder,
      kunnr as SoldToParty,
      _Item,
      _Customer
}`;

  const mockViewWithParameters = `define view entity I_SalesOrderWithParams
  with parameters parameter p_date : abap.dats,
                   parameter p_type : abap.char(4)
  as select from vbak
{
  key vbeln as SalesOrder
}
where erdat = :p_date
  and auart = :p_type`;

  const mockCompositeView = `define view entity R_SalesOrderTP
  as select from I_SalesOrder
  composition [0..*] of R_SalesOrderItemTP as _Item
{
  key SalesOrder,
      _Item
}`;

  const mockAnalyticalView = `@Analytics.dataCategory: #CUBE
@Analytics.dataExtraction.enabled: true
define view entity I_SalesAnalytics
  as select from vbak
{
  key vbeln as SalesOrder,
      @Aggregation.default: #SUM
      netwr as NetValue
}`;

  const mockAbstractEntity = `define abstract entity ZI_AbstractEntity
{
  key id : abap.char(10);
  name : abap.char(40);
}`;

  const mockInterfaceView = `@AbapCatalog.sqlViewName: 'ZISALESORDER'
define view I_SalesOrderOld
  as select from vbak
{
  key vbeln as SalesOrder
}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing view_name', async () => {
      const result = await handleGetCDSView({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('CDS view name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null view_name', async () => {
      const result = await handleGetCDSView({ view_name: null }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined view_name', async () => {
      const result = await handleGetCDSView({ view_name: undefined }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid view_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('View Name Encoding', () => {
    test('should encode view name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      await handleGetCDSView({ view_name: 'I/Sales Order' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('I%2FSales%20Order'),
        'GET',
        30000
      );
    });

    test('should handle view names with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      await handleGetCDSView({ view_name: 'I_SALES_ORDER' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('I_SALES_ORDER'),
        'GET',
        30000
      );
    });
  });

  describe('Basic CDS View Retrieval', () => {
    test('should retrieve CDS view source code', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });

      expect(result.isError).toBeFalsy();
      const viewData = JSON.parse(result.content[0].text);
      
      expect(viewData.view_name).toBe('I_SalesOrder');
      expect(viewData.source_code).toBe(mockBasicCDSView);
      expect(viewData.view_type).toBe('BASIC');
    });

    test('should extract annotations by default', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.annotations).toBeDefined();
      expect(viewData.annotations.length).toBeGreaterThan(0);
      
      const sqlViewAnnotation = viewData.annotations.find((a: any) => 
        a.name === 'AbapCatalog.sqlViewName'
      );
      expect(sqlViewAnnotation).toBeDefined();
      expect(sqlViewAnnotation.value).toContain('ZISALESORDER');
    });

    test('should exclude annotations when include_annotations is false', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ 
        view_name: 'I_SalesOrder',
        include_annotations: false
      });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.annotations).toEqual([]);
    });

    test('should extract base entity', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.base_entity).toBe('vbak');
    });
  });

  describe('View Type Detection', () => {
    test('should detect BASIC view type', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.view_type).toBe('BASIC');
    });

    test('should detect PROJECTION view type', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockProjectionView
      } as any);

      const result = await handleGetCDSView({ view_name: 'C_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.view_type).toBe('PROJECTION');
    });

    test('should detect COMPOSITE view type', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompositeView
      } as any);

      const result = await handleGetCDSView({ view_name: 'R_SalesOrderTP' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.view_type).toBe('COMPOSITE');
    });

    test('should detect ANALYTICAL view type', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockAnalyticalView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesAnalytics' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.view_type).toBe('ANALYTICAL');
    });

    test('should detect ABSTRACT entity type', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockAbstractEntity
      } as any);

      const result = await handleGetCDSView({ view_name: 'ZI_AbstractEntity' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.view_type).toBe('ABSTRACT');
    });

    test('should detect INTERFACE view type (old syntax)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockInterfaceView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrderOld' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.view_type).toBe('INTERFACE');
    });

    test('should return UNKNOWN for unrecognized view type', async () => {
      const unknownView = `some unknown CDS syntax`;
      
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: unknownView
      } as any);

      const result = await handleGetCDSView({ view_name: 'UNKNOWN_VIEW' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.view_type).toBe('UNKNOWN');
    });
  });

  describe('Annotation Extraction', () => {
    test('should extract annotations with values', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      const labelAnnotation = viewData.annotations.find((a: any) => 
        a.name === 'EndUserText.label'
      );
      expect(labelAnnotation).toBeDefined();
      expect(labelAnnotation.value).toContain('Sales Order View');
    });

    test('should extract simple annotations without values', async () => {
      const viewWithSimpleAnnotation = `@Metadata.allowExtensions
define view entity I_Test
  as select from test
{
  key id as Id
}`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: viewWithSimpleAnnotation
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_Test' });
      const viewData = JSON.parse(result.content[0].text);

      const metadataAnnotation = viewData.annotations.find((a: any) => 
        a.name === 'Metadata.allowExtensions'
      );
      expect(metadataAnnotation).toBeDefined();
      expect(metadataAnnotation.value).toBe(true);
    });

    test('should handle view without annotations', async () => {
      const viewWithoutAnnotations = `define view entity I_Simple
  as select from test
{
  key id as Id
}`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: viewWithoutAnnotations
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_Simple' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.annotations).toEqual([]);
    });
  });

  describe('Association Extraction', () => {
    test('should extract associations', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockViewWithAssociations
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.associations).toHaveLength(2);
      
      const itemAssoc = viewData.associations.find((a: any) => a.alias === '_Item');
      expect(itemAssoc).toBeDefined();
      expect(itemAssoc.cardinality).toBe('0..*');
      expect(itemAssoc.target_entity).toBe('I_SalesOrderItem');

      const customerAssoc = viewData.associations.find((a: any) => a.alias === '_Customer');
      expect(customerAssoc).toBeDefined();
      expect(customerAssoc.cardinality).toBe('1..1');
      expect(customerAssoc.target_entity).toBe('I_Customer');
    });

    test('should handle view without associations', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.associations).toEqual([]);
    });
  });

  describe('Parameter Extraction', () => {
      test('should extract parameters', async () => {
        mockMakeAdtRequest.mockResolvedValue({
          status: 200,
          data: mockViewWithParameters
        } as any);

        const result = await handleGetCDSView({ view_name: 'I_SalesOrderWithParams' });
        const viewData = JSON.parse(result.content[0].text);

        expect(viewData.parameters).toHaveLength(1);
      
      const dateParam = viewData.parameters.find((p: any) => p.name === 'p_date');
      expect(dateParam).toBeDefined();
      expect(dateParam.type).toBe('abap');
    });

    test('should handle view without parameters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.parameters).toEqual([]);
    });
  });

  describe('Base Entity Extraction', () => {
    test('should extract base entity from select statement', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.base_entity).toBe('vbak');
    });

    test('should extract base entity from projection', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockProjectionView
      } as any);

      const result = await handleGetCDSView({ view_name: 'C_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.base_entity).toBe('R_SalesOrderTP');
    });

    test('should return null when no base entity found', async () => {
      const viewWithoutBase = `define abstract entity ZI_Abstract
{
  key id : abap.char(10);
}`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: viewWithoutBase
      } as any);

      const result = await handleGetCDSView({ view_name: 'ZI_Abstract' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData.base_entity).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle empty response data', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: ''
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    test('should handle null response data', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: null
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'CDS view not found'
      });

      const result = await handleGetCDSView({ view_name: 'I_NONEXISTENT' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' }) as any;

      expect(result.isError).toBe(true);
    });
  });

  describe('Response Format', () => {
    test('should return JSON formatted response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    test('should include all required fields', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });
      const viewData = JSON.parse(result.content[0].text);

      expect(viewData).toHaveProperty('view_name');
      expect(viewData).toHaveProperty('source_code');
      expect(viewData).toHaveProperty('view_type');
      expect(viewData).toHaveProperty('annotations');
      expect(viewData).toHaveProperty('associations');
      expect(viewData).toHaveProperty('parameters');
      expect(viewData).toHaveProperty('base_entity');
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      await handleGetCDSView({ view_name: 'I_SalesOrder' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/ddic/ddl/sources/I_SalesOrder/source/main',
        'GET',
        30000
      );
    });

    test('should use GET method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      await handleGetCDSView({ view_name: 'I_SalesOrder' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should use 30 second timeout', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      await handleGetCDSView({ view_name: 'I_SalesOrder' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });
  });

  describe('View Name Variations', () => {
    test('should handle I_ prefix (interface views)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'I_SalesOrder' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle C_ prefix (consumption views)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockProjectionView
      } as any);

      const result = await handleGetCDSView({ view_name: 'C_SalesOrder' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle R_ prefix (restricted views)', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompositeView
      } as any);

      const result = await handleGetCDSView({ view_name: 'R_SalesOrderTP' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle Z/Y custom views', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockBasicCDSView
      } as any);

      const result = await handleGetCDSView({ view_name: 'ZI_CUSTOM_VIEW' });

      expect(result.isError).toBeFalsy();
    });
  });
});