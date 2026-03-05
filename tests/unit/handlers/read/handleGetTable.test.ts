/**
 * Unit Tests for handleGetTable
 * 
 * Tests the GetTable tool handler which retrieves ABAP database table
 * structure including fields, data elements, domains, and technical settings.
 */

import { handleGetTable } from '../../../../src/handlers/handleGetTable';
import * as utils from '../../../../src/lib/utils';

// Mock the utility functions
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetTable', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;

    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing table_name', async () => {
      const result = await handleGetTable({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Table name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty table_name', async () => {
      const result = await handleGetTable({ table_name: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid table_name', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table>MARA</table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
    });

    test('should handle case insensitive table names', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table>mara</table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'mara' });

      expect(result.isError).toBe(false);
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('mara'),
        'GET',
        expect.any(Number)
      );
    });
  });

  describe('Successful Retrieval', () => {
    test('should successfully retrieve table structure', async () => {
      const tableStructure = `<?xml version="1.0" encoding="UTF-8"?>
<table:table xmlns:table="http://www.sap.com/adt/ddic/tables">
  <table:name>MARA</table:name>
  <table:description>General Material Data</table:description>
  <table:fields>
    <table:field>
      <table:name>MATNR</table:name>
      <table:dataElement>MATNR</table:dataElement>
      <table:keyFlag>X</table:keyFlag>
    </table:field>
  </table:fields>
</table:table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: tableStructure,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe(tableStructure);
    });

    test('should use correct ADT endpoint', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table>MARA</table>',
        headers: {}
      } as any);

      await handleGetTable({ table_name: 'MARA' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/sap/bc/adt/ddic/tables/MARA/source/main'),
        'GET',
        30000
      );
    });

    test('should use GET HTTP method', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table>MARA</table>',
        headers: {}
      } as any);

      await handleGetTable({ table_name: 'MARA' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should retrieve table with multiple fields', async () => {
      const multiFieldTable = `<?xml version="1.0"?>
<table>
  <name>MARA</name>
  <fields>
    <field><name>MATNR</name><key>X</key></field>
    <field><name>MTART</name></field>
    <field><name>MATKL</name></field>
  </fields>
</table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: multiFieldTable,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('MATNR');
      expect(result.content[0].text).toContain('MTART');
      expect(result.content[0].text).toContain('MATKL');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent table', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 404 Not Found')
      );

      const result = await handleGetTable({ table_name: 'ZNONEXISTENT' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('404');
    });

    test('should handle authorization errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 403 Forbidden')
      );

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('403');
    });

    test('should handle network errors', async () => {
      mockGetBaseUrl.mockRejectedValueOnce(new Error('Network error'));

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle server errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 500 Internal Server Error')
      );

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('500');
    });

    test('should handle timeout errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    test('should handle locked table', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 423 Locked')
      );

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('423');
    });
  });

  describe('Table Types', () => {
    test('should retrieve transparent table', async () => {
      const transparentTable = `<?xml version="1.0"?>
<table>
  <name>MARA</name>
  <type>TRANSP</type>
  <description>General Material Data</description>
</table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: transparentTable,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('TRANSP');
    });

    test('should retrieve pooled table', async () => {
      const pooledTable = `<?xml version="1.0"?>
<table>
  <name>ATAB</name>
  <type>POOL</type>
</table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: pooledTable,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'ATAB' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('POOL');
    });

    test('should retrieve cluster table', async () => {
      const clusterTable = `<?xml version="1.0"?>
<table>
  <name>BSEG</name>
  <type>CLUSTER</type>
</table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: clusterTable,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'BSEG' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('CLUSTER');
    });

    test('should retrieve view', async () => {
      const view = `<?xml version="1.0"?>
<table>
  <name>MAKT</name>
  <type>VIEW</type>
</table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: view,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MAKT' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('VIEW');
    });
  });

  describe('Standard SAP Tables', () => {
    test('should retrieve MARA (Material Master)', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table><name>MARA</name></table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
    });

    test('should retrieve VBAK (Sales Document Header)', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table><name>VBAK</name></table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'VBAK' });

      expect(result.isError).toBe(false);
    });

    test('should retrieve KNA1 (Customer Master)', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table><name>KNA1</name></table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'KNA1' });

      expect(result.isError).toBe(false);
    });

    test('should retrieve LFA1 (Vendor Master)', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table><name>LFA1</name></table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'LFA1' });

      expect(result.isError).toBe(false);
    });
  });

  describe('Custom Tables', () => {
    test('should retrieve Z table', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table><name>ZTABLE</name></table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'ZTABLE' });

      expect(result.isError).toBe(false);
    });

    test('should retrieve Y table', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table><name>YTABLE</name></table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'YTABLE' });

      expect(result.isError).toBe(false);
    });

    test('should handle table name with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table><name>Z_MY_TABLE</name></table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'Z_MY_TABLE' });

      expect(result.isError).toBe(false);
    });

    test('should handle table name with numbers', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table><name>ZTABLE123</name></table>',
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'ZTABLE123' });

      expect(result.isError).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large table structure', async () => {
      const largeTable = '<table><fields>' + 
        '<field><name>FIELD</name></field>'.repeat(500) +
        '</fields></table>';

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: largeTable,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'LARGE_TABLE' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text.length).toBeGreaterThan(1000);
    });

    test('should handle table with special characters in description', async () => {
      const tableWithSpecialChars = `<?xml version="1.0"?>
<table>
  <name>MARA</name>
  <description>Material with "quotes" and &lt;brackets&gt;</description>
</table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: tableWithSpecialChars,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('quotes');
    });

    test('should handle table with Unicode characters', async () => {
      const tableWithUnicode = `<?xml version="1.0" encoding="UTF-8"?>
<table>
  <name>MARA</name>
  <description>Material Ümläüts 日本語</description>
</table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: tableWithUnicode,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Ümläüts');
    });

    test('should handle minimal table structure', async () => {
      const minimalTable = '<table><name>SIMPLE</name></table>';

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: minimalTable,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'SIMPLE' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('SIMPLE');
    });
  });

  describe('Response Format', () => {
    test('should return plain text content', async () => {
      const tableData = '<table><name>MARA</name></table>';

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: tableData,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(tableData);
    });

    test('should preserve XML formatting', async () => {
      const formattedXml = `<?xml version="1.0"?>
<table>
  <name>MARA</name>
  <fields>
    <field>
      <name>MATNR</name>
    </field>
  </fields>
</table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: formattedXml,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('\n');
      expect(result.content[0].text.split('\n').length).toBeGreaterThan(1);
    });

    test('should preserve indentation', async () => {
      const indentedXml = `<table>
  <name>MARA</name>
    <field>MATNR</field>
</table>`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: indentedXml,
        headers: {}
      } as any);

      const result = await handleGetTable({ table_name: 'MARA' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('  <name>');
      expect(result.content[0].text).toContain('    <field>');
    });
  });

  describe('Timeout Handling', () => {
    test('should use appropriate timeout', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<table>MARA</table>',
        headers: {}
      } as any);

      await handleGetTable({ table_name: 'MARA' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });
  });
});