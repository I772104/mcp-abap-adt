import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { fetchIncludes, formatMultiIncludeOutput } from '../lib/classUtils';

/**
 * Parameters for getting ABAP class source code
 */
interface GetClassParams {
    class_name: string;
    include_types?: string[]; // ['main', 'definitions', 'implementations', 'macros', 'testclasses', 'all']
}

/**
 * Retrieves ABAP class source code, optionally including local class includes
 *
 * @param args - Parameters containing class_name and optional include_types
 * @returns Class source code (main only or formatted multi-include output)
 */
export async function handleGetClass(args: GetClassParams) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }

        const encodedClassName = encodeURIComponent(args.class_name);
        const includeTypes = args.include_types && args.include_types.length > 0 ? args.include_types : ['main'];

        // Fast path: main only (backward compatible, no metadata fetch needed)
        if (includeTypes.length === 1 && includeTypes[0] === 'main') {
            const url = `${await getBaseUrl()}/sap/bc/adt/oo/classes/${encodedClassName}/source/main`;
            const response = await makeAdtRequest(url, 'GET', 30000);
            return return_response(response);
        }

        // Multi-include path: fetch metadata and includes
        const includes = await fetchIncludes(args.class_name, includeTypes);

        // Format output with section separators
        const formattedOutput = formatMultiIncludeOutput(includes);

        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: formattedOutput,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
