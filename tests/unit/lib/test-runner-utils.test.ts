/**
 * Unit tests for test-runner-utils parsing functions
 */

import { parseTestCases, parseTestSuites, formatTestResults } from '../../../src/lib/test-runner-utils';

// Mock the utils module to avoid making actual HTTP requests
jest.mock('../../../src/lib/utils', () => ({
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn().mockResolvedValue('http://test'),
}));

describe('test-runner-utils', () => {
    describe('parseTestCases', () => {
        test('should parse test case with correct name attribute and extract local test class', () => {
            const xml = `
                <testcase classname="package.clas:class---ltcl_test"
                    name="test_method_name" time="0.236" asserts="0" />
            `;

            const result = parseTestCases(xml);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('test_method_name');
            expect(result[0].className).toBe('ltcl_test'); // Extracted local test class name
            expect(result[0].status).toBe('passed');
        });

        test('should parse test case with skipped status', () => {
            const xml = `
                <testcase classname="package.clas:class---ltcl_test"
                    name="test_skipped" time="" asserts="1">
                    <skipped message="Missing Prerequisites">Test execution skipped</skipped>
                </testcase>
            `;

            const result = parseTestCases(xml);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('test_skipped');
            expect(result[0].className).toBe('ltcl_test');
            expect(result[0].status).toBe('skipped');
            expect(result[0].executionTime).toBe(0);
        });

        test('should parse test case with failed status', () => {
            const xml = `
                <testcase classname="package.clas:class---ltcl_test"
                    name="test_failed" time="0.001" asserts="1">
                    <failure message="Assertion failed">Expected true but got false</failure>
                </testcase>
            `;

            const result = parseTestCases(xml);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('test_failed');
            expect(result[0].className).toBe('ltcl_test');
            expect(result[0].status).toBe('failed');
            expect(result[0].failureMessage).toBe('Assertion failed');
        });

        test('should parse test case with error status', () => {
            const xml = `
                <testcase classname="package.clas:class---ltcl_test"
                    name="test_error" time="0.001" asserts="0">
                    <error message="Runtime error">Divide by zero</error>
                </testcase>
            `;

            const result = parseTestCases(xml);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('test_error');
            expect(result[0].className).toBe('ltcl_test');
            expect(result[0].status).toBe('error');
            expect(result[0].errorMessage).toBe('Runtime error');
        });
    });

    describe('parseTestSuites', () => {
        test('should parse test suite and group by local test class', () => {
            const xml = `
                <testsuite name="" tests="2" failures="0" errors="0" skipped="0" asserts="0"
                    package="test_package" timestamp="2026-04-02T12:08:11Z" time="0.608">
                    <testcase classname="test_package.clas:class---ltcl_test1"
                        name="test_method1" time="0.236" asserts="0" />
                    <testcase classname="test_package.clas:class---ltcl_test1"
                        name="test_method2" time="0.004" asserts="0" />
                </testsuite>
            `;

            const result = parseTestSuites(xml);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('ltcl_test1'); // Local test class name
            expect(result[0].package).toBe('test_package');
            expect(result[0].totalTests).toBe(2);
            expect(result[0].testCases).toHaveLength(2);
            expect(result[0].testCases[0].name).toBe('test_method1');
            expect(result[0].testCases[0].className).toBe('ltcl_test1');
            expect(result[0].testCases[1].name).toBe('test_method2');
            expect(result[0].testCases[1].className).toBe('ltcl_test1');
        });

        test('should create separate suites for different local test classes', () => {
            const xml = `
                <testsuite name="" tests="2" failures="0" errors="0" skipped="0" asserts="0"
                    package="package1" timestamp="2026-04-02T12:08:11Z" time="0.3">
                    <testcase classname="package1.clas:class---ltcl_test1"
                        name="test_method1" time="0.1" asserts="0" />
                    <testcase classname="package1.clas:class---ltcl_test2"
                        name="test_method2" time="0.2" asserts="0" />
                </testsuite>
            `;

            const result = parseTestSuites(xml);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('ltcl_test1');
            expect(result[0].testCases).toHaveLength(1);
            expect(result[0].testCases[0].name).toBe('test_method1');
            expect(result[1].name).toBe('ltcl_test2');
            expect(result[1].testCases).toHaveLength(1);
            expect(result[1].testCases[0].name).toBe('test_method2');
        });
    });

    describe('formatTestResults - Issue #86 regression test', () => {
        test('should correctly parse real test results from CL_FINS_PRED_ORCHESTRAT', () => {
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<testsuites title="CL_fins_pred_orchestrat" system="ERX" client="001" executedBy="GENTERM"
    time="1.712" timestamp="2026-04-02T12:08:10Z" failures="0" errors="0" skipped="1" asserts="1"
    tests="29">
    <testsuite name="" tests="20" failures="0" errors="0" skipped="0" asserts="0"
        package="fins_acdoc_predictive" timestamp="2026-04-02T12:08:11Z" time="0.608"
        hostname="ldcierx">
        <testcase classname="fins_acdoc_predictive.clas:cl_fins_pred_orchestrat---ltcl_orchestrat"
            name="test_check_relevance_so" time="0.236" asserts="0" />
        <testcase classname="fins_acdoc_predictive.clas:cl_fins_pred_orchestrat---ltcl_orchestrat"
            name="test_check_relevance_so_arm" time="0.004" asserts="0" />
    </testsuite>
    <testsuite name="" tests="2" failures="0" errors="0" skipped="1" asserts="1"
        package="fins_acdoc_predictive" timestamp="" time="0.000" hostname="ldcierx">
        <testcase
            classname="fins_acdoc_predictive.clas:cl_fins_pred_orchestrat---ltcl_orchestrat_is_oil"
            name="" time="" asserts="1">
            <skipped message="Missing Prerequisites">Test execution skipped</skipped>
        </testcase>
        <testcase
            classname="fins_acdoc_predictive.clas:cl_fins_pred_orchestrat---ltcl_orchestrat_is_oil"
            name="test_is_cmeth_not_supported" time="0.000" asserts="0" />
    </testsuite>
</testsuites>`;

            const result = formatTestResults(xml, 'CL_FINS_PRED_ORCHESTRAT');

            // Verify summary
            expect(result.summary.totalTests).toBe(29);
            expect(result.summary.passed).toBe(28);
            expect(result.summary.skipped).toBe(1);
            expect(result.summary.failed).toBe(0);
            expect(result.summary.errors).toBe(0);

            // Verify test suites - should now have 2 suites (one per local test class)
            expect(result.testSuites).toHaveLength(2);

            // First suite: ltcl_orchestrat with 2 test methods
            const suite1 = result.testSuites[0];
            expect(suite1.name).toBe('ltcl_orchestrat');
            expect(suite1.package).toBe('fins_acdoc_predictive');
            expect(suite1.totalTests).toBe(2);
            expect(suite1.passed).toBe(2);
            expect(suite1.skipped).toBe(0);
            expect(suite1.testCases).toHaveLength(2);
            expect(suite1.testCases[0].name).toBe('test_check_relevance_so');
            expect(suite1.testCases[0].className).toBe('ltcl_orchestrat');
            expect(suite1.testCases[0].status).toBe('passed');
            expect(suite1.testCases[1].name).toBe('test_check_relevance_so_arm');
            expect(suite1.testCases[1].className).toBe('ltcl_orchestrat');
            expect(suite1.testCases[1].status).toBe('passed');

            // Second suite: ltcl_orchestrat_is_oil with 2 tests (1 skipped, 1 passed)
            const suite2 = result.testSuites[1];
            expect(suite2.name).toBe('ltcl_orchestrat_is_oil');
            expect(suite2.package).toBe('fins_acdoc_predictive');
            expect(suite2.totalTests).toBe(2);
            expect(suite2.passed).toBe(1);
            expect(suite2.skipped).toBe(1);
            expect(suite2.testCases).toHaveLength(2);
            expect(suite2.testCases[0].name).toBe(''); // Empty name in XML
            expect(suite2.testCases[0].className).toBe('ltcl_orchestrat_is_oil');
            expect(suite2.testCases[0].status).toBe('skipped');
            expect(suite2.testCases[1].name).toBe('test_is_cmeth_not_supported');
            expect(suite2.testCases[1].className).toBe('ltcl_orchestrat_is_oil');
            expect(suite2.testCases[1].status).toBe('passed');

            // Verify no test case duplication between suites
            const suite1TestNames = suite1.testCases.map((tc) => tc.name);
            const suite2TestNames = suite2.testCases.map((tc) => tc.name);
            const intersection = suite1TestNames.filter((name) => suite2TestNames.includes(name));
            expect(intersection).toHaveLength(0);
        });
    });
});
