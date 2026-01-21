import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

/**
 * Interface for syntax check result items
 */
interface SyntaxCheckItem {
    type: string;
    message: string;
    line?: number;
    severity: string;
}

/**
 * Interface for syntax check results
 */
interface SyntaxCheckResults {
    status: string;
    errors: SyntaxCheckItem[];
    warnings: SyntaxCheckItem[];
    info: SyntaxCheckItem[];
    summary: {
        totalIssues: number;
        errorCount: number;
        warningCount: number;
        infoCount: number;
    };
}

/**
 * Parse ADT XML response to extract check messages
 */
function parseAdtCheckResponse(xmlResponse: string): SyntaxCheckResults {
    const errors: SyntaxCheckItem[] = [];
    const warnings: SyntaxCheckItem[] = [];
    const info: SyntaxCheckItem[] = [];

    try {
        // Simple XML parsing for check messages
        const messageRegex = /<chkrun:checkMessage[^>]*chkrun:type="([^"]*)"[^>]*chkrun:shortText="([^"]*)"[^>]*\/>/g;
        let match;

        while ((match = messageRegex.exec(xmlResponse)) !== null) {
            const messageType = match[1];
            const messageText = match[2];

            // Decode HTML entities in message text
            const decodedText = messageText
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');

            const checkItem: SyntaxCheckItem = {
                type: messageType,
                message: decodedText,
                severity: messageType === 'E' ? 'error' : messageType === 'W' ? 'warning' : 'info'
            };

            // Extract line number if present in URI
            const uriMatch = xmlResponse.match(/chkrun:uri="[^"]*#start=(\d+),\d+"/);
            if (uriMatch) {
                checkItem.line = parseInt(uriMatch[1]);
            }

            if (messageType === 'E') {
                errors.push(checkItem);
            } else if (messageType === 'W') {
                warnings.push(checkItem);
            } else {
                info.push(checkItem);
            }
        }

        const status = errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'success');

        return {
            status,
            errors,
            warnings,
            info,
            summary: {
                totalIssues: errors.length + warnings.length + info.length,
                errorCount: errors.length,
                warningCount: warnings.length,
                infoCount: info.length
            }
        };
    } catch (error) {
        console.error('Error parsing ADT check response:', error);
        return {
            status: 'error',
            errors: [{
                type: 'error',
                message: 'Failed to parse syntax check response',
                severity: 'error'
            }],
            warnings: [],
            info: [],
            summary: {
                totalIssues: 1,
                errorCount: 1,
                warningCount: 0,
                infoCount: 0
            }
        };
    }
}

/**
 * Create ADT XML payload for syntax check
 */
function createAdtCheckPayload(className: string, sourceCode: string): string {
    // Base64 encode the source code
    const encodedContent = Buffer.from(sourceCode, 'utf8').toString('base64');
    
    // Create the XML payload with proper structure
    return `<?xml version="1.0" encoding="UTF-8"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun" xmlns:adtcore="http://www.sap.com/adt/core">
    
  <chkrun:checkObject adtcore:uri="/sap/bc/adt/oo/classes/${className.toLowerCase()}" chkrun:version="active">
        
    <chkrun:artifacts>
            
      <chkrun:artifact chkrun:contentType="text/plain; charset=utf-8" chkrun:uri="/sap/bc/adt/oo/classes/${className.toLowerCase()}/source/main">
                
        <chkrun:content>${encodedContent}</chkrun:content>
              
      </chkrun:artifact>
          
    </chkrun:artifacts>
      
  </chkrun:checkObject>
  
</chkrun:checkObjectList>`;
}

/**
 * Main handler function for checking ABAP syntax using ADT checkruns
 */
export async function handleCheckSyntax(args: any) {
    try {
        // Validate required parameters
        if (!args?.source_code) {
            throw new McpError(ErrorCode.InvalidParams, 'source_code parameter is required');
        }

        const sourceCode = args.source_code;
        const objectName = args.object_name || 'TEMP_SYNTAX_CHECK';
        
        // For this implementation, we focus on active classes only
        console.error(`Initiating ADT syntax check for active class: ${objectName}`);

        const baseUrl = await getBaseUrl();
        const checkUrl = `${baseUrl}/sap/bc/adt/checkruns?reporters=abapCheckRun`;

        // Create the proper ADT XML payload
        const payload = createAdtCheckPayload(objectName, sourceCode);

        // Set proper ADT headers
        const headers = {
            'Accept': 'application/vnd.sap.adt.checkmessages+xml',
            'Content-Type': 'application/vnd.sap.adt.checkobjects+xml',
            'User-Agent': 'Eclipse/4.38.0.v20251201-0920 (win32; x86_64; Java 21.0.9) ADT/3.57.200 (devedition; adtproduct)',
            'X-sap-adt-profiling': 'server-time'
        };

        console.error(`Sending ADT syntax check request to: ${checkUrl}`);
        
        // Make the ADT request
        const response = await makeAdtRequest(checkUrl, 'POST', 10000, payload, undefined, headers);
        
        console.error('ADT syntax check request completed successfully');
        
        // Parse the XML response
        const syntaxCheckResults = parseAdtCheckResponse(response.data);
        
        // Create enhanced response
        const enhancedResponse = {
            syntaxCheck: syntaxCheckResults,
            rawResponse: response.data,
            requestInfo: {
                objectName,
                objectType: 'CLAS',
                usedFallback: false,
                adtEndpoint: checkUrl,
                method: 'adt_checkruns',
                timestamp: new Date().toISOString()
            }
        };

        // Return the enhanced response
        const enhancedAxiosResponse = {
            data: JSON.stringify(enhancedResponse, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {
                headers: {}
            }
        } as any;

        console.error('Syntax check completed successfully');
        return return_response(enhancedAxiosResponse);

    } catch (error) {
        console.error(`ADT syntax check failed for object ${args?.object_name || 'unknown'}:`, error);
        return return_error(error);
    }
}
