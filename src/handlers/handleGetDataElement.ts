import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetDataElement(args: any) {
    try {
        if (!args?.dataelement_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Data element name is required');
        }
        const encodedDataElementName = encodeURIComponent(args.dataelement_name.toLowerCase());
        const url = `${await getBaseUrl()}/sap/bc/adt/ddic/dataelements/${encodedDataElementName}`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        return return_response(response);
    } catch (error) {
        return return_error(error);
    }
}
