/**
 * Unit tests for AUnit XML parsing functions
 */

import {
    parseAUnitAlerts,
    parseAUnitTestMethods,
    parseAUnitTestClasses,
    parseAUnitPrograms,
    formatAUnitResults,
} from '../../../src/lib/test-runner-utils';

// Mock the utils module to avoid making actual HTTP requests
jest.mock('../../../src/lib/utils', () => ({
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn().mockResolvedValue('http://test'),
}));

describe('AUnit XML Parser', () => {
    describe('parseAUnitAlerts', () => {
        test('should parse alert with details and stack', () => {
            const xml = `
                <alerts>
                    <alert kind="abortion" severity="tolerable">
                        <title>Missing Prerequisites - All IS Oil specific tests skipped</title>
                        <details>
                            <detail text="Test execution skipped due to missing prerequisites"/>
                            <detail text="Test 'LTCL_ORCHESTRAT_IS_OIL' in Main Program 'CL_FINS_PRED_ORCHESTRAT=======CP'"/>
                        </details>
                        <stack>
                            <stackEntry adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat/includes/testclasses#start=1057,0;end=1057,0" adtcore:type="CLAS/OCN/testclasses" adtcore:name="CL_FINS_PRED_ORCHESTRAT" adtcore:description="Include: &lt;CL_FINS_PRED_ORCHESTRAT=======CCAU&gt; Line: &lt;1057&gt; (CLASS_SETUP)"/>
                        </stack>
                    </alert>
                </alerts>
            `;

            const result = parseAUnitAlerts(xml);

            expect(result).toHaveLength(1);
            expect(result[0].kind).toBe('abortion');
            expect(result[0].severity).toBe('tolerable');
            expect(result[0].title).toBe('Missing Prerequisites - All IS Oil specific tests skipped');
            expect(result[0].details).toHaveLength(2);
            expect(result[0].details?.[0]).toBe('Test execution skipped due to missing prerequisites');
            expect(result[0].stack).toHaveLength(1);
        });
    });

    describe('parseAUnitTestMethods', () => {
        test('should parse test methods with execution time', () => {
            const xml = `
                <testMethods>
                    <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT;testmethod=TEST_PROCESS" adtcore:type="CLAS/OLI" adtcore:name="TEST_PROCESS" executionTime="0.41" uriType="semantic" unit="s"/>
                    <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT;testmethod=TEST_SET_GV_SIM_CREATED" adtcore:type="CLAS/OLI" adtcore:name="TEST_SET_GV_SIM_CREATED" executionTime="0" uriType="semantic" unit="s"/>
                </testMethods>
            `;

            const result = parseAUnitTestMethods(xml);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('TEST_PROCESS');
            expect(result[0].executionTime).toBe(0.41);
            expect(result[0].unit).toBe('s');
            expect(result[0].status).toBe('passed');
            expect(result[1].name).toBe('TEST_SET_GV_SIM_CREATED');
            expect(result[1].executionTime).toBe(0);
            expect(result[1].status).toBe('passed');
        });

        test('should parse test methods without execution time (skipped)', () => {
            const xml = `
                <testMethods>
                    <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT_IS_OIL;testmethod=TEST_IS_CMETH_NOT_SUPPORTED" adtcore:type="CLAS/OLI" adtcore:name="TEST_IS_CMETH_NOT_SUPPORTED" uriType="semantic"/>
                </testMethods>
            `;

            const result = parseAUnitTestMethods(xml);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('TEST_IS_CMETH_NOT_SUPPORTED');
            expect(result[0].executionTime).toBe(0);
            expect(result[0].unit).toBe('');
            expect(result[0].status).toBe('skipped');
        });
    });

    describe('parseAUnitTestClasses', () => {
        test('should parse test class with test methods', () => {
            const xml = `
                <testClasses>
                    <testClass adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT" adtcore:type="CLAS/OP" adtcore:name="LTCL_ORCHESTRAT" uriType="semantic" durationCategory="short" riskLevel="harmless">
                        <testMethods>
                            <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT;testmethod=TEST_PROCESS" adtcore:type="CLAS/OLI" adtcore:name="TEST_PROCESS" executionTime="0.41" uriType="semantic" unit="s"/>
                        </testMethods>
                    </testClass>
                </testClasses>
            `;

            const result = parseAUnitTestClasses(xml);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('LTCL_ORCHESTRAT');
            expect(result[0].durationCategory).toBe('short');
            expect(result[0].riskLevel).toBe('harmless');
            expect(result[0].status).toBe('passed');
            expect(result[0].testMethods).toHaveLength(1);
            expect(result[0].testMethods[0].name).toBe('TEST_PROCESS');
        });

        test('should parse test class with alerts (skipped)', () => {
            const xml = `
                <testClasses>
                    <testClass adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT_IS_OIL" adtcore:type="CLAS/OP" adtcore:name="LTCL_ORCHESTRAT_IS_OIL" uriType="semantic" durationCategory="short" riskLevel="harmless">
                        <alerts>
                            <alert kind="abortion" severity="tolerable">
                                <title>Missing Prerequisites</title>
                                <details>
                                    <detail text="Test execution skipped"/>
                                </details>
                            </alert>
                        </alerts>
                        <testMethods>
                            <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT_IS_OIL;testmethod=TEST_IS_CMETH_NOT_SUPPORTED" adtcore:type="CLAS/OLI" adtcore:name="TEST_IS_CMETH_NOT_SUPPORTED" uriType="semantic"/>
                        </testMethods>
                    </testClass>
                </testClasses>
            `;

            const result = parseAUnitTestClasses(xml);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('LTCL_ORCHESTRAT_IS_OIL');
            expect(result[0].status).toBe('skipped');
            expect(result[0].alerts).toHaveLength(1);
            expect(result[0].alerts?.[0].kind).toBe('abortion');
            expect(result[0].testMethods).toHaveLength(1);
            expect(result[0].testMethods[0].status).toBe('skipped');
        });
    });

    describe('parseAUnitPrograms', () => {
        test('should parse program with test classes', () => {
            const xml = `
                <program xmlns:adtcore="http://www.sap.com/adt/core" adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat" adtcore:type="CLAS/OC" adtcore:name="CL_FINS_PRED_ORCHESTRAT" uriType="semantic">
                    <testClasses>
                        <testClass adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT" adtcore:type="CLAS/OP" adtcore:name="LTCL_ORCHESTRAT" uriType="semantic" durationCategory="short" riskLevel="harmless">
                            <testMethods>
                                <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT;testmethod=TEST_PROCESS" adtcore:type="CLAS/OLI" adtcore:name="TEST_PROCESS" executionTime="0.41" uriType="semantic" unit="s"/>
                            </testMethods>
                        </testClass>
                    </testClasses>
                </program>
            `;

            const result = parseAUnitPrograms(xml);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('CL_FINS_PRED_ORCHESTRAT');
            expect(result[0].type).toBe('CLAS/OC');
            expect(result[0].testClasses).toHaveLength(1);
            expect(result[0].testClasses[0].name).toBe('LTCL_ORCHESTRAT');
        });
    });

    describe('formatAUnitResults - Full XML', () => {
        test('should correctly parse real aunit results from CL_FINS_PRED_ORCHESTRAT', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?><aunit:runResult xmlns:aunit="http://www.sap.com/adt/aunit">
  <program xmlns:adtcore="http://www.sap.com/adt/core" adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat" adtcore:type="CLAS/OC" adtcore:name="CL_FINS_PRED_ORCHESTRAT" uriType="semantic">
    <testClasses>
      <testClass adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT" adtcore:type="CLAS/OP" adtcore:name="LTCL_ORCHESTRAT" uriType="semantic" durationCategory="short" riskLevel="harmless">
        <testMethods>
          <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT;testmethod=TEST_CHECK_RELEVANCE_SO" adtcore:type="CLAS/OLI" adtcore:name="TEST_CHECK_RELEVANCE_SO" executionTime="0.25" uriType="semantic" unit="s"/>
          <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT;testmethod=TEST_PROCESS" adtcore:type="CLAS/OLI" adtcore:name="TEST_PROCESS" executionTime="0.41" uriType="semantic" unit="s"/>
        </testMethods>
      </testClass>
      <testClass adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT_IS_OIL" adtcore:type="CLAS/OP" adtcore:name="LTCL_ORCHESTRAT_IS_OIL" uriType="semantic" durationCategory="short" riskLevel="harmless">
        <alerts>
          <alert kind="abortion" severity="tolerable">
            <title>Missing Prerequisites - All IS Oil specific tests skipped</title>
            <details>
              <detail text="Test execution skipped due to missing prerequisites"/>
            </details>
          </alert>
        </alerts>
        <testMethods>
          <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT_IS_OIL;testmethod=TEST_IS_CMETH_NOT_SUPPORTED" adtcore:type="CLAS/OLI" adtcore:name="TEST_IS_CMETH_NOT_SUPPORTED" uriType="semantic"/>
          <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTCL_ORCHESTRAT_IS_OIL;testmethod=TEST_IS_CMETH_SUPPORTED" adtcore:type="CLAS/OLI" adtcore:name="TEST_IS_CMETH_SUPPORTED" uriType="semantic"/>
        </testMethods>
      </testClass>
      <testClass adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTC_CWM_ENHANCEMENT_TEST" adtcore:type="CLAS/OP" adtcore:name="LTC_CWM_ENHANCEMENT_TEST" uriType="semantic" durationCategory="short" riskLevel="harmless">
        <testMethods>
          <testMethod adtcore:uri="/sap/bc/adt/oo/classes/cl_fins_pred_orchestrat#testclass=LTC_CWM_ENHANCEMENT_TEST;testmethod=TEST_CWM_ACTIVE_NO_MARA_INCL" adtcore:type="CLAS/OLI" adtcore:name="TEST_CWM_ACTIVE_NO_MARA_INCL" executionTime="0.17" uriType="semantic" unit="s"/>
        </testMethods>
      </testClass>
    </testClasses>
  </program>
</aunit:runResult>`;

            const result = formatAUnitResults(xml, 'CL_FINS_PRED_ORCHESTRAT');

            // Verify summary
            expect(result.summary.totalTestClasses).toBe(3);
            expect(result.summary.totalTestMethods).toBe(5);
            expect(result.summary.passed).toBe(3);
            expect(result.summary.skipped).toBe(2);
            expect(result.summary.failed).toBe(0);
            expect(result.summary.errors).toBe(0);
            expect(result.summary.executionTime).toBe(0.83); // 0.25 + 0.41 + 0.17

            // Verify programs
            expect(result.programs).toHaveLength(1);
            const program = result.programs[0];
            expect(program.name).toBe('CL_FINS_PRED_ORCHESTRAT');
            expect(program.type).toBe('CLAS/OC');

            // Verify test classes
            expect(program.testClasses).toHaveLength(3);

            // First test class - all passed
            const testClass1 = program.testClasses[0];
            expect(testClass1.name).toBe('LTCL_ORCHESTRAT');
            expect(testClass1.status).toBe('passed');
            expect(testClass1.testMethods).toHaveLength(2);
            expect(testClass1.testMethods[0].name).toBe('TEST_CHECK_RELEVANCE_SO');
            expect(testClass1.testMethods[0].status).toBe('passed');
            expect(testClass1.testMethods[0].executionTime).toBe(0.25);

            // Second test class - skipped with alerts
            const testClass2 = program.testClasses[1];
            expect(testClass2.name).toBe('LTCL_ORCHESTRAT_IS_OIL');
            expect(testClass2.status).toBe('skipped');
            expect(testClass2.alerts).toHaveLength(1);
            expect(testClass2.alerts?.[0].kind).toBe('abortion');
            expect(testClass2.testMethods).toHaveLength(2);
            expect(testClass2.testMethods[0].status).toBe('skipped');
            expect(testClass2.testMethods[1].status).toBe('skipped');

            // Third test class
            const testClass3 = program.testClasses[2];
            expect(testClass3.name).toBe('LTC_CWM_ENHANCEMENT_TEST');
            expect(testClass3.status).toBe('passed');
            expect(testClass3.testMethods).toHaveLength(1);

            // Verify overall status
            expect(result.overallStatus).toBe('success');
        });
    });
});
