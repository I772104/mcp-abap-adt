# GetObjectUsages Tool

## Overview

The `GetObjectUsages` tool provides comprehensive where-used list functionality for ABAP objects. It replaces the deprecated `GetClassUsages` tool and supports multiple object types with advanced filtering capabilities.

## Features

- **Multi-Object Type Support**: Classes, interfaces, programs, function groups, type groups, CDS views, behavior definitions, tables, and structures
- **Flexible Search Scope**: Filter which object types to search in
- **Usage Grades**: Control whether to include definitions, elements, and indirect references
- **Local/Global Search**: Option to limit search to local package only
- **Detailed Results**: Returns URIs, usage information, and object metadata

## Tool Definition

```typescript
{
  name: 'GetObjectUsages',
  description: 'Retrieve comprehensive where-used list for ABAP objects',
  inputSchema: {
    object_name: string,           // Required: Name of the ABAP object
    object_type: string,            // Optional: Type of object (default: 'class')
    include_object_types: string[], // Optional: Types to search in
    include_definitions: boolean,   // Optional: Include definition usages (default: true)
    include_elements: boolean,      // Optional: Include element usages (default: true)
    include_indirect: boolean,      // Optional: Include indirect references (default: true)
    local_usage_only: boolean,      // Optional: Local package only (default: false)
    max_results: number,            // Optional: Maximum results to return (default: 500, max: 500)
    summary_only: boolean,          // Optional: Return summary instead of full list (default: false)
    include_metadata: boolean,      // Optional: Include full metadata (default: true)
    group_by: string                // Optional: Group by 'none', 'package', or 'type' (default: 'none')
  }
}
```

## Parameters

### object_name (required)
- **Type**: `string`
- **Description**: Name of the ABAP object to search for
- **Example**: `"CL_MY_CLASS"`, `"I_SALESORDER"`, `"Z_MY_PROGRAM"`

### object_type (optional)
- **Type**: `string`
- **Default**: `"class"`
- **Valid Values**:
  - `"class"` - ABAP Classes (CLAS/OC)
  - `"interface"` - ABAP Interfaces (INTF/OI)
  - `"program"` - ABAP Programs (PROG/1P)
  - `"function_group"` - Function Groups (FUGR/FF)
  - `"type_group"` - Type Groups (PROG/1T)
  - `"cds"` - CDS Views (DDLS/DF)
  - `"behavior"` - Behavior Definitions (BDEF/BDO)
  - `"table"` - Database Tables (TABL/DS)
  - `"structure"` - DDIC Structures (TTYP/DA)

### include_object_types (optional)
- **Type**: `string[]`
- **Default**: `["class", "interface", "program", "function_group", "type_group"]`
- **Description**: Specifies which object types to search within
- **Example**: `["class", "interface"]` - Only search in classes and interfaces

### include_definitions (optional)
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Include usages where the object is used in definitions (e.g., inheritance, implementation)

### include_elements (optional)
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Include usages of specific elements (methods, attributes, etc.)

### include_indirect (optional)
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Include indirect references (e.g., through inheritance chains)

### local_usage_only (optional)
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Limit search to objects in the same package

### max_results (optional)
- **Type**: `number`
- **Default**: `500`
- **Valid Range**: `1-500`
- **Description**: Maximum number of results to return. Prevents timeouts with large result sets.

### summary_only (optional)
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Return aggregated summary instead of full usage list. Includes:
  - Total usage count
  - Breakdown by object type
  - Top 10 packages
  - Sample of 10 usages
- **Use Case**: Quick overview of widely-used objects without overwhelming detail

### include_metadata (optional)
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Include full metadata (URIs, responsible, package) in results. Set to `false` for minimal response with just object name and type.

### group_by (optional)
- **Type**: `string`
- **Default**: `"none"`
- **Valid Values**: `"none"`, `"package"`, `"type"`
- **Description**: Group results by package or object type for aggregated view

## Response Formats

### Standard Mode (default)

Returns streamlined usage information with essential fields only.

```json
{
  "object": {
    "name": "CL_MY_CLASS",
    "type": "CLAS/OC",
    "uri": "/sap/bc/adt/oo/classes/cl_my_class"
  },
  "searchCriteria": {
    "includeDefinitions": true,
    "includeElements": true,
    "includeIndirect": true,
    "localUsageOnly": false,
    "searchInTypes": ["CLAS/OC", "INTF/OI", "PROG/1P", "PROG/1F", "PROG/1T", "FUGR/FF"],
    "maxResults": 500
  },
  "results": {
    "totalResults": 1247,
    "returnedResults": 500,
    "wasTruncated": true,
    "description": "[ER1] Where-Used List: CL_MY_CLASS (Class)",
    "usages": [
      {
        "name": "CL_CONSUMER_CLASS",
        "type": "CLAS/OC",
        "package": "Z_MY_PACKAGE",
        "responsible": "DEVELOPER"
      }
    ]
  }
}
```

**Note**: The response uses a streamlined format with only essential fields (name, type, package, responsible) for ~60% token reduction compared to the full ADT response format.

### Summary Mode (summary_only: true)

```json
{
  "object": {
    "name": "CL_ABAP_TYPEDESCR",
    "type": "CLAS/OC",
    "uri": "/sap/bc/adt/oo/classes/cl_abap_typedescr"
  },
  "searchCriteria": {
    "includeDefinitions": true,
    "includeElements": true,
    "includeIndirect": true,
    "localUsageOnly": false,
    "searchInTypes": ["CLAS/OC", "INTF/OI", "PROG/1P"],
    "maxResults": 500
  },
  "summary": {
    "totalUsages": 1247,
    "returnedUsages": 1247,
    "byObjectType": {
      "CLAS/OC": 856,
      "INTF/OI": 234,
      "PROG/1P": 157
    },
    "topPackages": [
      {"package": "SABAP", "count": 423},
      {"package": "SUNI", "count": 178},
      {"package": "SLIN", "count": 145}
    ],
    "sampleUsages": [
      /* First 10 usages */
    ]
  }
}
```

### Grouped Mode (group_by: "package")

```json
{
  "object": {
    "name": "CL_MY_CLASS",
    "type": "CLAS/OC",
    "uri": "/sap/bc/adt/oo/classes/cl_my_class"
  },
  "searchCriteria": {
    "includeDefinitions": true,
    "includeElements": true,
    "includeIndirect": true,
    "localUsageOnly": false,
    "searchInTypes": ["CLAS/OC"],
    "maxResults": 500,
    "groupBy": "package"
  },
  "results": {
    "totalResults": 150,
    "returnedResults": 150,
    "wasTruncated": false,
    "description": "[ER1] Where-Used List: CL_MY_CLASS (Class)",
    "groupedUsages": [
      {
        "package": "Z_PACKAGE_A",
        "count": 45,
        "usages": [/* usage objects */]
      },
      {
        "package": "Z_PACKAGE_B",
        "count": 32,
        "usages": [/* usage objects */]
      }
    ]
  }
}
```

### Minimal Metadata Mode (include_metadata: false)

Returns only object name and type for maximum performance and minimal token usage.

```json
{
  "object": {
    "name": "CL_MY_CLASS",
    "type": "CLAS/OC",
    "uri": "/sap/bc/adt/oo/classes/cl_my_class"
  },
  "searchCriteria": {
    "includeDefinitions": true,
    "includeElements": true,
    "includeIndirect": true,
    "localUsageOnly": false,
    "searchInTypes": ["CLAS/OC", "INTF/OI", "PROG/1P", "PROG/1F", "PROG/1T", "FUGR/FF"],
    "maxResults": 500
  },
  "results": {
    "totalResults": 150,
    "returnedResults": 150,
    "wasTruncated": false,
    "description": "[ER1] Where-Used List: CL_MY_CLASS (Class)",
    "usages": [
      {
        "name": "CL_CONSUMER_CLASS",
        "type": "CLAS/OC"
      }
    ]
  }
}
```

**Note**: When `include_metadata: false`, the `package` and `responsible` fields are omitted from usage objects, providing the most compact response format.

## Usage Examples

### Example 1: Basic Class Usage Search

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "CL_MY_CLASS"
}
```

**Result**: Searches for all usages of `CL_MY_CLASS` in default object types, returns up to 500 results.

### Example 1b: Large Class with Result Limiting

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "CL_ABAP_TYPEDESCR",
  max_results: 100
}
```

**Result**: Returns first 100 usages, prevents timeout on widely-used SAP standard classes.

### Example 2: Interface Usage in Classes Only

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "IF_MY_INTERFACE",
  object_type: "interface",
  include_object_types: ["class"]
}
```

**Result**: Finds all classes that implement or use `IF_MY_INTERFACE`.

### Example 3: CDS View Usage with Limited Scope

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "I_SALESORDER",
  object_type: "cds",
  include_object_types: ["cds", "behavior"],
  include_indirect: false
}
```

**Result**: Finds direct usages of the CDS view in other CDS views and behavior definitions.

### Example 4: Local Package Search

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "ZCL_LOCAL_UTILITY",
  local_usage_only: true
}
```

**Result**: Finds usages only within the same package as `ZCL_LOCAL_UTILITY`.

### Example 5: Definition-Only Search

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "CL_BASE_CLASS",
  include_elements: false,
  include_indirect: false
}
```

**Result**: Finds only direct definition usages (e.g., inheritance, implementation) without element-level or indirect references.

### Example 6: Summary Mode for Quick Overview

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "CL_ABAP_TYPEDESCR",
  summary_only: true
}
```

**Result**: Returns aggregated summary with counts by type, top packages, and sample usages. Ideal for widely-used objects.

### Example 7: Grouped by Package

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "IF_MY_INTERFACE",
  object_type: "interface",
  group_by: "package",
  max_results: 200
}
```

**Result**: Returns usages grouped by package, showing which packages use the interface most.

### Example 8: Minimal Response for Performance

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "CL_UTILITY",
  include_metadata: false,
  max_results: 50
}
```

**Result**: Returns only object names and types, minimal token usage, fastest response.

### Example 9: Productive System Class (Optimized)

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "CL_ABAP_OBJECTDESCR",
  max_results: 50,
  summary_only: true,
  include_object_types: ["class"]
}
```

**Result**: Optimized for SAP standard classes - limited results, summary mode, focused search scope.

## Use Cases

### 1. Impact Analysis
**Scenario**: Before modifying a class, determine what will be affected.

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "CL_CRITICAL_CLASS",
  include_indirect: true
}
```

### 2. Refactoring Safety
**Scenario**: Check if a method or class can be safely deleted.

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "CL_DEPRECATED_CLASS",
  include_elements: true
}
```

### 3. Dependency Mapping
**Scenario**: Understand the dependency graph of a RAP Business Object.

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "I_SALESORDER",
  object_type: "cds",
  include_object_types: ["cds", "behavior", "class"]
}
```

### 4. Architecture Analysis
**Scenario**: Find all implementations of an interface.

```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "IF_PLUGIN",
  object_type: "interface",
  include_object_types: ["class"],
  include_definitions: true,
  include_elements: false
}
```


## Performance Considerations

### Response Size Management

1. **Result Limiting**: Use `max_results` to prevent timeouts
   - Default: 500 results
   - For SAP standard classes: Use 50-100
   - For custom classes: 500 is usually safe

2. **Summary Mode**: Use `summary_only: true` for quick overviews
   - Reduces response from ~50K to ~5K tokens
   - Ideal for widely-used objects
   - Provides aggregated insights

3. **Metadata Stripping**: Use `include_metadata: false` for minimal responses
   - Reduces token usage by ~60%
   - Returns only object name and type
   - Fastest response time

### Search Optimization

4. **Search Scope**: Limiting `include_object_types` improves performance
   - Fewer object types = faster search
   - Example: `["class"]` instead of default 6 types

5. **Local Search**: Using `local_usage_only: true` is faster for large systems
   - Limits search to same package
   - Significantly faster on large systems

6. **Indirect References**: Setting `include_indirect: false` reduces search time
   - Skips inheritance chain analysis
   - Faster for direct usage checks

### Token Usage Comparison

| Scenario | Standard | With Limits | Summary | Minimal | Savings |
|----------|----------|-------------|---------|---------|---------|
| Small (10 usages) | ~2K | ~2K | ~1K | ~500 | 0-75% |
| Medium (100 usages) | ~20K | ~20K | ~3K | ~2K | 0-90% |
| Large (1000 usages) | ~200K | ~20K | ~5K | ~3K | 90-98% |
| SAP Standard (5000+) | TIMEOUT | ~20K | ~8K | ~5K | 90-97% |

### Recommended Settings by Use Case

**Quick Check** (Is this used?):
```typescript
{
  max_results: 10,
  include_metadata: false
}
```

**Impact Analysis** (What will break?):
```typescript
{
  max_results: 200,
  group_by: "package"
}
```

**SAP Standard Class** (Widely used):
```typescript
{
  max_results: 50,
  summary_only: true,
  include_object_types: ["class"]
}
```

**Complete Analysis** (Full details):
```typescript
{
  max_results: 500,
  include_metadata: true
}
```

## Comparison with GetClassUsages (Deprecated)

| Feature | GetClassUsages | GetObjectUsages |
|---------|----------------|-----------------|
| Object Types | Classes only | 9+ object types |
| Search Filtering | None | Customizable |
| Usage Grades | Fixed | Configurable |
| Local Search | No | Yes |
| Result Detail | Basic | Comprehensive |
| Status | Deprecated | Active |

## Migration from GetClassUsages

**Old Code**:
```typescript
use_mcp_tool: GetClassUsages
arguments: {
  class_name: "CL_MY_CLASS"
}
```

**New Code**:
```typescript
use_mcp_tool: GetObjectUsages
arguments: {
  object_name: "CL_MY_CLASS",
  object_type: "class"
}
```

## Error Handling

### Common Errors

1. **Object Not Found**
   ```
   Error: Failed to retrieve usage scope payload
   ```
   **Solution**: Verify the object name and type are correct

2. **Invalid Object Type**
   ```
   Error: Unknown object type
   ```
   **Solution**: Use one of the supported object types

3. **Timeout**
   ```
   Error: Request timeout
   ```
   **Solution**: Reduce search scope or use `local_usage_only: true`

## Best Practices

### General Guidelines

1. **Start Narrow**: Begin with limited `include_object_types` and expand if needed
2. **Use Local Search**: For development objects, use `local_usage_only: true`
3. **Disable Indirect**: For quick checks, set `include_indirect: false`
4. **Check Elements**: Always include elements when analyzing method usage
5. **Combine with Other Tools**: Use with `GetClass`, `GetInterface` for complete analysis

### Timeout Prevention

6. **Always Set max_results**: Especially for productive system classes
   - Custom classes (Z/Y): 500 is safe
   - SAP standard classes: Use 50-100
   - Unknown objects: Start with 100

7. **Use Summary Mode**: For initial exploration of widely-used objects
   - Get overview first with `summary_only: true`
   - Then drill down with targeted searches

8. **Progressive Refinement**: Start broad, then narrow
   ```typescript
   // Step 1: Get summary
   { object_name: "CL_ABAP_TYPEDESCR", summary_only: true }
   
   // Step 2: Focus on specific package
   { object_name: "CL_ABAP_TYPEDESCR", local_usage_only: true, max_results: 100 }
   
   // Step 3: Get details for specific type
   { object_name: "CL_ABAP_TYPEDESCR", include_object_types: ["class"], max_results: 200 }
   ```

### Token Optimization

9. **Strip Metadata**: Use `include_metadata: false` when you only need object names
10. **Group Results**: Use `group_by` for aggregated views instead of individual usages
11. **Limit Scope**: Reduce `include_object_types` to only what you need

### Error Recovery

12. **Handle Truncation**: Check `wasTruncated` flag in response
    ```typescript
    if (response.results.wasTruncated) {
      // Results were limited, consider:
      // - Using summary_only for overview
      // - Narrowing search scope
      // - Using group_by for aggregation
    }
    ```

13. **Timeout Handling**: If timeout occurs:
    - Reduce `max_results` to 50
    - Enable `summary_only: true`
    - Limit `include_object_types`
    - Use `local_usage_only: true`

## Technical Details

### API Flow

1. **Step 1**: Request usage scope from ADT
   - Endpoint: `/sap/bc/adt/repository/informationsystem/usageReferences/scope`
   - Returns: Base64-encoded payload for Step 2

2. **Step 2**: Request usage references with scope payload
   - Endpoint: `/sap/bc/adt/repository/informationsystem/usageReferences`
   - Returns: Complete usage list with metadata

### Object Type Mapping

Internal mapping from friendly names to ADT types:

```typescript
{
  'class': 'CLAS/OC',
  'interface': 'INTF/OI',
  'program': 'PROG/1P',
  'function_group': 'FUGR/FF',
  'type_group': 'PROG/1T',
  'cds': 'DDLS/DF',
  'behavior': 'BDEF/BDO',
  'table': 'TABL/DS',
  'structure': 'TTYP/DA'
}
```

## Related Tools

- **GetClass**: Retrieve class source code
- **GetInterface**: Retrieve interface source code
- **GetCDSView**: Retrieve CDS view definition
- **GetBehaviorDefinition**: Retrieve behavior definition
- **SearchObject**: Search for objects by name pattern

## See Also

- [GetClassUsages (Deprecated)](./GetClassUsages.md)
- [SearchObject](./SearchObject.md)
- [Package Discovery Workflow](../AGENTS.md#package-discovery-workflow)