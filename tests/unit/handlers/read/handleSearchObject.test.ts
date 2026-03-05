/**
 * Unit Tests for handleSearchObject
 * 
 * Tests the SearchObject tool handler which performs quick search
 * for ABAP objects using wildcard patterns.
 */

import { handleSearchObject } from '../../../../src/handlers/handleSearchObject';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleSearchObject', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockSearchResponseMultiple = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:name="ZCL_TEST_CLASS" 
                          adtcore:type="CLAS/OC" 
                          adtcore:uri="/sap/bc/adt/oo/classes/zcl_test_class"
                          adtcore:packageName="Z_PACKAGE"
                          adtcore:description="Test Class"/>
  <adtcore:objectReference adtcore:name="ZCL_TEST_HELPER" 
                          adtcore:type="CLAS/OC" 
                          adtcore:uri="/sap/bc/adt/oo/classes/zcl_test_helper"
                          adtcore:packageName="Z_PACKAGE"
                          adtcore:description="Test Helper Class"/>
  <adtcore:objectReference adtcore:name="Z_TEST_PROGRAM" 
                          adtcore:type="PROG/P" 
                          adtcore:uri="/sap/bc/adt/programs/programs/z_test_program"
                          adtcore:packageName="Z_PACKAGE"
                          adtcore:description="Test Program"/>
</adtcore:objectReferences>`;

  const mockSearchResponseSingle = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:name="ZCL_SINGLE" 
                          adtcore:type="CLAS/OC" 
                          adtcore:uri="/sap/bc/adt/oo/classes/zcl_single"
                          adtcore:packageName="Z_PACKAGE"
                          adtcore:description="Single Result"/>
</adtcore:objectReferences>`;

  const mockSearchResponseEmpty = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core"/>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing query', async () => {
      const result = await handleSearchObject({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Search query');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null query', async () => {
      const result = await handleSearchObject({ query: null }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined query', async () => {
      const result = await handleSearchObject({ query: undefined }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid query', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Query Encoding', () => {
    test('should encode query with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      await handleSearchObject({ query: 'Z/TEST CLASS' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FTEST%20CLASS'),
        'GET',
        30000
      );
    });

    test('should encode wildcard characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      await handleSearchObject({ query: 'ZCL_*' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZCL_*'),
        'GET',
        30000
      );
    });
  });

  describe('Basic Search', () => {
    test('should search for objects', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_TEST*' });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.query).toBe('ZCL_TEST*');
      expect(response.matches_found).toBe(3);
      expect(response.objects).toHaveLength(3);
    });

    test('should extract object details', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_TEST*' });
      const response = JSON.parse(result.content[0].text);

      const firstObject = response.objects[0];
      expect(firstObject.name).toBe('ZCL_TEST_CLASS');
      expect(firstObject.type).toBe('CLAS/OC');
      expect(firstObject.uri).toContain('zcl_test_class');
      expect(firstObject.package).toBe('Z_PACKAGE');
      expect(firstObject.description).toBe('Test Class');
    });

    test('should handle empty search results', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      const result = await handleSearchObject({ query: 'NONEXISTENT*' });
      const response = JSON.parse(result.content[0].text);

      expect(response.matches_found).toBe(0);
      expect(response.objects).toHaveLength(0);
    });

    test('should handle single search result', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseSingle
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_SINGLE' });
      const response = JSON.parse(result.content[0].text);

      expect(response.matches_found).toBe(1);
      expect(response.objects).toHaveLength(1);
      expect(response.objects[0].name).toBe('ZCL_SINGLE');
    });
  });

  describe('Max Results Parameter', () => {
    test('should use default maxResults of 100', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' });
      const response = JSON.parse(result.content[0].text);

      expect(response.max_results).toBe(100);
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('maxResults=100'),
        'GET',
        30000
      );
    });

    test('should accept custom maxResults', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*', maxResults: 50 });
      const response = JSON.parse(result.content[0].text);

      expect(response.max_results).toBe(50);
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('maxResults=50'),
        'GET',
        30000
      );
    });

    test('should handle maxResults of 1', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseSingle
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*', maxResults: 1 });
      const response = JSON.parse(result.content[0].text);

      expect(response.max_results).toBe(1);
    });

    test('should handle large maxResults', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      const result = await handleSearchObject({ query: 'Z*', maxResults: 500 });
      const response = JSON.parse(result.content[0].text);

      expect(response.max_results).toBe(500);
    });
  });

  describe('Search Patterns', () => {
    test('should search with prefix wildcard', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      await handleSearchObject({ query: 'ZCL_*' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZCL_*'),
        'GET',
        30000
      );
    });

    test('should search with suffix wildcard', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      await handleSearchObject({ query: '*_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('*_TEST'),
        'GET',
        30000
      );
    });

    test('should search with middle wildcard', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      await handleSearchObject({ query: 'ZCL_*_CLASS' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZCL_*_CLASS'),
        'GET',
        30000
      );
    });

    test('should search with exact name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseSingle
      } as any);

      await handleSearchObject({ query: 'ZCL_TEST_CLASS' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('ZCL_TEST_CLASS'),
        'GET',
        30000
      );
    });
  });

  describe('Object Types', () => {
    test('should find classes', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' });
      const response = JSON.parse(result.content[0].text);

      const classes = response.objects.filter((obj: any) => obj.type === 'CLAS/OC');
      expect(classes.length).toBeGreaterThan(0);
    });

    test('should find programs', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'Z_TEST*' });
      const response = JSON.parse(result.content[0].text);

      const programs = response.objects.filter((obj: any) => obj.type === 'PROG/P');
      expect(programs.length).toBeGreaterThan(0);
    });

    test('should find mixed object types', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'Z*TEST*' });
      const response = JSON.parse(result.content[0].text);

      const types = new Set(response.objects.map((obj: any) => obj.type));
      expect(types.size).toBeGreaterThan(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleSearchObject({ query: 'ZCL_*' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle invalid XML response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: 'Invalid XML'
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Not found'
      });

      const result = await handleSearchObject({ query: 'ZCL_*' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await handleSearchObject({ query: 'ZCL_*' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle timeout', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Request timeout'));

      const result = await handleSearchObject({ query: 'Z*' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });
  });

  describe('Response Format', () => {
    test('should return JSON formatted response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    test('should include query in response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_TEST*' });
      const response = JSON.parse(result.content[0].text);

      expect(response).toHaveProperty('query');
      expect(response.query).toBe('ZCL_TEST*');
    });

    test('should include max_results in response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*', maxResults: 50 });
      const response = JSON.parse(result.content[0].text);

      expect(response).toHaveProperty('max_results');
      expect(response.max_results).toBe(50);
    });

    test('should include matches_found in response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' });
      const response = JSON.parse(result.content[0].text);

      expect(response).toHaveProperty('matches_found');
      expect(response.matches_found).toBe(3);
    });

    test('should include objects array in response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' });
      const response = JSON.parse(result.content[0].text);

      expect(response).toHaveProperty('objects');
      expect(Array.isArray(response.objects)).toBe(true);
    });

    test('should include all object fields', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' });
      const response = JSON.parse(result.content[0].text);

      const obj = response.objects[0];
      expect(obj).toHaveProperty('name');
      expect(obj).toHaveProperty('type');
      expect(obj).toHaveProperty('uri');
      expect(obj).toHaveProperty('package');
      expect(obj).toHaveProperty('description');
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      await handleSearchObject({ query: 'ZCL_*' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/sap/bc/adt/repository/informationsystem/search'),
        'GET',
        30000
      );
    });

    test('should use quickSearch operation', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      await handleSearchObject({ query: 'ZCL_*' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('operation=quickSearch'),
        'GET',
        30000
      );
    });

    test('should use GET method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      await handleSearchObject({ query: 'ZCL_*' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should use 30 second timeout', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      await handleSearchObject({ query: 'ZCL_*' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle objects with missing attributes', async () => {
      const mockResponseMissingAttrs = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:name="ZCL_PARTIAL" 
                          adtcore:type="CLAS/OC"/>
</adtcore:objectReferences>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockResponseMissingAttrs
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' });
      const response = JSON.parse(result.content[0].text);

      expect(response.objects[0].name).toBe('ZCL_PARTIAL');
      expect(response.objects[0].uri).toBe('');
      expect(response.objects[0].package).toBe('');
      expect(response.objects[0].description).toBe('');
    });

    test('should handle objects with null values', async () => {
      const mockResponseNullValues = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:name="" 
                          adtcore:type=""
                          adtcore:uri=""
                          adtcore:packageName=""
                          adtcore:description=""/>
</adtcore:objectReferences>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockResponseNullValues
      } as any);

      const result = await handleSearchObject({ query: '*' });
      const response = JSON.parse(result.content[0].text);

      expect(response.objects[0].name).toBe('');
      expect(response.objects[0].type).toBe('');
    });

    test('should handle malformed XML with missing objectReference', async () => {
      const mockResponseNoObjects = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <someOtherElement/>
</adtcore:objectReferences>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockResponseNoObjects
      } as any);

      const result = await handleSearchObject({ query: 'NONEXISTENT*' });
      const response = JSON.parse(result.content[0].text);

      expect(response.matches_found).toBe(0);
      expect(response.objects).toHaveLength(0);
    });
  });

  describe('Common Search Scenarios', () => {
    test('should search for Z classes', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'ZCL_*' });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.objects.length).toBeGreaterThan(0);
    });

    test('should search for Y classes', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseEmpty
      } as any);

      const result = await handleSearchObject({ query: 'YCL_*' });

      expect(result.isError).toBeFalsy();
    });

    test('should search for programs', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: 'Z_*_PROGRAM' });

      expect(result.isError).toBeFalsy();
    });

    test('should search with partial name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockSearchResponseMultiple
      } as any);

      const result = await handleSearchObject({ query: '*TEST*' });

      expect(result.isError).toBeFalsy();
    });
  });
});