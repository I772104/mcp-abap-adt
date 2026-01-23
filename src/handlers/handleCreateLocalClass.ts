import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { handleCheckSyntax } from './handleCheckSyntax';
import { handleDeleteLocalClass } from './handleDeleteLocalClass';

/**
 * Interface for class creation parameters
 */
interface CreateLocalClassParams {
    class_name: string;
    source_code: string;
    description?: string;
    package?: string;
}

/**
 * Validates class name follows Z/Y naming convention and ABAP naming rules
 */
function validateClassName(className: string): void {
    if (!className) {
        throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
    }
    
    const upperClassName = className.toUpperCase();
    
    // Check Z/Y prefix for customer namespace
    if (!upperClassName.startsWith('Z') && !upperClassName.startsWith('Y')) {
        throw new McpError(ErrorCode.InvalidParams, 'Class name must start with Z or Y for local development');
    }
    
    // Check length limit
    if (upperClassName.length > 30) {
        throw new McpError(ErrorCode.InvalidParams, 'Class name must not exceed 30 characters');
    }
    
    // Check valid ABAP naming pattern
    const validPattern = /^[ZY][A-Z0-9_]*$/;
    if (!validPattern.test(upperClassName)) {
        throw new McpError(ErrorCode.InvalidParams, 'Class name contains invalid characters. Use only A-Z, 0-9, and underscore');
    }
}

/**
 * Validates the package is local (no transport required)
 */
function validateLocalPackage(packageName: string): void {
    const isLocalPackage = packageName === '$TMP' || packageName === '$LOCAL' || packageName.startsWith('$');
    if (!isLocalPackage) {
        throw new McpError(ErrorCode.InvalidParams, 'Package must be local ($TMP, $LOCAL, or other $-prefixed packages)');
    }
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
 * Uploads source code to the created class with proper ETag handling
 */
async function uploadSourceCode(sourceUrl: string, sourceCode: string): Promise<void> {
    const baseHeaders = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Accept': 'text/plain'
    };

    // Try direct upload first
    try {
        await makeAdtRequest(sourceUrl, 'PUT', 30000, sourceCode, undefined, {
            ...baseHeaders,
            'If-Match': '*'
        });
        return;
    } catch (directUploadError) {
        // Fallback: GET current content for ETag, then PUT with proper ETag
        try {
            const getResponse = await makeAdtRequest(sourceUrl, 'GET', 10000);
            const etag = getResponse.headers['etag'] || getResponse.headers['ETag'];
            
            if (etag) {
                await makeAdtRequest(sourceUrl, 'PUT', 30000, sourceCode, undefined, {
                    ...baseHeaders,
                    'If-Match': etag
                });
                return;
            }
        } catch (etagUploadError) {
            // If both approaches fail, throw the original error
            throw directUploadError;
        }
    }
}

/**
 * Handles fallback when class creation succeeds but source upload fails due to syntax issues
 */
async function handleFallbackSyntaxCheck(params: CreateLocalClassParams, originalError: any, baseUrl: string, encodedClassName: string): Promise<any> {
    // Re-run syntax check to get detailed error information
    const syntaxResult = await handleCheckSyntax({
        source_code: params.source_code,
        object_name: params.class_name,
        object_type: 'CLAS'
    });

    // If syntax check call itself failed, return the original HTTP error
    if (syntaxResult.isError) {
        throw originalError;
    }

    // Parse syntax results to check if there are actual syntax errors
    const syntaxData = JSON.parse(syntaxResult.content[0].text);
    const hasSyntaxErrors = syntaxData.syntaxCheck?.status === 'error' || 
                           syntaxData.syntaxCheck?.errorCount > 0 ||
                           (syntaxData.syntaxCheck?.errors && syntaxData.syntaxCheck.errors.length > 0);
    
    // If there are syntax errors, clean up the wrongfully created class
    let cleanupResult: {
        attempted: boolean;
        successful: boolean;
        reason?: string;
        message?: string;
    } | null = null;
    
    if (hasSyntaxErrors) {
        try {
            const deleteResult = await handleDeleteLocalClass({ class_name: params.class_name });
            if (deleteResult.isError) {
                // Deletion failed, but we still want to return syntax errors
                cleanupResult = {
                    attempted: true,
                    successful: false,
                    reason: "Could not delete the basic class structure"
                };
            } else {
                cleanupResult = {
                    attempted: true,
                    successful: true,
                    message: "Basic class structure was cleaned up due to syntax errors"
                };
            }
        } catch (cleanupError) {
            cleanupResult = {
                attempted: true,
                successful: false,
                reason: "Cleanup failed due to system error"
            };
        }
    }
    
    // Enhance the syntax check response with context about what happened
    const enhancedSyntaxData = {
        ...syntaxData,
        classCreationStatus: {
            message: cleanupResult?.successful 
                ? "Class creation failed due to syntax errors. Basic structure was cleaned up."
                : cleanupResult?.attempted 
                ? "Class creation failed due to syntax errors. Basic structure could not be cleaned up automatically."
                : "Class creation failed due to syntax errors",
            cleanup: cleanupResult,
            instructions: cleanupResult?.successful 
                ? "Fix the syntax errors below and try creating the class again"
                : "Fix the syntax errors below. You may need to manually delete the basic class structure before recreating."
        }
    };

    // Return enhanced syntax check result
    const enhancedResponse = {
        data: JSON.stringify(enhancedSyntaxData, null, 2),
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} }
    } as any;

    return return_response(enhancedResponse);
}

/**
 * Main handler function for creating local ABAP classes
 */
export async function handleCreateLocalClass(args: any): Promise<any> {
    try {
        // Validate required parameters
        if (!args?.class_name || !args?.source_code) {
            throw new McpError(ErrorCode.InvalidParams, 'class_name and source_code parameters are required');
        }

        const params: CreateLocalClassParams = {
            class_name: args.class_name.toUpperCase(),
            source_code: args.source_code,
            description: args.description || `Local class ${args.class_name}`,
            package: args.package || '$TMP'
        };

        // Validate inputs
        validateClassName(params.class_name);
        validateLocalPackage(params.package!);

        // Step 1: First do the syntax check
        const syntaxResult = await handleCheckSyntax({
            source_code: params.source_code,
            object_name: params.class_name,
            object_type: 'CLAS'
        });

        // If syntax validation call itself failed, return that error
        if (syntaxResult.isError) {
            return syntaxResult;
        }

        // Parse the syntax validation result
        const syntaxData = JSON.parse(syntaxResult.content[0].text);
        
        // If there are syntax errors, return the syntax check response directly
        if (syntaxData.syntaxCheck?.status === 'error' || 
            syntaxData.syntaxCheck?.errorCount > 0 ||
            (syntaxData.syntaxCheck?.errors && syntaxData.syntaxCheck.errors.length > 0)) {
            
            // Return the syntax check result as-is (don't create anything)
            return syntaxResult;
        }

        // Step 2: Only proceed with class creation if syntax is valid
        const baseUrl = await getBaseUrl();
        const encodedClassName = encodeURIComponent(params.class_name);

        const createUrl = `${baseUrl}/sap/bc/adt/oo/classes`;
        const metadataPayload = createClassMetadataPayload(params.class_name, params.description!, params.package!);

        const createHeaders = {
            'Content-Type': 'application/vnd.sap.adt.oo.classes+xml',
            'Accept': 'application/vnd.sap.adt.oo.classes+xml'
        };

        // Step 3: Create class metadata and upload source code
        const sourceUrl = `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}/source/main`;
        let classCreated = false;
        
        try {
            // Create class metadata
            await makeAdtRequest(createUrl, 'POST', 30000, metadataPayload, undefined, createHeaders);
            classCreated = true;

            // Upload custom source code
            await uploadSourceCode(sourceUrl, params.source_code);
            
        } catch (creationError: any) {
            // Check for HTTP 412 ETag mismatch during source upload - likely due to syntax issues
            // Be more flexible in error detection
            const errorMessage = (creationError?.message || creationError?.toString?.() || String(creationError));
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
                    // This is expected for non-local classes or classes with dependencies
                }
            }
            throw creationError;
        }

        // Step 4: Prepare success response
        const successResponse = {
            status: 'success',
            message: `Local class ${params.class_name} created successfully`,
            details: {
                className: params.class_name,
                package: params.package,
                description: params.description,
                syntaxCheck: syntaxData.syntaxCheck,
                location: {
                    metadataUrl: `${createUrl}/${encodedClassName}`,
                    sourceUrl: sourceUrl
                }
            },
            timestamp: new Date().toISOString()
        };

        const enhancedResponse = {
            data: JSON.stringify(successResponse, null, 2),
            status: 201,
            statusText: 'Created',
            headers: {},
            config: { headers: {} }
        } as any;

        return return_response(enhancedResponse);

    } catch (error) {
        // Enhanced error handling for common scenarios
        if (error instanceof Error) {
            if (error.message.includes('already exists') || error.message.includes('409')) {
                return return_error(new McpError(ErrorCode.InvalidParams, `Class ${args?.class_name} already exists. Use a different name or delete the existing class first.`));
            }
            if (error.message.includes('authorization') || error.message.includes('403')) {
                return return_error(new McpError(ErrorCode.InvalidParams, 'Insufficient authorization to create classes. Check S_DEVELOP authorization.'));
            }
        }
        
        return return_error(error);
    }
}