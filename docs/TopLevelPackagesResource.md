# Top-Level Packages Resource

The MCP ABAP ADT server provides a cacheable resource for discovering top-level ABAP packages in the system.

## Overview

This resource provides a filtered list of top-level packages (packages without a super package) that are suitable for exploration and development. It automatically excludes system packages, test packages, and empty packages to provide a clean, relevant list.

## Resource URI

```
abap://packages/top-level
```

This is a static URI (no variables) that returns a filtered list of packages.

## Filtering Rules

The resource automatically applies the following filters:

1. **Excludes System Packages**: Packages starting with `$` are filtered out
2. **Excludes Test Packages**: Packages starting with `TEST` are filtered out  
3. **Excludes Empty Packages**: Packages with 0 objects (counter = 0) are filtered out
4. **Top-Level Only**: Only packages without a super package are included

## Usage

### Discovering the Resource

Use `ListResources` to discover this resource:

```typescript
// MCP Protocol
ListResourcesRequest
```

**Response:**
```json
{
  "resources": [
    {
      "uri": "abap://packages/top-level",
      "name": "Top-Level ABAP Packages List",
      "description": "Retrieve a filtered list of top-level packages (no super package) excluding system packages (starting with $), test packages (starting with TEST), and empty packages. Useful for package discovery.",
      "mimeType": "application/json"
    }
  ]
}
```

### Accessing the Resource

```typescript
// MCP Protocol
ReadResourceRequest {
  uri: "abap://packages/top-level"
}
```

## Response Format

The resource returns a JSON object with the total count and an array of packages:

```json
{
  "totalCount": 150,
  "packages": [
    {
      "name": "APPL_FIN_ACCOUNTING",
      "description": "Financial Accounting Application",
      "objectCount": 1250,
      "uri": "/sap/bc/adt/packages/appl_fin_accounting"
    },
    {
      "name": "APPL_SD_SALES",
      "description": "Sales and Distribution",
      "objectCount": 890,
      "uri": "/sap/bc/adt/packages/appl_sd_sales"
    },
    {
      "name": "ECC_COMMON_OBJECTS",
      "description": "Common Objects",
      "objectCount": 3677,
      "uri": "/sap/bc/adt/packages/ecc_common_objects"
    }
  ]
}
```

### Response Fields

- **totalCount**: Total number of packages in the filtered list
- **packages**: Array of package objects, sorted alphabetically by name
  - **name**: Package name
  - **description**: Package description
  - **objectCount**: Number of objects in the package
  - **uri**: ADT URI for the package

## Use Cases

### 1. Package Discovery
Quickly discover relevant packages in the system for exploration.

### 2. Development Package Selection
Find suitable packages for development work, excluding system and test packages.

### 3. Package Hierarchy Navigation
Start exploring the package hierarchy from top-level packages.

### 4. System Overview
Get an overview of the main application areas in the system.

### 5. MCP Inspector Integration
Provide a clean list of packages for interactive exploration in MCP Inspector.

## Benefits

### 1. **Filtered Results**
- Automatically excludes irrelevant packages
- Focuses on development-relevant packages
- Reduces noise from system and test packages

### 2. **Cacheable**
- MCP clients can cache the package list
- Reduces repeated API calls
- Improves performance for package discovery

### 3. **Sorted Output**
- Packages are sorted alphabetically
- Easy to scan and find specific packages
- Consistent ordering

### 4. **Object Count**
- Shows how many objects each package contains
- Helps identify active vs. empty packages
- Useful for prioritizing exploration

## Examples

### Example 1: Get All Top-Level Packages

```typescript
ReadResourceRequest {
  uri: "abap://packages/top-level"
}
```

**Response:**
```json
{
  "totalCount": 150,
  "packages": [
    {
      "name": "APPL_FIN_ACCOUNTING",
      "description": "Financial Accounting Application",
      "objectCount": 1250,
      "uri": "/sap/bc/adt/packages/appl_fin_accounting"
    },
    ...
  ]
}
```

### Example 2: Using with Package Resource

After getting the list, you can explore individual packages:

```typescript
// Step 1: Get top-level packages
ReadResourceRequest {
  uri: "abap://packages/top-level"
}

// Step 2: Explore a specific package
ReadResourceRequest {
  uri: "abap://package/APPL_FIN_ACCOUNTING"
}
```

## Implementation Details

### Data Source
- Uses ADT Virtual Folders API: `/sap/bc/adt/repository/informationsystem/virtualfolders/contents`
- Retrieves all packages in the system
- Applies filtering logic server-side

### Filtering Logic
```typescript
// Exclude packages starting with $ or TEST
if (name.startsWith('$') || name.startsWith('TEST')) return false;

// Exclude empty packages
if (objectCount === 0) return false;
```

### Response Processing
- Parses XML response from ADT API
- Extracts relevant package attributes
- Filters based on rules
- Sorts alphabetically by name
- Returns compact JSON format

## Comparison with Other Resources

### Top-Level Packages Resource (`abap://packages/top-level`)
- **Purpose**: Package discovery
- **Returns**: List of filtered packages
- **Cacheable**: Yes
- **Use Case**: Finding packages to explore

### Package Resource (`abap://package/{name}`)
- **Purpose**: Detailed package information
- **Returns**: Single package with full metadata
- **Cacheable**: Yes
- **Use Case**: Understanding a specific package

### GetPackageContents Tool
- **Purpose**: Package contents retrieval
- **Returns**: Objects within a package
- **Cacheable**: No
- **Use Case**: Exploring package contents

## Best Practices

1. **Cache the List**
   - The package list changes infrequently
   - Cache it for the duration of your session
   - Refresh only when needed

2. **Use for Initial Discovery**
   - Start with this resource to find packages
   - Then use Package Resource for details
   - Finally use GetPackageContents for objects

3. **Filter Client-Side if Needed**
   - The list is already filtered server-side
   - Apply additional client-side filters if needed
   - For example, filter by objectCount or description

4. **Combine with Search**
   - Use this for browsing
   - Use SearchObject tool for specific searches
   - Complement each other for discovery

## Error Handling

If the API call fails, the resource will throw an error:

```json
{
  "error": {
    "code": -32000,
    "message": "Failed to retrieve top-level packages: ..."
  }
}
```

## Future Enhancements

Potential improvements:
- Add query parameters for custom filtering (e.g., `?minObjects=10`)
- Support for different package types
- Include sub-package counts
- Add responsible person information
- Support for pagination if list is very large

## See Also

- [Package Resource](./PackageResource.md) - Detailed package information
- [GetPackageContents Tool](./GetPackageContents.md) - Package contents retrieval
- [SearchObject Tool](./SearchObject.md) - Search for specific objects
- [MCP Resources Specification](https://spec.modelcontextprotocol.io/specification/server/resources/)