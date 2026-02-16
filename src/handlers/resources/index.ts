import { handleGetPackage } from '../handleGetPackage';
import { handleListTopLevelPackages } from '../handleListTopLevelPackages';
import { handleRapBoAnalysisResource } from '../handleRapBoAnalysisResource';
import { handleGetCDSView } from '../handleGetCDSView';
import { handleGetCDSViewContents } from '../handleGetCDSViewContents';
import { handleGetClass } from '../handleGetClass';
import { handleGetTable } from '../handleGetTable';
import { listAgentGuideResources, getAgentGuide, detectAgentType } from './agentGuides';

/**
 * MCP Resource handler for ABAP objects
 * Provides cacheable access to ABAP packages, RAP BOs, CDS views, classes, and tables via URI scheme
 */

/**
 * List all available resource templates
 */
export async function listResourceTemplates() {
  return {
    resourceTemplates: [
      {
        uriTemplate: 'abap://package/{package_name}',
        name: 'ABAP Package Information',
        description: 'Retrieve comprehensive ABAP package information including metadata, attributes, hierarchy (super/sub-packages), transport details, application component, and package interfaces. The package_name parameter is required in the URI path.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'abap://packages/top-level?fields={fields}&limit={limit}&offset={offset}&prefix={prefix}&minObjects={minObjects}',
        name: 'Top-Level Packages (Customizable)',
        description: 'Retrieve filtered top-level packages with customizable fields. Parameters: fields (comma-separated: name,description,objectCount,uri), limit (max 500), offset (pagination), prefix (filter by name prefix), minObjects (minimum object count). All parameters are optional.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'rap-bo-analysis:///{rap_bo_name}',
        name: 'RAP Business Object Analysis',
        description: 'Comprehensive analysis of a RAP Business Object including behavior definitions, CDS views, service exposure, access control, and implementation classes. Replace {rap_bo_name} with the actual RAP BO name.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'abap://cds/{view_name}',
        name: 'CDS View',
        description: 'Retrieve CDS view source code, annotations, associations, and metadata. The view_name parameter is required in the URI path.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'cds-view-data:///{view_name}?columns={columns}&max_rows={max_rows}&where={where}&order_by={order_by}&offset={offset}&parameters={parameters}&include_metadata={include_metadata}',
        name: 'CDS View Data',
        description: 'Query CDS view data with filtering, pagination, and parameter support. Parameters: columns (comma-separated), max_rows (default: 100, max: 500), where (FIELD1:VALUE1,FIELD2:VALUE2), order_by (comma-separated), offset (pagination), parameters (CDS parameters as PARAM1:VALUE1,PARAM2:VALUE2), include_metadata (true/false). All parameters are optional.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'abap://class/{class_name}',
        name: 'ABAP Class',
        description: 'Retrieve ABAP class source code including definition and implementation sections. The class_name parameter is required in the URI path.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'abap://table/{table_name}',
        name: 'Database Table',
        description: 'Retrieve database table structure including fields, data elements, domains, and technical settings. The table_name parameter is required in the URI path.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'agent-guide://{agent_type}',
        name: 'Agent-Specific Guide',
        description: 'Get optimized guide for specific AI agent (cline, claude, cursor, opencode, universal). Use agent-guide://auto for automatic detection.',
        mimeType: 'text/markdown'
      }
    ]
  };
}


/**
 * List all available resources
 */
export async function listResources() {
  return {
    resources: [
      {
        uri: 'abap://packages/top-level',
        name: 'Top-Level ABAP Packages List',
        description: 'Retrieve a filtered list of top-level packages (no super package) excluding system packages (starting with $), test packages (starting with TEST), and empty packages. Useful for package discovery.',
        mimeType: 'application/json'
      },
      {
        uri: 'abap://packages/top-level/names',
        name: 'Top-Level Package Names (Lightweight)',
        description: 'Retrieve only the names of top-level packages as a simple array. Much lighter than the full list (~5K tokens vs 35K). Useful for quick discovery and autocomplete scenarios.',
        mimeType: 'application/json'
      },
      ...listAgentGuideResources()
    ]
  };
}

/**
 * Read a specific resource by URI
 */
export async function readResource(uri: string) {
  // Parse URL to extract base path and query parameters
  const urlObj = new URL(uri);
  const basePath = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  const params: any = {};
  
  // Extract query parameters
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  // Check for top-level packages list (with or without parameters)
  if (basePath === 'abap://packages/top-level' || uri === 'abap://packages/top-level') {
    const result = await handleListTopLevelPackages(params);
    
    if (result.isError) {
      throw new Error(`Failed to retrieve top-level packages: ${JSON.stringify(result.content)}`);
    }
    
    const jsonContent = result.content[0].text;
    
    return {
      contents: [
        {
          uri: uri,
          mimeType: 'application/json',
          text: jsonContent
        }
      ]
    };
  }
  
  // Check for names-only variant
  if (basePath === 'abap://packages/top-level/names' || uri === 'abap://packages/top-level/names') {
    const result = await handleListTopLevelPackages({ ...params, namesOnly: true });
    
    if (result.isError) {
      throw new Error(`Failed to retrieve package names: ${JSON.stringify(result.content)}`);
    }
    
    const jsonContent = result.content[0].text;
    
    return {
      contents: [
        {
          uri: uri,
          mimeType: 'application/json',
          text: jsonContent
        }
      ]
    };
  }
  
  // Handle RAP BO Analysis
  if (uri.startsWith('rap-bo-analysis:///')) {
    return await handleRapBoAnalysisResource(uri);
  }
  
  // Handle Agent Guides
  if (uri.startsWith('agent-guide://')) {
    const agentMatch = uri.match(/^agent-guide:\/\/(.+)$/);
    if (agentMatch) {
      let agentType = decodeURIComponent(agentMatch[1]);
      
      // Auto-detect agent type if requested
      if (agentType === 'auto') {
        // In a real implementation, you would detect from request headers
        // For now, default to universal
        agentType = 'universal';
      }
      
      const guideContent = getAgentGuide(agentType);
      
      return {
        contents: [
          {
            uri: uri,
            mimeType: 'text/markdown',
            text: guideContent
          }
        ]
      };
    }
  }
  
  // Parse the URI to extract the package name
  const packageMatch = uri.match(/^abap:\/\/package\/(.+)$/);
  
  if (packageMatch) {
    const packageName = decodeURIComponent(packageMatch[1]);
    
    // Call the existing GetPackage handler
    const result = await handleGetPackage({ package_name: packageName });
    
    if (result.isError) {
      throw new Error(`Failed to retrieve package ${packageName}: ${JSON.stringify(result.content)}`);
    }
    
    // Extract the JSON content from the handler response
    const jsonContent = result.content[0].text;
    
    return {
      contents: [
        {
          uri: uri,
          mimeType: 'application/json',
          text: jsonContent
        }
      ]
    };
  }
  
  // Parse the URI to extract CDS view name
  const cdsMatch = uri.match(/^abap:\/\/cds\/(.+)$/);
  
  if (cdsMatch) {
    const viewName = decodeURIComponent(cdsMatch[1]);
    
    const result = await handleGetCDSView({ view_name: viewName });
    
    if (result.isError) {
      throw new Error(`Failed to retrieve CDS view ${viewName}: ${JSON.stringify(result.content)}`);
    }
    
    const jsonContent = result.content[0].text;
    
    return {
      contents: [
        {
          uri: uri,
          mimeType: 'application/json',
          text: jsonContent
        }
      ]
    };
  }
  
  // Parse the URI to extract class name
  const classMatch = uri.match(/^abap:\/\/class\/(.+)$/);
  
  if (classMatch) {
    const className = decodeURIComponent(classMatch[1]);
    
    const result = await handleGetClass({ class_name: className });
    
    if (result.isError) {
      throw new Error(`Failed to retrieve class ${className}: ${JSON.stringify(result.content)}`);
    }
    
    const jsonContent = result.content[0].text;
    
    return {
      contents: [
        {
          uri: uri,
          mimeType: 'application/json',
          text: jsonContent
        }
      ]
    };
  }
  
  // Parse the URI to extract table name
  const tableMatch = uri.match(/^abap:\/\/table\/(.+)$/);
  
  if (tableMatch) {
    const tableName = decodeURIComponent(tableMatch[1]);
    
    const result = await handleGetTable({ table_name: tableName });
    
    if (result.isError) {
      throw new Error(`Failed to retrieve table ${tableName}: ${JSON.stringify(result.content)}`);
    }
    
    const jsonContent = result.content[0].text;
    
    return {
      contents: [
        {
          uri: uri,
          mimeType: 'application/json',
          text: jsonContent
        }
      ]
    };
  }
  
  // Handle CDS View Data queries
  if (uri.startsWith('cds-view-data:///')) {
    // Parse the URI manually since URL() doesn't handle custom schemes well
    const uriWithoutScheme = uri.substring('cds-view-data:///'.length);
    const [pathPart, queryPart] = uriWithoutScheme.split('?');
    
    if (!pathPart) {
      throw new Error('Invalid CDS view data URI format: missing view name');
    }
    
    const viewName = decodeURIComponent(pathPart);
    const queryParams: any = { view_name: viewName };
    
    // Parse query parameters if present
    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      
      if (searchParams.has('columns')) {
        queryParams.columns = searchParams.get('columns')!.split(',').map(c => c.trim());
      }
      if (searchParams.has('max_rows')) {
        queryParams.max_rows = parseInt(searchParams.get('max_rows')!);
      }
      if (searchParams.has('offset')) {
        queryParams.offset = parseInt(searchParams.get('offset')!);
      }
      if (searchParams.has('where')) {
        const whereStr = searchParams.get('where')!;
        queryParams.where_conditions = {};
        whereStr.split(',').forEach(pair => {
          const [key, value] = pair.split(':').map(s => s.trim());
          if (key && value) {
            queryParams.where_conditions[key] = value;
          }
        });
      }
      if (searchParams.has('order_by')) {
        queryParams.order_by = searchParams.get('order_by')!.split(',').map(c => c.trim());
      }
      if (searchParams.has('parameters')) {
        const paramsStr = searchParams.get('parameters')!;
        queryParams.parameters = {};
        paramsStr.split(',').forEach(pair => {
          const [key, value] = pair.split(':').map(s => s.trim());
          if (key && value) {
            queryParams.parameters[key] = value;
          }
        });
      }
      if (searchParams.has('include_metadata')) {
        queryParams.include_column_metadata = searchParams.get('include_metadata') === 'true';
      }
    }
    
    const result = await handleGetCDSViewContents(queryParams);
    
    // handleGetCDSViewContents always returns content array, no isError property
    const jsonContent = result.content[0].text;
    
    return {
      contents: [
        {
          uri: uri,
          mimeType: 'application/json',
          text: jsonContent
        }
      ]
    };
  }
  
  throw new Error(`Unknown resource URI: ${uri}`);
}
