import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

/**
 * Interface for class deletion parameters
 */
interface DeleteLocalClassParams {
    class_name: string;
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
        throw new McpError(ErrorCode.InvalidParams, 'Only Z and Y classes (customer namespace) can be deleted');
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
 * Creates XML payload for deletion check request
 */
function createDeletionCheckPayload(className: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?><del:checkRequest xmlns:del="http://www.sap.com/adt/deletion" xmlns:adtcore="http://www.sap.com/adt/core">
  <del:object adtcore:uri="/sap/bc/adt/oo/classes/${className.toLowerCase()}"/>
</del:checkRequest>`;
}

/**
 * Creates XML payload for deletion request
 */
function createDeletionRequestPayload(className: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?><del:deletionRequest xmlns:del="http://www.sap.com/adt/deletion" xmlns:adtcore="http://www.sap.com/adt/core">
  <del:object adtcore:uri="/sap/bc/adt/oo/classes/${className.toLowerCase()}">
    <del:transportNumber/>
  </del:object>
</del:deletionRequest>`;
}

/**
 * Parses deletion check response to verify if class is deletable and is local
 */
function parseDeletionCheckResponse(xmlResponse: string, className: string): { isDeletable: boolean; isLocal: boolean; packageName: string } {
    try {
        // Extract package name
        const packageMatch = xmlResponse.match(/adtcore:packageName="([^"]*)"/);
        const packageName = packageMatch ? packageMatch[1] : '';
        
        // Extract isDeletable flag
        const deletableMatch = xmlResponse.match(/del:isDeletable="([^"]*)"/);
        const isDeletable = deletableMatch ? deletableMatch[1] === 'true' : false;
        
        // Check if it's a local package
        const isLocal = packageName === '$TMP' || packageName === '$LOCAL' || packageName.startsWith('$');
        
        return { isDeletable, isLocal, packageName };
    } catch (error) {
        throw new Error(`Failed to parse deletion check response: ${error}`);
    }
}

/**
 * Parses deletion result response to verify deletion success
 */
function parseDeletionResult(xmlResponse: string): { isDeleted: boolean; className: string } {
    try {
        // Extract isDeleted flag
        const deletedMatch = xmlResponse.match(/del:isDeleted="([^"]*)"/);
        const isDeleted = deletedMatch ? deletedMatch[1] === 'true' : false;
        
        // Extract class name
        const nameMatch = xmlResponse.match(/adtcore:name="([^"]*)"/);
        const className = nameMatch ? nameMatch[1] : '';
        
        return { isDeleted, className };
    } catch (error) {
        throw new Error(`Failed to parse deletion result response: ${error}`);
    }
}

/**
 * Main handler function for deleting local ABAP classes
 */
export async function handleDeleteLocalClass(args: any): Promise<any> {
    try {
        // Validate required parameters
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'class_name parameter is required');
        }

        const params: DeleteLocalClassParams = {
            class_name: args.class_name.toUpperCase()
        };

        // Validate class name
        validateClassName(params.class_name);

        const baseUrl = await getBaseUrl();
        const lowerClassName = params.class_name.toLowerCase();

        // Step 1: Check if class can be deleted
        const checkUrl = `${baseUrl}/sap/bc/adt/deletion/check`;
        const checkPayload = createDeletionCheckPayload(lowerClassName);
        
        const checkHeaders = {
            'Content-Type': 'application/vnd.sap.adt.deletion.check.request.v1+xml',
            'Accept': 'application/vnd.sap.adt.deletion.check.response.v1+xml'
        };

        const checkResponse = await makeAdtRequest(checkUrl, 'POST', 10000, checkPayload, undefined, checkHeaders);
        
        // Parse check response
        const checkResult = parseDeletionCheckResponse(checkResponse.data, params.class_name);
        
        // Verify class is local
        if (!checkResult.isLocal) {
            throw new McpError(ErrorCode.InvalidParams, `Class ${params.class_name} is in package '${checkResult.packageName}' which is not a local package. Only classes in local packages ($TMP, $LOCAL, etc.) can be deleted.`);
        }
        
        // Verify class is deletable
        if (!checkResult.isDeletable) {
            throw new McpError(ErrorCode.InvalidParams, `Class ${params.class_name} cannot be deleted. It may be locked, have dependencies, or be in use.`);
        }

        // Step 2: Perform the deletion
        const deleteUrl = `${baseUrl}/sap/bc/adt/deletion/delete`;
        const deletePayload = createDeletionRequestPayload(lowerClassName);
        
        const deleteHeaders = {
            'Content-Type': 'application/vnd.sap.adt.deletion.request.v1+xml',
            'Accept': 'application/vnd.sap.adt.deletion.response.v1+xml'
        };

        const deleteResponse = await makeAdtRequest(deleteUrl, 'POST', 30000, deletePayload, undefined, deleteHeaders);
        
        // Parse deletion result
        const deleteResult = parseDeletionResult(deleteResponse.data);
        
        if (!deleteResult.isDeleted) {
            throw new Error(`Deletion failed for class ${params.class_name}`);
        }

        // Step 3: Prepare success response
        const successResponse = {
            status: 'success',
            message: `Local class ${params.class_name} deleted successfully`,
            details: {
                className: params.class_name,
                package: checkResult.packageName,
                deletionConfirmed: deleteResult.isDeleted,
                timestamp: new Date().toISOString()
            }
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
                return return_error(new McpError(ErrorCode.InvalidParams, `Class ${args?.class_name} not found. Verify the class exists and the name is correct.`));
            }
            if (error.message.includes('authorization') || error.message.includes('403')) {
                return return_error(new McpError(ErrorCode.InvalidParams, 'Insufficient authorization to delete classes. Check S_DEVELOP authorization with delete activity.'));
            }
            if (error.message.includes('locked') || error.message.includes('409')) {
                return return_error(new McpError(ErrorCode.InvalidParams, `Class ${args?.class_name} is locked by another user or process. Try again later.`));
            }
        }
        
        return return_error(error);
    }
}