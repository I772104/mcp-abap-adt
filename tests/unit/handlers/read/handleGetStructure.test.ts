/**
 * Unit Tests for handleGetStructure
 * 
 * Tests the GetStructure tool handler which retrieves ABAP structure
 * definitions including fields, data elements, and nested structures.
 */

import { handleGetStructure } from '../../../../src/handlers/handleGetStructure';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetStructure', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockSimpleStructure = `<?xml version="1.0" encoding="UTF-8"?>
<abapStructure>
  <name>ZTEST_STRUCTURE</name>
  <fields>
    <field>
      <name>MATNR</name>
      <dataElement>MATNR</dataElement>
      <type>CHAR</type>
      <length>18</length>
    </field>
    <field>
      <name>MAKTX</name>
      <dataElement>MAKTX</dataElement>
      <type>CHAR</type>
      <length>40</length>
    </field>
  </fields>
</abapStructure>`;

  const mockNestedStructure = `<?xml version="1.0" encoding="UTF-8"?>
<abapStructure>
  <name>ZCOMPLEX_STRUCTURE</name>
  <fields>
    <field>
      <name>HEADER</name>
      <structure>ZHEADER_STRUCTURE</structure>
    </field>
    <field>
      <name>ITEMS</name>
      <table>ZITEM_TABLE</table>
    </field>
  </fields>
</abapStructure>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing structure_name', async () => {
      const result = await handleGetStructure({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Structure name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null structure_name', async () => {
      const result = await handleGetStructure({ structure_name: null }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined structure_name', async () => {
      const result = await handleGetStructure({ structure_name: undefined }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid structure_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZTEST_STRUCTURE' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Structure Name Encoding', () => {
    test('should encode structure name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      await handleGetStructure({ structure_name: 'Z/TEST STRUCTURE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FTEST%20STRUCTURE'),
        'GET',
        30000
      );
    });

    test('should handle structure names with underscores', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      await handleGetStructure({ structure_name: 'ZTEST_STRUCTURE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZTEST_STRUCTURE'),
        'GET',
        30000
      );
    });

    test('should handle lowercase structure names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      await handleGetStructure({ structure_name: 'ztest_structure' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ztest_structure'),
        'GET',
        30000
      );
    });
  });

  describe('Basic Structure Retrieval', () => {
    test('should retrieve simple structure', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZTEST_STRUCTURE' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(mockSimpleStructure);
    });

    test('should retrieve nested structure', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockNestedStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZCOMPLEX_STRUCTURE' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('HEADER');
      expect(result.content[0].text).toContain('ITEMS');
    });

    test('should handle empty structure', async () => {
      const emptyStructure = `<?xml version="1.0" encoding="UTF-8"?>
<abapStructure>
  <name>ZEMPTY_STRUCTURE</name>
  <fields/>
</abapStructure>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: emptyStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZEMPTY_STRUCTURE' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(emptyStructure);
    });
  });

  describe('Structure Name Variations', () => {
    test('should handle Z prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZSTRUCTURE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle Y prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'YSTRUCTURE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle SAP standard structures', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'BAPIRET2' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle structures with S prefix', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'SFLIGHT' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetStructure({ structure_name: 'ZTEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Structure not found'
      });

      const result = await handleGetStructure({ structure_name: 'ZNONEXISTENT' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await handleGetStructure({ structure_name: 'ZTEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 500 server error', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error'
      });

      const result = await handleGetStructure({ structure_name: 'ZTEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle timeout', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Request timeout'));

      const result = await handleGetStructure({ structure_name: 'ZTEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    test('should handle empty response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: ''
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZTEST' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('');
    });
  });

  describe('Response Format', () => {
    test('should return text response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZTEST' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    test('should preserve XML formatting', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZTEST' });

      expect(result.content[0].text).toContain('<?xml');
      expect(result.content[0].text).toContain('<abapStructure>');
      expect(result.content[0].text).toContain('</abapStructure>');
    });

    test('should include all structure components', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZTEST' });

      expect(result.content[0].text).toContain('<name>');
      expect(result.content[0].text).toContain('<fields>');
      expect(result.content[0].text).toContain('<field>');
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      await handleGetStructure({ structure_name: 'ZTEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/ddic/structures/ZTEST/source/main',
        'GET',
        30000
      );
    });

    test('should use GET method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      await handleGetStructure({ structure_name: 'ZTEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should use 30 second timeout', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      await handleGetStructure({ structure_name: 'ZTEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });

    test('should call makeAdtRequest once', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      await handleGetStructure({ structure_name: 'ZTEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Structure Content Validation', () => {
    test('should retrieve structure with field definitions', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZTEST' });

      expect(result.content[0].text).toContain('<field>');
      expect(result.content[0].text).toContain('<name>MATNR</name>');
      expect(result.content[0].text).toContain('<dataElement>');
    });

    test('should retrieve structure with nested structures', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockNestedStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZCOMPLEX' });

      expect(result.content[0].text).toContain('<structure>');
      expect(result.content[0].text).toContain('<table>');
    });

    test('should retrieve structure with data types', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZTEST' });

      expect(result.content[0].text).toContain('<type>');
      expect(result.content[0].text).toContain('<length>');
    });
  });

  describe('Common Structure Patterns', () => {
    test('should handle BAPI return structure', async () => {
      const bapiStructure = `<?xml version="1.0" encoding="UTF-8"?>
<abapStructure>
  <name>BAPIRET2</name>
  <fields>
    <field>
      <name>TYPE</name>
      <dataElement>BAPI_MTYPE</dataElement>
    </field>
    <field>
      <name>MESSAGE</name>
      <dataElement>BAPI_MSG</dataElement>
    </field>
  </fields>
</abapStructure>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: bapiStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'BAPIRET2' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('BAPIRET2');
    });

    test('should handle address structure', async () => {
      const addressStructure = `<?xml version="1.0" encoding="UTF-8"?>
<abapStructure>
  <name>ZADDRESS</name>
  <fields>
    <field>
      <name>STREET</name>
      <dataElement>AD_STREET</dataElement>
    </field>
    <field>
      <name>CITY</name>
      <dataElement>AD_CITY1</dataElement>
    </field>
  </fields>
</abapStructure>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: addressStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZADDRESS' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle header-item structure', async () => {
      const headerStructure = `<?xml version="1.0" encoding="UTF-8"?>
<abapStructure>
  <name>ZORDER_HEADER</name>
  <fields>
    <field>
      <name>ORDER_ID</name>
      <dataElement>ZORDER_ID</dataElement>
    </field>
    <field>
      <name>CUSTOMER</name>
      <dataElement>KUNNR</dataElement>
    </field>
  </fields>
</abapStructure>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: headerStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZORDER_HEADER' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Structure Type Variations', () => {
    test('should handle flat structure', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSimpleStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZFLAT_STRUCTURE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle deep structure', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockNestedStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZDEEP_STRUCTURE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle append structure', async () => {
      const appendStructure = `<?xml version="1.0" encoding="UTF-8"?>
<abapStructure>
  <name>ZAPPEND_STRUCTURE</name>
  <append>true</append>
  <fields>
    <field>
      <name>ZZFIELD1</name>
      <dataElement>CHAR10</dataElement>
    </field>
  </fields>
</abapStructure>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: appendStructure
      } as any);

      const result = await handleGetStructure({ structure_name: 'ZAPPEND_STRUCTURE' });

      expect(result.isError).toBeFalsy();
    });
  });
});