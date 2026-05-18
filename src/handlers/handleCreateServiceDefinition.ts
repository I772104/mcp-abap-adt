import { McpError, ErrorCode, makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { validateLocalClassName, validateLocalPackage } from '../lib/fileUtils';
import { attemptObjectActivation, createWorkflowResponse } from '../lib/activation-utils';

interface CreateServiceDefinitionParams {
    service_name: string;
    source_code: string;
    description?: string;
    package?: string;
    auto_activate?: boolean;
    preaudit_requested?: boolean;
}

function createSrvdMetadataPayload(name: string, description: string, packageName: string): string {
    const xmlDescription = description
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // Package name: escape $ so XML parser doesn't treat it as an entity reference
    const xmlPackage = packageName.replace(/\$/g, '&#36;');

    return `<?xml version="1.0" encoding="UTF-8"?><srvd:srvdSource xmlns:srvd="http://www.sap.com/adt/ddic/srvdsources" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${xmlDescription}" adtcore:language="EN" adtcore:name="${name}" adtcore:type="SRVD/SRV" adtcore:masterLanguage="EN" srvd:srvdSourceType="S"><adtcore:packageRef adtcore:name="${xmlPackage}"/></srvd:srvdSource>`;
}

async function uploadSrvdSource(sourceUrl: string, sourceCode: string): Promise<void> {
    const baseHeaders = {
        'Content-Type': 'text/plain; charset=utf-8',
        Accept: 'text/plain',
    };

    const getResponse = await makeAdtRequest(sourceUrl, 'GET', 10000);
    const rawEtag = getResponse.headers['etag'] || getResponse.headers['ETag'];

    if (rawEtag) {
        // SAP ADT returns ETag without charset; PUT If-Match requires full content-type
        const etag = rawEtag.replace('text/plain_', 'text/plain; charset=utf-8_');
        await makeAdtRequest(sourceUrl, 'PUT', 30000, sourceCode, undefined, {
            ...baseHeaders,
            'If-Match': etag,
        });
        return;
    }

    await makeAdtRequest(sourceUrl, 'PUT', 30000, sourceCode, undefined, {
        ...baseHeaders,
        'If-Match': '*',
    });
}

function createErrorResponse(name: string, originalError: any, isReplacing: boolean): any {
    const errorMessage = originalError.message || String(originalError);
    const isETagError = errorMessage.includes('HTTP 412') || errorMessage.includes('412');

    const errorResponse = {
        status: 'error',
        message: isETagError
            ? `Service definition ${isReplacing ? 'replacement' : 'creation'} failed with ETag mismatch. Check for syntax errors in the source code.`
            : `Service definition ${isReplacing ? 'replacement' : 'creation'} failed.`,
        details: {
            serviceName: name,
            action: isReplacing ? 'replace' : 'create',
            originalError: errorMessage,
            errorType: isETagError ? 'ETag_Mismatch_Likely_Syntax' : 'General_Error',
            recommendations: isETagError
                ? [
                      'Check service definition source syntax',
                      isReplacing ? 'Original unchanged' : 'No service definition was created',
                  ]
                : ['Check system connectivity and authorization', 'Verify service name starts with Z or Y'],
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

export async function handleCreateServiceDefinition(args: any): Promise<any> {
    try {
        if (!args?.service_name) {
            throw new McpError(ErrorCode.InvalidParams, 'service_name parameter is required');
        }
        if (!args?.source_code) {
            throw new McpError(ErrorCode.InvalidParams, 'source_code parameter is required');
        }

        const params: CreateServiceDefinitionParams = {
            service_name: args.service_name.toUpperCase(),
            source_code: args.source_code,
            description: args.description || `Service definition ${args.service_name.toUpperCase()}`,
            package: args.package || '$TMP',
            auto_activate: args.auto_activate !== false,
            preaudit_requested: args.preaudit_requested !== false,
        };

        params.service_name = validateLocalClassName(params.service_name);
        validateLocalPackage(params.package!);

        const baseUrl = await getBaseUrl();
        const encodedName = encodeURIComponent(params.service_name);
        const sourceUrl = `${baseUrl}/sap/bc/adt/ddic/srvd/sources/${encodedName}/source/main`;
        const adtUri = `/sap/bc/adt/ddic/srvd/sources/${encodedName}`;

        let isReplacing = false;

        try {
            await makeAdtRequest(sourceUrl, 'GET', 10000);
            isReplacing = true;

            try {
                await uploadSrvdSource(sourceUrl, params.source_code);
            } catch (uploadError: any) {
                const msg = uploadError?.message || String(uploadError);
                if (msg.includes('HTTP 412') || msg.includes('412')) {
                    return return_response(createErrorResponse(params.service_name, uploadError, true));
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

            const createUrl = `${baseUrl}/sap/bc/adt/ddic/srvd/sources`;
            const metadataPayload = createSrvdMetadataPayload(
                params.service_name,
                params.description!,
                params.package!
            );

            let srvdCreated = false;
            try {
                await makeAdtRequest(createUrl, 'POST', 30000, metadataPayload, undefined, {
                    'Content-Type': 'application/vnd.sap.adt.ddic.srvd.v1+xml',
                    Accept: 'application/vnd.sap.adt.ddic.srvd.v1+xml',
                });
                srvdCreated = true;
                await uploadSrvdSource(sourceUrl, params.source_code);
            } catch (creationError: any) {
                const errorMessage = creationError?.message || String(creationError);
                const isHttp412 = errorMessage.includes('HTTP 412') || errorMessage.includes('412');

                if (srvdCreated) {
                    try {
                        await makeAdtRequest(`${baseUrl}/sap/bc/adt/ddic/srvd/sources/${encodedName}`, 'DELETE', 10000);
                    } catch (_) {
                        // cleanup failure is non-fatal
                    }
                    if (isHttp412) {
                        return return_response(createErrorResponse(params.service_name, creationError, false));
                    }
                }
                throw creationError;
            }
        }

        const actionMessage = isReplacing ? 'replaced' : 'created';
        const successResponse = {
            status: 'success',
            message: `Service definition ${params.service_name} ${actionMessage} successfully`,
            details: {
                serviceName: params.service_name,
                package: params.package,
                description: params.description,
                action: isReplacing ? 'replace' : 'create',
                location: {
                    metadataUrl: `${baseUrl}/sap/bc/adt/ddic/srvd/sources/${encodedName}`,
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
            const activationResult = await attemptObjectActivation(
                params.service_name,
                adtUri,
                params.preaudit_requested
            );

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
                        'Insufficient authorization to create/modify service definitions. Check S_DEVELOP authorization.'
                    )
                );
            }
        }
        return return_error(error);
    }
}
