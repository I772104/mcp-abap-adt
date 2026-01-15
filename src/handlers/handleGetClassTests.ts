import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetClassTests(args: any) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }
        const encodedClassName = encodeURIComponent(args.class_name);
        const url = `${await getBaseUrl()}/sap/bc/adt/oo/classes/${encodedClassName}/includes/testclasses`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        return return_response(response);
    } catch (error) {
        return return_error(error);
    }
}
