import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetDomain(args: any) {
    try {
        if (!args?.domain_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Domain name is required');
        }
        const encodedDomainName = encodeURIComponent(args.domain_name.toLowerCase());
        const url = `${await getBaseUrl()}/sap/bc/adt/ddic/domains/${encodedDomainName}`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        return return_response(response);
    } catch (error) {
        return return_error(error);
    }
}
