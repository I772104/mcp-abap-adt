import { McpError, ErrorCode, makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { validateLocalClassName, validateLocalPackage } from '../lib/fileUtils';
import { attemptObjectActivation, createWorkflowResponse } from '../lib/activation-utils';

interface CreateCDSViewParams {
    view_name: string;
    source_code: string;
    description?: string;
    package?: string;
    auto_activate?: boolean;
    preaudit_requested?: boolean;
}

function createViewMetadataPayload(viewName: string, description: string, packageName: string): string {
    const xmlDescription = description
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    return `<?xml version="1.0" encoding="UTF-8"?><ddl:ddlSource xmlns:ddl="http://www.sap.com/adt/ddic/ddlsources" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${xmlDescription}" adtcore:language="EN" adtcore:name="${viewName}" adtcore:type="DDLS/S" adtcore:masterLanguage="EN">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</ddl:ddlSource>`;
}

async function uploadViewSource(sourceUrl: string, sourceCode: string): Promise<void> {
    const baseHeaders = {
        'Content-Type': 'text/plain; charset=utf-8',
        Accept: 'text/plain',
    };

    // Fetch ETag first — the SAP ADT DDL endpoint requires a valid ETag (does not accept If-Match: *)
    const getResponse = await makeAdtRequest(sourceUrl, 'GET', 10000);
    const etag = getResponse.headers['etag'] || getResponse.headers['ETag'];

    if (etag) {
        await makeAdtRequest(sourceUrl, 'PUT', 30000, sourceCode, undefined, {
            ...baseHeaders,
            'If-Match': etag,
        });
        return;
    }

    // Fallback for systems that don't return ETag
    await makeAdtRequest(sourceUrl, 'PUT', 30000, sourceCode, undefined, {
        ...baseHeaders,
        'If-Match': '*',
    });
}

function createErrorResponse(viewName: string, originalError: any, isReplacing: boolean): any {
    const errorMessage = originalError.message || String(originalError);
    const isETagError = errorMessage.includes('HTTP 412') || errorMessage.includes('412');

    const errorResponse = {
        status: 'error',
        message: isETagError
            ? `CDS view ${isReplacing ? 'replacement' : 'creation'} failed with ETag mismatch. Check for syntax errors in the source code.`
            : `CDS view ${isReplacing ? 'replacement' : 'creation'} failed.`,
        details: {
            viewName,
            action: isReplacing ? 'replace' : 'create',
            originalError: errorMessage,
            errorType: isETagError ? 'ETag_Mismatch_Likely_Syntax' : 'General_Error',
            recommendations: isETagError
                ? ['Check DDL source syntax', isReplacing ? 'Original view unchanged' : 'No view was created']
                : ['Check system connectivity and authorization', 'Verify view name starts with Z or Y'],
        },
        timestamp: new Date().toISOString(),
    };

    return {
        data: JSON.stringify(errorResponse, null, 2),
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: {} },
    } as any;
}

export async function handleCreateCDSView(args: any): Promise<any> {
    try {
        if (!args?.view_name || !args?.source_code) {
            throw new McpError(ErrorCode.InvalidParams, 'view_name and source_code parameters are required');
        }

        const params: CreateCDSViewParams = {
            view_name: args.view_name.toUpperCase(),
            source_code: args.source_code,
            description: args.description || `Local CDS view ${args.view_name.toUpperCase()}`,
            package: args.package || '$TMP',
            auto_activate: args.auto_activate !== false,
            preaudit_requested: args.preaudit_requested !== false,
        };

        params.view_name = validateLocalClassName(params.view_name);
        validateLocalPackage(params.package!);

        const baseUrl = await getBaseUrl();
        const encodedViewName = encodeURIComponent(params.view_name);
        const sourceUrl = `${baseUrl}/sap/bc/adt/ddic/ddl/sources/${encodedViewName}/source/main`;
        const adtUri = `/sap/bc/adt/ddic/ddl/sources/${encodedViewName}`;

        let isReplacing = false;

        try {
            await makeAdtRequest(sourceUrl, 'GET', 10000);
            isReplacing = true;

            try {
                await uploadViewSource(sourceUrl, params.source_code);
            } catch (uploadError: any) {
                const msg = uploadError?.message || String(uploadError);
                if (msg.includes('HTTP 412') || msg.includes('412')) {
                    return return_response(createErrorResponse(params.view_name, uploadError, true));
                }
                throw uploadError;
            }
        } catch (getError: any) {
            const is404 =
                getError.message?.includes('404') ||
                getError.message?.includes('Not Found') ||
                getError.status === 404 ||
                getError.response?.status === 404;

            if (!is404) {
                throw getError;
            }

            isReplacing = false;

            const createUrl = `${baseUrl}/sap/bc/adt/ddic/ddl/sources`;
            const metadataPayload = createViewMetadataPayload(params.view_name, params.description!, params.package!);

            let viewCreated = false;
            try {
                await makeAdtRequest(createUrl, 'POST', 30000, metadataPayload, undefined, {
                    'Content-Type': 'application/vnd.sap.adt.ddlSource+xml',
                    Accept: 'application/vnd.sap.adt.ddlSource+xml',
                });
                viewCreated = true;
                await uploadViewSource(sourceUrl, params.source_code);
            } catch (creationError: any) {
                const errorMessage = creationError?.message || String(creationError);
                const isHttp412 = errorMessage.includes('HTTP 412') || errorMessage.includes('412');

                if (viewCreated) {
                    try {
                        await makeAdtRequest(
                            `${baseUrl}/sap/bc/adt/ddic/ddl/sources/${encodedViewName}`,
                            'DELETE',
                            10000
                        );
                    } catch (_) {
                        // cleanup failure is non-fatal
                    }
                    if (isHttp412) {
                        return return_response(createErrorResponse(params.view_name, creationError, false));
                    }
                }
                throw creationError;
            }
        }

        const actionMessage = isReplacing ? 'replaced' : 'created';
        const successResponse = {
            status: 'success',
            message: `CDS view ${params.view_name} ${actionMessage} successfully`,
            details: {
                viewName: params.view_name,
                package: params.package,
                description: params.description,
                action: isReplacing ? 'replace' : 'create',
                location: {
                    metadataUrl: `${baseUrl}/sap/bc/adt/ddic/ddl/sources/${encodedViewName}`,
                    sourceUrl,
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

        if (params.auto_activate) {
            const activationResult = await attemptObjectActivation(params.view_name, adtUri, params.preaudit_requested);

            const workflowResponse = createWorkflowResponse(enhancedResponse, activationResult, true);

            return return_response({
                data: JSON.stringify(workflowResponse, null, 2),
                status: enhancedResponse.status,
                statusText: enhancedResponse.statusText,
                headers: {},
                config: { headers: {} },
            } as any);
        }

        return return_response(enhancedResponse);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('authorization') || error.message.includes('403')) {
                return return_error(
                    new McpError(
                        ErrorCode.InvalidParams,
                        'Insufficient authorization to create/modify CDS views. Check S_DEVELOP authorization.'
                    )
                );
            }
        }
        return return_error(error);
    }
}
