import { makeAdtRequest, getBaseUrl } from './utils';
import { ActivationAttemptResult } from './activation-utils';

/**
 * Interface for test case result
 */
export interface TestCase {
    name: string;
    className: string;
    status: 'passed' | 'failed' | 'error' | 'skipped';
    executionTime: number;
    assertCount: number;
    errorMessage?: string;
    failureMessage?: string;
}

/**
 * Interface for test suite result
 */
export interface TestSuite {
    name: string;
    package: string;
    totalTests: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    totalAsserts: number;
    executionTime: number;
    timestamp: string;
    testCases: TestCase[];
}

/**
 * Interface for AUnit test method result
 */
export interface AUnitTestMethod {
    name: string;
    uri: string;
    executionTime: number;
    unit: string;
    status: 'passed' | 'failed' | 'error' | 'skipped';
    alerts?: AUnitAlert[];
}

/**
 * Interface for AUnit test class result
 */
export interface AUnitTestClass {
    name: string;
    uri: string;
    durationCategory: string;
    riskLevel: string;
    status: 'passed' | 'failed' | 'error' | 'skipped';
    alerts?: AUnitAlert[];
    testMethods: AUnitTestMethod[];
}

/**
 * Interface for AUnit alert
 */
export interface AUnitAlert {
    kind: string;
    severity: string;
    title: string;
    details?: string[];
    stack?: string[];
}

/**
 * Interface for AUnit program result (root level)
 */
export interface AUnitProgram {
    name: string;
    uri: string;
    type: string;
    testClasses: AUnitTestClass[];
}

/**
 * Interface for AUnit formatted test results
 */
export interface AUnitFormattedResults {
    testTarget: string;
    system?: string;
    client?: string;
    executedBy?: string;
    overallStatus: 'success' | 'failed' | 'error';
    summary: {
        totalTestClasses: number;
        totalTestMethods: number;
        passed: number;
        failed: number;
        errors: number;
        skipped: number;
        executionTime: number;
        successRate: number;
    };
    programs: AUnitProgram[];
    timestamp: string;
    activation?: ActivationAttemptResult;
}

/**
 * Interface for formatted test results
 */
export interface FormattedTestResults {
    testTarget: string;
    system: string;
    client: string;
    executedBy: string;
    overallStatus: 'success' | 'failed' | 'error';
    summary: {
        totalTests: number;
        passed: number;
        failed: number;
        errors: number;
        skipped: number;
        totalAsserts: number;
        executionTime: number;
        successRate: number;
    };
    testSuites: TestSuite[];
    timestamp: string;
    activation?: ActivationAttemptResult;
}

const POLL_INTERVAL = 1000; // 1 second
const MAX_POLL_ATTEMPTS = 300; // 5 minutes max

/**
 * Poll the test run status until it's finished
 */
export async function pollRunStatus(statusUrl: string, maxAttempts: number = MAX_POLL_ATTEMPTS): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await makeAdtRequest(statusUrl, 'GET', 30000);
            const data = response.data;

            // Check if status is FINISHED
            if (data.includes('status="FINISHED"')) {
                return data;
            }

            // Wait before polling again
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        } catch (error) {
            // If it's a 404 or other error, continue polling
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
    }

    throw new Error('Test run did not complete within the timeout period');
}

/**
 * Extract the results link from the run response
 */
export function extractResultsLink(runResponse: string): string {
    // Try multiple patterns for extracting the results link
    let junitLinkMatch;

    // Pattern 1: Original pattern
    junitLinkMatch = runResponse.match(
        /type="application\/vnd\.sap\.adt\.api\.junit\.run-result\.v1\+xml"[^>]*href="([^"]+)"/
    );
    if (junitLinkMatch && junitLinkMatch[1]) {
        return junitLinkMatch[1];
    }

    // Pattern 2: Try without version in content type
    junitLinkMatch = runResponse.match(
        /type="application\/vnd\.sap\.adt\.api\.junit\.run-result[^"]*"[^>]*href="([^"]+)"/
    );
    if (junitLinkMatch && junitLinkMatch[1]) {
        return junitLinkMatch[1];
    }

    // Pattern 3: Try any junit result link
    junitLinkMatch = runResponse.match(/junit[^>]*href="([^"]+)"/i);
    if (junitLinkMatch && junitLinkMatch[1]) {
        return junitLinkMatch[1];
    }

    // Pattern 4: Try any href with result in the path
    junitLinkMatch = runResponse.match(/href="([^"]*result[^"]+)"/i);
    if (junitLinkMatch && junitLinkMatch[1]) {
        return junitLinkMatch[1];
    }

    // Pattern 5: Generic href pattern as fallback
    junitLinkMatch = runResponse.match(/href="([^"]+)"/);
    if (junitLinkMatch && junitLinkMatch[1]) {
        return junitLinkMatch[1];
    }

    throw new Error('Could not find results link in run response');
}

/**
 * Parse AUnit alerts from XML
 */
export function parseAUnitAlerts(alertsXml: string): AUnitAlert[] {
    const alerts: AUnitAlert[] = [];
    const alertPattern = /<alert\s+kind="([^"]*)"[^>]*severity="([^"]*)"[^>]*>([\s\S]*?)<\/alert>/g;
    const alertMatches = alertsXml.matchAll(alertPattern);

    for (const match of alertMatches) {
        const kind = match[1];
        const severity = match[2];
        const content = match[3];

        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].trim() : '';

        // Extract details
        const details: string[] = [];
        const detailPattern = /<detail\s+text="([^"]*)"\s*\/>/g;
        const detailMatches = content.matchAll(detailPattern);
        for (const detailMatch of detailMatches) {
            details.push(detailMatch[1]);
        }

        // Extract stack entries
        const stack: string[] = [];
        const stackPattern = /<stackEntry[^>]*adtcore:description="([^"]*)"/g;
        const stackMatches = content.matchAll(stackPattern);
        for (const stackMatch of stackMatches) {
            stack.push(stackMatch[1]);
        }

        alerts.push({
            kind,
            severity,
            title,
            details: details.length > 0 ? details : undefined,
            stack: stack.length > 0 ? stack : undefined,
        });
    }

    return alerts;
}

/**
 * Parse AUnit test methods from XML
 */
export function parseAUnitTestMethods(testClassXml: string): AUnitTestMethod[] {
    const methods: AUnitTestMethod[] = [];
    const methodPattern = /<testMethod\s+[^>]*>/g;
    const methodMatches = testClassXml.matchAll(methodPattern);

    for (const match of methodMatches) {
        const methodTag = match[0];

        // Extract attributes
        const uriMatch = methodTag.match(/adtcore:uri="([^"]*)"/);
        const nameMatch = methodTag.match(/adtcore:name="([^"]*)"/);
        const executionTimeMatch = methodTag.match(/executionTime="([^"]*)"/);
        const unitMatch = methodTag.match(/unit="([^"]*)"/);

        const uri = uriMatch ? uriMatch[1] : '';
        const name = nameMatch ? nameMatch[1] : '';
        const executionTime = executionTimeMatch ? parseFloat(executionTimeMatch[1]) : 0;
        const unit = unitMatch ? unitMatch[1] : '';

        methods.push({
            name,
            uri,
            executionTime,
            unit,
            status: executionTime > 0 || unit ? 'passed' : 'skipped', // Methods without execution time are likely skipped
        });
    }

    return methods;
}

/**
 * Parse AUnit test classes from XML
 */
export function parseAUnitTestClasses(programXml: string): AUnitTestClass[] {
    const testClasses: AUnitTestClass[] = [];
    const testClassPattern = /<testClass\s+[^>]*>([\s\S]*?)<\/testClass>/g;
    const testClassMatches = programXml.matchAll(testClassPattern);

    for (const match of testClassMatches) {
        const testClassTag = match[0].match(/<testClass\s+[^>]*>/)?.[0] || '';
        const content = match[1];

        // Extract attributes
        const uriMatch = testClassTag.match(/adtcore:uri="([^"]*)"/);
        const nameMatch = testClassTag.match(/adtcore:name="([^"]*)"/);
        const durationCategoryMatch = testClassTag.match(/durationCategory="([^"]*)"/);
        const riskLevelMatch = testClassTag.match(/riskLevel="([^"]*)"/);

        const uri = uriMatch ? uriMatch[1] : '';
        const name = nameMatch ? nameMatch[1] : '';
        const durationCategory = durationCategoryMatch ? durationCategoryMatch[1] : '';
        const riskLevel = riskLevelMatch ? riskLevelMatch[1] : '';

        // Parse alerts if present
        let alerts: AUnitAlert[] | undefined;
        const alertsMatch = content.match(/<alerts>([\s\S]*?)<\/alerts>/);
        if (alertsMatch) {
            alerts = parseAUnitAlerts(alertsMatch[1]);
        }

        // Parse test methods
        const testMethods = parseAUnitTestMethods(content);

        // Update test method status based on alerts
        if (alerts && alerts.length > 0) {
            for (const method of testMethods) {
                if (method.executionTime === 0 && !method.unit) {
                    method.status = 'skipped';
                    method.alerts = alerts;
                }
            }
        }

        // Determine test class status
        let status: 'passed' | 'failed' | 'error' | 'skipped' = 'passed';
        if (alerts && alerts.length > 0) {
            const hasAbortion = alerts.some((a) => a.kind === 'abortion');
            const hasCritical = alerts.some((a) => a.severity === 'critical');
            if (hasAbortion || hasCritical) {
                status = 'skipped';
            }
        }
        const hasFailures = testMethods.some((m) => m.status === 'failed');
        const hasErrors = testMethods.some((m) => m.status === 'error');
        if (hasErrors) status = 'error';
        else if (hasFailures) status = 'failed';

        testClasses.push({
            name,
            uri,
            durationCategory,
            riskLevel,
            status,
            alerts,
            testMethods,
        });
    }

    return testClasses;
}

/**
 * Parse AUnit programs from XML
 */
export function parseAUnitPrograms(aunitXml: string): AUnitProgram[] {
    const programs: AUnitProgram[] = [];
    const programPattern = /<program\s+[^>]*>([\s\S]*?)<\/program>/g;
    const programMatches = aunitXml.matchAll(programPattern);

    for (const match of programMatches) {
        const programTag = match[0].match(/<program\s+[^>]*>/)?.[0] || '';
        const content = match[1];

        // Extract attributes
        const uriMatch = programTag.match(/adtcore:uri="([^"]*)"/);
        const typeMatch = programTag.match(/adtcore:type="([^"]*)"/);
        const nameMatch = programTag.match(/adtcore:name="([^"]*)"/);

        const uri = uriMatch ? uriMatch[1] : '';
        const type = typeMatch ? typeMatch[1] : '';
        const name = nameMatch ? nameMatch[1] : '';

        // Parse test classes
        const testClasses = parseAUnitTestClasses(content);

        programs.push({
            name,
            uri,
            type,
            testClasses,
        });
    }

    return programs;
}

/**
 * Format AUnit XML results into hierarchical structured JSON
 */
export function formatAUnitResults(
    aunitXml: string,
    testTarget: string,
    activationResult?: ActivationAttemptResult | null
): AUnitFormattedResults {
    // Parse programs
    const programs = parseAUnitPrograms(aunitXml);

    // Calculate summary statistics
    let totalTestClasses = 0;
    let totalTestMethods = 0;
    let passed = 0;
    let failed = 0;
    let errors = 0;
    let skipped = 0;
    let totalExecutionTime = 0;

    for (const program of programs) {
        totalTestClasses += program.testClasses.length;
        for (const testClass of program.testClasses) {
            totalTestMethods += testClass.testMethods.length;
            for (const method of testClass.testMethods) {
                totalExecutionTime += method.executionTime;
                switch (method.status) {
                    case 'passed':
                        passed++;
                        break;
                    case 'failed':
                        failed++;
                        break;
                    case 'error':
                        errors++;
                        break;
                    case 'skipped':
                        skipped++;
                        break;
                }
            }
        }
    }

    const successRate = totalTestMethods > 0 ? (passed / totalTestMethods) * 100 : 100;

    // Determine overall status
    let overallStatus: 'success' | 'failed' | 'error' = 'success';
    if (errors > 0) {
        overallStatus = 'error';
    } else if (failed > 0) {
        overallStatus = 'failed';
    }

    const results: AUnitFormattedResults = {
        testTarget,
        overallStatus,
        summary: {
            totalTestClasses,
            totalTestMethods,
            passed,
            failed,
            errors,
            skipped,
            executionTime: Math.round(totalExecutionTime * 100) / 100,
            successRate: Math.round(successRate * 100) / 100,
        },
        programs,
        timestamp: new Date().toISOString(),
    };

    // Include activation results if available
    if (activationResult) {
        results.activation = activationResult;
    }

    return results;
}

/**
 * Parse test cases from JUnit XML and extract test class hierarchy
 */
export function parseTestCases(junitXml: string): TestCase[] {
    const testCases: TestCase[] = [];

    // Match both self-closing and full testcase elements
    const testCasePattern = /<testcase[^>]*(?:\/>|>[\s\S]*?<\/testcase>)/g;
    const testCaseMatches = junitXml.matchAll(testCasePattern);

    for (const match of testCaseMatches) {
        const testCaseElement = match[0];
        const testCaseTag = testCaseElement.match(/<testcase[^>]*>/)?.[0] || testCaseElement;

        // Extract attributes from opening tag
        const classNameMatch = testCaseTag.match(/classname="([^"]*)"/);
        const nameMatch = testCaseTag.match(/\sname="([^"]*)"/);
        const timeMatch = testCaseTag.match(/time="([^"]*)"/);
        const assertsMatch = testCaseTag.match(/asserts="([^"]*)"/);

        const fullClassName = classNameMatch ? classNameMatch[1] : 'Unknown';
        const methodName = nameMatch ? nameMatch[1] : 'Unknown';

        // Extract the local test class name from the classname
        // Format: package.clas:global_class---local_test_class
        // Example: fins_acdoc_predictive.clas:cl_fins_pred_orchestrat---ltcl_orchestrat
        const localTestClassMatch = fullClassName.match(/---(.+)$/);
        const localTestClassName = localTestClassMatch ? localTestClassMatch[1] : fullClassName;

        const testCase: TestCase = {
            name: methodName,
            className: localTestClassName, // Store the local test class name
            status: 'passed', // Default to passed
            executionTime: timeMatch && timeMatch[1] ? parseFloat(timeMatch[1]) : 0,
            assertCount: assertsMatch ? parseInt(assertsMatch[1]) : 0,
        };

        // Check for failures, errors, or skipped status in the element content
        if (testCaseElement.includes('<failure')) {
            testCase.status = 'failed';
            const failureMatch = testCaseElement.match(/<failure[^>]*message="([^"]*)"[^>]*>/);
            if (failureMatch) {
                testCase.failureMessage = failureMatch[1];
            }
        } else if (testCaseElement.includes('<error')) {
            testCase.status = 'error';
            const errorMatch = testCaseElement.match(/<error[^>]*message="([^"]*)"[^>]*>/);
            if (errorMatch) {
                testCase.errorMessage = errorMatch[1];
            }
        } else if (testCaseElement.includes('<skipped')) {
            testCase.status = 'skipped';
        }

        testCases.push(testCase);
    }

    return testCases;
}

/**
 * Parse test suites from JUnit XML - restructured to group by local test class
 */
export function parseTestSuites(junitXml: string): TestSuite[] {
    const testSuites: TestSuite[] = [];

    // Match <testsuite> elements (not <testsuites>). Require whitespace after tag name.
    const testSuitePattern = /<testsuite\s[\s\S]*?<\/testsuite>/g;
    const testSuiteMatches = junitXml.matchAll(testSuitePattern);

    for (const match of testSuiteMatches) {
        const testSuiteElement = match[0];
        // Extract the opening tag including all attributes across multiple lines
        const testSuiteTag = testSuiteElement.match(/<testsuite\s[\s\S]*?>/)?.[0] || '';

        // Extract attributes from opening tag (matches across newlines)
        const nameMatch = testSuiteTag.match(/\sname="([^"]*)"/);
        const packageMatch = testSuiteTag.match(/package="([^"]*)"/);
        const testsMatch = testSuiteTag.match(/tests="([^"]*)"/);
        const failuresMatch = testSuiteTag.match(/failures="([^"]*)"/);
        const errorsMatch = testSuiteTag.match(/errors="([^"]*)"/);
        const skippedMatch = testSuiteTag.match(/skipped="([^"]*)"/);
        const assertsMatch = testSuiteTag.match(/asserts="([^"]*)"/);
        const timeMatch = testSuiteTag.match(/time="([^"]*)"/);
        const timestampMatch = testSuiteTag.match(/timestamp="([^"]*)"/);

        const packageName = packageMatch ? packageMatch[1] : 'Unknown';
        const totalTests = testsMatch ? parseInt(testsMatch[1]) : 0;
        const failed = failuresMatch ? parseInt(failuresMatch[1]) : 0;
        const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
        const passed = totalTests - failed - errors - skipped;

        // Parse all test cases from this suite element
        const allTestCases = parseTestCases(testSuiteElement);

        // Group test cases by their local test class name
        const testCasesByClass = new Map<string, TestCase[]>();
        for (const testCase of allTestCases) {
            const className = testCase.className;
            if (!testCasesByClass.has(className)) {
                testCasesByClass.set(className, []);
            }
            testCasesByClass.get(className)!.push(testCase);
        }

        // Create a separate test suite for each local test class
        for (const [className, testCases] of testCasesByClass.entries()) {
            const classTotal = testCases.length;
            const classFailed = testCases.filter((tc) => tc.status === 'failed').length;
            const classErrors = testCases.filter((tc) => tc.status === 'error').length;
            const classSkipped = testCases.filter((tc) => tc.status === 'skipped').length;
            const classPassed = classTotal - classFailed - classErrors - classSkipped;
            const classAsserts = testCases.reduce((sum, tc) => sum + tc.assertCount, 0);
            const classTime = testCases.reduce((sum, tc) => sum + tc.executionTime, 0);

            const testSuite: TestSuite = {
                name: className, // Use the local test class name as the suite name
                package: packageName,
                totalTests: classTotal,
                passed: classPassed,
                failed: classFailed,
                errors: classErrors,
                skipped: classSkipped,
                totalAsserts: classAsserts,
                executionTime: classTime,
                timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
                testCases: testCases,
            };

            testSuites.push(testSuite);
        }
    }

    return testSuites;
}

/**
 * Format JUnit XML results into structured JSON
 */
export function formatTestResults(
    junitXml: string,
    testTarget: string,
    activationResult?: ActivationAttemptResult | null
): FormattedTestResults {
    // Extract root testsuites attributes
    const testSuitesMatch = junitXml.match(/<testsuites[^>]*>/);
    const testSuitesElement = testSuitesMatch ? testSuitesMatch[0] : '';

    const systemMatch = testSuitesElement.match(/system="([^"]*)"/);
    const clientMatch = testSuitesElement.match(/client="([^"]*)"/);
    const executedByMatch = testSuitesElement.match(/executedBy="([^"]*)"/);
    const totalTimeMatch = testSuitesElement.match(/time="([^"]*)"/);
    const timestampMatch = testSuitesElement.match(/timestamp="([^"]*)"/);
    const totalFailuresMatch = testSuitesElement.match(/failures="([^"]*)"/);
    const totalErrorsMatch = testSuitesElement.match(/errors="([^"]*)"/);
    const totalSkippedMatch = testSuitesElement.match(/skipped="([^"]*)"/);
    const totalAssertsMatch = testSuitesElement.match(/asserts="([^"]*)"/);
    const totalTestsMatch = testSuitesElement.match(/tests="([^"]*)"/);

    // Parse test suites (each suite now contains its own test cases)
    const testSuites = parseTestSuites(junitXml);

    // Flatten all test cases from all suites for summary calculation
    const allTestCases = testSuites.flatMap((suite) => suite.testCases);

    // Calculate summary
    const totalTests = totalTestsMatch ? parseInt(totalTestsMatch[1]) : allTestCases.length;
    const totalFailures = totalFailuresMatch ? parseInt(totalFailuresMatch[1]) : 0;
    const totalErrors = totalErrorsMatch ? parseInt(totalErrorsMatch[1]) : 0;
    const totalSkipped = totalSkippedMatch ? parseInt(totalSkippedMatch[1]) : 0;
    const totalPassed = totalTests - totalFailures - totalErrors - totalSkipped;
    const successRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 100;

    // Determine overall status
    let overallStatus: 'success' | 'failed' | 'error' = 'success';
    if (totalErrors > 0) {
        overallStatus = 'error';
    } else if (totalFailures > 0) {
        overallStatus = 'failed';
    }

    const results: FormattedTestResults = {
        testTarget,
        system: systemMatch ? systemMatch[1] : 'Unknown',
        client: clientMatch ? clientMatch[1] : 'Unknown',
        executedBy: executedByMatch ? executedByMatch[1] : 'Unknown',
        overallStatus,
        summary: {
            totalTests,
            passed: totalPassed,
            failed: totalFailures,
            errors: totalErrors,
            skipped: totalSkipped,
            totalAsserts: totalAssertsMatch ? parseInt(totalAssertsMatch[1]) : 0,
            executionTime: totalTimeMatch ? parseFloat(totalTimeMatch[1]) : 0,
            successRate: Math.round(successRate * 100) / 100,
        },
        testSuites,
        timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
    };

    // Include activation results if available
    if (activationResult) {
        results.activation = activationResult;
    }

    return results;
}

/**
 * Create object set XML for a class
 */
export function createClassObjectSet(className: string): string {
    return `<osl:objectSet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:osl="http://www.sap.com/api/osl" xsi:type="osl:flatObjectSet">
    <osl:object name="${className}" type="CLAS"/>
  </osl:objectSet>`;
}

/**
 * Create object set XML for a package
 */
export function createPackageObjectSet(packageName: string): string {
    return `<osl:objectSet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:osl="http://www.sap.com/api/osl" xsi:type="osl:multiPropertySet">
    <osl:property key="package" value="${packageName}"/>
  </osl:objectSet>`;
}

/**
 * Create test run payload XML
 */
export function createTestRunPayload(
    objectSetXml: string,
    title: string,
    context: string = 'MCP ABAP ADT Test Runner'
): string {
    return `<?xml version="1.0" encoding="UTF-8"?><aunit:run xmlns:aunit="http://www.sap.com/adt/api/aunit" title="${title}" context="${context}">
  <aunit:options>
    <aunit:scope ownTests="true" foreignTests="false" addForeignTestsAsPreview="true"/>
    <aunit:riskLevel harmless="true" dangerous="true" critical="true"/>
    <aunit:duration short="true" medium="true" long="true"/>
  </aunit:options>
  ${objectSetXml}
</aunit:run>`;
}

/**
 * Core function to run ABAP Unit tests - returns formatted results
 */
export async function runAbapUnitTests(
    objectSetXml: string,
    title: string,
    testTarget: string,
    activationResult?: ActivationAttemptResult | null
): Promise<FormattedTestResults> {
    const baseUrl = await getBaseUrl();

    // Create the XML payload
    const payload = createTestRunPayload(objectSetXml, title);

    // Trigger the test run
    const runUrl = `${baseUrl}/sap/bc/adt/abapunit/runs`;
    const customHeaders = {
        'Content-Type': 'application/vnd.sap.adt.api.abapunit.run.v2+xml',
    };
    const runResponse = await makeAdtRequest(runUrl, 'POST', 30000, payload, undefined, customHeaders);

    // Log the POST response to stderr
    console.error('POST Response:', {
        status: runResponse.status,
        statusText: runResponse.statusText,
        headers: runResponse.headers,
        data: runResponse.data,
    });

    // Extract the Location header which contains the status endpoint
    const locationHeader = runResponse.headers['location'];
    if (!locationHeader) {
        throw new Error('No Location header in response - could not determine run status endpoint');
    }

    const statusUrl = `${baseUrl}${locationHeader}`;

    // Poll until the run is finished
    const finishedRunResponse = await pollRunStatus(statusUrl);

    // Extract the results link - try both JUnit and AUnit formats
    const resultsLink = extractResultsLink(finishedRunResponse);
    const resultsUrl = `${baseUrl}${resultsLink}`;

    // Fetch the results
    const resultsResponse = await makeAdtRequest(resultsUrl, 'GET', 30000);

    // Detect format and parse accordingly
    // JUnit format has <testsuites>, AUnit format has <aunit:runResult>
    const xmlData = resultsResponse.data;
    if (xmlData.includes('<testsuites')) {
        // JUnit XML format - use the updated JUnit parser with hierarchical structure
        return formatTestResults(xmlData, testTarget, activationResult);
    } else if (xmlData.includes('<aunit:runResult') || xmlData.includes('<runResult')) {
        // AUnit XML format - convert to FormattedTestResults for compatibility
        const aunitResults = formatAUnitResults(xmlData, testTarget, activationResult);
        // For now, return empty FormattedTestResults since we're focusing on JUnit format
        // This can be enhanced later to convert AUnit format to FormattedTestResults
        return formatTestResults(
            '<?xml version="1.0"?><testsuites tests="0"></testsuites>',
            testTarget,
            activationResult
        );
    } else {
        throw new Error('Unknown test result format received');
    }
}
