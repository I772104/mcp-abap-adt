/**
 * Unit Tests for handleGetPackage
 * 
 * Tests the GetPackage tool handler which retrieves comprehensive
 * package information including metadata, hierarchy, transport details,
 * and package interfaces.
 */

import { handleGetPackage } from '../../../../src/handlers/handleGetPackage';
import * as utils from '../../../../src/lib/utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleGetPackage', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  const mockCompletePackageXml = `<?xml version="1.0" encoding="UTF-8"?>
<pak:package xmlns:pak="http://www.sap.com/adt/packages" 
             xmlns:adtcore="http://www.sap.com/adt/core"
             adtcore:name="Z_TEST_PACKAGE"
             adtcore:description="Test Package Description"
             adtcore:type="DEVC/K"
             adtcore:responsible="DEVELOPER"
             adtcore:createdBy="DEVELOPER"
             adtcore:createdAt="2024-01-01T10:00:00Z"
             adtcore:changedBy="DEVELOPER"
             adtcore:changedAt="2024-01-15T14:30:00Z"
             adtcore:masterLanguage="EN"
             adtcore:masterSystem="ABC"
             adtcore:version="active">
  <pak:attributes pak:packageType="development"
                  pak:isEncapsulated="false"
                  pak:recordChanges="true"
                  pak:languageVersion="5"
                  pak:isAddingObjectsAllowed="true"/>
  <pak:superPackage adtcore:name="Z_PARENT_PACKAGE"
                    adtcore:description="Parent Package"
                    adtcore:type="DEVC/K"
                    adtcore:uri="/sap/bc/adt/packages/z_parent_package"/>
  <pak:applicationComponent pak:name="FI-GL"
                           pak:description="Financial Accounting - General Ledger"/>
  <pak:transport>
    <pak:softwareComponent pak:name="HOME"
                          pak:description="SAP Basis Component"
                          pak:type="HOME"/>
    <pak:transportLayer pak:name="ZTL1"
                       pak:description="Transport Layer 1"/>
  </pak:transport>
  <pak:translation pak:relevance="X"
                  pak:relevanceDescription="Translation relevant"/>
  <pak:subPackages>
    <pak:packageRef adtcore:name="Z_SUB_PACKAGE_1"
                    adtcore:description="Sub Package 1"
                    adtcore:type="DEVC/K"
                    adtcore:uri="/sap/bc/adt/packages/z_sub_package_1"/>
    <pak:packageRef adtcore:name="Z_SUB_PACKAGE_2"
                    adtcore:description="Sub Package 2"
                    adtcore:type="DEVC/K"
                    adtcore:uri="/sap/bc/adt/packages/z_sub_package_2"/>
  </pak:subPackages>
  <pak:packageInterfaces>
    <pak:packageInterfaceRef adtcore:name="Z_INTERFACE_1"
                            adtcore:description="Package Interface 1"
                            adtcore:type="INTF/OI"
                            adtcore:uri="/sap/bc/adt/packages/z_test_package/interfaces/z_interface_1"/>
  </pak:packageInterfaces>
</pak:package>`;

  const mockMinimalPackageXml = `<?xml version="1.0" encoding="UTF-8"?>
<pak:package xmlns:pak="http://www.sap.com/adt/packages" 
             xmlns:adtcore="http://www.sap.com/adt/core"
             adtcore:name="Z_MINIMAL"
             adtcore:description="Minimal Package"
             adtcore:type="DEVC/K"/>`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject missing package_name', async () => {
      const result = await handleGetPackage({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Package name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject null package_name', async () => {
      const result = await handleGetPackage({ package_name: null }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject undefined package_name', async () => {
      const result = await handleGetPackage({ package_name: undefined }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid package_name', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Package Name Encoding', () => {
    test('should encode package name with special characters', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      await handleGetPackage({ package_name: 'Z/TEST PACKAGE' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z%2FTEST%20PACKAGE'),
        'GET',
        30000
      );
    });

    test('should handle package names with slashes', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      await handleGetPackage({ package_name: 'SAP/BASIS' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('SAP%2FBASIS'),
        'GET',
        30000
      );
    });
  });

  describe('Complete Package Information', () => {
    test('should retrieve complete package metadata', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompletePackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST_PACKAGE' });

      expect(result.isError).toBeFalsy();
      const packageInfo = JSON.parse(result.content[0].text);
      
      expect(packageInfo.name).toBe('Z_TEST_PACKAGE');
      expect(packageInfo.description).toBe('Test Package Description');
      expect(packageInfo.type).toBe('DEVC/K');
      expect(packageInfo.responsible).toBe('DEVELOPER');
      expect(packageInfo.createdBy).toBe('DEVELOPER');
      expect(packageInfo.changedBy).toBe('DEVELOPER');
      expect(packageInfo.masterLanguage).toBe('EN');
      expect(packageInfo.version).toBe('active');
    });

    test('should extract package attributes', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompletePackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST_PACKAGE' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.attributes).toBeDefined();
      expect(packageInfo.attributes.packageType).toBe('development');
      expect(packageInfo.attributes.isEncapsulated).toBe('false');
      expect(packageInfo.attributes.recordChanges).toBe('true');
      expect(packageInfo.attributes.languageVersion).toBe('5');
      expect(packageInfo.attributes.isAddingObjectsAllowed).toBe('true');
    });

    test('should extract super package information', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompletePackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST_PACKAGE' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.superPackage).toBeDefined();
      expect(packageInfo.superPackage.name).toBe('Z_PARENT_PACKAGE');
      expect(packageInfo.superPackage.description).toBe('Parent Package');
      expect(packageInfo.superPackage.type).toBe('DEVC/K');
      expect(packageInfo.superPackage.uri).toContain('z_parent_package');
    });

    test('should extract application component', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompletePackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST_PACKAGE' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.applicationComponent).toBeDefined();
      expect(packageInfo.applicationComponent.name).toBe('FI-GL');
      expect(packageInfo.applicationComponent.description).toContain('Financial');
    });

    test('should extract transport information', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompletePackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST_PACKAGE' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.transport).toBeDefined();
      expect(packageInfo.transport.softwareComponent).toBeDefined();
      expect(packageInfo.transport.softwareComponent.name).toBe('HOME');
      expect(packageInfo.transport.transportLayer).toBeDefined();
      expect(packageInfo.transport.transportLayer.name).toBe('ZTL1');
    });

    test('should extract translation relevance', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompletePackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST_PACKAGE' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.translation).toBeDefined();
      expect(packageInfo.translation.relevance).toBe('X');
      expect(packageInfo.translation.relevanceDescription).toContain('Translation');
    });

    test('should extract sub-packages', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompletePackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST_PACKAGE' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.subPackages).toBeDefined();
      expect(packageInfo.subPackages).toHaveLength(2);
      expect(packageInfo.subPackages[0].name).toBe('Z_SUB_PACKAGE_1');
      expect(packageInfo.subPackages[1].name).toBe('Z_SUB_PACKAGE_2');
    });

    test('should extract package interfaces', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompletePackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST_PACKAGE' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.packageInterfaces).toBeDefined();
      expect(packageInfo.packageInterfaces).toHaveLength(1);
      expect(packageInfo.packageInterfaces[0].name).toBe('Z_INTERFACE_1');
    });
  });

  describe('Minimal Package Information', () => {
    test('should handle package with minimal information', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_MINIMAL' });

      expect(result.isError).toBeFalsy();
      const packageInfo = JSON.parse(result.content[0].text);
      
      expect(packageInfo.name).toBe('Z_MINIMAL');
      expect(packageInfo.description).toBe('Minimal Package');
      expect(packageInfo.type).toBe('DEVC/K');
    });

    test('should handle package without attributes', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_MINIMAL' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.attributes).toBeUndefined();
    });

    test('should handle package without super package', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_MINIMAL' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.superPackage).toBeUndefined();
    });

    test('should handle package without sub-packages', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_MINIMAL' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.subPackages).toBeUndefined();
    });
  });

  describe('Single Sub-Package Handling', () => {
    test('should handle package with single sub-package', async () => {
      const singleSubPackageXml = `<?xml version="1.0" encoding="UTF-8"?>
<pak:package xmlns:pak="http://www.sap.com/adt/packages" 
             xmlns:adtcore="http://www.sap.com/adt/core"
             adtcore:name="Z_PARENT"
             adtcore:description="Parent Package">
  <pak:subPackages>
    <pak:packageRef adtcore:name="Z_SINGLE_SUB"
                    adtcore:description="Single Sub Package"
                    adtcore:type="DEVC/K"
                    adtcore:uri="/sap/bc/adt/packages/z_single_sub"/>
  </pak:subPackages>
</pak:package>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: singleSubPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_PARENT' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.subPackages).toBeDefined();
      expect(packageInfo.subPackages).toHaveLength(1);
      expect(packageInfo.subPackages[0].name).toBe('Z_SINGLE_SUB');
    });

    test('should handle package with single interface', async () => {
      const singleInterfaceXml = `<?xml version="1.0" encoding="UTF-8"?>
<pak:package xmlns:pak="http://www.sap.com/adt/packages" 
             xmlns:adtcore="http://www.sap.com/adt/core"
             adtcore:name="Z_PKG"
             adtcore:description="Package">
  <pak:packageInterfaces>
    <pak:packageInterfaceRef adtcore:name="Z_INTF"
                            adtcore:description="Interface"
                            adtcore:type="INTF/OI"
                            adtcore:uri="/sap/bc/adt/packages/z_pkg/interfaces/z_intf"/>
  </pak:packageInterfaces>
</pak:package>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: singleInterfaceXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_PKG' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo.packageInterfaces).toBeDefined();
      expect(packageInfo.packageInterfaces).toHaveLength(1);
      expect(packageInfo.packageInterfaces[0].name).toBe('Z_INTF');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetPackage({ package_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle invalid XML response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: 'Invalid XML'
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle missing package element', async () => {
      const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<invalid xmlns:pak="http://www.sap.com/adt/packages"/>`;

      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: invalidXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid package response');
    });

    test('should handle 404 not found', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 404 },
        message: 'Package not found'
      });

      const result = await handleGetPackage({ package_name: 'Z_NONEXISTENT' }) as any;

      expect(result.isError).toBe(true);
    });

    test('should handle 401 unauthorized', async () => {
      mockMakeAdtRequest.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await handleGetPackage({ package_name: 'Z_TEST' }) as any;

      expect(result.isError).toBe(true);
    });
  });

  describe('Response Format', () => {
    test('should return JSON formatted response', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    test('should include all metadata fields', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockCompletePackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_TEST' });
      const packageInfo = JSON.parse(result.content[0].text);

      expect(packageInfo).toHaveProperty('name');
      expect(packageInfo).toHaveProperty('description');
      expect(packageInfo).toHaveProperty('type');
      expect(packageInfo).toHaveProperty('responsible');
      expect(packageInfo).toHaveProperty('attributes');
      expect(packageInfo).toHaveProperty('superPackage');
      expect(packageInfo).toHaveProperty('transport');
    });
  });

  describe('Package Name Variations', () => {
    test('should handle Z package names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Z_MY_PACKAGE' });

      expect(result.isError).toBeFalsy();
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('Z_MY_PACKAGE'),
        'GET',
        30000
      );
    });

    test('should handle Y package names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'Y_MY_PACKAGE' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle SAP standard package names', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: 'SAP_BASIS' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle $TMP local package', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      const result = await handleGetPackage({ package_name: '$TMP' });

      expect(result.isError).toBeFalsy();
      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('%24TMP'),
        'GET',
        30000
      );
    });
  });

  describe('API Request Details', () => {
    test('should use correct endpoint URL', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      await handleGetPackage({ package_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        'https://mock-sap-system.com:443/sap/bc/adt/packages/Z_TEST',
        'GET',
        30000
      );
    });

    test('should use GET method', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      await handleGetPackage({ package_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number)
      );
    });

    test('should use 30 second timeout', async () => {
      mockMakeAdtRequest.mockResolvedValue({
        status: 200,
        data: mockMinimalPackageXml
      } as any);

      await handleGetPackage({ package_name: 'Z_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        30000
      );
    });
  });
});