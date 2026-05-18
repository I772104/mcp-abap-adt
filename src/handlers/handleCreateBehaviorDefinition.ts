import { McpError, ErrorCode, makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { validateLocalClassName, validateLocalPackage } from '../lib/fileUtils';
import { attemptObjectActivation, createWorkflowResponse } from '../lib/activation-utils';

type BdefType = 'managed' | 'unmanaged' | 'projection' | 'abstract';

interface CreateBehaviorDefinitionParams {
    behavior_name: string;
    source_code: string;
    bdef_type: BdefType;
    description?: string;
    package?: string;
    auto_activate?: boolean;
    preaudit_requested?: boolean;
}

function createBdefMetadataPayload(name: string, description: string, packageName: string): string {
    const xmlDescription = description
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    return `<?xml version="1.0" encoding="UTF-8"?><blue:blueSource xmlns:blue="http://www.sap.com/wbobj/blue" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${xmlDescription}" adtcore:language="EN" adtcore:name="${name}" adtcore:type="BDEF/BDO" adtcore:masterLanguage="EN">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</blue:blueSource>`;
}

async function uploadBdefSource(sourceUrl: string, sourceCode: string): Promise<void> {
    const baseHeaders = {
        'Content-Type': 'text/plain; charset=utf-8',
        Accept: 'text/plain',
    };

    // Fetch ETag first — the SAP ADT BDEF endpoint requires a valid ETag (does not accept If-Match: *)
    const getResponse = await makeAdtRequest(sourceUrl, 'GET', 10000);
    const rawEtag = getResponse.headers['etag'] || getResponse.headers['ETag'];

    if (rawEtag) {
        // SAP ADT returns an ETag without charset in the content-type portion (e.g. "...text/plain_...")
        // but the PUT If-Match must use the full content-type "text/plain; charset=utf-8".
        // Fix the ETag so it matches what the server validates against.
        const etag = rawEtag.replace('text/plain_', 'text/plain; charset=utf-8_');
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

function createErrorResponse(name: string, originalError: any, isReplacing: boolean): any {
    const errorMessage = originalError.message || String(originalError);
    const isETagError = errorMessage.includes('HTTP 412') || errorMessage.includes('412');

    const errorResponse = {
        status: 'error',
        message: isETagError
            ? `BDEF ${isReplacing ? 'replacement' : 'creation'} failed with ETag mismatch. Check for syntax errors in the source code.`
            : `BDEF ${isReplacing ? 'replacement' : 'creation'} failed.`,
        details: {
            behaviorName: name,
            action: isReplacing ? 'replace' : 'create',
            originalError: errorMessage,
            errorType: isETagError ? 'ETag_Mismatch_Likely_Syntax' : 'General_Error',
            recommendations: isETagError
                ? ['Check BDEF source syntax', isReplacing ? 'Original BDEF unchanged' : 'No BDEF was created']
                : ['Check system connectivity and authorization', 'Verify behavior name starts with Z or Y'],
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

export async function handleCreateBehaviorDefinition(args: any): Promise<any> {
    try {
        if (!args?.behavior_name) {
            throw new McpError(ErrorCode.InvalidParams, 'behavior_name parameter is required');
        }
        if (!args?.source_code) {
            throw new McpError(ErrorCode.InvalidParams, 'source_code parameter is required');
        }
        if (!args?.bdef_type) {
            throw new McpError(ErrorCode.InvalidParams, 'bdef_type parameter is required (managed, unmanaged, projection, or abstract)');
        }

        const VALID_BDEF_TYPES = ['managed', 'unmanaged', 'projection', 'abstract'];
        if (!VALID_BDEF_TYPES.includes(args.bdef_type)) {
            throw new McpError(ErrorCode.InvalidParams, `bdef_type must be one of: managed, unmanaged, projection, abstract`);
        }

        const params: CreateBehaviorDefinitionParams = {
            behavior_name: args.behavior_name.toUpperCase(),
            source_code: args.source_code,
            bdef_type: args.bdef_type as BdefType,
            description: args.description || `Behavior definition ${args.behavior_name.toUpperCase()}`,
            package: args.package || '$TMP',
            auto_activate: args.auto_activate !== false,
            preaudit_requested: args.preaudit_requested !== false,
        };

        // Use word-boundary regex to avoid 'unmanaged' matching 'managed' (case-insensitive, covers uppercase too)
        const bdefTypeRegex = new RegExp(`(?<![a-zA-Z])${params.bdef_type}(?![a-zA-Z])`, 'i');
        if (!bdefTypeRegex.test(params.source_code)) {
            throw new McpError(
                ErrorCode.InvalidParams,
                `bdef_type is '${params.bdef_type}' but source_code does not contain '${params.bdef_type}'`
            );
        }

        params.behavior_name = validateLocalClassName(params.behavior_name);
        validateLocalPackage(params.package!);

        const baseUrl = await getBaseUrl();
        const encodedName = encodeURIComponent(params.behavior_name);
        const sourceUrl = `${baseUrl}/sap/bc/adt/bo/behaviordefinitions/${encodedName}/source/main`;
        const adtUri = `/sap/bc/adt/bo/behaviordefinitions/${encodedName}`;

        let isReplacing = false;

        try {
            await makeAdtRequest(sourceUrl, 'GET', 10000);
            isReplacing = true;

            try {
                await uploadBdefSource(sourceUrl, params.source_code);
            } catch (uploadError: any) {
                const msg = uploadError?.message || String(uploadError);
                if (msg.includes('HTTP 412') || msg.includes('412')) {
                    return return_response(createErrorResponse(params.behavior_name, uploadError, true));
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

            const createUrl = `${baseUrl}/sap/bc/adt/bo/behaviordefinitions`;
            const metadataPayload = createBdefMetadataPayload(params.behavior_name, params.description!, params.package!);

            let bdefCreated = false;
            try {
                await makeAdtRequest(createUrl, 'POST', 30000, metadataPayload, undefined, {
                    'Content-Type': 'application/vnd.sap.adt.blues.v1+xml',
                    Accept: 'application/vnd.sap.adt.blues.v1+xml',
                });
                bdefCreated = true;
                await uploadBdefSource(sourceUrl, params.source_code);
            } catch (creationError: any) {
                const errorMessage = creationError?.message || String(creationError);
                const isHttp412 = errorMessage.includes('HTTP 412') || errorMessage.includes('412');

                if (bdefCreated) {
                    try {
                        await makeAdtRequest(`${baseUrl}/sap/bc/adt/bo/behaviordefinitions/${encodedName}`, 'DELETE', 10000);
                    } catch (_) {
                        // cleanup failure is non-fatal
                    }
                    if (isHttp412) {
                        return return_response(createErrorResponse(params.behavior_name, creationError, false));
                    }
                }
                throw creationError;
            }
        }

        const actionMessage = isReplacing ? 'replaced' : 'created';
        const successResponse = {
            status: 'success',
            message: `Behavior definition ${params.behavior_name} ${actionMessage} successfully`,
            details: {
                behaviorName: params.behavior_name,
                bdefType: params.bdef_type,
                package: params.package,
                description: params.description,
                action: isReplacing ? 'replace' : 'create',
                location: {
                    metadataUrl: `${baseUrl}/sap/bc/adt/bo/behaviordefinitions/${encodedName}`,
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
                params.behavior_name,
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
                        'Insufficient authorization to create/modify behavior definitions. Check S_DEVELOP authorization.'
                    )
                );
            }
        }
        return return_error(error);
    }
}
