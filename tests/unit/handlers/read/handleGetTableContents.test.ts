/**
 * Unit Tests for handleGetTableContents
 * 
 * Tests the GetTableContents tool handler which queries ABAP database table
 * data with advanced filtering, pagination, and batch query support.
 */

import { handleGetTableContents } from '../../../../src/handlers/handleGetTableContents';
import * as utils from '../../../../src/lib/utils';

// Mock the utility functions
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetTableContents', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockMetadataResponse = `<?xml version="1.0"?>
<dataPreview:tableData xmlns:dataPreview="http://www.sap.com/adt/datapreview">
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="MATNR" dataPreview:type="CHAR" dataPreview:description="Material Number" dataPreview:length="40"/>
  </dataPreview:columns>
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="MTART" dataPreview:type="CHAR" dataPreview:description="Material Type" dataPreview:length="4"/>
  </dataPreview:columns>
</dataPreview:tableData>`;

  const mockDataResponse = `<?xml version="1.0"?>
<dataPreview:tableData xmlns:dataPreview="http://www.sap.com/adt/datapreview">
  <dataPreview:name>MARA</dataPreview:name>
  <dataPreview:totalRows>2</dataPreview:totalRows>
  <dataPreview:queryExecutionTime>50</dataPreview:queryExecutionTime>
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="MATNR" dataPreview:type="CHAR" dataPreview:description="Material Number"/>
    <dataPreview:dataSet>
      <dataPreview:data>MAT001</dataPreview:data>
      <dataPreview:data>MAT002</dataPreview:data>
    </dataPreview:dataSet>
  </dataPreview:columns>
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="MTART" dataPreview:type="CHAR" dataPreview:description="Material Type"/>
    <dataPreview:dataSet>
      <dataPreview:data>FERT</dataPreview:data>
      <dataPreview:data>ROH</dataPreview:data>
    </dataPreview:dataSet>
  </dataPreview:columns>
</dataPreview:tableData>`;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;

    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing table_name', async () => {
      const result = await handleGetTableContents({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('table_name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty table_name', async () => {
      const result = await handleGetTableContents({ table_name: '' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject max_rows exceeding 500', async () => {
      const result = await handleGetTableContents({ 
        table_name: 'MARA',
        max_rows: 501
      }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('500');
    });

    test('should reject negative offset', async () => {
      const result = await handleGetTableContents({ 
        table_name: 'MARA',
        offset: -1
      }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('negative');
    });

    test('should accept valid parameters', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ table_name: 'MARA' }) as any;

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Basic Query', () => {
    test('should successfully query table contents', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ table_name: 'MARA' });

      expect(result.content[0].type).toBe('text');
      const response = JSON.parse(result.content[0].text);
      expect(response.table).toBe('MARA');
      expect(response.rows).toHaveLength(2);
    });

    test('should use default max_rows of 100', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ table_name: 'MARA' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('rowNumber=100'),
        'POST',
        expect.any(Number),
        expect.any(String)
      );
    });

    test('should respect custom max_rows', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ 
        table_name: 'MARA',
        max_rows: 50
      });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('rowNumber=50'),
        'POST',
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('Column Selection', () => {
    test('should query all columns by default', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ table_name: 'MARA' });

      const sqlCall = mockMakeAdtRequest.mock.calls[1][3]; // 4th parameter is the SQL
      expect(sqlCall).toContain('MARA~*');
    });

    test('should query specific columns', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ 
        table_name: 'MARA',
        columns: ['MATNR', 'MTART']
      });

      const sqlCall = mockMakeAdtRequest.mock.calls[1][3]; // 4th parameter is the SQL
      expect(sqlCall).toContain('MARA~MATNR');
      expect(sqlCall).toContain('MARA~MTART');
    });

    test('should reject invalid column names', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any);

      const result = await handleGetTableContents({ 
        table_name: 'MARA',
        columns: ['INVALID_COL']
      }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid column name');
      expect(result.content[0].text).toContain('INVALID_COL');
    });
  });

  describe('WHERE Conditions', () => {
    test('should apply simple WHERE condition', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ 
        table_name: 'MARA',
        where_conditions: { MTART: 'FERT' }
      });

      const sqlCall = mockMakeAdtRequest.mock.calls[1][3];
      expect(sqlCall).toContain("WHERE MARA~MTART = 'FERT'");
    });

    test('should apply multiple WHERE conditions', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ 
        table_name: 'MARA',
        where_conditions: { 
          MTART: 'FERT',
          MATNR: 'MAT001'
        }
      });

      const sqlCall = mockMakeAdtRequest.mock.calls[1][3];
      expect(sqlCall).toContain('WHERE');
      expect(sqlCall).toContain("MARA~MTART = 'FERT'");
      expect(sqlCall).toContain("MARA~MATNR = 'MAT001'");
      expect(sqlCall).toContain('AND');
    });

    test('should apply operator-based WHERE condition', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ 
        table_name: 'MARA',
        where_conditions: { 
          MTART: { eq: 'FERT' }
        }
      });

      const sqlCall = mockMakeAdtRequest.mock.calls[1][3];
      expect(sqlCall).toContain("MARA~MTART = 'FERT'");
    });

    test('should escape SQL special characters', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ 
        table_name: 'MARA',
        where_conditions: { MATNR: "MAT'001" }
      });

      const sqlCall = mockMakeAdtRequest.mock.calls[1][3];
      expect(sqlCall).toContain("MAT''001");
    });

    test('should reject invalid WHERE column names', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any);

      const result = await handleGetTableContents({ 
        table_name: 'MARA',
        where_conditions: { INVALID_COL: 'VALUE' }
      }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid column in WHERE condition');
    });
  });

  describe('ORDER BY', () => {
    test('should apply ORDER BY clause', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ 
        table_name: 'MARA',
        order_by: ['MATNR']
      });

      const sqlCall = mockMakeAdtRequest.mock.calls[1][3];
      expect(sqlCall).toContain('ORDER BY MARA~MATNR');
    });

    test('should apply multiple ORDER BY columns', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      await handleGetTableContents({ 
        table_name: 'MARA',
        order_by: ['MTART', 'MATNR']
      });

      const sqlCall = mockMakeAdtRequest.mock.calls[1][3];
      expect(sqlCall).toContain('ORDER BY MARA~MTART, MARA~MATNR');
    });

    test('should reject invalid ORDER BY column names', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any);

      const result = await handleGetTableContents({ 
        table_name: 'MARA',
        order_by: ['INVALID_COL']
      }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid column name');
    });
  });

  describe('Pagination', () => {
    test('should include pagination info', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ 
        table_name: 'MARA',
        max_rows: 10
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.pagination).toBeDefined();
      expect(response.pagination.offset).toBe(0);
      expect(response.pagination.limit).toBe(10);
    });

    test('should handle offset parameter', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ 
        table_name: 'MARA',
        offset: 10,
        max_rows: 10
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.pagination.offset).toBe(10);
    });
  });

  describe('Column Metadata', () => {
    test('should exclude column metadata by default', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ table_name: 'MARA' });

      const response = JSON.parse(result.content[0].text);
      expect(response.columns).toBeUndefined();
    });

    test('should include column metadata when requested', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ 
        table_name: 'MARA',
        include_column_metadata: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.columns).toBeDefined();
      expect(Array.isArray(response.columns)).toBe(true);
    });
  });

  describe('Batch Queries', () => {
    test('should execute batch queries', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ 
        queries: [
          { id: 'query1', table_name: 'MARA', max_rows: 10 },
          { id: 'query2', table_name: 'MAKT', max_rows: 10 }
        ]
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.batch_results).toBeDefined();
      expect(response.batch_results.query1).toBeDefined();
      expect(response.batch_results.query2).toBeDefined();
    });

    test('should reject empty queries array', async () => {
      const result = await handleGetTableContents({ queries: [] }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('cannot be empty');
    });

    test('should reject more than 10 batch queries', async () => {
      const queries = Array(11).fill({ table_name: 'MARA' });
      const result = await handleGetTableContents({ queries }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('10 queries');
    });

    test('should handle partial batch failures', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any)
        .mockRejectedValueOnce(new Error('Table not found'));

      const result = await handleGetTableContents({ 
        queries: [
          { id: 'success', table_name: 'MARA' },
          { id: 'failure', table_name: 'INVALID' }
        ]
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.batch_results.success).toBeDefined();
      expect(response.batch_results.failure.error).toBe(true);
      expect(response.stats.successful).toBe(1);
      expect(response.stats.failed).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent table', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 404 Not Found')
      );

      const result = await handleGetTableContents({ table_name: 'ZNONEXISTENT' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('404');
    });

    test('should handle authorization errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 403 Forbidden')
      );

      const result = await handleGetTableContents({ table_name: 'MARA' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('403');
    });

    test('should handle network errors', async () => {
      mockGetBaseUrl.mockRejectedValueOnce(new Error('Network error'));

      const result = await handleGetTableContents({ table_name: 'MARA' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle timeout errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const result = await handleGetTableContents({ table_name: 'MARA' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });
  });

  describe('Performance Stats', () => {
    test('should include performance statistics', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ table_name: 'MARA' });

      const response = JSON.parse(result.content[0].text);
      expect(response.stats).toBeDefined();
      expect(response.stats.metadata_fetch_ms).toBeGreaterThanOrEqual(0);
      expect(response.stats.query_time_ms).toBeGreaterThanOrEqual(0);
      expect(response.stats.total_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Response Format', () => {
    test('should return JSON formatted response', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ table_name: 'MARA' });

      expect(result.content[0].type).toBe('text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    test('should include table name in response', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ table_name: 'MARA' });

      const response = JSON.parse(result.content[0].text);
      expect(response.table).toBe('MARA');
    });

    test('should include total_rows in response', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockMetadataResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockDataResponse } as any);

      const result = await handleGetTableContents({ table_name: 'MARA' });

      const response = JSON.parse(result.content[0].text);
      expect(response.total_rows).toBeDefined();
    });
  });
});