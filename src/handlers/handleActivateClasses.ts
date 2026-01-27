import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

/**
 * Interface for class activation parameters
 */
interface ActivateClassesParams {
    class_names?: string[];
    class_name?: string;
    preaudit_requested?: boolean;
}

/**
 * Interface for activation result item
 */
interface ActivationResultItem {
    className: string;
    uri: string;
    status: 'success' | 'error' | 'warning';
    message?: string;
}

/**
 * Interface for activation results
 */
interface ActivationResults {
    status: string;
    activatedClasses: ActivationResultItem[];
    summary: {
        totalClasses: number;
        successCount: number;
        errorCount: number;
        warningCount: number;
    };
    timestamp: string;
}

/**
 * Validates class names and formats them properly
 */
function validateAndFormatClassNames(classNames: string[]): string[] {
    if (!classNames || classNames.length === 0) {
        throw new McpError(ErrorCode.InvalidParams, 'At least one class name is required');
    }

    return classNames.map(className => {
        if (!className || typeof className !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'All class names must be non-empty strings');
        }

        const upperClassName = className.trim().toUpperCase();
        
        // Basic validation - class name should not be empty after trimming
        if (!upperClassName) {
            throw new McpError(ErrorCode.InvalidParams, 'Class names cannot be empty');
        }

        // Check length limit (ABAP object names are typically max 30 characters)
        if (upperClassName.length > 30) {
            throw new McpError(ErrorCode.InvalidParams, `Class name '${upperClassName}' exceeds 30 character limit`);
        }

        return upperClassName;
    });
}

/**
 * Creates XML payload for class activation request
 */
function createActivationPayload(classNames: string[]): string {
    const objectReferences = classNames.map(className => {
        // XML escape the class name
        const escapedClassName = className
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const uri = `/sap/bc/adt/oo/classes/${className.toLowerCase()}`;
        
        return `  <adtcore:objectReference adtcore:uri="${uri}" adtcore:name="${escapedClassName}"/>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?><adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
${objectReferences}
</adtcore:objectReferences>`;
}

/**
 * Parses activation response to extract results
 */
function parseActivationResponse(responseData: string, classNames: string[]): ActivationResults {
    const results: ActivationResultItem[] = [];
    let successCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    try {
        // Check if activation was cancelled or failed
        const activationCancelled = responseData.includes('Activation was cancelled');
        const activationFailed = responseData.includes('activationExecuted="false"');
        
        // Extract error and warning messages from XML
        const errorMessages: string[] = [];
        const warningMessages: string[] = [];
        
        // Parse XML messages with type="E" (Error) and type="W" (Warning)
        const errorMatches = responseData.match(/<msg[^>]*type="E"[^>]*>[\s\S]*?<shortText><txt>(.*?)<\/txt><\/shortText>[\s\S]*?<\/msg>/g);
        const warningMatches = responseData.match(/<msg[^>]*type="W"[^>]*>[\s\S]*?<shortText><txt>(.*?)<\/txt><\/shortText>[\s\S]*?<\/msg>/g);
        
        if (errorMatches) {
            errorMatches.forEach(match => {
                const textMatch = match.match(/<txt>(.*?)<\/txt>/);
                if (textMatch) {
                    errorMessages.push(textMatch[1]);
                }
            });
        }
        
        if (warningMatches) {
            warningMatches.forEach(match => {
                const textMatch = match.match(/<txt>(.*?)<\/txt>/);
                if (textMatch) {
                    warningMessages.push(textMatch[1]);
                }
            });
        }

        // Determine status based on XML analysis
        const hasErrors = errorMessages.length > 0;
        const hasWarnings = warningMessages.length > 0;
        const hasActivationIssues = activationCancelled || activationFailed;

        // For each class, determine activation status
        for (const className of classNames) {
            const uri = `/sap/bc/adt/oo/classes/${className.toLowerCase()}`;
            
            let status: 'success' | 'error' | 'warning';
            let message: string | undefined;

            if (hasErrors || hasActivationIssues) {
                status = 'error';
                if (errorMessages.length > 0) {
                    message = `Activation failed for class ${className}: ${errorMessages.join('; ')}`;
                } else {
                    message = `Activation cancelled for class ${className}`;
                }
                errorCount++;
            } else if (hasWarnings) {
                status = 'warning';
                message = `Activation completed with warnings for class ${className}: ${warningMessages.join('; ')}`;
                warningCount++;
            } else {
                status = 'success';
                message = `Class ${className} activated successfully`;
                successCount++;
            }

            results.push({
                className,
                uri,
                status,
                message
            });
        }

        const overallStatus = errorCount > 0 ? 'error' : (warningCount > 0 ? 'warning' : 'success');

        return {
            status: overallStatus,
            activatedClasses: results,
            summary: {
                totalClasses: classNames.length,
                successCount,
                errorCount,
                warningCount
            },
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        // If parsing fails, assume all activations failed
        const results = classNames.map(className => ({
            className,
            uri: `/sap/bc/adt/oo/classes/${className.toLowerCase()}`,
            status: 'error' as const,
            message: `Failed to parse activation result for class ${className}: ${error instanceof Error ? error.message : 'Unknown parsing error'}`
        }));

        return {
            status: 'error',
            activatedClasses: results,
            summary: {
                totalClasses: classNames.length,
                successCount: 0,
                errorCount: classNames.length,
                warningCount: 0
            },
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Main handler function for activating ABAP classes
 */
export async function handleActivateClasses(args: any): Promise<any> {
    try {
        // Validate that at least one class name is provided
        if (!args?.class_name && !args?.class_names) {
            throw new McpError(ErrorCode.InvalidParams, 'Either class_name or class_names parameter is required');
        }

        const params: ActivateClassesParams = {
            class_name: args.class_name,
            class_names: args.class_names,
            preaudit_requested: args.preaudit_requested !== false // default to true
        };

        // Normalize input to always work with an array
        let classNames: string[];
        if (params.class_names) {
            classNames = params.class_names;
        } else if (params.class_name) {
            classNames = [params.class_name];
        } else {
            throw new McpError(ErrorCode.InvalidParams, 'No class names provided');
        }

        // Validate and format class names
        const validatedClassNames = validateAndFormatClassNames(classNames);

        // Build the activation endpoint URL
        const baseUrl = await getBaseUrl();
        const activationUrl = `${baseUrl}/sap/bc/adt/activation?method=activate&preauditRequested=${params.preaudit_requested}`;

        // Create XML payload
        const xmlPayload = createActivationPayload(validatedClassNames);

        // Set request headers
        const headers = {
            'Content-Type': 'application/xml; charset=utf-8',
            'Accept': 'application/xml'
        };

        // Make the activation request
        const response = await makeAdtRequest(activationUrl, 'POST', 30000, xmlPayload, undefined, headers);

        // Parse the activation results
        const activationResults = parseActivationResponse(response.data || '', validatedClassNames);

        // Create enhanced response
        const enhancedResponse = {
            activation: activationResults,
            request: {
                endpoint: activationUrl,
                classNames: validatedClassNames,
                preauditRequested: params.preaudit_requested,
                method: 'POST'
            },
            rawResponse: response.data || 'No response data'
        };

        const enhancedAxiosResponse = {
            data: JSON.stringify(enhancedResponse, null, 2),
            status: activationResults.status === 'error' ? 400 : 200,
            statusText: activationResults.status === 'error' ? 'Bad Request' : 'OK',
            headers: response.headers || {},
            config: { headers: {} }
        } as any;

        return return_response(enhancedAxiosResponse);

    } catch (error) {
        // Enhanced error handling for common scenarios
        if (error instanceof Error) {
            if (error.message.includes('authorization') || error.message.includes('403')) {
                return return_error(new McpError(ErrorCode.InvalidParams, 'Insufficient authorization to activate classes. Check S_DEVELOP authorization.'));
            }
            if (error.message.includes('404') || error.message.includes('Not Found')) {
                return return_error(new McpError(ErrorCode.InvalidParams, 'One or more classes not found. Ensure classes exist before activation.'));
            }
        }
        
        return return_error(error);
    }
}