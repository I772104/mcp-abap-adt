import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

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

export async function handleRunClassTests(args: any) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }

        const className = args.class_name;
        const encodedClassName = encodeURIComponent(className);
        const baseUrl = await getBaseUrl();

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

        return return_response(resultsResponse);
    } catch (error) {
        return return_error(error);
    }
}
