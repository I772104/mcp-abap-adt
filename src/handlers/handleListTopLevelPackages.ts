import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import convert from 'xml-js';

/**
 * Helper function to safely extract attribute from XML-JS object
 */
function extractAttr(obj: any, attrName: string): string | undefined {
    if (!obj || !obj._attributes) return undefined;
    return obj._attributes[attrName];
}

export async function handleListTopLevelPackages(args?: any) {
    try {
        const baseUrl = await getBaseUrl();

        // Parse parameters
        const fields = args?.fields
            ? args.fields.split(',').map((f: string) => f.trim())
            : ['name', 'description', 'objectCount', 'uri'];
        const limit = args?.limit ? Math.min(parseInt(args.limit, 10), 500) : undefined;
        const offset = args?.offset ? parseInt(args.offset, 10) : 0;
        const prefix = args?.prefix?.toUpperCase();
        const minObjects = args?.minObjects ? parseInt(args.minObjects, 10) : undefined;
        const namesOnly = args?.namesOnly === true || args?.namesOnly === 'true';

        // Call the virtual folders endpoint to get all packages
        const url = `${baseUrl}/sap/bc/adt/repository/informationsystem/virtualfolders/contents`;

        // The API requires a specific Content-Type and XML body with objectSearchPattern and facetorder
        const requestBody = `<?xml version="1.0" encoding="UTF-8"?>
<vfs:virtualFoldersRequest xmlns:vfs="http://www.sap.com/adt/ris/virtualFolders" objectSearchPattern="*">
  <vfs:facetorder>
    <vfs:facet>package</vfs:facet>
    <vfs:facet>group</vfs:facet>
    <vfs:facet>type</vfs:facet>
  </vfs:facetorder>
</vfs:virtualFoldersRequest>`;

        const response = await makeAdtRequest(
            url,
            'POST',
            30000,
            requestBody,
            undefined, // params
            {
                'Content-Type': 'application/vnd.sap.adt.repository.virtualfolders.request.v1+xml',
                Accept: 'application/vnd.sap.adt.repository.virtualfolders.result.v1+xml',
            }
        );

        // Parse the XML response
        const result = convert.xml2js(response.data, { compact: true });
        const vfsResult = result['vfs:virtualFoldersResult'];

        if (!vfsResult || !vfsResult['vfs:virtualFolder']) {
            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(namesOnly ? { packageNames: [] } : { packages: [] }, null, 2),
                    },
                ],
            };
        }

        // Get all virtual folders
        const folders = Array.isArray(vfsResult['vfs:virtualFolder'])
            ? vfsResult['vfs:virtualFolder']
            : [vfsResult['vfs:virtualFolder']];

        // Filter and map packages
        let packages = folders
            .filter((folder: any) => {
                const name = extractAttr(folder, 'name');
                const counter = parseInt(extractAttr(folder, 'counter') || '0', 10);

                if (!name) return false;

                // Exclude packages starting with $ or TEST
                if (name.startsWith('$') || name.startsWith('TEST')) return false;

                // Exclude empty packages (counter = 0)
                if (counter === 0) return false;

                // Apply prefix filter if provided
                if (prefix && !name.startsWith(prefix)) return false;

                // Apply minObjects filter if provided
                if (minObjects !== undefined && counter < minObjects) return false;

                return true;
            })
            .map((folder: any) => {
                const fullPackage = {
                    name: extractAttr(folder, 'name'),
                    description: extractAttr(folder, 'text'),
                    objectCount: parseInt(extractAttr(folder, 'counter') || '0', 10),
                    uri: extractAttr(folder, 'uri'),
                };

                // If namesOnly, return just the name
                if (namesOnly) {
                    return fullPackage.name;
                }

                // Otherwise, return only requested fields
                const filteredPackage: any = {};
                fields.forEach((field: string) => {
                    if (field in fullPackage) {
                        filteredPackage[field] = fullPackage[field as keyof typeof fullPackage];
                    }
                });
                return filteredPackage;
            })
            .sort((a, b) => {
                const aName = typeof a === 'string' ? a : a.name;
                const bName = typeof b === 'string' ? b : b.name;
                return aName.localeCompare(bName);
            });

        // Apply pagination if limit is specified
        const totalCount = packages.length;
        if (limit !== undefined) {
            packages = packages.slice(offset, offset + limit);
        }

        // Return appropriate format
        if (namesOnly) {
            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                totalCount,
                                packageNames: packages,
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        } else {
            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                totalCount,
                                ...(limit !== undefined && { limit, offset }),
                                packages,
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        }
    } catch (error) {
        return return_error(error);
    }
}
