import { McpError, ErrorCode, makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { validateLocalClassName } from '../lib/fileUtils';
import { attemptClassActivation, createWorkflowResponse } from '../lib/activation-utils';

interface CreateClassImplementationParams {
    class_name: string;
    source_code: string;
    auto_activate?: boolean;
    preaudit_requested?: boolean;
}

async function uploadImplementationSource(baseUrl: string, className: string, sourceCode: string): Promise<void> {
    const encodedClassName = encodeURIComponent(className.toUpperCase());
    const implUrl = `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}/includes/implementations`;

    const baseHeaders = {
        'Content-Type': 'text/plain; charset=utf-8',
        Accept: 'text/plain',
    };

    // Try wildcard ETag first (works for most class includes)
    try {
        await makeAdtRequest(implUrl, 'PUT', 30000, sourceCode, undefined, {
            ...baseHeaders,
            'If-Match': '*',
        });
        return;
    } catch (err: any) {
        const msg = err?.message || String(err);
        // Only retry with real ETag on 412 — other errors (403, 500, network) should bubble up
        if (!msg.includes('412') && !msg.includes('Precondition Failed')) {
            throw err;
        }
        // Fallback: GET real ETag, then PUT with it
        const getResponse = await makeAdtRequest(implUrl, 'GET', 10000);
        const etag = getResponse.headers['etag'] || getResponse.headers['ETag'];

        if (etag) {
            await makeAdtRequest(implUrl, 'PUT', 30000, sourceCode, undefined, {
                ...baseHeaders,
                'If-Match': etag,
            });
            return;
        }

        throw new Error(`Could not obtain ETag for ${implUrl}`);
    }
}

export async function handleCreateClassImplementation(args: any): Promise<any> {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'class_name parameter is required');
        }
        if (!args?.source_code) {
            throw new McpError(ErrorCode.InvalidParams, 'source_code parameter is required');
        }

        const params: CreateClassImplementationParams = {
            class_name: args.class_name.toUpperCase(),
            source_code: args.source_code,
            auto_activate: args.auto_activate !== false,
            preaudit_requested: args.preaudit_requested !== false,
        };

        params.class_name = validateLocalClassName(params.class_name);

        const baseUrl = await getBaseUrl();
        const encodedClassName = encodeURIComponent(params.class_name);

        // Verify class exists
        try {
            await makeAdtRequest(`${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}`, 'GET', 10000);
        } catch (error: any) {
            if (error.message?.includes('404') || error.message?.includes('Not Found')) {
                throw new McpError(ErrorCode.InvalidParams, `Class ${params.class_name} does not exist or is not accessible`);
            }
            throw error;
        }

        try {
            await uploadImplementationSource(baseUrl, params.class_name, params.source_code);
        } catch (uploadError: any) {
            if (uploadError.message?.includes('403') || uploadError.message?.includes('authorization')) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `Insufficient authorization to modify ${params.class_name}. Check S_DEVELOP authorization.`
                );
            }
            if (uploadError.message?.includes('412') || uploadError.message?.includes('ETag')) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    'Concurrent modification detected. The implementation may have been modified by another user. Please try again.'
                );
            }
            throw uploadError;
        }

        const successResponse = {
            status: 'success',
            message: `Implementation include for ${params.class_name} updated successfully`,
            details: {
                className: params.class_name,
                location: {
                    implementationUrl: `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}/includes/implementations`,
                },
            },
            timestamp: new Date().toISOString(),
        };

        const enhancedResponse = {
            data: JSON.stringify(successResponse, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: { headers: {} },
        } as any;

        if (params.auto_activate) {
            const activationResult = await attemptClassActivation(params.class_name, params.preaudit_requested!);
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
        if (error instanceof Error && (error.message.includes('authorization') || error.message.includes('403'))) {
            return return_error(
                new McpError(ErrorCode.InvalidParams, 'Insufficient authorization to modify class implementation. Check S_DEVELOP authorization.')
            );
        }
        return return_error(error);
    }
}
