# GetPackage Tool Documentation

## Overview

The `GetPackage` tool retrieves comprehensive information about an ABAP package from the SAP system via the ADT (ABAP Development Tools) API. It provides detailed metadata, hierarchy information, transport settings, and related package components.

## Endpoint

```
GET /sap/bc/adt/packages/{package_name}
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `package_name` | string | Yes | Name of the ABAP package to retrieve |

## Response Structure

The tool returns a JSON object with the following structure:

### Package Metadata

```json
{
  "name": "CMD_PM_HPC",
  "description": "CMD: Classification-Based Product Hierarchy - OP Only",
  "type": "DEVC/K",
  "responsible": "SETHSH",
  "createdBy": "SETHSH",
  "createdAt": "2024-12-23T23:00:00Z",
  "changedBy": "SETHSH",
  "changedAt": "2024-12-23T23:00:00Z",
  "masterLanguage": "EN",
  "masterSystem": "ER1",
  "version": "active"
}
```

### Package Attributes

```json
{
  "attributes": {
    "packageType": "main",
    "isEncapsulated": "true",
    "recordChanges": "true",
    "languageVersion": "",
    "isAddingObjectsAllowed": "true"
  }
}
```

### Package Hierarchy

#### Super Package (Parent)
```json
{
  "superPackage": {
    "name": "IFS_CMD_PM",
    "description": "Structure Package for modernization area CFND_CMD_PM",
    "type": "DEVC/K",
    "uri": "/sap/bc/adt/packages/ifs_cmd_pm"
  }
}
```

#### Sub-Packages (Children)
```json
{
  "subPackages": [
    {
      "name": "APPL_MD_HPC",
      "description": "Central Master Data: Classification-Based Product Hierarchy",
      "type": "DEVC/K",
      "uri": "/sap/bc/adt/packages/appl_md_hpc"
    }
  ]
}
```

### Application Component

```json
{
  "applicationComponent": {
    "name": "LO-MD-MM",
    "description": "Material Master"
  }
}
```

### Transport Information

```json
{
  "transport": {
    "softwareComponent": {
      "name": "SAPSCORE_B",
      "description": "SAPSCORE_B Cloud Only Backend",
      "type": "R"
    },
    "transportLayer": {
      "name": "SSCB",
      "description": "For ER1 SAPSCORE_B (Cloud Only)"
    }
  }
}
```

### Translation Settings

```json
{
  "translation": {
    "relevance": "TRANSL_NONE",
    "relevanceDescription": "No Translation"
  }
}
```

### Package Interfaces

```json
{
  "packageInterfaces": [
    {
      "name": "CMD_PM_HPC",
      "description": "CMD:Classification based Product Hierarchy OP Only",
      "type": "PINF/KI",
      "uri": "/sap/bc/adt/vit/wb/object_type/pinfki/object_name/CMD_PM_HPC"
    }
  ]
}
```

## Usage Examples

### Example 1: Basic Package Information

```typescript
const result = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetPackage",
  arguments: {
    package_name: "CMD_PM_HPC"
  }
});
```

### Example 2: Understanding Package Hierarchy

Use GetPackage to understand the package structure:
1. Get the main package information
2. Check the `superPackage` field to see the parent package
3. Check the `subPackages` array to see child packages
4. Recursively call GetPackage on sub-packages to build a complete hierarchy tree

### Example 3: Transport Analysis

Use the transport information to understand:
- Which software component the package belongs to
- The transport layer configuration
- Whether the package is in a local or transportable state

## Field Descriptions

### Package Types
- `DEVC/K`: Development package (main package type)
- Other types may include structure packages, test packages, etc.

### Encapsulation
- `true`: Package is encapsulated (uses package interfaces for visibility control)
- `false`: Package is not encapsulated (all objects are visible)

### Translation Relevance
- `TRANSL_NONE`: No translation required
- `TRANSL_RELEVANT`: Translation is relevant
- Other values may indicate specific translation requirements

### Software Component Types
- `R`: Application component
- Other types may indicate different component categories

## Error Handling

The tool may return errors in the following cases:

1. **Missing Package Name**: If `package_name` is not provided
   ```json
   {
     "isError": true,
     "content": [{
       "type": "text",
       "text": "Error: Package name is required"
     }]
   }
   ```

2. **Package Not Found**: If the specified package doesn't exist
   ```json
   {
     "isError": true,
     "content": [{
       "type": "text",
       "text": "Error: HTTP 404: Package not found"
     }]
   }
   ```

3. **Authorization Error**: If the user doesn't have permission to view the package
   ```json
   {
     "isError": true,
     "content": [{
       "type": "text",
       "text": "Error: HTTP 403: Forbidden"
     }]
   }
   ```

## Use Cases

### 1. Package Structure Analysis
Understand the organization and hierarchy of packages in your SAP system.

### 2. Dependency Management
Identify package dependencies through super/sub-package relationships and package interfaces.

### 3. Transport Planning
Analyze transport layer and software component information for change management.

### 4. Documentation Generation
Extract comprehensive package metadata for documentation purposes.

### 5. Package Governance
Review package attributes like encapsulation settings and responsible persons.

## Best Practices

1. **Hierarchy Navigation**: When exploring package hierarchies, start with the top-level package and recursively retrieve sub-packages.

2. **Caching**: Consider caching package information as it typically doesn't change frequently.

3. **Error Handling**: Always check for errors in the response before processing the data.

4. **Package Interfaces**: Pay attention to package interfaces when working with encapsulated packages - they define the public API of the package.

5. **Transport Layers**: Use transport layer information to understand the deployment path of package contents.

## Related Tools

- **SearchObject**: Find packages by name pattern
- **GetClass**: Retrieve classes within a package
- **GetProgram**: Retrieve programs within a package
- **GetTable**: Retrieve tables within a package

## Technical Notes

- The tool uses the ADT REST API endpoint `/sap/bc/adt/packages/{package_name}`
- Response is parsed from XML to JSON for easier consumption
- All timestamps are in ISO 8601 format (UTC)
- Package URIs can be used to construct links to other ADT endpoints