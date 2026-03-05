/**
 * Unit Tests for handleGetPackageContents
 * 
 * Tests the GetPackageContents tool handler which retrieves objects
 * and sub-packages within an ABAP package, with optional recursive
 * sub-package exploration.
 */

import { handleGetPackageContents } from '../../../../src/handlers/handleGetPackageContents';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetPackageContents', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockPackageContentsXml = `<?xml version="1.0" encoding="UTF-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml">
  <asx:values>
    <DATA>
      <TREE_CONTENT>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>CLAS/OC</OBJECT_TYPE>
          <OBJECT_NAME>ZCL_TEST_CLASS</OBJECT_NAME>
          <DESCRIPTION>Test Class</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/oo/classes/zcl_test_class</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>PROG/P</OBJECT_TYPE>
          <OBJECT_NAME>Z_TEST_PROGRAM</OBJECT_NAME>
          <DESCRIPTION>Test Program</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/programs/programs/z_test_program</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>DEVC/K</OBJECT_TYPE>
          <OBJECT_NAME>Z_SUB_PACKAGE</OBJECT_NAME>
          <DESCRIPTION>Sub Package</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/packages/z_sub_package</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
      </TREE_CONTENT>
    </DATA>
  </asx:values>
</asx:abap>`;

  const mockEmptyPackageXml = `<?xml version="1.0" encoding="UTF-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml">
  <asx:values>
    <DATA>
      <TREE_CONTENT/>
    </DATA>
  </asx:values>
</asx:abap>`;

  const mockSubPackageContentsXml = `<?xml version="1.0" encoding="UTF-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml">
  <asx:values>
    <DATA>
      <TREE_CONTENT>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>CLAS/OC</OBJECT_TYPE>
          <OBJECT_NAME>ZCL_SUB_CLASS</OBJECT_NAME>
          <DESCRIPTION>Sub Class</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/oo/classes/zcl_sub_class</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
      </TREE_CONTENT>
    </DATA>
  </asx:values>
</asx:abap>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing package_name', async () => {
      const result = await handleGetPackageContents({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Package name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null package_name', async () => {
      const result = await handleGetPackageContents({ package_name: null }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined package_name', async () => {
      const result = await handleGetPackageContents({ package_name: undefined }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid package_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Package Name Encoding', () => {
    test('should encode package name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      await handleGetPackageContents({ package_name: 'Z/TEST PACKAGE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        30000,
        undefined,
        expect.objectContaining({
          parent_name: 'Z%2FTEST%20PACKAGE'
        })
      );
    });

    test('should handle $TMP local package', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      await handleGetPackageContents({ package_name: '$TMP' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        30000,
        undefined,
        expect.objectContaining({
          parent_name: '%24TMP'
        })
      );
    });
  });

  describe('Basic Package Contents', () => {
    test('should retrieve package objects', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockPackageContentsXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });

      expect(result.isError).toBeFalsy();
      const contents = JSON.parse(result.content[0].text);
      
      expect(contents.package).toBe('Z_TEST');
      expect(contents.objects).toBeDefined();
      expect(contents.objects).toHaveLength(2);
      expect(contents.objectCount).toBe(2);
    });

    test('should extract object details', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockPackageContentsXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });
      const contents = JSON.parse(result.content[0].text);

      const classObj = contents.objects.find((obj: any) => obj.type === 'CLAS/OC');
      expect(classObj).toBeDefined();
      expect(classObj.name).toBe('ZCL_TEST_CLASS');
      expect(classObj.description).toBe('Test Class');
      expect(classObj.uri).toContain('zcl_test_class');

      const progObj = contents.objects.find((obj: any) => obj.type === 'PROG/P');
      expect(progObj).toBeDefined();
      expect(progObj.name).toBe('Z_TEST_PROGRAM');
    });

    test('should handle empty package', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_EMPTY' });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.package).toBe('Z_EMPTY');
      expect(contents.objects).toHaveLength(0);
      expect(contents.objectCount).toBe(0);
    });
  });

  describe('Sub-Package Handling', () => {
    test('should include sub-packages by default', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockPackageContentsXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackages).toBeDefined();
      expect(contents.subPackages).toHaveLength(1);
      expect(contents.subPackageCount).toBe(1);
      expect(contents.subPackages[0].name).toBe('Z_SUB_PACKAGE');
    });

    test('should exclude sub-packages when include_subpackages is false', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockPackageContentsXml
      } as any);

      const result = await handleGetPackageContents({ 
        package_name: 'Z_TEST',
        include_subpackages: false
      });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackages).toBeUndefined();
      expect(contents.subPackageCount).toBeUndefined();
      expect(contents.objects).toHaveLength(2); // Only non-package objects
    });

    test('should handle package with no sub-packages', async () => {
      const noSubPackagesXml = `<?xml version="1.0" encoding="UTF-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml">
  <asx:values>
    <DATA>
      <TREE_CONTENT>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>CLAS/OC</OBJECT_TYPE>
          <OBJECT_NAME>ZCL_TEST</OBJECT_NAME>
          <DESCRIPTION>Test</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/oo/classes/zcl_test</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
      </TREE_CONTENT>
    </DATA>
  </asx:values>
</asx:abap>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: noSubPackagesXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackages).toBeUndefined();
      expect(contents.subPackageCount).toBeUndefined();
    });
  });

  describe('Recursive Sub-Package Exploration', () => {
    test('should not recurse by default', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockPackageContentsXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackageContents).toBeUndefined();
      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1);
    });

    test('should recursively fetch sub-package contents when recursive is true', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          data: mockPackageContentsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockSubPackageContentsXml
        } as any);

      const result = await handleGetPackageContents({ 
        package_name: 'Z_TEST',
        recursive: true
      });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackageContents).toBeDefined();
      expect(contents.subPackageContents).toHaveLength(1);
      expect(contents.subPackageContents[0].package).toBe('Z_SUB_PACKAGE');
      expect(contents.subPackageContents[0].objects).toHaveLength(1);
      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(2);
    });

    test('should handle recursive with no sub-packages', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      const result = await handleGetPackageContents({ 
        package_name: 'Z_TEST',
        recursive: true
      });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackageContents).toBeUndefined();
      expect(mockMakeAdtRequest).toHaveBeenCalledTimes(1);
    });

    test('should continue with other sub-packages if one fails', async () => {
      const multiSubPackagesXml = `<?xml version="1.0" encoding="UTF-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml">
  <asx:values>
    <DATA>
      <TREE_CONTENT>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>DEVC/K</OBJECT_TYPE>
          <OBJECT_NAME>Z_SUB1</OBJECT_NAME>
          <DESCRIPTION>Sub 1</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/packages/z_sub1</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>DEVC/K</OBJECT_TYPE>
          <OBJECT_NAME>Z_SUB2</OBJECT_NAME>
          <DESCRIPTION>Sub 2</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/packages/z_sub2</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
      </TREE_CONTENT>
    </DATA>
  </asx:values>
</asx:abap>`;

      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          data: multiSubPackagesXml
        } as any)
        .mockRejectedValueOnce(new Error('Sub-package 1 failed'))
        .mockResolvedValueOnce({
          status: 200,
          data: mockSubPackageContentsXml
        } as any);

      const result = await handleGetPackageContents({ 
        package_name: 'Z_TEST',
        recursive: true
      });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackageContents).toBeDefined();
      expect(contents.subPackageContents).toHaveLength(1);
      expect(contents.subPackageContents[0].package).toBe('Z_SUB2');
    });
  });

  describe('Parameter Combinations', () => {
    test('should handle include_subpackages=true, recursive=false', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockPackageContentsXml
      } as any);

      const result = await handleGetPackageContents({ 
        package_name: 'Z_TEST',
        include_subpackages: true,
        recursive: false
      });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackages).toBeDefined();
      expect(contents.subPackageContents).toBeUndefined();
    });

    test('should handle include_subpackages=false, recursive=true', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockPackageContentsXml
      } as any);

      const result = await handleGetPackageContents({ 
        package_name: 'Z_TEST',
        include_subpackages: false,
        recursive: true
      });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackages).toBeUndefined();
      expect(contents.subPackageContents).toBeUndefined();
    });

    test('should handle include_subpackages=true, recursive=true', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          data: mockPackageContentsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockSubPackageContentsXml
        } as any);

      const result = await handleGetPackageContents({ 
        package_name: 'Z_TEST',
        include_subpackages: true,
        recursive: true
      });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.subPackages).toBeDefined();
      expect(contents.subPackageContents).toBeDefined();
    });
  });

  describe('Object Filtering', () => {
    test('should skip nodes without OBJECT_NAME', async () => {
      const incompleteXml = `<?xml version="1.0" encoding="UTF-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml">
  <asx:values>
    <DATA>
      <TREE_CONTENT>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>CLAS/OC</OBJECT_TYPE>
          <DESCRIPTION>Test</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/oo/classes/zcl_test</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>PROG/P</OBJECT_TYPE>
          <OBJECT_NAME>Z_VALID</OBJECT_NAME>
          <DESCRIPTION>Valid</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/programs/programs/z_valid</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
      </TREE_CONTENT>
    </DATA>
  </asx:values>
</asx:abap>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: incompleteXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.objects).toHaveLength(1);
      expect(contents.objects[0].name).toBe('Z_VALID');
    });

    test('should skip nodes without OBJECT_URI', async () => {
      const incompleteXml = `<?xml version="1.0" encoding="UTF-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml">
  <asx:values>
    <DATA>
      <TREE_CONTENT>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>CLAS/OC</OBJECT_TYPE>
          <OBJECT_NAME>ZCL_NO_URI</OBJECT_NAME>
          <DESCRIPTION>No URI</DESCRIPTION>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
        <SEU_ADT_REPOSITORY_OBJ_NODE>
          <OBJECT_TYPE>PROG/P</OBJECT_TYPE>
          <OBJECT_NAME>Z_VALID</OBJECT_NAME>
          <DESCRIPTION>Valid</DESCRIPTION>
          <OBJECT_URI>/sap/bc/adt/programs/programs/z_valid</OBJECT_URI>
        </SEU_ADT_REPOSITORY_OBJ_NODE>
      </TREE_CONTENT>
    </DATA>
  </asx:values>
</asx:abap>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: incompleteXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });
      const contents = JSON.parse(result.content[0].text);

      expect(contents.objects).toHaveLength(1);
      expect(contents.objects[0].name).toBe('Z_VALID');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle invalid XML response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: 'Invalid XML'
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Package not found'
      });

      const result = await handleGetPackageContents({ package_name: 'Z_NONEXISTENT' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
    });
  });

  describe('Response Format', () => {
    test('should return JSON formatted response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    test('should include required fields', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockPackageContentsXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_TEST' });
      const contents = JSON.parse(result.content[0].text);

      expect(contents).toHaveProperty('package');
      expect(contents).toHaveProperty('objectCount');
      expect(contents).toHaveProperty('objects');
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      await handleGetPackageContents({ package_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/repository/nodestructure',
        'POST',
        30000,
        undefined,
        expect.any(Object)
      );
    });

    test('should use POST method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      await handleGetPackageContents({ package_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        expect.any(Number),
        undefined,
        expect.any(Object)
      );
    });

    test('should include correct request parameters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      await handleGetPackageContents({ package_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        30000,
        undefined,
        {
          parent_type: 'DEVC/K',
          parent_name: 'Z_TEST',
          withShortDescriptions: true
        }
      );
    });

    test('should use 30 second timeout', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      await handleGetPackageContents({ package_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        30000,
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('Package Name Variations', () => {
    test('should handle Z package names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Z_MY_PACKAGE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle Y package names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'Y_MY_PACKAGE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle SAP standard package names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockEmptyPackageXml
      } as any);

      const result = await handleGetPackageContents({ package_name: 'SAP_BASIS' });

      expect(result.isError).toBeFalsy();
    });
  });
});