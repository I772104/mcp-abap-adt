import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
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
                severity: 'error'
            });
        }
        
        // Check for missing RETURNING VALUE parameter name
        if (line.includes('RETURNING VALUE()')) {
            errors.push({
                type: 'error',
                message: 'Missing parameter name in RETURNING VALUE()',
                line: i + 1,
                severity: 'error'
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
    // Try to clean up the created class since upload failed
    try {
        await handleDeleteLocalClass({ class_name: params.class_name });
    } catch (cleanupError) {
        // Cleanup failed, but continue with error reporting
    }
    
    // Return the original error with context
    const errorResponse = {
        status: 'error',
        message: `Class creation failed during source code upload. This is likely due to syntax errors in the provided code.`,
        details: {
            className: params.class_name,
            originalError: originalError.message || String(originalError),
            recommendation: "Use the CheckSyntax tool to validate your code before creating the class"
        },
        timestamp: new Date().toISOString()
    };

    const enhancedResponse = {
        data: JSON.stringify(errorResponse, null, 2),
        status: 400,
        statusText: 'Bad Request',
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

        // Proceed with class creation (let ADT handle syntax validation)
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