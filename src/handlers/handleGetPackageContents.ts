import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';
import convert from 'xml-js';

/**
 * Helper function to safely extract text from XML-JS object
 */
function extractText(obj: any): string | undefined {
    if (!obj) return undefined;
    if (typeof obj === 'string') return obj;
    if (obj._text) return obj._text;
    return undefined;
}

export async function handleGetPackageContents(args: any) {
    try {
        if (!args?.package_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Package name is required');
        }

        const includeSubpackages = args.include_subpackages !== false; // default true
        const recursive = args.recursive === true; // default false

        const baseUrl = await getBaseUrl();
        const encodedPackageName = encodeURIComponent(args.package_name);

        // Get package contents using the nodestructure endpoint
        const nodeContentsUrl = `${baseUrl}/sap/bc/adt/repository/nodestructure`;
        const nodeContentsParams = {
            parent_type: "DEVC/K",
            parent_name: encodedPackageName,
            withShortDescriptions: true
        };

        const response = await makeAdtRequest(nodeContentsUrl, 'POST', 30000, undefined, nodeContentsParams);
        const result = convert.xml2js(response.data, { compact: true });
        
        const nodes = result["asx:abap"]?.["asx:values"]?.DATA?.TREE_CONTENT?.SEU_ADT_REPOSITORY_OBJ_NODE || [];
        const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
        
        // Extract and categorize objects
        const objects: any[] = [];
        const subPackages: any[] = [];

        for (const node of nodeArray) {
            if (!node.OBJECT_NAME?._text || !node.OBJECT_URI?._text) {
                continue;
            }

            const objectData = {
                type: extractText(node.OBJECT_TYPE),
                name: extractText(node.OBJECT_NAME),
                description: extractText(node.DESCRIPTION),
                uri: extractText(node.OBJECT_URI)
            };

            // Check if it's a sub-package
            const isSubPackage = objectData.type === 'DEVC/K';
            
            if (isSubPackage) {
                if (includeSubpackages) {
                    subPackages.push(objectData);
                }
            } else {
                objects.push(objectData);
            }
        }

        // Build response
        const packageContents: any = {
            package: args.package_name,
            objectCount: objects.length,
            objects: objects
        };

        if (includeSubpackages && subPackages.length > 0) {
            packageContents.subPackages = subPackages;
            packageContents.subPackageCount = subPackages.length;
        }

        // If recursive is enabled, fetch contents of sub-packages
        if (recursive && subPackages.length > 0) {
            packageContents.subPackageContents = [];
            
            for (const subPkg of subPackages) {
                try {
                    // Recursively get sub-package contents
                    const subPkgResult = await handleGetPackageContents({
                        package_name: subPkg.name,
                        include_subpackages: includeSubpackages,
                        recursive: true
                    });

                    if (!subPkgResult.isError && subPkgResult.content?.[0]?.text) {
                        const subPkgData = JSON.parse(subPkgResult.content[0].text);
                        packageContents.subPackageContents.push(subPkgData);
                    }
                } catch (error) {
                    // Continue with other sub-packages if one fails
                    console.error(`Failed to fetch contents for sub-package ${subPkg.name}:`, error);
                }
            }
        }

        return {
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify(packageContents, null, 2)
            }]
        };

    } catch (error) {
        return return_error(error);
    }
}