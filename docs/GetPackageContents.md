# GetPackageContents Tool Documentation

## Overview

The `GetPackageContents` tool retrieves all objects and contents within an ABAP package from the SAP system via the ADT (ABAP Development Tools) API. It provides a flat list of development objects (classes, programs, function groups, etc.) contained in the package, with optional support for including sub-packages and recursive exploration.

## Endpoint

```
POST /sap/bc/adt/repository/nodestructure
```

## Input Parameters

| Parameter             | Type      | Required  | Default   | Description                                           |
|-----------------------|-----------|-----------|-----------|-------------------------------------------------------|
| `package_name`        | string    | Yes       | -         | Name of the ABAP package to retrieve contents from    |
| `include_subpackages` | boolean   | No        | true      | Include sub-packages in the results                   |
| `recursive`           | boolean   | No        | false     | Recursively retrieve contents of sub-packages         |

## Response Structure

### Basic Response (Non-Recursive)

```json
{
  "package": "CMD_PM_HPC",
  "objectCount": 15,
  "objects": [
    {
      "type": "CLAS/OC",
      "name": "CL_SOME_CLASS",
      "description": "Some Class Description",
      "uri": "/sap/bc/adt/oo/classes/cl_some_class"
    },
    {
      "type": "PROG/P",
      "name": "ZSOME_PROGRAM",
      "description": "Some Program",
      "uri": "/sap/bc/adt/programs/programs/zsome_program"
    }
  ],
  "subPackages": [
    {
      "type": "DEVC/K",
      "name": "APPL_MD_HPC",
      "description": "Central Master Data: Classification-Based Product Hierarchy",
      "uri": "/sap/bc/adt/packages/appl_md_hpc"
    }
  ],
  "subPackageCount": 3
}
```

### Recursive Response

When `recursive: true` is set, the response includes a `subPackageContents` array with the full contents of each sub-package:

```json
{
  "package": "CMD_PM_HPC",
  "objectCount": 15,
  "objects": [...],
  "subPackages": [...],
  "subPackageCount": 3,
  "subPackageContents": [
    {
      "package": "APPL_MD_HPC",
      "objectCount": 8,
      "objects": [...],
      "subPackages": [...],
      "subPackageCount": 0
    }
  ]
}
```

## Common Object Types

| Type      | Description           |
|-----------|-----------------------|
| `CLAS/OC` | ABAP Class            |
| `INTF/OI` | ABAP Interface        |
| `PROG/P`  | ABAP Program          |
| `FUGR/F`  | Function Group        |
| `TABL/DT` | Database Table        |
| `DTEL/DE` | Data Element          |
| `DOMA/DD` | Domain                |
| `TTYP/TT` | Table Type            |
| `DDLS/DL` | CDS View              |
| `DEVC/K`  | Package (Sub-package) |
| `PINF/KI` | Package Interface     |

## Usage Examples

### Example 1: Basic Package Contents

Get all objects in a package without sub-package contents:

```typescript
const result = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetPackageContents",
  arguments: {
    package_name: "CMD_PM_HPC"
  }
});
```

**Response:**
```json
{
  "package": "CMD_PM_HPC",
  "objectCount": 15,
  "objects": [
    {
      "type": "CLAS/OC",
      "name": "CL_HPC_MANAGER",
      "description": "Product Hierarchy Manager",
      "uri": "/sap/bc/adt/oo/classes/cl_hpc_manager"
    }
  ],
  "subPackages": [
    {
      "type": "DEVC/K",
      "name": "APPL_MD_HPC",
      "description": "Central Master Data",
      "uri": "/sap/bc/adt/packages/appl_md_hpc"
    }
  ],
  "subPackageCount": 3
}
```

### Example 2: Exclude Sub-Packages

Get only the direct objects, excluding sub-packages from the list:

```typescript
const result = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetPackageContents",
  arguments: {
    package_name: "CMD_PM_HPC",
    include_subpackages: false
  }
});
```

**Response:**
```json
{
  "package": "CMD_PM_HPC",
  "objectCount": 15,
  "objects": [...]
}
```

### Example 3: Recursive Package Exploration

Get all objects including contents of all sub-packages recursively:

```typescript
const result = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetPackageContents",
  arguments: {
    package_name: "CMD_PM_HPC",
    recursive: true
  }
});
```

**Response:**
```json
{
  "package": "CMD_PM_HPC",
  "objectCount": 15,
  "objects": [...],
  "subPackages": [...],
  "subPackageCount": 3,
  "subPackageContents": [
    {
      "package": "APPL_MD_HPC",
      "objectCount": 8,
      "objects": [...],
      "subPackages": [],
      "subPackageCount": 0
    },
    {
      "package": "ODATA_CMD_HPC",
      "objectCount": 12,
      "objects": [...],
      "subPackages": [],
      "subPackageCount": 0
    }
  ]
}
```

## Response Fields

### Root Level

| Field                 | Type      | Description                                                   |
|-----------------------|-----------|---------------------------------------------------------------|
| `package`             | string    | Name of the package                                           |
| `objectCount`         | number    | Number of objects (excluding sub-packages)                    |
| `objects`             | array     | Array of object details                                       |
| `subPackages`         | array     | Array of sub-package details (if `include_subpackages: true`) |
| `subPackageCount`     | number    | Number of sub-packages (if `include_subpackages: true`)       |
| `subPackageContents`  | array     | Recursive contents of sub-packages (if `recursive: true`)     |

### Object Details

| Field         | Type      | Description                           |
|---------------|-----------|---------------------------------------|
| `type`        | string    | Object type (e.g., CLAS/OC, PROG/P)   |
| `name`        | string    | Object name                           |
| `description` | string    | Object description                    |
| `uri`         | string    | ADT URI for accessing the object      |

## Error Handling

The tool may return errors in the following cases:

1. **Missing Package Name**
   ```json
   {
     "isError": true,
     "content": [{
       "type": "text",
       "text": "Error: Package name is required"
     }]
   }
   ```

2. **Package Not Found**
   ```json
   {
     "isError": true,
     "content": [{
       "type": "text",
       "text": "Error: HTTP 404: Package not found"
     }]
   }
   ```

3. **Authorization Error**
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

### 1. Package Inventory
Get a complete inventory of all development objects in a package for documentation or analysis purposes.

### 2. Dependency Analysis
Identify all objects that need to be considered when making changes to a package.

### 3. Package Migration
List all objects that need to be transported or migrated when moving a package between systems.

### 4. Code Review Preparation
Get a list of all objects in a package to prepare for code reviews or quality checks.

### 5. Package Structure Analysis
Understand the organization and distribution of objects across a package hierarchy.

### 6. Automated Testing
Identify all classes in a package that need to have unit tests run.

## Best Practices

1. **Start Non-Recursive**: For large package hierarchies, start with `recursive: false` to get an overview before diving deeper.

2. **Performance Consideration**: Recursive mode can be slow for packages with many sub-packages. Use it judiciously.

3. **Filter by Type**: After retrieving contents, filter the `objects` array by `type` to focus on specific object types (e.g., only classes).

4. **Use URIs**: The returned URIs can be used with other tools (like `GetClass`, `GetProgram`) to retrieve detailed information about specific objects.

5. **Combine with GetPackage**: Use `GetPackage` for metadata and `GetPackageContents` for the object list to get a complete picture.

## Performance Notes

- **Non-recursive mode**: Fast, single API call
- **Recursive mode**: Makes one API call per sub-package level, can be slow for deep hierarchies
- **Large packages**: Packages with hundreds of objects may take a few seconds to retrieve

## Comparison with GetPackage

| Feature | GetPackage | GetPackageContents |
|---------|------------|-------------------|
| Package metadata | ✅ Yes | ❌ No |
| Package attributes | ✅ Yes | ❌ No |
| Transport info | ✅ Yes | ❌ No |
| Object list | ❌ No | ✅ Yes |
| Object details | ❌ No | ✅ Yes (type, name, description, URI) |
| Recursive exploration | ❌ No | ✅ Yes (optional) |
| Sub-package list | ✅ Yes (basic) | ✅ Yes (with details) |

**Recommendation**: Use both tools together for comprehensive package analysis:
1. `GetPackage` for metadata, attributes, and transport information
2. `GetPackageContents` for the complete list of objects

## Related Tools

- **GetPackage**: Retrieve package metadata and attributes
- **GetClass**: Retrieve source code of a specific class
- **GetProgram**: Retrieve source code of a specific program
- **SearchObject**: Search for objects across the system
- **GetTable**: Retrieve table structure

## Technical Notes

- Uses the ADT REST API endpoint `/sap/bc/adt/repository/nodestructure`
- Response is parsed from XML to JSON for easier consumption
- Sub-packages are identified by object type `DEVC/K`
- Package interfaces are identified by object type `PINF/KI`
- Recursive mode uses the same handler recursively for sub-packages
- Failed sub-package retrievals in recursive mode are logged but don't stop the overall process