import { handleGetPackage } from '../handleGetPackage';
import { handleListTopLevelPackages } from '../handleListTopLevelPackages';

/**
 * MCP Resource handler for ABAP packages
 * Provides cacheable access to package information via URI scheme
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
      }
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
  
  throw new Error(`Unknown resource URI: ${uri}`);
}
