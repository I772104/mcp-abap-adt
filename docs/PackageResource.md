# Package Resource

The MCP ABAP ADT server provides cacheable resources for accessing ABAP package information via URI scheme, with support for both resource templates and parameterized queries.

## Overview

Resources in MCP provide a way to access data that can be cached by the client, reducing the need for repeated API calls. The package resource provides the same comprehensive package information as the `GetPackage` tool, but in a cacheable format.

## Resource Templates vs Resources

### Resource Templates
**Resource templates** define URI patterns with placeholders that describe available resources:
- Used by MCP Inspector and other clients for discovery
- Contains placeholders like `{package_name}`
- Returned by `ListResourceTemplates` request
- **This is what we implement** since our URIs contain variables

### Resources (Not Used)
**Static resources** would be actual data endpoints with concrete, fixed URIs:
- Would return specific package data without variables
- Would use specific package names in the URI itself
- We don't use static resources since package names are dynamic
- All package access is done via resource templates

**Note:** Since our package URIs contain the variable `{package_name}`, we only expose them as resource templates. The `ListResources` request returns an empty array, and clients should use `ListResourceTemplates` for discovery.

## Resource URI Scheme

```
abap://package/{package_name}
```

### URI Components

- **Base Pattern**: `abap://package/{package_name}`
- **Placeholder**: `{package_name}` - The name of the ABAP package (required)

**Note:** The GetPackage resource returns comprehensive package information including sub-packages in the hierarchy. If you need to retrieve the contents of packages with filtering options, use the `GetPackageContents` tool instead.

## Usage

### 1. Discovering Available Resource Templates

Use `ListResourceTemplates` to discover available resource patterns:

```typescript
// MCP Protocol
ListResourceTemplatesRequest
```

**Response:**
```json
{
  "resourceTemplates": [
    {
      "uriTemplate": "abap://package/{package_name}",
      "name": "ABAP Package Information",
      "description": "Retrieve comprehensive ABAP package information including metadata, attributes, hierarchy (super/sub-packages), transport details, application component, and package interfaces. The package_name parameter is required in the URI path.",
      "mimeType": "application/json"
    }
  ]
}
```

**Note:** `ListResources` returns an empty array since all our resources use variables and are only available as templates.

### 2. Accessing a Package Resource

To access a specific package:

```typescript
// MCP Protocol
ReadResourceRequest {
  uri: "abap://package/QM"
}
```

**Response:**
```json
{
  "contents": [
    {
      "uri": "abap://package/QM",
      "mimeType": "application/json",
      "text": "{...package information...}"
    }
  ]
}
```

### 3. Package Information Includes Sub-Packages

The package resource automatically includes sub-package information in the hierarchy:

```typescript
ReadResourceRequest {
  uri: "abap://package/QM"
}
```

The response will include:
- Package metadata and attributes
- Super package (parent) information
- Sub-packages list
- Transport details
- Application component
- Package interfaces

**Note:** If you need to retrieve the actual contents (objects) within packages with filtering options like `include_subpackages` or `recursive`, use the `GetPackageContents` tool instead.

## Package Information Structure

The resource returns comprehensive package information:

```json
{
  "name": "QM",
  "description": "QM inspection specifications",
  "type": "DEVC/K",
  "responsible": "APFELBACH",
  "createdBy": "SAP",
  "createdAt": "1972-03-31T23:00:00Z",
  "changedBy": "COLLE",
  "changedAt": "2024-11-11T23:00:00Z",
  "masterLanguage": "EN",
  "masterSystem": "ER1",
  "version": "active",
  "attributes": {
    "packageType": "development",
    "isEncapsulated": "false",
    "recordChanges": "true",
    "languageVersion": "",
    "isAddingObjectsAllowed": "false"
  },
  "superPackage": {
    "name": "APPL_QM_PLANNING",
    "description": "QM Planning",
    "type": "DEVC/K",
    "uri": "/sap/bc/adt/packages/appl_qm_planning"
  },
  "subPackages": [
    {
      "name": "SUBPKG1",
      "description": "Sub Package 1",
      "type": "DEVC/K",
      "uri": "/sap/bc/adt/packages/subpkg1"
    }
  ],
  "applicationComponent": {
    "name": "QM-PT-IP",
    "description": "Inspection Planning"
  },
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
  },
  "translation": {
    "relevance": "NOT_CLASSIFIED",
    "relevanceDescription": "Not classified"
  },
  "packageInterfaces": []
}
```

## Benefits of Using Resources

### 1. **Caching**
- MCP clients can cache resource responses
- Reduces repeated API calls for the same package
- Improves performance for frequently accessed packages

### 2. **Standardized Access**
- Uses standard MCP resource protocol
- Consistent with other MCP servers
- Better integration with MCP clients and Inspector

### 3. **URI-Based Access**
- Simple, predictable URI scheme
- Easy to construct URIs programmatically
- Supports URL encoding for special characters


## Comparison: Resource vs Tool

### Package Resource (`abap://package/{name}`)
- **Cacheable**: Yes, clients can cache responses
- **Access Pattern**: URI-based with query parameters
- **Use Case**: Repeated access to package metadata
- **Performance**: Better for multiple accesses (cached)
- **Discovery**: Supports resource templates for MCP Inspector

### GetPackage Tool
- **Cacheable**: No, fresh data on each call
- **Access Pattern**: Tool call with parameters
- **Use Case**: One-time package information retrieval
- **Performance**: Better for single access
- **Discovery**: Listed in tool catalog

## Examples

### Example 1: Access Local Package

```typescript
ReadResourceRequest {
  uri: "abap://package/$TMP"
}
```

### Example 2: Access Standard Package

```typescript
ReadResourceRequest {
  uri: "abap://package/QM"
}
```

### Example 3: Access Custom Package

```typescript
ReadResourceRequest {
  uri: "abap://package/ZTEST_PACKAGE"
}
```

### Example 4: URL Encoding for Special Characters

If a package name contains special characters, use URL encoding:

```typescript
ReadResourceRequest {
  uri: "abap://package/Z%2FTEST"  // For package "Z/TEST"
}
```


## Error Handling

If a package doesn't exist or cannot be accessed, the resource will throw an error:

```json
{
  "error": {
    "code": -32000,
    "message": "Failed to retrieve package NONEXISTENT: Package not found"
  }
}
```

## Use Cases

### 1. Package Hierarchy Exploration
Cache parent package information while exploring sub-packages.

### 2. Package Metadata Dashboard
Build a dashboard showing multiple packages without repeated API calls.

### 3. Package Dependency Analysis
Cache package information while analyzing dependencies across multiple packages.

### 4. Development Environment Setup
Cache package structures for IDE integrations and development tools.

### 5. MCP Inspector Integration
Use resource templates for interactive exploration in MCP Inspector.

## Implementation Details

### Resource Handler
- Located in: `src/handlers/resources/index.ts`
- Uses existing `handleGetPackage` handler internally
- Provides URI parsing and response formatting
- Supports query parameter parsing

### URI Pattern Matching
```typescript
const packageMatch = uri.match(/^abap:\/\/package\/(.+)$/);
```

### Response Format
```typescript
{
  contents: [
    {
      uri: string,           // Original URI
      mimeType: 'application/json',
      text: string          // JSON-stringified package info
    }
  ]
}
```

## Best Practices

1. **Use Resource Templates for Discovery**
   - Let MCP Inspector discover available resources
   - Provides better user experience

2. **Use Resources for Repeated Access**
   - If you need package info multiple times, use the resource
   - Let the MCP client handle caching

3. **Use Tools for One-Time Access**
   - If you only need package info once, use the `GetPackage` tool
   - Simpler parameter passing

4. **URL Encode Package Names**
   - Always URL encode package names in URIs
   - Handles special characters correctly

5. **Cache Invalidation**
   - Be aware that cached data may become stale
   - Refresh cache when package metadata changes

## Future Enhancements

Potential future resource types:
- `abap://class/{class_name}` - Cacheable class source code
- `abap://table/{table_name}` - Cacheable table structure
- `abap://package/{package_name}/contents` - Cacheable package contents
- `abap://function/{function_group}/{function_name}` - Cacheable function module

## See Also

- [GetPackage Tool](./GetPackage.md) - Non-cacheable package information tool
- [GetPackageContents Tool](./GetPackageContents.md) - Package contents retrieval
- [MCP Resources Specification](https://spec.modelcontextprotocol.io/specification/server/resources/)
- [MCP Resource Templates](https://spec.modelcontextprotocol.io/specification/server/resources/#resource-templates)