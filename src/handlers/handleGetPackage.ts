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

/**
 * Helper function to safely extract attribute from XML-JS object
 */
function extractAttr(obj: any, attrName: string): string | undefined {
    if (!obj || !obj._attributes) return undefined;
    return obj._attributes[attrName];
}

export async function handleGetPackage(args: any) {
    try {
        if (!args?.package_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Package name is required');
        }

        const encodedPackageName = encodeURIComponent(args.package_name);
        const baseUrl = await getBaseUrl();
        
        // Get comprehensive package details from the main package endpoint
        const packageUrl = `${baseUrl}/sap/bc/adt/packages/${encodedPackageName}`;
        const packageResponse = await makeAdtRequest(packageUrl, 'GET', 30000);
        
        // Parse the XML response
        const result = convert.xml2js(packageResponse.data, { compact: true });
        const pkg = result['pak:package'];
        
        if (!pkg) {
            throw new McpError(ErrorCode.InternalError, 'Invalid package response format');
        }

        // Extract package metadata
        const packageInfo: any = {
            name: extractAttr(pkg, 'adtcore:name'),
            description: extractAttr(pkg, 'adtcore:description'),
            type: extractAttr(pkg, 'adtcore:type'),
            responsible: extractAttr(pkg, 'adtcore:responsible'),
            createdBy: extractAttr(pkg, 'adtcore:createdBy'),
            createdAt: extractAttr(pkg, 'adtcore:createdAt'),
            changedBy: extractAttr(pkg, 'adtcore:changedBy'),
            changedAt: extractAttr(pkg, 'adtcore:changedAt'),
            masterLanguage: extractAttr(pkg, 'adtcore:masterLanguage'),
            masterSystem: extractAttr(pkg, 'adtcore:masterSystem'),
            version: extractAttr(pkg, 'adtcore:version')
        };

        // Extract package attributes
        if (pkg['pak:attributes']) {
            packageInfo.attributes = {
                packageType: extractAttr(pkg['pak:attributes'], 'pak:packageType'),
                isEncapsulated: extractAttr(pkg['pak:attributes'], 'pak:isEncapsulated'),
                recordChanges: extractAttr(pkg['pak:attributes'], 'pak:recordChanges'),
                languageVersion: extractAttr(pkg['pak:attributes'], 'pak:languageVersion'),
                isAddingObjectsAllowed: extractAttr(pkg['pak:attributes'], 'pak:isAddingObjectsAllowed')
            };
        }

        // Extract super package (parent)
        if (pkg['pak:superPackage']) {
            packageInfo.superPackage = {
                name: extractAttr(pkg['pak:superPackage'], 'adtcore:name'),
                description: extractAttr(pkg['pak:superPackage'], 'adtcore:description'),
                type: extractAttr(pkg['pak:superPackage'], 'adtcore:type'),
                uri: extractAttr(pkg['pak:superPackage'], 'adtcore:uri')
            };
        }

        // Extract application component
        if (pkg['pak:applicationComponent']) {
            packageInfo.applicationComponent = {
                name: extractAttr(pkg['pak:applicationComponent'], 'pak:name'),
                description: extractAttr(pkg['pak:applicationComponent'], 'pak:description')
            };
        }

        // Extract transport information
        if (pkg['pak:transport']) {
            packageInfo.transport = {};
            
            if (pkg['pak:transport']['pak:softwareComponent']) {
                packageInfo.transport.softwareComponent = {
                    name: extractAttr(pkg['pak:transport']['pak:softwareComponent'], 'pak:name'),
                    description: extractAttr(pkg['pak:transport']['pak:softwareComponent'], 'pak:description'),
                    type: extractAttr(pkg['pak:transport']['pak:softwareComponent'], 'pak:type')
                };
            }
            
            if (pkg['pak:transport']['pak:transportLayer']) {
                packageInfo.transport.transportLayer = {
                    name: extractAttr(pkg['pak:transport']['pak:transportLayer'], 'pak:name'),
                    description: extractAttr(pkg['pak:transport']['pak:transportLayer'], 'pak:description')
                };
            }
        }

        // Extract translation relevance
        if (pkg['pak:translation']) {
            packageInfo.translation = {
                relevance: extractAttr(pkg['pak:translation'], 'pak:relevance'),
                relevanceDescription: extractAttr(pkg['pak:translation'], 'pak:relevanceDescription')
            };
        }

        // Extract sub-packages
        if (pkg['pak:subPackages'] && pkg['pak:subPackages']['pak:packageRef']) {
            const subPkgs = pkg['pak:subPackages']['pak:packageRef'];
            const subPkgArray = Array.isArray(subPkgs) ? subPkgs : [subPkgs];
            
            packageInfo.subPackages = subPkgArray.map((subPkg: any) => ({
                name: extractAttr(subPkg, 'adtcore:name'),
                description: extractAttr(subPkg, 'adtcore:description'),
                type: extractAttr(subPkg, 'adtcore:type'),
                uri: extractAttr(subPkg, 'adtcore:uri')
            }));
        }

        // Extract package interfaces
        if (pkg['pak:packageInterfaces'] && pkg['pak:packageInterfaces']['pak:packageInterfaceRef']) {
            const interfaces = pkg['pak:packageInterfaces']['pak:packageInterfaceRef'];
            const interfaceArray = Array.isArray(interfaces) ? interfaces : [interfaces];
            
            packageInfo.packageInterfaces = interfaceArray.map((intf: any) => ({
                name: extractAttr(intf, 'adtcore:name'),
                description: extractAttr(intf, 'adtcore:description'),
                type: extractAttr(intf, 'adtcore:type'),
                uri: extractAttr(intf, 'adtcore:uri')
            }));
        }

        return {
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify(packageInfo, null, 2)
            }]
        };

    } catch (error) {
        return return_error(error);
    }
}
