# Package Discovery Workflow

## Efficient Package Navigation

Use lightweight resources first, drill down to details only when needed.

## Workflow Steps

### 1. Get Lightweight Package Names

Start with the most efficient resource:

```
access_mcp_resource: uri=abap://packages/top-level/names
→ Returns: Package names only
→ Use for: Initial discovery, dropdown lists
```

### 2. Filter to Relevant Packages

Narrow down using query parameters:

```
access_mcp_resource: uri=abap://packages/top-level?prefix=FIN&fields=name,description&limit=20
→ Returns: Filtered packages with descriptions
→ Use for: Finding packages by prefix
```

### 3. Get Detailed Package Information

Once you've identified the target package:

```
access_mcp_resource: uri=abap://package/{package_name}
→ Returns: Complete package metadata, hierarchy, transport info
→ Use for: Understanding package structure
```

### 4. Explore Package Contents

Get objects within the package:

```
use_mcp_tool: GetPackageContents
  package_name: {package_name}
  include_subpackages: true
  recursive: false
→ Returns: List of objects in package
```

## Workflow Prompt

Use MCP prompt for guided discovery:

```
invoke_prompt: package-discovery-workflow
arguments: {
  search_term: "FIN"  # Optional
}
```

## Efficiency Tips

### Lightest to Heaviest
```
1. abap://packages/top-level/names           (lightest)
2. abap://packages/top-level?prefix=X         (light)
3. abap://package/{name}                      (medium)
4. GetPackageContents                         (heavy)
```

### Query Parameters for Filtering
```
# Prefix filter
abap://packages/top-level?prefix=FIN

# Limit results
abap://packages/top-level?prefix=FIN&limit=20

# Specific fields only
abap://packages/top-level?prefix=FIN&fields=name,description

# Combine filters
abap://packages/top-level?prefix=BC&limit=10&fields=name
```

## Common Use Cases

### Find Packages by Prefix
```
access_mcp_resource: uri=abap://packages/top-level?prefix=S4&limit=50
```

### Get Package Hierarchy
```
access_mcp_resource: uri=abap://package/FINANCIAL_BASIS
→ Returns: superpackage, subpackages, interfaces
```

### List All Package Objects
```
use_mcp_tool: GetPackageContents
  package_name: FINANCIAL_BASIS
  include_subpackages: true
  recursive: true
```

### Search Across Packages
```
use_mcp_tool: SearchObject
  query: "Z*INVOICE*"
  maxResults: 100
→ Returns: Objects matching pattern across all packages
```

## Package Resource URIs

### Top-Level Packages
```
# Complete list
abap://packages/top-level

# Names only (most efficient)
abap://packages/top-level/names

# Filtered
abap://packages/top-level?prefix={prefix}
abap://packages/top-level?fields=name,description
abap://packages/top-level?limit={count}
```

### Individual Package
```
abap://package/{package_name}
```

## Package Metadata

When accessing `abap://package/{name}`, you get:

- Package name and description
- Package type (development, structure, main)
- Superpackage (parent)
- Subpackages (children)
- Application component
- Transport layer
- Package interfaces
- Responsible person

## Integration with Other Workflows

### After Package Discovery
```
1. Discover package → abap://packages/top-level/names
2. Get details → abap://package/{name}
3. Explore contents → GetPackageContents
4. Analyze specific objects:
   → abap://class/{name}
   → abap://cds/{name}
   → rap-bo-analysis:///{name}
```

### RAP Business Object Discovery
```
1. Find RAP packages → SearchObject with query="*_M"
2. Get package contents → GetPackageContents
3. Analyze RAP BO → rap-bo-analysis:///{bo_name}
```

## Related Documentation

- [../Resources.md](../Resources.md) - Complete resource catalog
- [../PackageResource.md](../PackageResource.md) - Package resource details
- [../TopLevelPackagesResource.md](../TopLevelPackagesResource.md) - Top-level packages
- [../GetPackage.md](../GetPackage.md) - GetPackage tool
- [../GetPackageContents.md](../GetPackageContents.md) - GetPackageContents tool
- [../SearchObject.md](../SearchObject.md) - Object search tool
