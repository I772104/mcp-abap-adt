import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import { fetchClassMetadata } from '../lib/classUtils';

/**
 * Helper function to fetch include with 404 handling
 */
async function fetchIncludeWithNotFoundHandling(url: string, includeType: string, className: string): Promise<any> {
    try {
        const response = await makeAdtRequest(url, 'GET', 30000, undefined, undefined, {
            Accept: 'text/plain',
        });
        return return_response(response);
    } catch (error: any) {
        // 404 is expected if the include doesn't exist
        if (error.message?.includes('404') || error.response?.status === 404) {
            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text: `// Include '${includeType}' not found for class ${className}\n// This is normal if the class does not use ${includeType}`,
                    },
                ],
            };
        }
        throw error;
    }
}

/**
 * Parameters for getting a specific class include
 */
interface GetClassIncludeParams {
    class_name: string;
    include_type: 'definitions' | 'implementations' | 'macros' | 'testclasses' | 'main';
}

/**
 * Valid include types
 */
const VALID_INCLUDE_TYPES = ['definitions', 'implementations', 'macros', 'testclasses', 'main'];

/**
 * Retrieves a specific include from an ABAP class
 *
 * @param args - Parameters containing class_name and include_type
 * @returns The source code of the requested include
 */
export async function handleGetClassInclude(args: GetClassIncludeParams) {
    try {
        // Validate parameters
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }

        if (!args?.include_type) {
            throw new McpError(
                ErrorCode.InvalidParams,
                `Include type is required. Valid types: ${VALID_INCLUDE_TYPES.join(', ')}`
            );
        }

        // Validate include_type
        if (!VALID_INCLUDE_TYPES.includes(args.include_type)) {
            throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid include type '${args.include_type}'. Valid types: ${VALID_INCLUDE_TYPES.join(', ')}`
            );
        }

        const encodedClassName = encodeURIComponent(args.class_name);
        const baseUrl = await getBaseUrl();

        // Fetch class metadata to get the correct URI for the include
        const metadata = await fetchClassMetadata(args.class_name);
        const include = metadata.includes.find((inc) => inc.type === args.include_type);

        if (!include) {
            // Include type not found in metadata - try with standard URI
            const standardUri = getStandardIncludeUri(args.include_type);
            const url = `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}/${standardUri}`;
            return await fetchIncludeWithNotFoundHandling(url, args.include_type, args.class_name);
        }

        // Fetch the include source
        const url = `${baseUrl}/sap/bc/adt/oo/classes/${encodedClassName}/${include.uri}`;
        return await fetchIncludeWithNotFoundHandling(url, args.include_type, args.class_name);
    } catch (error) {
        return return_error(error);
    }
}

/**
 * Gets the standard URI for an include type (fallback)
 */
function getStandardIncludeUri(includeType: string): string {
    switch (includeType) {
        case 'main':
            return 'source/main';
        case 'definitions':
            return 'includes/definitions';
        case 'implementations':
            return 'includes/implementations';
        case 'macros':
            return 'includes/macros';
        case 'testclasses':
            return 'includes/testclasses';
        default:
            return `includes/${includeType}`;
    }
}
