import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { parseStringPromise } from 'xml2js';

export async function handleSearchObject(args: any) {
    try {
        if (!args?.query) {
            throw new McpError(ErrorCode.InvalidParams, 'Search query is required');
        }
        const maxResults = args.maxResults || 100;
        const encodedQuery = encodeURIComponent(args.query);
        const url = `${await getBaseUrl()}/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodedQuery}&maxResults=${maxResults}`;
        const response = await makeAdtRequest(url, 'GET', 30000);

        // Parse XML response to JSON
        const xmlData = response.data;
        const parsedData = await parseStringPromise(xmlData, { explicitArray: false });

        // Extract search results from XML structure
        const searchResult = parsedData?.['adtcore:objectReferences'] || {};
        const objects = searchResult?.['adtcore:objectReference'] || [];

        // Normalize to array if single result
        const objectArray = Array.isArray(objects) ? objects : [objects];

        // Transform to simplified JSON structure
        const result = {
            query: args.query,
            max_results: maxResults,
            matches_found: objectArray.length,
            objects: objectArray.map((obj: any) => ({
                name: obj.$?.['adtcore:name'] || '',
                type: obj.$?.['adtcore:type'] || '',
                uri: obj.$?.['adtcore:uri'] || '',
                package: obj.$?.['adtcore:packageName'] || '',
                description: obj.$?.['adtcore:description'] || '',
            })),
        };

        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
