import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { validateLocalClassName, validateLocalPackage, ABAP_CLASS_NAME_MAX_LENGTH } from '../lib/fileUtils';
import { handleDeleteLocalClass } from './handleDeleteLocalClass';
import { handleGetClass } from './handleGetClass';
import { attemptClassActivation, createWorkflowResponse, WorkflowResult } from '../lib/activation-utils';

/**
 * Interface for class creation parameters
 */
interface CreateClassParams {
    class_name: string;
    source_code: string;
    description?: string;
    package?: string;
    backup_existing?: boolean;
    auto_activate?: boolean;
    preaudit_requested?: boolean;
}

/**
 * Interface for backup data
 */
interface ClassBackup {
    class_name: string;
    timestamp: string;
    original_content: string;
    package?: string;
    description?: string;
}

/**
 * Basic syntax validation to catch obvious errors without circular dependency
 */
function validateBasicSyntax(sourceCode: string): any[] | null {
    const errors: any[] = [];

    // Check for missing periods in common statements
    const lines = sourceCode.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('*') || line.startsWith('"')) {
            continue;
        }

        // Check for missing periods in METHODS declarations
        if (line.includes('METHODS:') && !line.endsWith('.') && !line.endsWith(',')) {
            errors.push({
                type: 'error',
                message: 'Missing period in METHODS declaration',
                line: i + 1,
                severity: 'error',
            });
        }

        // Check for missing RETURNING VALUE parameter name
        if (line.includes('RETURNING VALUE()')) {
            errors.push({
                type: 'error',
                message: 'Missing parameter name in RETURNING VALUE()',
                line: i + 1,
                severity: 'error',
            });
        }
    }

    return errors.length > 0 ? errors : null;
}

/**
 * Creates XML payload for class metadata creation
 */
function createClassMetadataPayload(className: string, description: string, packageName: string): string {
    const xmlDescription = description
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    return `<?xml version="1.0" encoding="UTF-8"?><class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${xmlDescription}" adtcore:language="EN" adtcore:name="${className}" adtcore:type="CLAS/OC" adtcore:masterLanguage="EN" class:final="true" class:visibility="public">
  <adtcore:packageRef adtcore:name="${packageName}"/>
  <class:include adtcore:name="CLAS/OC" adtcore:type="CLAS/OC" class:includeType="testclasses"/>
  <class:superClassRef/>
</class:abapClass>`;
}

/**
 * Uploads source code to the created class with proper ETag handling.
 * Always fetches a fresh ETag before PUT to avoid stale-ETag 412 errors after
 * activation or any prior write in the same session.
 */
async function uploadSourceCode(sourceUrl: string, sourceCode: string): Promise<void> {
    const baseHeaders = {
        'Content-Type': 'text/plain; charset=utf-8',
        Accept: 'text/plain',
    };

    const getResponse = await makeAdtRequest(sourceUrl, 'GET', 10000);
    const etag = getResponse.headers['etag'] || getResponse.headers['ETag'];

    if (etag) {
        await makeAdtRequest(sourceUrl, 'PUT', 30000, sourceCode, undefined, {
            ...baseHeaders,
            'If-Match': etag,
        });
        return;
    }

    // Fallback for systems that don't return an ETag header
    await makeAdtRequest(sourceUrl, 'PUT', 30000, sourceCode, undefined, {
        ...baseHeaders,
        'If-Match': '*',
    });
}

/**
 * Creates a backup of existing class if requested
 */
async function backupExistingClass(className: string): Promise<ClassBackup | null> {
    try {
        const classResult = await handleGetClass({ class_name: className });

        // If getting class failed, we can't create a backup
        if (classResult.isError) {
            return null;
        }

        // Extract the class content from the response
        const classContent = classResult.content?.[0]?.text || '';

        return {
            class_name: className,
            timestamp: new Date().toISOString(),
            original_content: classContent,
        };
    } catch (error) {
        // If backup fails, we'll proceed without backup but note it in the response
        return null;
    }
}

/**
 * Creates a user-friendly error response for syntax/ETag related issues
 */
function createSyntaxErrorResponse(params: CreateClassParams, originalError: any, isReplacing: boolean): any {
    const action = isReplacing ? 'replacement' : 'creation';
    const errorMessage = originalError.message || String(originalError);
    const isETagError = errorMessage.includes('HTTP 412') || errorMessage.includes('412');
    const isSyntaxRelated =
        isETagError || errorMessage.toLowerCase().includes('syntax') || errorMessage.toLowerCase().includes('invalid');

    let mainMessage: string;
    let recommendations: string[];

    if (isReplacing && isETagError) {
        mainMessage = `Class ${action} failed with ETag mismatch (HTTP 412). The class may have been modified or activated concurrently.`;
        recommendations = [
            'Retry the operation — a fresh ETag will be fetched automatically',
            'If the error persists, check whether another user or process is modifying the class',
            'The original class remains unchanged due to this error',
        ];
    } else if (isSyntaxRelated) {
        mainMessage = `Class ${action} failed due to syntax errors in the provided source code.`;
        recommendations = [
            'Review your ABAP code for syntax errors',
            'Use the CheckSyntax tool to validate your code before creating the class',
            isReplacing ? 'The original class remains unchanged' : 'No class was created due to syntax errors',
        ];
    } else {
        mainMessage = `Class ${action} failed due to an unexpected error.`;
        recommendations = [
            'Check system connectivity and authorization',
            'Verify the class name follows naming conventions (Z*/Y*)',
            'Ensure the package is a local package ($TMP, $LOCAL)',
            'Try the operation again',
            isReplacing ? 'The original class remains unchanged' : 'No class was created',
        ];
    }

    const errorResponse = {
        status: 'error',
        message: mainMessage,
        details: {
            className: params.class_name,
            action: isReplacing ? 'replace' : 'create',
            originalError: errorMessage,
            errorType: isETagError ? 'ETag_Mismatch' : isSyntaxRelated ? 'Syntax_Error' : 'General_Error',
            recommendations: recommendations,
        },
        timestamp: new Date().toISOString(),
    };

    return {
        data: JSON.stringify(errorResponse, null, 2),
        status: 400,
        statusText: isETagError ? 'Bad Request - ETag Mismatch' : 'Bad Request - Syntax Error',
        headers: {},
        config: { headers: {} },
    } as any;
}

/**
 * Handles fallback when class creation succeeds but source upload fails due to syntax issues
 */
async function handleFallbackSyntaxCheck(
    params: CreateClassParams,
    originalError: any,
    baseUrl: string,
    encodedClassName: string
): Promise<any> {
    // Try to clean up the created class since upload failed
    try {
        await handleDeleteLocalClass({ class_name: params.class_name });
    } catch (cleanupError) {
        // Cleanup failed, but continue with error reporting
    }

    // Return improved error response
    return return_response(createSyntaxErrorResponse(params, originalError, false));
}

/**
 * Main handler function for creating ABAP classes
 */
export async function handleCreateClass(args: any): Promise<any> {
    try {
        // Validate required parameters
        if (!args?.class_name || !args?.source_code) {
            throw new McpError(ErrorCode.InvalidParams, 'class_name and source_code parameters are required');
        }

        const params: CreateClassParams = {
            class_name: args.class_name.toUpperCase(),
            source_code: args.source_code,
            description: args.description || `Local class ${args.class_name}`,
            package: args.package || '$TMP',
            backup_existing: args.backup_existing === true,
            auto_activate: args.auto_activate !== false, // default to true
            preaudit_requested: args.preaudit_requested !== false, // default to true
        };

        // Validate inputs
        params.class_name = validateLocalClassName(params.class_name);
        validateLocalPackage(params.package!);

        // Check if class already exists and handle accordingly
        const baseUrl = await getBaseUrl();
        const encodedClassName = encodeURIComponent(params.class_name);
        const sourceUrl = `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}/source/main`;

        let backup: ClassBackup | null = null;
        let isReplacing = false;

        // Check if class exists
        try {
            await makeAdtRequest(sourceUrl, 'GET', 10000);
            isReplacing = true;

            // Create backup if requested
            if (params.backup_existing) {
                backup = await backupExistingClass(params.class_name);
            }

            // If replacing, upload new source code with enhanced error handling
            try {
                await uploadSourceCode(sourceUrl, params.source_code);
            } catch (uploadError: any) {
                // Enhanced error handling for class replacement failures
                const uploadErrorMessage = uploadError?.message || String(uploadError);
                const isETagError = uploadErrorMessage.includes('HTTP 412') || uploadErrorMessage.includes('412');

                if (isETagError) {
                    // ETag mismatch during replacement - likely syntax errors
                    const errorResponse = createSyntaxErrorResponse(params, uploadError, true);
                    return return_response(errorResponse);
                }

                // Other upload errors during replacement
                throw uploadError;
            }
        } catch (getError: any) {
            // Class doesn't exist, proceed with normal creation
            // Check for 404 error (class not found) - be flexible with error format
            const is404Error =
                getError.message?.includes('404') ||
                getError.message?.includes('Not Found') ||
                getError.status === 404 ||
                getError.response?.status === 404;

            if (is404Error) {
                isReplacing = false;

                const createUrl = `${baseUrl}/sap/bc/adt/oo/classes`;
                const metadataPayload = createClassMetadataPayload(
                    params.class_name,
                    params.description!,
                    params.package!
                );

                const createHeaders = {
                    'Content-Type': 'application/vnd.sap.adt.oo.classes+xml',
                    Accept: 'application/vnd.sap.adt.oo.classes+xml',
                };

                let classCreated = false;

                try {
                    // Create class metadata
                    await makeAdtRequest(createUrl, 'POST', 30000, metadataPayload, undefined, createHeaders);
                    classCreated = true;

                    // Upload custom source code
                    await uploadSourceCode(sourceUrl, params.source_code);
                } catch (creationError: any) {
                    // Check for HTTP 412 ETag mismatch during source upload - likely due to syntax issues
                    const errorMessage = creationError?.message || creationError?.toString?.() || String(creationError);
                    const isHttp412Error = errorMessage.includes('HTTP 412') || errorMessage.includes('412');

                    if (classCreated && isHttp412Error) {
                        // Don't cleanup the class, instead run fallback syntax check
                        return await handleFallbackSyntaxCheck(params, creationError, baseUrl, encodedClassName);
                    }

                    // For other errors, try to clean up the created class using proper deletion
                    if (classCreated) {
                        try {
                            await handleDeleteLocalClass({ class_name: params.class_name });
                        } catch (cleanupError) {
                            // Cleanup failed, but don't mask the original error
                        }
                    }
                    throw creationError;
                }
            } else {
                // Other error occurred during class check
                throw getError;
            }
        }

        // Prepare success response
        const actionMessage = isReplacing ? 'replaced' : 'created';
        const successResponse = {
            status: 'success',
            message: `Local class ${params.class_name} ${actionMessage} successfully`,
            details: {
                className: params.class_name,
                package: params.package,
                description: params.description,
                action: isReplacing ? 'replace' : 'create',
                backup: backup
                    ? {
                          created: true,
                          timestamp: backup.timestamp,
                          message: 'Previous class content backed up',
                      }
                    : params.backup_existing
                      ? {
                            created: false,
                            message: 'Backup was requested but could not be created',
                        }
                      : {
                            created: false,
                            message: 'No backup requested',
                        },
                location: {
                    metadataUrl: `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}`,
                    sourceUrl: sourceUrl,
                },
            },
            timestamp: new Date().toISOString(),
        };

        const enhancedResponse = {
            data: JSON.stringify(successResponse, null, 2),
            status: isReplacing ? 200 : 201,
            statusText: isReplacing ? 'OK' : 'Created',
            headers: {},
            config: { headers: {} },
        } as any;

        // Handle auto-activation if requested
        if (params.auto_activate) {
            const activationResult = await attemptClassActivation(params.class_name, params.preaudit_requested ?? true);

            // Create comprehensive workflow response
            const workflowResponse = createWorkflowResponse(enhancedResponse, activationResult, true);

            const workflowResponseFormatted = {
                data: JSON.stringify(workflowResponse, null, 2),
                status: enhancedResponse.status,
                statusText: enhancedResponse.statusText,
                headers: {},
                config: { headers: {} },
            } as any;

            return return_response(workflowResponseFormatted);
        }

        return return_response(enhancedResponse);
    } catch (error) {
        // Enhanced error handling for common scenarios
        if (error instanceof Error) {
            if (error.message.includes('authorization') || error.message.includes('403')) {
                return return_error(
                    new McpError(
                        ErrorCode.InvalidParams,
                        'Insufficient authorization to create/modify classes. Check S_DEVELOP authorization.'
                    )
                );
            }
        }

        return return_error(error);
    }
}
