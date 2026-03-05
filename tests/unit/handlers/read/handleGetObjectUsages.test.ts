/**
 * Unit Tests for handleGetObjectUsages
 * 
 * Tests the GetObjectUsages tool handler which retrieves comprehensive
 * where-used lists for ABAP objects with advanced filtering and grouping.
 */

import { handleGetObjectUsages } from '../../../../src/handlers/handleGetObjectUsages';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetObjectUsages', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockScopeResponse = `<?xml version="1.0" encoding="UTF-8"?>
<usagereferences:usageScopeResult xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <usagereferences:objectIdentifier displayName="ZCL_TEST" globalType="CLAS/OC"/>
  <usagereferences:payload>test_payload_data</usagereferences:payload>
</usagereferences:usageScopeResult>`;

  const mockUsageResponse = `<?xml version="1.0" encoding="UTF-8"?>
<usagereferences:usageReferenceResult xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences" 
                                      xmlns:adtcore="http://www.sap.com/adt/core"
                                      numberOfResults="3"
                                      resultDescription="Found 3 usages">
  <usagereferences:referencedObjects>
    <usagereferences:referencedObject>
      <usagereferences:adtObject adtcore:name="ZCL_USER1" adtcore:type="CLAS/OC" adtcore:responsible="DEVELOPER">
        <adtcore:packageRef adtcore:name="Z_PACKAGE1"/>
      </usagereferences:adtObject>
    </usagereferences:referencedObject>
    <usagereferences:referencedObject>
      <usagereferences:adtObject adtcore:name="ZCL_USER2" adtcore:type="CLAS/OC" adtcore:responsible="DEVELOPER">
        <adtcore:packageRef adtcore:name="Z_PACKAGE2"/>
      </usagereferences:adtObject>
    </usagereferences:referencedObject>
    <usagereferences:referencedObject>
      <usagereferences:adtObject adtcore:name="Z_PROGRAM" adtcore:type="PROG/1P" adtcore:responsible="DEVELOPER">
        <adtcore:packageRef adtcore:name="Z_PACKAGE1"/>
      </usagereferences:adtObject>
    </usagereferences:referencedObject>
  </usagereferences:referencedObjects>
</usagereferences:usageReferenceResult>`;

  const mockEmptyUsageResponse = `<?xml version="1.0" encoding="UTF-8"?>
<usagereferences:usageReferenceResult xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences"
                                      numberOfResults="0"
                                      resultDescription="No usages found"/>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing object_name', async () => {
      const result = await handleGetObjectUsages({}) as any;

      expect(result.content[0].text).toContain('object_name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject invalid max_results (too low)', async () => {
      const result = await handleGetObjectUsages({
        object_name: 'ZCL_TEST',
        max_results: 0
      }) as any;

      expect(result.content[0].text).toContain('max_results');
      expect(result.content[0].text).toContain('between 1 and 500');
    });

    test('should reject invalid max_results (too high)', async () => {
      const result = await handleGetObjectUsages({
        object_name: 'ZCL_TEST',
        max_results: 501
      }) as any;

      expect(result.content[0].text).toContain('max_results');
      expect(result.content[0].text).toContain('between 1 and 500');
    });

    test('should reject invalid group_by value', async () => {
      const result = await handleGetObjectUsages({
        object_name: 'ZCL_TEST',
        group_by: 'invalid'
      }) as any;

      expect(result.content[0].text).toContain('group_by');
      expect(result.content[0].text).toContain('none, package, type');
    });

    test('should accept valid parameters', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ object_name: 'ZCL_TEST' });

      expect(result.content).toBeDefined();
    });
  });

  describe('SAP Standard Class Auto-Restrictions', () => {
    test('should apply lower max_results for SAP standard classes', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'CL_ABAP_TYPEDESCR' // SAP standard class
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.searchCriteria.maxResults).toBe(100); // Lower default
    });

    test('should disable indirect references for SAP standard classes', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'CL_ABAP_TYPEDESCR'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.searchCriteria.includeIndirect).toBe(false);
    });

    test('should not apply restrictions to Z/Y classes', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_MY_CLASS'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.searchCriteria.maxResults).toBe(500); // Default
      expect(response.searchCriteria.includeIndirect).toBe(true);
    });

    test('should respect explicit parameters even for SAP classes', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'CL_ABAP_TYPEDESCR',
        max_results: 200,
        include_indirect: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.searchCriteria.maxResults).toBe(200);
      expect(response.searchCriteria.includeIndirect).toBe(true);
    });
  });

  describe('Basic Usage Retrieval', () => {
    test('should retrieve object usages', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ object_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.object.name).toBe('ZCL_TEST');
      expect(response.results.usages).toHaveLength(3);
    });

    test('should handle empty usage results', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockEmptyUsageResponse } as any);

      const result = await handleGetObjectUsages({ object_name: 'ZCL_UNUSED' });

      const response = JSON.parse(result.content[0].text);
      expect(response.results.totalResults).toBe(0);
      expect(response.results.usages).toHaveLength(0);
    });

    test('should include metadata by default', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ object_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.results.usages[0]).toHaveProperty('responsible');
    });

    test('should exclude metadata when include_metadata is false', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        include_metadata: false
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.results.usages[0]).not.toHaveProperty('responsible');
      expect(response.results.usages[0]).toHaveProperty('name');
      expect(response.results.usages[0]).toHaveProperty('type');
    });
  });

  describe('Result Limiting', () => {
    test('should limit results to max_results', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        max_results: 2
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.results.returnedResults).toBe(2);
      expect(response.results.wasTruncated).toBe(true);
    });

    test('should not truncate when results fit within limit', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        max_results: 10
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.results.returnedResults).toBe(3);
      expect(response.results.wasTruncated).toBe(false);
    });
  });

  describe('Summary Mode', () => {
    test('should generate summary when summary_only is true', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        summary_only: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.summary).toBeDefined();
      expect(response.summary.totalUsages).toBe(3);
      expect(response.summary.byObjectType).toBeDefined();
      expect(response.summary.topPackages).toBeDefined();
      expect(response.summary.sampleUsages).toBeDefined();
    });

    test('should not include full usages list in summary mode', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        summary_only: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.results).toBeUndefined();
    });
  });

  describe('Grouping', () => {
    test('should group by package', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        group_by: 'package'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.results.groupedUsages).toBeDefined();
      expect(Array.isArray(response.results.groupedUsages)).toBe(true);
      expect(response.results.groupedUsages[0]).toHaveProperty('package');
      expect(response.results.groupedUsages[0]).toHaveProperty('count');
      expect(response.results.groupedUsages[0]).toHaveProperty('usages');
    });

    test('should group by type', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        group_by: 'type'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.results.groupedUsages).toBeDefined();
      expect(response.results.groupedUsages[0]).toHaveProperty('objectType');
      expect(response.results.groupedUsages[0]).toHaveProperty('count');
    });

    test('should not group when group_by is none', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        group_by: 'none'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.results.groupedUsages).toBeUndefined();
      expect(response.results.usages).toBeDefined();
    });
  });

  describe('Object Type Handling', () => {
    test('should handle class object type', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        object_type: 'class'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.object.type).toBe('CLAS/OC');
    });

    test('should handle interface object type', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZIF_TEST',
        object_type: 'interface'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.object.type).toBe('INTF/OI');
    });

    test('should handle CDS object type', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'I_SALESORDER',
        object_type: 'cds'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.object.type).toBe('DDLS/DF');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetObjectUsages({ object_name: 'ZCL_TEST' }) as any;

      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle timeout errors with enhanced message', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Request timeout'));

      const result = await handleGetObjectUsages({ object_name: 'CL_ABAP_TYPEDESCR' });

      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('timeout');
      expect(response.recommendedApproach).toBeDefined();
      expect(response.recommendedApproach.steps).toHaveLength(3);
    });

    test('should handle missing scope payload', async () => {
      const invalidScopeResponse = `<?xml version="1.0" encoding="UTF-8"?>
<usagereferences:usageScopeResult xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <usagereferences:objectIdentifier displayName="ZCL_TEST" globalType="CLAS/OC"/>
</usagereferences:usageScopeResult>`;

      mockMakeAdtRequest.mockResolvedValueOnce({ 
        status: 200, 
        data: invalidScopeResponse 
      } as any);

      const result = await handleGetObjectUsages({ object_name: 'ZCL_TEST' }) as any;

      expect(result.content[0].text).toContain('Failed to retrieve usage scope payload');
    });
  });

  describe('Search Criteria', () => {
    test('should include search criteria in response', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ 
        object_name: 'ZCL_TEST',
        include_definitions: false,
        include_elements: true,
        include_indirect: false,
        local_usage_only: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.searchCriteria.includeDefinitions).toBe(false);
      expect(response.searchCriteria.includeElements).toBe(true);
      expect(response.searchCriteria.includeIndirect).toBe(false);
      expect(response.searchCriteria.localUsageOnly).toBe(true);
    });

    test('should use default search criteria', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ object_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.searchCriteria.includeDefinitions).toBe(true);
      expect(response.searchCriteria.includeElements).toBe(true);
      expect(response.searchCriteria.includeIndirect).toBe(true);
      expect(response.searchCriteria.localUsageOnly).toBe(false);
    });
  });

  describe('API Request Details', () => {
    test('should make two API calls (scope + usage)', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      await handleGetObjectUsages({ object_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(2);
    });

    test('should use correct content types', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      await handleGetObjectUsages({ object_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        'POST',
        20000,
        expect.any(String),
        {},
        expect.objectContaining({
          'Content-Type': expect.stringContaining('usagereferences.scope.request')
        })
      );

      expect(mockMakeAdtRequest).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        'POST',
        20000,
        expect.any(String),
        {},
        expect.objectContaining({
          'Content-Type': expect.stringContaining('usagereferences.request')
        })
      );
    });
  });

  describe('Response Format', () => {
    test('should return JSON formatted response', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ object_name: 'ZCL_TEST' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    test('should include object information', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({ status: 200, data: mockScopeResponse } as any)
        .mockResolvedValueOnce({ status: 200, data: mockUsageResponse } as any);

      const result = await handleGetObjectUsages({ object_name: 'ZCL_TEST' });

      const response = JSON.parse(result.content[0].text);
      expect(response.object).toHaveProperty('name');
      expect(response.object).toHaveProperty('type');
      expect(response.object).toHaveProperty('uri');
    });
  });
});