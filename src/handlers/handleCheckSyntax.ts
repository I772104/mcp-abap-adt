import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { handleGetClass } from './handleGetClass';
import { handleCreateLocalClass } from './handleCreateLocalClass';
import { handleDeleteLocalClass } from './handleDeleteLocalClass';

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
 * Parse ADT XML response to extract check messages with enhanced parsing
 */
function parseAdtCheckResponse(xmlResponse: string): SyntaxCheckResults {
    const errors: SyntaxCheckItem[] = [];
    const warnings: SyntaxCheckItem[] = [];
    const info: SyntaxCheckItem[] = [];

    try {
        console.error('Raw ADT response for parsing:', xmlResponse.substring(0, 500) + '...');
        
        // Enhanced XML parsing for check messages - handle different ADT response formats
        // Updated regex to properly handle self-closing tags and various attribute orders
        const messageRegex = /<chkrun:checkMessage[^>]*>/g;
        let match;

        while ((match = messageRegex.exec(xmlResponse)) !== null) {
            const fullMatch = match[0];
            
            // Extract type attribute
            const typeMatch = fullMatch.match(/chkrun:type="([^"]*)"/);
            const messageType = typeMatch ? typeMatch[1] : null;
            
            // Extract shortText attribute
            const textMatch = fullMatch.match(/chkrun:shortText="([^"]*)"/);
            const messageText = textMatch ? textMatch[1] : null;

            if (!messageType || !messageText) continue;

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

            // Try to extract line number from URI or other attributes
            const lineRegexes = [
                /chkrun:uri="[^"]*#start=(\d+),\d+"/,
                /line="(\d+)"/,
                /startLine="(\d+)"/
            ];
            
            for (const regex of lineRegexes) {
                const lineMatch = xmlResponse.match(regex);
                if (lineMatch) {
                    checkItem.line = parseInt(lineMatch[1]);
                    break;
                }
            }

            if (messageType === 'E') {
                errors.push(checkItem);
            } else if (messageType === 'W') {
                warnings.push(checkItem);
            } else {
                info.push(checkItem);
            }
        }

        // If no structured messages found, try to extract from different formats
        if (errors.length === 0 && warnings.length === 0 && info.length === 0) {
            // Try alternative parsing for different ADT response formats
            const altRegex = /<message[^>]*type="([^"]*)"[^>]*>([^<]+)<\/message>/g;
            let altMatch;
            while ((altMatch = altRegex.exec(xmlResponse)) !== null) {
                const messageType = altMatch[1];
                const messageText = altMatch[2];
                
                const checkItem: SyntaxCheckItem = {
                    type: messageType,
                    message: messageText.trim(),
                    severity: messageType === 'E' ? 'error' : messageType === 'W' ? 'warning' : 'info'
                };
                
                if (messageType === 'E') {
                    errors.push(checkItem);
                } else if (messageType === 'W') {
                    warnings.push(checkItem);
                } else {
                    info.push(checkItem);
                }
            }
        }

        const status = errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'success');

        console.error(`Parsed ${errors.length} errors, ${warnings.length} warnings, ${info.length} info messages`);

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
    
    // Create the XML payload with proper structure for ADT checkruns
    return `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun" xmlns:adtcore="http://www.sap.com/adt/core">
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
 * Generate a temporary class name for syntax checking
 */
function generateTempClassName(): string {
    const timestamp = Date.now().toString().slice(-8);
    return `ZTEMP_SYNTAX_${timestamp}`;
}

/**
 * Direct ADT syntax check - bypasses class creation to get real ADT errors
 */
async function performDirectAdtSyntaxCheck(sourceCode: string, className: string): Promise<{syntaxCheck: SyntaxCheckResults, rawResponse: string}> {
    try {
        console.error(`Performing direct ADT syntax check for class: ${className}`);
        
        const baseUrl = await getBaseUrl();
        const checkUrl = `${baseUrl}/sap/bc/adt/checkruns?reporters=abapCheckRun`;
        const payload = createAdtCheckPayload(className, sourceCode);
        
        const headers = {
            'Accept': 'application/vnd.sap.adt.checkmessages+xml',
            'Content-Type': 'application/vnd.sap.adt.checkobjects+xml',
            'User-Agent': 'Eclipse/4.38.0.v20251201-0920 (win32; x86_64; Java 21.0.9) ADT/3.57.200 (devedition; adtproduct)',
            'X-sap-adt-profiling': 'server-time'
        };
        
        console.error('Sending direct ADT checkrun request...');
        const response = await makeAdtRequest(checkUrl, 'POST', 15000, payload, undefined, headers);
        
        console.error('Received ADT response, parsing...');
        const syntaxCheckResults = parseAdtCheckResponse(response.data);
        
        return {
            syntaxCheck: syntaxCheckResults,
            rawResponse: response.data || 'No response data'
        };
        
    } catch (error: any) {
        console.error('Direct ADT syntax check failed:', error);
        
        // If the direct check fails, return error with more context
        return {
            syntaxCheck: {
                status: 'error',
                errors: [{
                    type: 'error',
                    message: `ADT syntax check failed: ${error?.message || 'Unknown error'}`,
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
            },
            rawResponse: error?.response?.data || error?.message || 'No error response data'
        };
    }
}

/**
 * Temp class syntax check - creates temporary class, checks syntax, then deletes it
 */
async function performTempClassSyntaxCheck(sourceCode: string, originalClassName: string): Promise<{syntaxCheck: SyntaxCheckResults, rawResponse: string, tempClassName: string}> {
    const tempClassName = generateTempClassName();
    
    try {
        console.error(`Creating temporary class for syntax check: ${tempClassName}`);
        
        // Create temporary class with minimal default source code
        const minimalSource = `CLASS ${tempClassName.toLowerCase()} DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.

ENDCLASS.

CLASS ${tempClassName.toLowerCase()} IMPLEMENTATION.
ENDCLASS.`;

        const createResult = await handleCreateLocalClass({
            class_name: tempClassName,
            source_code: minimalSource,
            description: `Temp class for syntax check`,
            package: '$TMP'
        });
        
        if (createResult.isError) {
            const errorMessage = typeof createResult.content === 'string' ? 
                createResult.content : 
                JSON.stringify(createResult.content);
            throw new Error(`Failed to create temporary class: ${errorMessage}`);
        }
        
        console.error(`Temporary class ${tempClassName} created, performing syntax check...`);
        
        // Replace class names in source code to match temp class name
        let modifiedSourceCode = sourceCode;
        // Replace class definition and implementation names with temp class name
        modifiedSourceCode = modifiedSourceCode.replace(/CLASS\s+\w+\s+DEFINITION/gi, `CLASS ${tempClassName.toLowerCase()} DEFINITION`);
        modifiedSourceCode = modifiedSourceCode.replace(/CLASS\s+\w+\s+IMPLEMENTATION/gi, `CLASS ${tempClassName.toLowerCase()} IMPLEMENTATION`);
        
        // Perform syntax check on the temporary class with modified source code
        const syntaxResult = await performDirectAdtSyntaxCheck(modifiedSourceCode, tempClassName);
        
        return {
            syntaxCheck: syntaxResult.syntaxCheck,
            rawResponse: syntaxResult.rawResponse,
            tempClassName: tempClassName
        };
        
    } catch (error: any) {
        console.error(`Temp class syntax check failed for ${tempClassName}:`, error);
        
        return {
            syntaxCheck: {
                status: 'error',
                errors: [{
                    type: 'error',
                    message: `Temp class syntax check failed: ${error?.message || 'Unknown error'}`,
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
            },
            rawResponse: error?.response?.data || error?.message || 'No error response data',
            tempClassName: tempClassName
        };
    }
}

/**
 * Main handler function for checking ABAP syntax using direct ADT checkruns
 */
export async function handleCheckSyntax(args: any) {
    try {
        // Validate that at least source_code or object_name is provided
        if (!args?.source_code && !args?.object_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Either source_code or object_name parameter is required');
        }

        let sourceCode = args.source_code;
        let objectName = args.object_name;
        let sourceMethod = 'provided'; // Track how we got the source code
        let classExists = false;

        // If source_code is not provided, try to fetch it from existing class
        if (!sourceCode && objectName) {
            console.error(`Attempting to fetch source code for class: ${objectName}`);
            try {
                const classResult = await handleGetClass({ class_name: objectName });
                if (!classResult.isError) {
                    sourceCode = classResult.content[0].text;
                    sourceMethod = 'fetched';
                    classExists = true;
                    console.error(`Successfully fetched source code for existing class: ${objectName}`);
                } else {
                    console.error(`Class ${objectName} does not exist`);
                    throw new McpError(ErrorCode.InvalidParams, `Class ${objectName} does not exist or is not accessible`);
                }
            } catch (fetchError) {
                console.error(`Failed to fetch class ${objectName}:`, fetchError);
                throw fetchError;
            }
        }

        // If we still don't have source code, we can't proceed
        if (!sourceCode) {
            throw new McpError(ErrorCode.InvalidParams, 'Could not obtain source code: either provide source_code parameter or specify an existing class name in object_name');
        }

        // Generate object name if not provided
        if (!objectName) {
            objectName = generateTempClassName();
            sourceMethod = 'generated_name';
        }

        let syntaxResults: any;
        let tempClassUsed = false;
        let tempClassName: string | undefined;
        let approach = 'direct_adt_api';
        
        // Try direct ADT syntax check first
        console.error(`Starting direct ADT syntax check for: ${objectName}`);
        const directResults = await performDirectAdtSyntaxCheck(sourceCode, objectName);
        
        // Check if the direct approach failed because class doesn't exist
        const responseContainsNotExist = directResults.rawResponse && 
            (directResults.rawResponse.includes('does not exist') || 
             directResults.rawResponse.includes('notProcessed'));
        
        if (!classExists && responseContainsNotExist) {
            // Use temporary class approach for non-existing classes
            console.error(`Direct ADT approach failed because class doesn't exist. Using temporary class approach...`);
            const tempResults = await performTempClassSyntaxCheck(sourceCode, objectName);
            
            syntaxResults = {
                syntaxCheck: tempResults.syntaxCheck,
                rawAdtResponse: tempResults.rawResponse
            };
            
            tempClassUsed = true;
            tempClassName = tempResults.tempClassName;
            approach = 'temp_class';
            
            // Clean up: Delete the temporary class
            try {
                console.error(`Deleting temporary class: ${tempResults.tempClassName}`);
                const deleteResult = await handleDeleteLocalClass({ class_name: tempResults.tempClassName });
                
                if (deleteResult.isError) {
                    console.error(`Warning: Failed to delete temporary class ${tempResults.tempClassName}:`, deleteResult.content);
                } else {
                    console.error(`Temporary class ${tempResults.tempClassName} deleted successfully`);
                }
            } catch (deleteError) {
                console.error(`Warning: Exception during temporary class deletion ${tempResults.tempClassName}:`, deleteError);
                // Don't fail the entire operation if cleanup fails
            }
        } else {
            // Use direct results
            syntaxResults = {
                syntaxCheck: directResults.syntaxCheck,
                rawAdtResponse: directResults.rawResponse
            };
        }
        
        // Create enhanced response with the REAL ADT error details
        const enhancedResponse: any = {
            syntaxCheck: syntaxResults.syntaxCheck,
            rawAdtResponse: syntaxResults.rawAdtResponse,
            requestInfo: {
                objectName: args.object_name || objectName,
                objectType: args.object_type || 'CLAS',
                sourceMethod: sourceMethod,
                classExists: classExists,
                tempClassUsed: tempClassUsed,
                tempClassName: tempClassName,
                adtEndpoint: tempClassUsed ? 'Temp class + ADT checkruns API' : 'Direct ADT checkruns API',
                method: tempClassUsed ? 'temp_class_adt_checkruns' : 'adt_checkruns',
                timestamp: new Date().toISOString(),
                approach: approach
            }
        };

        // Return the enhanced response with REAL ADT syntax errors
        const enhancedAxiosResponse = {
            data: JSON.stringify(enhancedResponse, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {
                headers: {}
            }
        } as any;

        console.error('Direct ADT syntax check completed successfully');
        return return_response(enhancedAxiosResponse);

    } catch (error) {
        console.error(`Direct ADT syntax check failed for object ${args?.object_name || 'unknown'}:`, error);
        return return_error(error);
    }
}