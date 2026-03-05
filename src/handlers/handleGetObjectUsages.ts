import { getConfig } from '../index';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

/**
 * Object type mapping from friendly names to ADT types
 */
const OBJECT_TYPE_MAP: Record<string, string> = {
  'class': 'CLAS/OC',
  'interface': 'INTF/OI',
  'program': 'PROG/1P',
  'function_group': 'FUGR/FF',
  'type_group': 'PROG/1T',
  'cds': 'DDLS/DF',
  'behavior': 'BDEF/BDO',
  'table': 'TABL/DS',
  'structure': 'TTYP/DA'
};

/**
 * Default object types to search in (based on user requirements)
 */
const DEFAULT_SEARCH_TYPES = [
  'CLAS/OC',  // Classes
  'INTF/OI',  // Interfaces
  'PROG/1P',  // Programs
  'PROG/1F',  // Function Groups (main program)
  'PROG/1T',  // Type Groups
  'FUGR/FF'   // Function Modules
];

/**
 * All available object types for comprehensive search
 */
const ALL_OBJECT_TYPES = [
  'CLAS/OC', 'INTF/OI', 'PROG/1P', 'PROG/1F', 'PROG/1T',
  'WDYN/YT', 'WAPA/WO', 'FUGR/FF', 'PINF/KI', 'TRAN/T',
  'WEBI/3I', 'SXSD/XD', 'ENHO/XH', 'ENHS/XS', 'DTEL/DE',
  'TABL/DS', 'TTYP/DA', 'SQSC/DU', 'DDLS/DF', 'ECAT/GE',
  'AOBJ/TYP', 'BDEF/BDO', 'BOBF', 'BOBX', 'CHKO/TYP',
  'CMHC', 'DDLX/EX', 'DMON', 'DRAS/RAS', 'DRTY/STY',
  'DTSC/DF', 'EEEC/EVC', 'JOBD', 'PDWS', 'SAIA/TYP',
  'SAMC', 'SAPC', 'SE61/DC', 'SKTD/TYP', 'SOD2',
  'SRVC/SVM', 'SRVD/SRV', 'SVAL', 'WB2A/TYP', 'WB2J/TYP', 'WMPC'
];

interface GetObjectUsagesArgs {
  object_name: string;
  object_type?: string;
  include_object_types?: string[];
  include_definitions?: boolean;
  include_elements?: boolean;
  include_indirect?: boolean;
  local_usage_only?: boolean;
  max_results?: number;
  summary_only?: boolean;
  include_metadata?: boolean;
  group_by?: 'none' | 'package' | 'type';
}

/**
 * Build ADT URI for an object
 */
function buildObjectUri(objectName: string, objectType: string): string {
  const upperName = objectName.toUpperCase();
  const adtType = OBJECT_TYPE_MAP[objectType.toLowerCase()] || objectType;
  
  // Map ADT types to URI paths
  if (adtType === 'CLAS/OC') {
    return `/sap/bc/adt/oo/classes/${upperName.toLowerCase()}`;
  } else if (adtType === 'INTF/OI') {
    return `/sap/bc/adt/oo/interfaces/${upperName.toLowerCase()}`;
  } else if (adtType === 'PROG/1P' || adtType === 'PROG/1F' || adtType === 'PROG/1T') {
    return `/sap/bc/adt/programs/programs/${upperName.toLowerCase()}`;
  } else if (adtType === 'FUGR/FF') {
    return `/sap/bc/adt/functions/groups/${upperName.toLowerCase()}`;
  } else if (adtType === 'DDLS/DF') {
    return `/sap/bc/adt/ddic/ddl/sources/${upperName.toLowerCase()}`;
  } else if (adtType === 'BDEF/BDO') {
    return `/sap/bc/adt/ddic/bdef/sources/${upperName.toLowerCase()}`;
  } else if (adtType === 'TABL/DS') {
    return `/sap/bc/adt/ddic/tables/${upperName.toLowerCase()}`;
  }
  
  // Default fallback
  return `/sap/bc/adt/repository/nodestructure?name=${upperName}&type=${adtType}`;
}

/**
 * Build XML for object types selection
 */
function buildObjectTypesXml(objectTypes: string[], isSelected: boolean = true): string {
  return objectTypes.map(type => {
    const isDefault = DEFAULT_SEARCH_TYPES.includes(type);
    return `<usagereferences:type name="${type}" isSelected="${isSelected}" isDefault="${isDefault}"/>`;
  }).join('\n        ');
}

/**
 * Generate summary from usages
 */
function generateSummary(usages: any[], totalCount: number): any {
  // Count by object type
  const byObjectType: Record<string, number> = {};
  usages.forEach(usage => {
    const type = usage.type || '';
    byObjectType[type] = (byObjectType[type] || 0) + 1;
  });

  // Count by package
  const packageCounts: Record<string, number> = {};
  usages.forEach(usage => {
    const pkg = usage.package;
    if (pkg) {
      packageCounts[pkg] = (packageCounts[pkg] || 0) + 1;
    }
  });

  // Get top packages
  const topPackages = Object.entries(packageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pkg, count]) => ({ package: pkg, count }));

  // Get sample usages (first 10)
  const sampleUsages = usages.slice(0, 10);

  return {
    totalUsages: totalCount,
    returnedUsages: usages.length,
    byObjectType,
    topPackages,
    sampleUsages
  };
}

/**
 * Group usages by specified criteria
 */
function groupUsages(usages: any[], groupBy: 'package' | 'type'): any {
  if (groupBy === 'package') {
    const grouped: Record<string, any[]> = {};
    usages.forEach(usage => {
      const pkg = usage.package || 'NO_PACKAGE';
      if (!grouped[pkg]) {
        grouped[pkg] = [];
      }
      grouped[pkg].push(usage);
    });
    
    return Object.entries(grouped).map(([pkg, items]) => ({
      package: pkg,
      count: items.length,
      usages: items
    }));
  } else if (groupBy === 'type') {
    const grouped: Record<string, any[]> = {};
    usages.forEach(usage => {
      const type = usage.type || '';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(usage);
    });
    
    return Object.entries(grouped).map(([type, items]) => ({
      objectType: type,
      count: items.length,
      usages: items
    }));
  }
  
  return usages;
}

/**
 * Strip metadata from usage object
 */
function stripMetadata(usage: any): any {
  return {
    name: usage.name,
    type: usage.type
  };
}

/**
 * Parse usage references response with streamlined format
 */
function parseUsageReferences(xmlResponse: string, includeMetadata: boolean = true): any {
  const parser = require('xml2js');
  
  return new Promise((resolve, reject) => {
    parser.parseString(xmlResponse, { explicitArray: false }, (err: any, result: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        const usageResult = result['usagereferences:usageReferenceResult'];
        
        if (!usageResult) {
          resolve({
            numberOfResults: 0,
            description: 'No usages found',
            usages: []
          });
          return;
        }
        
        const referencedObjects = usageResult['usagereferences:referencedObjects']?.['usagereferences:referencedObject'];
        
        if (!referencedObjects) {
          resolve({
            numberOfResults: 0,
            description: usageResult.$.resultDescription || 'No usages found',
            usages: []
          });
          return;
        }
        
        // Ensure referencedObjects is an array
        const objectsArray = Array.isArray(referencedObjects) ? referencedObjects : [referencedObjects];
        
        const usages = objectsArray.map((obj: any) => {
          const adtObject = obj['usagereferences:adtObject'];
          
          // Streamlined format - only essential information
          const usage: any = {
            name: adtObject?.$?.['adtcore:name'] || '',
            type: adtObject?.$?.['adtcore:type'] || '',
            package: adtObject?.['adtcore:packageRef']?.$?.['adtcore:name'] || ''
          };
          
          // Only include responsible if metadata requested
          if (includeMetadata) {
            usage.responsible = adtObject?.$?.['adtcore:responsible'] || '';
          }
          
          return usage;
        });
        
        resolve({
          numberOfResults: parseInt(usageResult.$.numberOfResults || '0'),
          description: usageResult.$.resultDescription || '',
          usages: usages
        });
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

/**
 * Handler for GetObjectUsages tool
 */
export async function handleGetObjectUsages(args: any) {
  try {
    let {
      object_name,
      object_type = 'class',
      include_object_types,
      include_definitions = true,
      include_elements = true,
      include_indirect = true,
      local_usage_only = false,
      max_results = 500,
      summary_only = false,
      include_metadata = true,
      group_by = 'none'
    } = args as GetObjectUsagesArgs;

    if (!object_name) {
      return return_error('object_name parameter is required');
    }

    // Validate max_results
    if (max_results < 1 || max_results > 500) {
      return return_error('max_results must be between 1 and 500');
    }

    // Validate group_by
    if (group_by && !['none', 'package', 'type'].includes(group_by)) {
      return return_error('group_by must be one of: none, package, type');
    }

    // Smart auto-restrictions for SAP standard classes (non-Z/Y)
    const isSapStandard = !object_name.toUpperCase().startsWith('Z') && 
                          !object_name.toUpperCase().startsWith('Y');
    
    if (isSapStandard) {
      // Apply safer defaults for SAP standard classes if not explicitly set
      if (!args.hasOwnProperty('max_results')) {
        max_results = 100; // Lower default for SAP classes
      }
      if (!args.hasOwnProperty('include_indirect')) {
        include_indirect = false; // Disable indirect by default for SAP classes
      }
    }

    const baseUrl = await getBaseUrl();
    const objectUri = buildObjectUri(object_name, object_type);
    const adtType = OBJECT_TYPE_MAP[object_type.toLowerCase()] || object_type;
    
    // Determine which object types to search in
    const searchTypes = include_object_types && include_object_types.length > 0
      ? include_object_types.map(t => OBJECT_TYPE_MAP[t.toLowerCase()] || t)
      : DEFAULT_SEARCH_TYPES;

    // Step 1: Get usage scope
    const scopeUrl = `${await baseUrl}/sap/bc/adt/repository/informationsystem/usageReferences/scope?uri=${encodeURIComponent(objectUri)}`;
    const scopePayload = `<?xml version="1.0" encoding="UTF-8"?>
<usagereferences:usageScopeRequest xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <usagereferences:affectedObjects/>
</usagereferences:usageScopeRequest>`;

    const scopeResponse = await makeAdtRequest(
      scopeUrl,
      'POST',
      20000,
      scopePayload,
      {},
      { 
        'Content-Type': 'application/vnd.sap.adt.repository.usagereferences.scope.request.v1+xml',
        'Accept': 'application/vnd.sap.adt.repository.usagereferences.scope.response.v1+xml'
      }
    );

    // Parse scope response to get payload
    const parser = require('xml2js');
    const scopeResult: any = await new Promise((resolve, reject) => {
      parser.parseString(scopeResponse.data, { explicitArray: false }, (err: any, result: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    const scopeData = scopeResult['usagereferences:usageScopeResult'];
    const payload = scopeData['usagereferences:payload'];
    const objectIdentifier = scopeData['usagereferences:objectIdentifier'];

    if (!payload) {
      return return_error('Failed to retrieve usage scope payload');
    }

    // Step 2: Get usage references
    const usageUrl = `${await baseUrl}/sap/bc/adt/repository/informationsystem/usageReferences?uri=${encodeURIComponent(objectUri)}`;
    
    // Build object types XML with all types set to isSelected based on searchTypes
    const allTypesXml = ALL_OBJECT_TYPES.map(type => {
      const isSelected = searchTypes.includes(type);
      const isDefault = DEFAULT_SEARCH_TYPES.includes(type);
      return `<usagereferences:type isDefault="${isDefault}" isSelected="${isSelected}" name="${type}"/>`;
    }).join('\n            ');

    const usagePayload = `<?xml version="1.0" encoding="UTF-8"?>
<usagereferences:usageReferenceRequest xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <usagereferences:affectedObjects/>
  <usagereferences:scope localUsage="${local_usage_only}">
    <usagereferences:objectIdentifier displayName="${objectIdentifier.$.displayName}" globalType="${objectIdentifier.$.globalType}"/>
    <usagereferences:grade definitions="${include_definitions}" elements="${include_elements}" indirectReferences="${include_indirect}"/>
    <usagereferences:objectTypes>
            ${allTypesXml}
    </usagereferences:objectTypes>
    <usagereferences:payload>${payload}</usagereferences:payload>
  </usagereferences:scope>
</usagereferences:usageReferenceRequest>`;

    const usageResponse = await makeAdtRequest(
      usageUrl,
      'POST',
      20000,
      usagePayload,
      {},
      { 
        'Content-Type': 'application/vnd.sap.adt.repository.usagereferences.request.v1+xml',
        'Accept': 'application/vnd.sap.adt.repository.usagereferences.result.v1+xml'
      }
    );

    // Parse usage references with metadata flag
    const usageData = await parseUsageReferences(usageResponse.data, include_metadata);

    // Apply result limiting
    const totalResults = usageData.numberOfResults;
    const allUsages = usageData.usages;
    let limitedUsages = allUsages.slice(0, max_results);
    const wasTruncated = allUsages.length > max_results;

    // Apply metadata stripping if requested
    if (!include_metadata) {
      limitedUsages = limitedUsages.map(stripMetadata);
    }

    // Build response based on mode
    let response: any;

    if (summary_only) {
      // Summary mode
      response = {
        object: {
          name: object_name.toUpperCase(),
          type: adtType,
          uri: objectUri
        },
        searchCriteria: {
          includeDefinitions: include_definitions,
          includeElements: include_elements,
          includeIndirect: include_indirect,
          localUsageOnly: local_usage_only,
          searchInTypes: searchTypes,
          maxResults: max_results
        },
        summary: generateSummary(allUsages, totalResults)
      };
    } else if (group_by !== 'none') {
      // Grouped mode
      const groupedData = groupUsages(limitedUsages, group_by as 'package' | 'type');
      response = {
        object: {
          name: object_name.toUpperCase(),
          type: adtType,
          uri: objectUri
        },
        searchCriteria: {
          includeDefinitions: include_definitions,
          includeElements: include_elements,
          includeIndirect: include_indirect,
          localUsageOnly: local_usage_only,
          searchInTypes: searchTypes,
          maxResults: max_results,
          groupBy: group_by
        },
        results: {
          totalResults: totalResults,
          returnedResults: limitedUsages.length,
          wasTruncated: wasTruncated,
          description: usageData.description,
          groupedUsages: groupedData
        }
      };
    } else {
      // Standard mode with limiting
      response = {
        object: {
          name: object_name.toUpperCase(),
          type: adtType,
          uri: objectUri
        },
        searchCriteria: {
          includeDefinitions: include_definitions,
          includeElements: include_elements,
          includeIndirect: include_indirect,
          localUsageOnly: local_usage_only,
          searchInTypes: searchTypes,
          maxResults: max_results
        },
        results: {
          totalResults: totalResults,
          returnedResults: limitedUsages.length,
          wasTruncated: wasTruncated,
          description: usageData.description,
          usages: limitedUsages
        }
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const objectName = (args as GetObjectUsagesArgs).object_name || 'UNKNOWN';
    
    // Enhanced error handling for timeouts
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Query timeout - object has too many usages',
            object: objectName.toUpperCase(),
            message: 'This object is extremely widely used across the system (likely 1000+ usages). The where-used search cannot complete within the 20-second timeout, regardless of parameters.',
            conclusion: 'For objects with this many usages, GetObjectUsages is not the right tool. Use alternative approaches instead.',
            recommendedApproach: {
              title: 'Use these alternative tools for targeted analysis:',
              steps: [
                {
                  step: 1,
                  tool: 'SearchObject',
                  description: 'Find related objects by name pattern',
                  example: {
                    tool_name: 'SearchObject',
                    parameters: {
                      query: `*${objectName.substring(0, 15)}*`,
                      maxResults: 20
                    }
                  },
                  purpose: 'Discover classes/interfaces that reference this object in their name'
                },
                {
                  step: 2,
                  tool: 'GetClass / GetInterface',
                  description: 'Analyze specific objects found in step 1',
                  example: {
                    tool_name: 'GetClass',
                    parameters: {
                      class_name: '<class_from_search>'
                    }
                  },
                  purpose: 'Examine how specific classes use the object'
                },
                {
                  step: 3,
                  tool: 'GetPackageContents',
                  description: 'Explore packages that might use this object',
                  example: {
                    tool_name: 'GetPackageContents',
                    parameters: {
                      package_name: '<relevant_package>'
                    }
                  },
                  purpose: 'Find objects in specific functional areas'
                }
              ]
            },
            example: {
              title: `Example workflow for analyzing ${objectName.toUpperCase()}:`,
              workflow: [
                `1. SearchObject({ query: "*${objectName.substring(3, 15)}*", maxResults: 20 })`,
                '2. Review found objects and identify relevant ones',
                '3. GetClass({ class_name: "<relevant_class>" }) to see actual usage',
                '4. Repeat for other interesting objects from search results'
              ]
            },
            note: 'This approach provides targeted, actionable information instead of an overwhelming list of thousands of usages.'
          }, null, 2)
        }]
      };
    }
    
    // Standard error handling for other errors
    return return_error(`Failed to retrieve object usages: ${errorMessage}`);
  }
}
