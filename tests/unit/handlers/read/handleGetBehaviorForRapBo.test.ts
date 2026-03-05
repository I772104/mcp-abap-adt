/**
 * Unit Tests for handleGetBehaviorForRapBo
 */

import { handleGetBehaviorForRapBo } from '../../../../src/handlers/handleGetBehaviorForRapBo';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetBehaviorForRapBo', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockXmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<dataPreview:tableData xmlns:dataPreview="http://www.sap.com/adt/dataPreview">
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="RONT_NAME"/>
    <dataPreview:dataSet><dataPreview:data>R_SALESORDERTP</dataPreview:data></dataPreview:dataSet>
  </dataPreview:columns>
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="INTERFACE_BEHAVIOR_DEFINITION"/>
    <dataPreview:dataSet><dataPreview:data>ZBP_R_SALESORDERTP</dataPreview:data></dataPreview:dataSet>
  </dataPreview:columns>
</dataPreview:tableData>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing rap_bo_name', async () => {
      const result = await handleGetBehaviorForRapBo({}) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('rap_bo_name');
    });

    test('should accept valid rap_bo_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockXmlResponse } as any);
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'I_SalesOrder' });
      expect((result as any).isError).toBeFalsy();
    });
  });

  describe('Basic Retrieval', () => {
    test('should query RONT_NODE table and parse results', async () => {
      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockXmlResponse } as any);
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'I_SalesOrder' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('behavior_definitions');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'I_Test' }) as any;
      expect(result.isError).toBe(true);
    });

    test('should handle empty response data', async () => {
      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: null } as any);
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'I_Test' }) as any;
      expect(result.isError).toBe(true);
    });

    test('should handle invalid XML format', async () => {
      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: 'Invalid XML' } as any);
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'I_Test' }) as any;
      expect(result.isError).toBe(true);
    });
  });

  describe('SQL Escaping', () => {
    test('should escape single quotes in RAP BO name', async () => {
      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockXmlResponse } as any);
      
      await handleGetBehaviorForRapBo({ rap_bo_name: "I_Test'Name" });
      
      // Verify the SQL statement was called with escaped quotes
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        60000,
        expect.stringContaining("I_TEST''NAME")
      );
    });

    test('should handle RAP BO names with multiple quotes', async () => {
      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockXmlResponse } as any);
      
      await handleGetBehaviorForRapBo({ rap_bo_name: "I_Test'Multi'Quote" });
      
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        60000,
        expect.stringContaining("I_TEST''MULTI''QUOTE")
      );
    });
  });

  describe('Multiple Results', () => {
    test('should handle multiple behavior definitions', async () => {
      const mockMultipleResponse = `<?xml version="1.0" encoding="UTF-8"?>
<dataPreview:tableData xmlns:dataPreview="http://www.sap.com/adt/dataPreview">
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="RONT_NAME"/>
    <dataPreview:dataSet>
      <dataPreview:data>R_SALESORDERTP</dataPreview:data>
      <dataPreview:data>R_SALESORDERITEMTP</dataPreview:data>
    </dataPreview:dataSet>
  </dataPreview:columns>
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="INTERFACE_BEHAVIOR_DEFINITION"/>
    <dataPreview:dataSet>
      <dataPreview:data>ZBP_R_SALESORDERTP</dataPreview:data>
      <dataPreview:data>ZBP_R_SALESORDERITEMTP</dataPreview:data>
    </dataPreview:dataSet>
  </dataPreview:columns>
</dataPreview:tableData>`;

      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockMultipleResponse } as any);
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'I_SalesOrder' });
      const parsed = JSON.parse(result.content[0].text);
      
      expect(parsed.matches_found).toBe(2);
      expect(parsed.behavior_definitions).toHaveLength(2);
      expect(parsed.behavior_definitions[0].ront_name).toBe('R_SALESORDERTP');
      expect(parsed.behavior_definitions[1].ront_name).toBe('R_SALESORDERITEMTP');
    });

    test('should filter out empty behavior definitions', async () => {
      const mockMixedResponse = `<?xml version="1.0" encoding="UTF-8"?>
<dataPreview:tableData xmlns:dataPreview="http://www.sap.com/adt/dataPreview">
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="RONT_NAME"/>
    <dataPreview:dataSet>
      <dataPreview:data>R_SALESORDERTP</dataPreview:data>
      <dataPreview:data>R_EMPTYTP</dataPreview:data>
    </dataPreview:dataSet>
  </dataPreview:columns>
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="INTERFACE_BEHAVIOR_DEFINITION"/>
    <dataPreview:dataSet>
      <dataPreview:data>ZBP_R_SALESORDERTP</dataPreview:data>
      <dataPreview:data></dataPreview:data>
    </dataPreview:dataSet>
  </dataPreview:columns>
</dataPreview:tableData>`;

      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockMixedResponse } as any);
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'I_SalesOrder' });
      const parsed = JSON.parse(result.content[0].text);
      
      expect(parsed.matches_found).toBe(1);
      expect(parsed.behavior_definitions).toHaveLength(1);
      expect(parsed.behavior_definitions[0].ront_name).toBe('R_SALESORDERTP');
    });

    test('should handle whitespace-only behavior definitions', async () => {
      const mockWhitespaceResponse = `<?xml version="1.0" encoding="UTF-8"?>
<dataPreview:tableData xmlns:dataPreview="http://www.sap.com/adt/dataPreview">
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="RONT_NAME"/>
    <dataPreview:dataSet><dataPreview:data>R_TEST</dataPreview:data></dataPreview:dataSet>
  </dataPreview:columns>
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="INTERFACE_BEHAVIOR_DEFINITION"/>
    <dataPreview:dataSet><dataPreview:data>   </dataPreview:data></dataPreview:dataSet>
  </dataPreview:columns>
</dataPreview:tableData>`;

      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockWhitespaceResponse } as any);
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'I_Test' });
      const parsed = JSON.parse(result.content[0].text);
      
      expect(parsed.matches_found).toBe(0);
      expect(parsed.behavior_definitions).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null values in response', async () => {
      const mockNullResponse = `<?xml version="1.0" encoding="UTF-8"?>
<dataPreview:tableData xmlns:dataPreview="http://www.sap.com/adt/dataPreview">
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="RONT_NAME"/>
  </dataPreview:columns>
  <dataPreview:columns>
    <dataPreview:metadata dataPreview:name="INTERFACE_BEHAVIOR_DEFINITION"/>
  </dataPreview:columns>
</dataPreview:tableData>`;

      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockNullResponse } as any);
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'I_Test' });
      const parsed = JSON.parse(result.content[0].text);
      
      expect(parsed.matches_found).toBe(0);
      expect(parsed.behavior_definitions).toHaveLength(0);
    });

    test('should convert RAP BO name to uppercase', async () => {
      mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockXmlResponse } as any);
      
      const result = await handleGetBehaviorForRapBo({ rap_bo_name: 'i_salesorder' });
      const parsed = JSON.parse(result.content[0].text);
      
      expect(parsed.search_term).toBe('I_SALESORDER');
    });
  });
});
