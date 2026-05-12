import { handleGetBopfBusinessObject } from '../../../../src/handlers/handleGetBopfBusinessObject';
import * as utils from '../../../../src/lib/utils';
import * as classUtils from '../../../../src/lib/classUtils';

jest.mock('../../../../src/lib/utils', () => ({
    ...jest.requireActual('../../../../src/lib/utils'),
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn(),
}));

jest.mock('../../../../src/lib/classUtils', () => ({
    ...jest.requireActual('../../../../src/lib/classUtils'),
    fetchIncludes: jest.fn(),
}));

describe('handleGetBopfBusinessObject — core', () => {
    let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
    let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

    // Minimal Classic BOPF XML with one root node
    const mockClassicBoXml = `<?xml version="1.0" encoding="utf-8"?>
<bo:businessObject xmlns:bo="http://www.sap.com/adt/bo" xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="ZTEST_BO" adtcore:description="Test BO" adtcore:type="BOBF"
  bo:objectCategory="businessProcessObject" bo:programmingModel="Classic BOPF"
  bo:isExtensible="false" bo:objectModelGenerated="false" bo:thirdGenBO="false"
  bo:rapBO="false" bo:smartValidation="false"
  adtcore:responsible="USER1" adtcore:masterLanguage="EN" adtcore:masterSystem="ER1"
  adtcore:createdAt="2020-01-01T00:00:00Z" adtcore:createdBy="SAP"
  adtcore:changedAt="2024-01-01T00:00:00Z" adtcore:changedBy="USER1" adtcore:version="active">
  <adtcore:packageRef adtcore:name="ZTEST_PKG"/>
  <bo:constantsInterfaceRef adtcore:name="ZIF_TEST_C"/>
  <bo:nodes bo:name="ROOT" bo:nodeID="abc123==" bo:rootNode="true"
    bo:objectModelGenerated="false" bo:createEnabled="true" bo:updateEnabled="true"
    bo:deleteEnabled="true" bo:authorizationCheck="false" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:persistentStructureRef adtcore:name="ZTEST_ROOT_D"/>
    <bo:persistentTableRef adtcore:name="ZTEST_ROOT"/>
    <bo:combinedStructureRef adtcore:name="ZTEST_ROOT_C"/>
    <bo:dataAccessClassRef adtcore:name="ZCL_DAC_TEST"/>
    <bo:properties bo:name="KEY" bo:readonly="true"/>
    <bo:properties bo:name="ROOT_KEY" bo:readonly="true"/>
    <bo:properties bo:name="FIELD1" bo:readonly="false"/>
  </bo:nodes>
</bo:businessObject>`;

    const mockBoWithDoRefXml = `<?xml version="1.0" encoding="utf-8"?>
<bo:businessObject xmlns:bo="http://www.sap.com/adt/bo" xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="ZTEST_BO" adtcore:type="BOBF" bo:programmingModel="Classic BOPF"
  bo:isExtensible="false" bo:objectModelGenerated="false" bo:thirdGenBO="false"
  bo:rapBO="false" bo:smartValidation="false" adtcore:masterLanguage="EN"
  adtcore:masterSystem="ER1" adtcore:createdAt="2020-01-01T00:00:00Z"
  adtcore:createdBy="SAP" adtcore:changedAt="2024-01-01T00:00:00Z"
  adtcore:changedBy="USER1" adtcore:version="active">
  <adtcore:packageRef adtcore:name="ZPKG"/>
  <bo:nodes bo:name="ROOT" bo:nodeID="root1==" bo:rootNode="true"
    bo:objectModelGenerated="false" bo:createEnabled="true" bo:updateEnabled="true"
    bo:deleteEnabled="true" bo:authorizationCheck="false" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:persistentTableRef adtcore:name="ZROOT_TABLE"/>
    <bo:properties bo:name="KEY" bo:readonly="true"/>
    <bo:associations bo:name="TXT" bo:implementationType="Association" bo:multiplicity="0..*">
      <bo:targetNodeRef adtcore:name="ZTEST_BO~TXT_COLL.ROOT"/>
    </bo:associations>
  </bo:nodes>
  <bo:nodes bo:name="TXT_COLL.ROOT" bo:nodeID="txt1==" bo:rootNode="false"
    bo:objectModelGenerated="false" bo:createEnabled="false" bo:updateEnabled="false"
    bo:deleteEnabled="false" bo:authorizationCheck="false" bo:isDependentObjectNode="true"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:doRef adtcore:name="/BOBF/TEXT_COLLECTION" adtcore:type="BOBF"/>
  </bo:nodes>
</bo:businessObject>`;

    // CDS-based BO with Draft
    const mockCdsBoXml = `<?xml version="1.0" encoding="utf-8"?>
<bo:businessObject xmlns:bo="http://www.sap.com/adt/bo" xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="I_TESTBO" adtcore:type="BOBF" adtcore:description="Test CDS BO"
  bo:objectCategory="draftObject"
  bo:programmingModel="ABAP Programming Model for Fiori - New with Draft - Semantic Key"
  bo:isExtensible="false" bo:objectModelGenerated="true" bo:thirdGenBO="true"
  bo:rapBO="false" bo:smartValidation="true" adtcore:masterLanguage="EN"
  adtcore:masterSystem="ER1" adtcore:createdAt="2021-01-01T00:00:00Z"
  adtcore:createdBy="SAP" adtcore:changedAt="2024-01-01T00:00:00Z"
  adtcore:changedBy="USER1" adtcore:version="active">
  <adtcore:packageRef adtcore:name="TEST_PKG"/>
  <bo:nodes bo:name="I_TESTBO" bo:nodeID="node1==" bo:rootNode="true"
    bo:objectModelGenerated="true" bo:createEnabled="true" bo:updateEnabled="true"
    bo:deleteEnabled="true" bo:authorizationCheck="true" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false"
    bo:draftDataType="I_TESTBO_DR" bo:draftPersistence="QTESTBO_D" bo:activPersistence="V_TESTBO_A">
    <bo:persistentStructureRef adtcore:name="ITESTBO_D"/>
    <bo:persistentTableRef adtcore:name="QTESTBO_D"/>
    <bo:sourceCDSViewRef adtcore:name="I_TESTBO"/>
    <bo:draftClassRef adtcore:name="CL_DR_TESTBO"/>
    <bo:properties bo:name="KEY" bo:readonly="false"/>
  </bo:nodes>
  <bo:sourceCDSViewRef adtcore:name="I_TESTBO" adtcore:description="Entity"/>
</bo:businessObject>`;

    const mockBoWithImplicitCrossBoXml = `<?xml version="1.0" encoding="utf-8"?>
<bo:businessObject xmlns:bo="http://www.sap.com/adt/bo" xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="ZTEST_BO" adtcore:type="BOBF" bo:programmingModel="Classic BOPF"
  bo:isExtensible="false" bo:objectModelGenerated="false" bo:thirdGenBO="false"
  bo:rapBO="false" bo:smartValidation="false" adtcore:masterLanguage="EN"
  adtcore:masterSystem="ER1" adtcore:createdAt="2020-01-01T00:00:00Z"
  adtcore:createdBy="SAP" adtcore:changedAt="2024-01-01T00:00:00Z"
  adtcore:changedBy="USER1" adtcore:version="active">
  <adtcore:packageRef adtcore:name="ZPKG"/>
  <bo:nodes bo:name="ROOT" bo:nodeID="root1==" bo:rootNode="true"
    bo:objectModelGenerated="false" bo:createEnabled="true" bo:updateEnabled="true"
    bo:deleteEnabled="true" bo:authorizationCheck="false" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:persistentTableRef adtcore:name="ZROOT_TABLE"/>
    <bo:properties bo:name="KEY" bo:readonly="true"/>
    <bo:associations bo:name="CHANGE_DOCUMENT" bo:implementationType="Association" bo:multiplicity="0..*">
      <bo:targetNodeRef adtcore:name="/BOFU/CHANGE_DOCUMENT~ROOT"/>
    </bo:associations>
    <bo:associations bo:name="DIRECT_ACTIVITIES" bo:implementationType="Association" bo:multiplicity="0..*">
      <bo:targetNodeRef adtcore:name="/ZTEST/ACTIVITY~ROOT"/>
    </bo:associations>
  </bo:nodes>
  <bo:nodes bo:name="PARTY" bo:nodeID="party1==" bo:rootNode="false"
    bo:objectModelGenerated="false" bo:createEnabled="true" bo:updateEnabled="true"
    bo:deleteEnabled="true" bo:authorizationCheck="false" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false"
    bo:parent="@bo:name='ROOT'">
    <bo:persistentTableRef adtcore:name="ZPARTY_TABLE"/>
    <bo:properties bo:name="KEY" bo:readonly="true"/>
    <bo:properties bo:name="PARENT_KEY" bo:readonly="true"/>
    <bo:associations bo:name="BUPA_ROOT" bo:implementationType="Association" bo:multiplicity="0..1">
      <bo:targetNodeRef adtcore:name="/BOFU/BUSINESSPARTNER~ROOT"/>
    </bo:associations>
  </bo:nodes>
  <bo:nodes bo:name="CHANGE_DOCUMENT" bo:nodeID="cd1==" bo:rootNode="false"
    bo:objectModelGenerated="false" bo:createEnabled="false" bo:updateEnabled="false"
    bo:deleteEnabled="false" bo:authorizationCheck="false" bo:isDependentObjectNode="true"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:properties bo:name="KEY" bo:readonly="false"/>
    <bo:properties bo:name="PARENT_KEY" bo:readonly="false"/>
    <bo:properties bo:name="ROOT_KEY" bo:readonly="false"/>
  </bo:nodes>
  <bo:nodes bo:name="BUPA_ROOT" bo:nodeID="bupa1==" bo:rootNode="false"
    bo:objectModelGenerated="false" bo:createEnabled="false" bo:updateEnabled="false"
    bo:deleteEnabled="false" bo:authorizationCheck="false" bo:isDependentObjectNode="true"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:properties bo:name="KEY" bo:readonly="false"/>
    <bo:properties bo:name="PARENT_KEY" bo:readonly="false"/>
    <bo:properties bo:name="ROOT_KEY" bo:readonly="false"/>
  </bo:nodes>
  <bo:nodes bo:name="ACTIVITY" bo:nodeID="act1==" bo:rootNode="false"
    bo:objectModelGenerated="false" bo:createEnabled="false" bo:updateEnabled="false"
    bo:deleteEnabled="false" bo:authorizationCheck="false" bo:isDependentObjectNode="true"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:properties bo:name="KEY" bo:readonly="false"/>
    <bo:properties bo:name="PARENT_KEY" bo:readonly="false"/>
    <bo:properties bo:name="ROOT_KEY" bo:readonly="false"/>
  </bo:nodes>
</bo:businessObject>`;

    // Classic BOPF with actions, determinations, validations
    const mockBoWithBusinessLogicXml = `<?xml version="1.0" encoding="utf-8"?>
<bo:businessObject xmlns:bo="http://www.sap.com/adt/bo" xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="ZLOGIC_BO" adtcore:type="BOBF" bo:programmingModel="Classic BOPF"
  bo:isExtensible="false" bo:objectModelGenerated="false" bo:thirdGenBO="false"
  bo:rapBO="false" bo:smartValidation="false" adtcore:masterLanguage="EN"
  adtcore:masterSystem="ER1" adtcore:createdAt="2020-01-01T00:00:00Z"
  adtcore:createdBy="SAP" adtcore:changedAt="2024-01-01T00:00:00Z"
  adtcore:changedBy="USER1" adtcore:version="active">
  <adtcore:packageRef adtcore:name="ZPKG"/>
  <bo:nodes bo:name="ROOT" bo:nodeID="root1==" bo:rootNode="true"
    bo:objectModelGenerated="false" bo:createEnabled="true" bo:updateEnabled="true"
    bo:deleteEnabled="true" bo:authorizationCheck="false" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:persistentTableRef adtcore:name="ZROOT_TABLE"/>
    <bo:dataAccessClassRef adtcore:name="ZCL_DAC_LOGIC"/>
    <bo:properties bo:name="KEY" bo:readonly="true"/>
    <bo:actions bo:name="SUBMIT" bo:objectModelGenerated="false" bo:category="0">
      <bo:implementationClassRef adtcore:name="ZCL_ACT_SUBMIT"/>
    </bo:actions>
    <bo:actions bo:name="GENERATED_ACTION" bo:objectModelGenerated="true" bo:category="0">
    </bo:actions>
    <bo:determinations bo:name="CALC_STATUS" bo:objectModelGenerated="false" bo:category="reactAfterModification">
      <bo:implementationClassRef adtcore:name="ZCL_DET_STATUS"/>
      <bo:triggers bo:node="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']" bo:association="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']/bo:associations[@bo:name='']" bo:create="true" bo:update="true" bo:delete="false" bo:load="false" bo:determine="false"/>
      <bo:relations bo:node="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']" bo:determination="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']/bo:determinations[@bo:name='SET_UI_DATA']" bo:relationType="successor"/>
    </bo:determinations>
    <bo:determinations bo:name="SET_ADMIN_DATA" bo:objectModelGenerated="false" bo:category="undefined">
      <bo:implementationClassRef adtcore:name="ZCL_DET_ADMIN"/>
      <bo:triggers bo:node="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']" bo:association="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']/bo:associations[@bo:name='PARTY']" bo:create="true" bo:update="true" bo:delete="true" bo:load="true" bo:determine="false"/>
      <bo:relations bo:node="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']" bo:determination="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']/bo:determinations[@bo:name='ROOT_SET_UI_DATA']" bo:relationType="successor"/>
      <bo:relations bo:node="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='PARTY']" bo:determination="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='PARTY']/bo:determinations[@bo:name='PARTY_SET_UI_DATA']" bo:relationType="successor"/>
    </bo:determinations>
    <bo:validations bo:name="CHECK_REQUIRED" bo:objectModelGenerated="false" bo:category="consistencyCheck" bo:checkBeforeSave="true" bo:createNode="true" bo:updateNode="true" bo:deleteNode="false">
      <bo:implementationClassRef adtcore:name="ZCL_VAL_REQUIRED"/>
      <bo:triggers bo:node="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']" bo:association="ZLOGIC_BO#//bo:businessObject/bo:nodes[@bo:name='ROOT']/bo:associations[@bo:name='']" bo:create="true" bo:update="true" bo:delete="false" bo:check="true"/>
    </bo:validations>
    <bo:validations bo:name="CHECK_DUPLICATE" bo:objectModelGenerated="false" bo:category="consistencyCheck" bo:checkBeforeSave="false" bo:createNode="false" bo:updateNode="false" bo:deleteNode="false">
      <bo:implementationClassRef adtcore:name="ZCL_DAC_LOGIC"/>
    </bo:validations>
  </bo:nodes>
</bo:businessObject>`;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
        mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
        mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
    });

    // -------------------------------------------------------------------------
    describe('Input Validation', () => {
        test('should reject missing bo_name', async () => {
            const result = (await handleGetBopfBusinessObject({} as any)) as any;
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('required');
        });

        test('should reject null bo_name', async () => {
            const result = (await handleGetBopfBusinessObject({ bo_name: null } as any)) as any;
            expect(result.isError).toBe(true);
        });

        test('should accept valid bo_name', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            expect(result.isError).toBeFalsy();
        });
    });

    // -------------------------------------------------------------------------
    describe('URL Encoding', () => {
        test('should encode slashes in BO name via encodeURIComponent', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            await handleGetBopfBusinessObject({ bo_name: '/IAM/ISSUE' });
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(expect.stringContaining('%2Fiam%2Fissue'), 'GET', 30000);
        });

        test('should lowercase the BO name in the URL', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(expect.stringContaining('ztest_bo'), 'GET', 30000);
        });

        test('should use correct BOPF endpoint path', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                'https://mock-sap-system.com:443/sap/bc/adt/bopf/businessobjects/ztest_bo',
                'GET',
                30000
            );
        });
    });

    // -------------------------------------------------------------------------
    describe('Header Parsing — Classic BOPF', () => {
        test('should parse BO name and description', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            expect(data.header.name).toBe('ZTEST_BO');
            expect(data.header.description).toBe('Test BO');
        });

        test('should detect Classic BOPF model variant', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            expect(data.header.programmingModel).toBe('Classic BOPF');
            expect(data.header.modelVariant).toBe('Classic BOPF');
        });

        test('should parse package and constants interface', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            expect(data.package).toBe('ZTEST_PKG');
            expect(data.constantsInterface).toBe('ZIF_TEST_C');
        });

        test('should omit description when absent', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithDoRefXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            expect(data.header).not.toHaveProperty('description');
        });
    });

    // -------------------------------------------------------------------------
    describe('Header Parsing — CDS-based BO', () => {
        test('should detect CDS-based with Draft model variant', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockCdsBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'I_TESTBO' });
            const data = JSON.parse(result.content[0].text);
            expect(data.header.modelVariant).toBe('CDS-based (with Draft)');
        });

        test('should include sourceCDSView at BO level', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockCdsBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'I_TESTBO' });
            const data = JSON.parse(result.content[0].text);
            expect(data.sourceCDSView).toBeDefined();
            expect(data.sourceCDSView.name).toBe('I_TESTBO');
        });
    });

    // -------------------------------------------------------------------------
    describe('Node Parsing', () => {
        test('should parse root node correctly', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            expect(root).toBeDefined();
            expect(root.rootNode).toBe(true);
            expect(root.parentNode).toBeNull();
        });

        test('should parse node persistence (Classic BOPF)', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            expect(root.persistence.persistentStructure).toBe('ZTEST_ROOT_D');
            expect(root.persistence.persistentTable).toBe('ZTEST_ROOT');
            expect(root.persistence.combinedStructure).toBe('ZTEST_ROOT_C');
        });

        test('should parse node persistence (CDS-based with Draft)', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockCdsBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'I_TESTBO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes[0];
            expect(root.persistence.draftDataType).toBe('I_TESTBO_DR');
            expect(root.persistence.draftTable).toBe('QTESTBO_D');
            expect(root.persistence.activeView).toBe('V_TESTBO_A');
            expect(root.persistence.sourceCDSView).toBe('I_TESTBO');
            expect(root.persistence.draftClass).toBe('CL_DR_TESTBO');
        });

        test('should parse implementation classes', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            expect(root.implementationClasses.dataAccess).toBe('ZCL_DAC_TEST');
        });

        test('should classify node properties into readonly and editable', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            expect(root.properties.readonly).toContain('KEY');
            expect(root.properties.readonly).toContain('ROOT_KEY');
            expect(root.properties.editable).toContain('FIELD1');
        });

        test('should parse parent node reference', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithImplicitCrossBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const party = data.nodes.find((n: any) => n.name === 'PARTY');
            expect(party.parentNode).toBe('ROOT');
        });

        test('should parse associations', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithImplicitCrossBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const changeDocAssoc = root.associations.find((a: any) => a.name === 'CHANGE_DOCUMENT');
            expect(changeDocAssoc).toBeDefined();
            expect(changeDocAssoc.targetNode).toBe('/BOFU/CHANGE_DOCUMENT~ROOT');
        });
    });

    // -------------------------------------------------------------------------
    describe('Determination Triggers and Relations', () => {
        test('should parse triggers on a determination', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const det = root.determinations.find((d: any) => d.name === 'CALC_STATUS');
            expect(det.triggers).toBeDefined();
            expect(Array.isArray(det.triggers)).toBe(true);
            expect(det.triggers.length).toBeGreaterThan(0);
        });

        test('trigger should contain node name, on-flags, and optional association', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const det = root.determinations.find((d: any) => d.name === 'SET_ADMIN_DATA');
            const trigger = det.triggers[0];
            expect(trigger.node).toBe('ROOT');
            expect(trigger.association).toBe('PARTY');
            expect(trigger.on).toEqual({ create: true, update: true, delete: true, load: true, determine: false });
        });

        test('should parse relations when present', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const det = root.determinations.find((d: any) => d.name === 'SET_ADMIN_DATA');
            expect(det.relations).toBeDefined();
            expect(det.relations.length).toBe(2);
        });

        test('relation should contain node, determination name, and relationType', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const det = root.determinations.find((d: any) => d.name === 'SET_ADMIN_DATA');
            const rootSuccessor = det.relations.find((r: any) => r.node === 'ROOT');
            expect(rootSuccessor.determination).toBe('ROOT_SET_UI_DATA');
            expect(rootSuccessor.relationType).toBe('successor');
            const partySuccessor = det.relations.find((r: any) => r.node === 'PARTY');
            expect(partySuccessor.determination).toBe('PARTY_SET_UI_DATA');
        });

        test('CALC_STATUS should have exactly one relation', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const det = root.determinations.find((d: any) => d.name === 'CALC_STATUS');
            expect(det.relations).toBeDefined();
            expect(det.relations.length).toBe(1);
        });

        test('validation should have triggers array', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const val = root.validations.find((v: any) => v.name === 'CHECK_REQUIRED');
            expect(val.triggers).toBeDefined();
            expect(Array.isArray(val.triggers)).toBe(true);
            expect(val.triggers.length).toBe(1);
        });

        test('validation trigger should have bo:check flag instead of bo:load/determine', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const val = root.validations.find((v: any) => v.name === 'CHECK_REQUIRED');
            const trigger = val.triggers[0];
            expect(trigger.node).toBe('ROOT');
            expect(trigger.on.check).toBe(true);
            expect(trigger.on.create).toBe(true);
            expect(trigger.on.update).toBe(true);
            expect(trigger.on.delete).toBe(false);
            expect(trigger.on.load).toBeUndefined();
            expect(trigger.on.determine).toBeUndefined();
        });

        test('validation should have checkBeforeSave, createNode, updateNode, deleteNode attributes', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const val = root.validations.find((v: any) => v.name === 'CHECK_REQUIRED');
            expect(val.checkBeforeSave).toBe(true);
            expect(val.createNode).toBe(true);
            expect(val.updateNode).toBe(true);
            expect(val.deleteNode).toBe(false);
        });

        test('validation with no triggers should have empty triggers array', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const val = root.validations.find((v: any) => v.name === 'CHECK_DUPLICATE');
            expect(val.triggers).toEqual([]);
        });

        test('determination trigger should have load/determine flags, not check', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const det = root.determinations.find((d: any) => d.name === 'SET_ADMIN_DATA');
            const trigger = det.triggers[0];
            expect(trigger.on.load).toBe(true);
            expect(trigger.on.determine).toBe(false);
            expect(trigger.on.check).toBeUndefined();
        });

        test('actionCheck validation with empty bo:node trigger entries should produce empty triggers array', async () => {
            const xmlActionCheck = `<?xml version="1.0" encoding="utf-8"?>
<bo:businessObject xmlns:bo="http://www.sap.com/adt/bo" xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="ZTEST_BO" adtcore:type="BOBF" bo:programmingModel="Classic BOPF"
  bo:isExtensible="false" bo:objectModelGenerated="false" bo:thirdGenBO="false"
  bo:rapBO="false" bo:smartValidation="false" adtcore:masterLanguage="EN"
  adtcore:masterSystem="ER1" adtcore:createdAt="2020-01-01T00:00:00Z"
  adtcore:createdBy="SAP" adtcore:changedAt="2024-01-01T00:00:00Z"
  adtcore:changedBy="USER1" adtcore:version="active">
  <adtcore:packageRef adtcore:name="ZPKG"/>
  <bo:nodes bo:name="ROOT" bo:nodeID="root1==" bo:rootNode="true"
    bo:objectModelGenerated="false" bo:createEnabled="true" bo:updateEnabled="true"
    bo:deleteEnabled="true" bo:authorizationCheck="false" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:persistentTableRef adtcore:name="ZROOT_TABLE"/>
    <bo:properties bo:name="KEY" bo:readonly="true"/>
    <bo:validations bo:name="CHECK_ACTION" bo:objectModelGenerated="false"
      bo:category="actionCheck" bo:checkBeforeSave="false"
      bo:createNode="false" bo:updateNode="false" bo:deleteNode="false">
      <bo:implementationClassRef adtcore:name="ZCL_ACTION_CHECK"/>
      <bo:triggers bo:node="" bo:create="false" bo:update="false" bo:delete="false" bo:check="false"/>
      <bo:triggers bo:node="" bo:create="false" bo:update="false" bo:delete="false" bo:check="false"/>
    </bo:validations>
  </bo:nodes>
</bo:businessObject>`;
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: xmlActionCheck } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            const val = root.validations.find((v: any) => v.name === 'CHECK_ACTION');
            expect(val.triggers).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    describe('_limitations content', () => {
        test('Classic BOPF should include limitation about unresolvable stub nodes', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            expect(data._limitations).toHaveLength(3);
            expect(data._limitations[2]).toMatch(/REP_/);
            expect(data._limitations[2]).toMatch(/BOBX|BOBF/);
        });
    });

    // -------------------------------------------------------------------------
    describe('Error Handling', () => {
        test('should handle network errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));
            const result = (await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' })) as any;
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Network error');
        });

        test('should handle missing response data', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: null } as any);
            const result = (await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' })) as any;
            expect(result.isError).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    describe('Response Format', () => {
        test('should return valid JSON', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            expect(result.content[0].type).toBe('text');
            expect(() => JSON.parse(result.content[0].text)).not.toThrow();
        });

        test('should include header, package, and nodes', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            expect(data).toHaveProperty('header');
            expect(data).toHaveProperty('package');
            expect(data).toHaveProperty('nodes');
            expect(Array.isArray(data.nodes)).toBe(true);
        });

        test('Classic BOPF should include _limitations hint about node categories', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockClassicBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            expect(Array.isArray(data._limitations)).toBe(true);
            expect(data._limitations[0]).toMatch(/BOBX|BOBF/);
            expect(data._limitations[0]).toMatch(/node categor/i);
        });

        test('CDS-based BO should not include _limitations', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockCdsBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'I_TESTBO' });
            const data = JSON.parse(result.content[0].text);
            expect(data._limitations).toBeUndefined();
        });
    });
});
