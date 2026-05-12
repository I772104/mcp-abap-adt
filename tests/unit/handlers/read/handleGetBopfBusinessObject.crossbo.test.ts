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

describe('handleGetBopfBusinessObject — cross-BO & analyze', () => {
    let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
    let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;
    let mockFetchIncludes: jest.MockedFunction<typeof classUtils.fetchIncludes>;

    // Classic BOPF with explicit bo:doRef (cross-BO node via delegation)
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

    // Classic BOPF with implicit cross-BO stub nodes
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

    // Classic BOPF with actions, determinations, validations carrying implementation classes
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
        mockFetchIncludes = classUtils.fetchIncludes as jest.MockedFunction<typeof classUtils.fetchIncludes>;
        mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
    });

    // -------------------------------------------------------------------------
    describe('Cross-BO References — Explicit (bo:doRef)', () => {
        test('should detect explicit cross-BO node via bo:doRef', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithDoRefXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const txtNode = data.nodes.find((n: any) => n.name === 'TXT_COLL.ROOT');
            expect(txtNode.externalBoRef).toBeDefined();
            expect(txtNode.externalBoRef.name).toBe('/BOBF/TEXT_COLLECTION');
            expect(txtNode.externalBoRef.type).toBe('BOBF');
        });

        test('should not set externalBoRef on non-cross-BO nodes', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithDoRefXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const root = data.nodes.find((n: any) => n.name === 'ROOT');
            expect(root.externalBoRef).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    describe('Cross-BO References — Implicit (stub node + association)', () => {
        test('should detect CHANGE_DOCUMENT via direct association name match', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithImplicitCrossBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const node = data.nodes.find((n: any) => n.name === 'CHANGE_DOCUMENT');
            expect(node.externalBoRef).toBeDefined();
            expect(node.externalBoRef.name).toBe('/BOFU/CHANGE_DOCUMENT');
            expect(node.externalBoRef.node).toBe('ROOT');
            expect(node.externalBoRef.type).toBe('BOBF');
        });

        test('should detect BUPA_ROOT via direct association name match', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithImplicitCrossBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const node = data.nodes.find((n: any) => n.name === 'BUPA_ROOT');
            expect(node.externalBoRef).toBeDefined();
            expect(node.externalBoRef.name).toBe('/BOFU/BUSINESSPARTNER');
            expect(node.externalBoRef.node).toBe('ROOT');
        });

        test('should detect ACTIVITY via fallback BO basename match', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithImplicitCrossBoXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const node = data.nodes.find((n: any) => n.name === 'ACTIVITY');
            expect(node.externalBoRef).toBeDefined();
            expect(node.externalBoRef.name).toBe('/ZTEST/ACTIVITY');
            expect(node.externalBoRef.node).toBe('ROOT');
        });

        test('should not treat internal-only stub as cross-BO', async () => {
            const xmlInternalOnly = `<?xml version="1.0" encoding="utf-8"?>
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
    <bo:associations bo:name="ORPHAN" bo:implementationType="Association" bo:multiplicity="0..*">
      <bo:targetNodeRef adtcore:name="ZTEST_BO~ORPHAN"/>
    </bo:associations>
  </bo:nodes>
  <bo:nodes bo:name="ORPHAN" bo:nodeID="orp1==" bo:rootNode="false"
    bo:objectModelGenerated="false" bo:createEnabled="false" bo:updateEnabled="false"
    bo:deleteEnabled="false" bo:authorizationCheck="false" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:properties bo:name="KEY" bo:readonly="false"/>
    <bo:properties bo:name="PARENT_KEY" bo:readonly="false"/>
    <bo:properties bo:name="ROOT_KEY" bo:readonly="false"/>
  </bo:nodes>
</bo:businessObject>`;
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: xmlInternalOnly } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const orphan = data.nodes.find((n: any) => n.name === 'ORPHAN');
            expect(orphan.externalBoRef).toBeUndefined();
        });

        test('should handle duplicate association names across nodes without overwriting', async () => {
            const xmlDupAssoc = `<?xml version="1.0" encoding="utf-8"?>
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
    <bo:associations bo:name="PARTNER" bo:implementationType="Association" bo:multiplicity="0..*">
      <bo:targetNodeRef adtcore:name="/BOFU/BUSINESSPARTNER~ROOT"/>
    </bo:associations>
  </bo:nodes>
  <bo:nodes bo:name="ITEM" bo:nodeID="item1==" bo:rootNode="false"
    bo:objectModelGenerated="false" bo:createEnabled="true" bo:updateEnabled="true"
    bo:deleteEnabled="true" bo:authorizationCheck="false" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false"
    bo:parent="@bo:name='ROOT'">
    <bo:persistentTableRef adtcore:name="ZITEM_TABLE"/>
    <bo:properties bo:name="KEY" bo:readonly="true"/>
    <bo:associations bo:name="PARTNER" bo:implementationType="Association" bo:multiplicity="0..1">
      <bo:targetNodeRef adtcore:name="/BOFU/BUSINESSPARTNER~EMPLOYEE"/>
    </bo:associations>
  </bo:nodes>
  <bo:nodes bo:name="PARTNER" bo:nodeID="partner1==" bo:rootNode="false"
    bo:objectModelGenerated="false" bo:createEnabled="false" bo:updateEnabled="false"
    bo:deleteEnabled="false" bo:authorizationCheck="false" bo:isDependentObjectNode="false"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:properties bo:name="KEY" bo:readonly="false"/>
    <bo:properties bo:name="PARENT_KEY" bo:readonly="false"/>
    <bo:properties bo:name="ROOT_KEY" bo:readonly="false"/>
  </bo:nodes>
</bo:businessObject>`;
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: xmlDupAssoc } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZTEST_BO' });
            const data = JSON.parse(result.content[0].text);
            const partner = data.nodes.find((n: any) => n.name === 'PARTNER');
            expect(partner.externalBoRef).toBeDefined();
            expect(partner.externalBoRef.name).toBe('/BOFU/BUSINESSPARTNER');
        });
    });

    // -------------------------------------------------------------------------
    describe('Cross-BO References — Implicit suffix match', () => {
        test('stub name matches BO basename suffix (e.g. BUSINESS_PARTNER in EPM_BUSINESS_PARTNER)', async () => {
            const xmlSuffix = `<?xml version="1.0" encoding="utf-8"?>
<bo:businessObject xmlns:bo="http://www.sap.com/adt/bo" xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="/BOBF/EPM_SALES_QUOTE" adtcore:type="BOBF" bo:programmingModel="Classic BOPF"
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
    <bo:associations bo:name="TO_BUSINESS_PARTNER" bo:implementationType="Association" bo:multiplicity="0..1">
      <bo:targetNodeRef adtcore:name="/BOBF/EPM_BUSINESS_PARTNER~ROOT"/>
    </bo:associations>
  </bo:nodes>
  <bo:nodes bo:name="BUSINESS_PARTNER" bo:nodeID="bp1==" bo:rootNode="false"
    bo:objectModelGenerated="false" bo:createEnabled="false" bo:updateEnabled="false"
    bo:deleteEnabled="false" bo:authorizationCheck="false" bo:isDependentObjectNode="true"
    bo:textNode="false" bo:objectModelObsolete="false">
    <bo:properties bo:name="KEY" bo:readonly="false"/>
    <bo:properties bo:name="PARENT_KEY" bo:readonly="false"/>
    <bo:properties bo:name="ROOT_KEY" bo:readonly="false"/>
  </bo:nodes>
</bo:businessObject>`;
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: xmlSuffix } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: '/BOBF/EPM_SALES_QUOTE' });
            const data = JSON.parse(result.content[0].text);
            const bp = data.nodes.find((n: any) => n.name === 'BUSINESS_PARTNER');
            expect(bp.externalBoRef).toBeDefined();
            expect(bp.externalBoRef.name).toBe('/BOBF/EPM_BUSINESS_PARTNER');
            expect(bp.externalBoRef.node).toBe('ROOT');
        });
    });

    // -------------------------------------------------------------------------
    describe('analyze flag', () => {
        const mockIncludes = (className: string) => [
            { type: 'main', source: `CLASS ${className} DEFINITION.\nENDCLASS.` },
            { type: 'definitions', source: `CLASS lcl_helper DEFINITION.\nENDCLASS.` },
            { type: 'implementations', source: `CLASS lcl_helper IMPLEMENTATION.\nENDCLASS.` },
            { type: 'testclasses', source: null },
        ];

        test('analyze: false (default) does not add implementation field', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO' });
            const data = JSON.parse(result.content[0].text);
            expect(data.implementation).toBeUndefined();
            expect(mockFetchIncludes).not.toHaveBeenCalled();
        });

        test('analyze: true adds implementation field with class sources', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            mockFetchIncludes.mockImplementation(async (className) => mockIncludes(className));
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            const data = JSON.parse(result.content[0].text);
            expect(data.implementation).toBeDefined();
            expect(typeof data.implementation).toBe('object');
        });

        test('collects implementation classes from node implementationClasses', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            mockFetchIncludes.mockImplementation(async (className) => mockIncludes(className));
            await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            const calledNames = mockFetchIncludes.mock.calls.map((c) => c[0]);
            expect(calledNames).toContain('ZCL_DAC_LOGIC');
        });

        test('collects implementation classes from actions', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            mockFetchIncludes.mockImplementation(async (className) => mockIncludes(className));
            await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            const calledNames = mockFetchIncludes.mock.calls.map((c) => c[0]);
            expect(calledNames).toContain('ZCL_ACT_SUBMIT');
        });

        test('collects implementation classes from determinations and validations', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            mockFetchIncludes.mockImplementation(async (className) => mockIncludes(className));
            await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            const calledNames = mockFetchIncludes.mock.calls.map((c) => c[0]);
            expect(calledNames).toContain('ZCL_DET_STATUS');
            expect(calledNames).toContain('ZCL_VAL_REQUIRED');
        });

        test('deduplicates class names — same class referenced twice fetched once', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            mockFetchIncludes.mockImplementation(async (className) => mockIncludes(className));
            await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            const calledNames = mockFetchIncludes.mock.calls.map((c) => c[0]);
            const zclDacCount = calledNames.filter((n) => n === 'ZCL_DAC_LOGIC').length;
            expect(zclDacCount).toBe(1);
        });

        test('skips objectModelGenerated actions without implementationClass', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            mockFetchIncludes.mockImplementation(async (className) => mockIncludes(className));
            await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            const calledNames = mockFetchIncludes.mock.calls.map((c) => c[0]);
            expect(calledNames).not.toContain(undefined);
            expect(new Set(calledNames).size).toBe(5);
        });

        test('includes are fetched with correct include types', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            mockFetchIncludes.mockImplementation(async (className) => mockIncludes(className));
            await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            const [, includeTypes] = mockFetchIncludes.mock.calls[0];
            expect(includeTypes).toEqual(
                expect.arrayContaining(['main', 'definitions', 'implementations', 'testclasses'])
            );
            expect(includeTypes).toHaveLength(4);
        });

        test('null source (404) for an include is preserved as null in output', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            mockFetchIncludes.mockImplementation(async (className) => mockIncludes(className));
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            const data = JSON.parse(result.content[0].text);
            expect(data.implementation['ZCL_ACT_SUBMIT'].testclasses).toBeNull();
        });

        test('error on one class is isolated — others still present', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            mockFetchIncludes.mockImplementation(async (className) => {
                if (className === 'ZCL_ACT_SUBMIT') throw new Error('Connection refused');
                return mockIncludes(className);
            });
            const result = await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            const data = JSON.parse(result.content[0].text);
            expect(data.implementation['ZCL_ACT_SUBMIT'].error).toContain('Connection refused');
            expect(data.implementation['ZCL_DET_STATUS'].main).toBeDefined();
        });

        test('fetches all classes in parallel (Promise.all)', async () => {
            mockMakeAdtRequest.mockResolvedValue({ status: 200, data: mockBoWithBusinessLogicXml } as any);
            const callOrder: string[] = [];
            mockFetchIncludes.mockImplementation(async (className) => {
                callOrder.push(className);
                return mockIncludes(className);
            });
            await handleGetBopfBusinessObject({ bo_name: 'ZLOGIC_BO', analyze: true });
            expect(callOrder).toHaveLength(5);
        });
    });
});
