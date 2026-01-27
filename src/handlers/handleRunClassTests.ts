import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { attemptClassActivation, createWorkflowResponse, ActivationAttemptResult } from '../lib/activation-utils';

/**
 * Interface for test case result
 */
interface TestCase {
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
interface TestSuite {
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
 * Interface for formatted test results
 */
interface FormattedTestResults {
    className: string;
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

async function pollRunStatus(statusUrl: string, maxAttempts: number = MAX_POLL_ATTEMPTS): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await makeAdtRequest(statusUrl, 'GET', 30000);
            const data = response.data;

            // Check if status is FINISHED
            if (data.includes('status="FINISHED"')) {
                return data;
            }

            // Wait before polling again
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        } catch (error) {
            // If it's a 404 or other error, continue polling
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
    }

    throw new Error('Test run did not complete within the timeout period');
}

function extractResultsLink(runResponse: string): string {
    // Try multiple patterns for extracting the results link
    let junitLinkMatch;
    
    // Pattern 1: Original pattern
    junitLinkMatch = runResponse.match(/type="application\/vnd\.sap\.adt\.api\.junit\.run-result\.v1\+xml"[^>]*href="([^"]+)"/);
    if (junitLinkMatch && junitLinkMatch[1]) {
        return junitLinkMatch[1];
    }
    
    // Pattern 2: Try without version in content type
    junitLinkMatch = runResponse.match(/type="application\/vnd\.sap\.adt\.api\.junit\.run-result[^"]*"[^>]*href="([^"]+)"/);
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
 * Parses JUnit XML and extracts test case information
 */
function parseTestCases(junitXml: string): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Extract test case elements using regex
    const testCasePattern = /<testcase[^>]*>/g;
    const testCaseMatches = junitXml.matchAll(testCasePattern);
    
    for (const match of testCaseMatches) {
        const testCaseElement = match[0];
        
        // Extract attributes
        const classNameMatch = testCaseElement.match(/classname="([^"]*)"/);
        const nameMatch = testCaseElement.match(/name="([^"]*)"/);
        const timeMatch = testCaseElement.match(/time="([^"]*)"/);
        const assertsMatch = testCaseElement.match(/asserts="([^"]*)"/);
        
        const testCase: TestCase = {
            name: nameMatch ? nameMatch[1] : 'Unknown',
            className: classNameMatch ? classNameMatch[1] : 'Unknown',
            status: 'passed', // Default to passed
            executionTime: timeMatch ? parseFloat(timeMatch[1]) : 0,
            assertCount: assertsMatch ? parseInt(assertsMatch[1]) : 0
        };
        
        // Check for failures or errors in the following content
        const testCaseEndIndex = junitXml.indexOf('</testcase>', junitXml.indexOf(testCaseElement));
        if (testCaseEndIndex > -1) {
            const testCaseContent = junitXml.substring(junitXml.indexOf(testCaseElement), testCaseEndIndex);
            
            if (testCaseContent.includes('<failure')) {
                testCase.status = 'failed';
                const failureMatch = testCaseContent.match(/<failure[^>]*message="([^"]*)"[^>]*>/);
                if (failureMatch) {
                    testCase.failureMessage = failureMatch[1];
                }
            } else if (testCaseContent.includes('<error')) {
                testCase.status = 'error';
                const errorMatch = testCaseContent.match(/<error[^>]*message="([^"]*)"[^>]*>/);
                if (errorMatch) {
                    testCase.errorMessage = errorMatch[1];
                }
            } else if (testCaseContent.includes('<skipped')) {
                testCase.status = 'skipped';
            }
        }
        
        testCases.push(testCase);
    }
    
    return testCases;
}

/**
 * Parses JUnit XML and extracts test suite information
 */
function parseTestSuites(junitXml: string): TestSuite[] {
    const testSuites: TestSuite[] = [];
    
    // Extract test suite elements
    const testSuitePattern = /<testsuite[^>]*>/g;
    const testSuiteMatches = junitXml.matchAll(testSuitePattern);
    
    for (const match of testSuiteMatches) {
        const testSuiteElement = match[0];
        
        // Extract attributes
        const nameMatch = testSuiteElement.match(/name="([^"]*)"/);
        const packageMatch = testSuiteElement.match(/package="([^"]*)"/);
        const testsMatch = testSuiteElement.match(/tests="([^"]*)"/);
        const failuresMatch = testSuiteElement.match(/failures="([^"]*)"/);
        const errorsMatch = testSuiteElement.match(/errors="([^"]*)"/);
        const skippedMatch = testSuiteElement.match(/skipped="([^"]*)"/);
        const assertsMatch = testSuiteElement.match(/asserts="([^"]*)"/);
        const timeMatch = testSuiteElement.match(/time="([^"]*)"/);
        const timestampMatch = testSuiteElement.match(/timestamp="([^"]*)"/);
        
        const totalTests = testsMatch ? parseInt(testsMatch[1]) : 0;
        const failed = failuresMatch ? parseInt(failuresMatch[1]) : 0;
        const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
        const passed = totalTests - failed - errors - skipped;
        
        const testSuite: TestSuite = {
            name: nameMatch ? nameMatch[1] : 'Test Suite',
            package: packageMatch ? packageMatch[1] : 'Unknown',
            totalTests,
            passed,
            failed,
            errors,
            skipped,
            totalAsserts: assertsMatch ? parseInt(assertsMatch[1]) : 0,
            executionTime: timeMatch ? parseFloat(timeMatch[1]) : 0,
            timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
            testCases: [] // Will be populated with test cases
        };
        
        testSuites.push(testSuite);
    }
    
    return testSuites;
}

/**
 * Formats JUnit XML results into a structured JSON response
 */
function formatTestResults(junitXml: string, className: string, activationResult?: ActivationAttemptResult | null): FormattedTestResults {
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
    
    // Parse test suites and test cases
    const testSuites = parseTestSuites(junitXml);
    const allTestCases = parseTestCases(junitXml);
    
    // Associate test cases with their test suites
    testSuites.forEach(suite => {
        suite.testCases = allTestCases.filter(testCase => 
            testCase.className.includes(suite.package) || suite.name === ''
        );
    });
    
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
        className,
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
            successRate: Math.round(successRate * 100) / 100
        },
        testSuites,
        timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString()
    };
    
    // Include activation results if available
    if (activationResult) {
        results.activation = activationResult;
    }
    
    return results;
}

export async function handleRunClassTests(args: any) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }

        const className = args.class_name;
        const autoActivate = args.auto_activate === true;
        const preauditRequested = args.preaudit_requested !== false; // default to true
        const encodedClassName = encodeURIComponent(className);
        const baseUrl = await getBaseUrl();

        // Auto-activate class before running tests if requested
        let activationResult: ActivationAttemptResult | null = null;
        if (autoActivate) {
            console.log(`Auto-activation requested before running tests for class ${className}`);
            activationResult = await attemptClassActivation(className, preauditRequested);
            
            // If activation failed critically, we might still want to try running tests
            if (activationResult.status === 'error') {
                console.warn(`Auto-activation failed for class ${className}, but proceeding with test execution`);
            }
        }

        // Create the XML payload
        const payload = `<?xml version="1.0" encoding="UTF-8"?><aunit:run xmlns:aunit="http://www.sap.com/adt/api/aunit" title="${className}" context="ADT4Eclipse ABAP Unit Test Runner">
  <aunit:options>
    <aunit:scope ownTests="true" foreignTests="false" addForeignTestsAsPreview="true"/>
    <aunit:riskLevel harmless="true" dangerous="true" critical="true"/>
    <aunit:duration short="true" medium="true" long="true"/>
  </aunit:options>
  <osl:objectSet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:osl="http://www.sap.com/api/osl" xsi:type="osl:flatObjectSet">
    <osl:object name="${className}" type="CLAS"/>
  </osl:objectSet>
</aunit:run>`;

        // Trigger the test run
        const runUrl = `${baseUrl}/sap/bc/adt/abapunit/runs`;
        const customHeaders = {
            'Content-Type': 'application/vnd.sap.adt.api.abapunit.run.v2+xml'
        };
        const runResponse = await makeAdtRequest(runUrl, 'POST', 30000, payload, undefined, customHeaders);
        
        // Log the POST response to stderr
        console.error('POST Response:', {
            status: runResponse.status,
            statusText: runResponse.statusText,
            headers: runResponse.headers,
            data: runResponse.data
        });

        // Extract the Location header which contains the status endpoint
        const locationHeader = runResponse.headers['location'];
        if (!locationHeader) {
            throw new Error('No Location header in response - could not determine run status endpoint');
        }

        const statusUrl = `${baseUrl}${locationHeader}`;

        // Poll until the run is finished
        const finishedRunResponse = await pollRunStatus(statusUrl);

        // Extract the results link from the finished response
        const resultsLink = extractResultsLink(finishedRunResponse);
        const resultsUrl = `${baseUrl}${resultsLink}`;

        // Fetch the results in JUnit format
        const resultsResponse = await makeAdtRequest(resultsUrl, 'GET', 30000);

        // Parse and format the JUnit XML results
        const formattedResults = formatTestResults(resultsResponse.data, className, activationResult);
        
        // Create a formatted JSON response
        const formattedResponse = {
            data: JSON.stringify(formattedResults, null, 2),
            status: resultsResponse.status,
            statusText: resultsResponse.statusText,
            headers: { 'Content-Type': 'application/json' },
            config: resultsResponse.config,
            request: resultsResponse.request
        };

        return return_response(formattedResponse);
    } catch (error) {
        return return_error(error);
    }
}
