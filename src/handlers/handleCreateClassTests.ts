import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { handleCheckSyntax } from './handleCheckSyntax';
import { handleGetClassTests } from './handleGetClassTests';

/**
 * Interface for test class creation parameters
 */
interface CreateClassTestsParams {
    parent_class_name: string;
    test_source_code: string;
    backup_existing?: boolean;
}

/**
 * Interface for backup data
 */
interface TestClassBackup {
    parent_class: string;
    timestamp: string;
    original_content: string;
}

/**
 * Validates that the parent class exists by attempting to retrieve its metadata
 */
async function validateParentClassExists(className: string): Promise<void> {
    try {
        const baseUrl = await getBaseUrl();
        const encodedClassName = encodeURIComponent(className.toUpperCase());
        const url = `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}`;
        
        // Attempt to get class metadata to verify it exists
        await makeAdtRequest(url, 'GET', 10000);
    } catch (error: any) {
        if (error.message?.includes('404') || error.message?.includes('Not Found')) {
            throw new McpError(ErrorCode.InvalidParams, `Parent class ${className} does not exist or is not accessible`);
        }
        // Re-throw other errors (authorization, network, etc.)
        throw error;
    }
}

/**
 * Creates a backup of existing test classes if requested
 */
async function backupExistingTests(className: string): Promise<TestClassBackup | null> {
    try {
        const testResult = await handleGetClassTests({ class_name: className });
        
        // If getting tests failed, we can't create a backup
        if (testResult.isError) {
            return null;
        }
        
        // Extract the test content from the response
        const testContent = testResult.content?.[0]?.text || '';
        
        return {
            parent_class: className,
            timestamp: new Date().toISOString(),
            original_content: testContent
        };
    } catch (error) {
        // If backup fails, we'll proceed without backup but note it in the response
        return null;
    }
}

/**
 * Uploads test class source code to the parent class with proper ETag handling
 */
async function uploadTestClassSource(className: string, sourceCode: string): Promise<void> {
    const baseUrl = await getBaseUrl();
    const encodedClassName = encodeURIComponent(className.toUpperCase());
    const testUrl = `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}/includes/testclasses`;
    
    const baseHeaders = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Accept': 'text/plain'
    };

    // Try direct upload with wildcard ETag first
    try {
        await makeAdtRequest(testUrl, 'PUT', 30000, sourceCode, undefined, {
            ...baseHeaders,
            'If-Match': '*'
        });
        return;
    } catch (directUploadError) {
        // Fallback: GET current content for proper ETag, then PUT with that ETag
        try {
            const getResponse = await makeAdtRequest(testUrl, 'GET', 10000);
            const etag = getResponse.headers['etag'] || getResponse.headers['ETag'];
            
            if (etag) {
                await makeAdtRequest(testUrl, 'PUT', 30000, sourceCode, undefined, {
                    ...baseHeaders,
                    'If-Match': etag
                });
                return;
            }
        } catch (etagUploadError) {
            // If both approaches fail, throw the original error
            throw directUploadError;
        }
        
        // If we couldn't get ETag, throw the original error
        throw directUploadError;
    }
}

/**
 * Main handler function for creating/replacing test classes in existing global classes
 */
export async function handleCreateClassTests(args: any): Promise<any> {
    try {
        // Validate required parameters
        if (!args?.parent_class_name || !args?.test_source_code) {
            throw new McpError(ErrorCode.InvalidParams, 'parent_class_name and test_source_code parameters are required');
        }

        const params: CreateClassTestsParams = {
            parent_class_name: args.parent_class_name.toUpperCase(),
            test_source_code: args.test_source_code,
            backup_existing: args.backup_existing === true
        };

        // Step 1: Validate parent class exists
        await validateParentClassExists(params.parent_class_name);

        // Step 2: Optional syntax check of test source code
        let syntaxCheckResult: any = null;
        try {
            const syntaxResult = await handleCheckSyntax({
                source_code: params.test_source_code,
                object_name: `${params.parent_class_name}_TEST`,
                object_type: 'CLAS'
            });

            if (!syntaxResult.isError) {
                const syntaxData = JSON.parse(syntaxResult.content[0].text);
                
                // If there are syntax errors, return them
                if (syntaxData.syntaxCheck?.status === 'error' || 
                    syntaxData.syntaxCheck?.errorCount > 0 ||
                    (syntaxData.syntaxCheck?.errors && syntaxData.syntaxCheck.errors.length > 0)) {
                    
                    const enhancedSyntaxData = {
                        ...syntaxData,
                        testClassCreationStatus: {
                            message: "Test class creation failed due to syntax errors",
                            instructions: "Fix the syntax errors below and try creating the test class again"
                        }
                    };

                    const enhancedResponse = {
                        data: JSON.stringify(enhancedSyntaxData, null, 2),
                        status: 400,
                        statusText: 'Bad Request - Syntax Errors',
                        headers: {},
                        config: { headers: {} }
                    } as any;

                    return return_response(enhancedResponse);
                }
                
                syntaxCheckResult = syntaxData.syntaxCheck;
            }
        } catch (syntaxError) {
            // If syntax check fails, we'll proceed but note it in the response
            syntaxCheckResult = { status: 'warning', message: 'Syntax check could not be performed' };
        }

        // Step 3: Create backup if requested
        let backup: TestClassBackup | null = null;
        if (params.backup_existing) {
            backup = await backupExistingTests(params.parent_class_name);
        }

        // Step 4: Upload the test class source code
        try {
            await uploadTestClassSource(params.parent_class_name, params.test_source_code);
        } catch (uploadError: any) {
            // Enhanced error handling for common scenarios
            if (uploadError.message?.includes('403') || uploadError.message?.includes('authorization')) {
                throw new McpError(ErrorCode.InvalidParams, 
                    `Insufficient authorization to modify test classes for ${params.parent_class_name}. Check S_DEVELOP authorization.`);
            }
            if (uploadError.message?.includes('412') || uploadError.message?.includes('ETag')) {
                throw new McpError(ErrorCode.InvalidParams, 
                    `Concurrent modification detected. The test class may have been modified by another user. Please try again.`);
            }
            throw uploadError;
        }

        // Step 5: Prepare success response
        const successResponse = {
            status: 'success',
            message: `Test classes for ${params.parent_class_name} created/updated successfully`,
            details: {
                parentClass: params.parent_class_name,
                syntaxCheck: syntaxCheckResult,
                backup: backup ? {
                    created: true,
                    timestamp: backup.timestamp,
                    message: 'Previous test classes backed up'
                } : params.backup_existing ? {
                    created: false,
                    message: 'Backup was requested but could not be created'
                } : {
                    created: false,
                    message: 'No backup requested'
                },
                location: {
                    testClassUrl: `${await getBaseUrl()}/sap/bc/adt/oo/classes/${encodeURIComponent(params.parent_class_name)}/includes/testclasses`
                }
            },
            timestamp: new Date().toISOString()
        };

        const enhancedResponse = {
            data: JSON.stringify(successResponse, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: { headers: {} }
        } as any;

        return return_response(enhancedResponse);

    } catch (error) {
        // Enhanced error handling for common scenarios
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('404')) {
                return return_error(new McpError(ErrorCode.InvalidParams, 
                    `Parent class ${args?.parent_class_name} does not exist or is not accessible`));
            }
            if (error.message.includes('authorization') || error.message.includes('403')) {
                return return_error(new McpError(ErrorCode.InvalidParams, 
                    'Insufficient authorization to create/modify test classes. Check S_DEVELOP authorization.'));
            }
        }
        
        return return_error(error);
    }
}