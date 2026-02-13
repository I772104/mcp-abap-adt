# Top-Level Packages Resource Templates

The MCP ABAP ADT server provides flexible resource templates for accessing top-level ABAP packages with customizable output.

## Overview

Three resource templates are available for different use cases:

1. **Full List** (Static Resource): Complete package information
2. **Names Only** (Template): Lightweight list of package names
3. **Customizable** (Template): GraphQL-style field selection and filtering

## 1. Full List (Static Resource)

### URI
```
abap://packages/top-level
```

### Description
Returns complete information for all top-level packages. This is a static resource (no parameters).

### Response Format
```json
{
  "totalCount": 757,
  "packages": [
    {
      "name": "APPL",
      "description": "Structure Package: Logistics/Accounting",
      "objectCount": 310910,
      "uri": "/sap/bc/adt/packages/appl"
    }
  ]
}
```

### Token Usage
~30,000-40,000 tokens (complete list)

### Use Cases
- Initial discovery of all packages
- One-time comprehensive overview
- Caching for session-long use

---

## 2. Names Only (Lightweight)

### URI Template
```
abap://packages/top-level/names
```

### Description
Returns only package names as a simple array. Much lighter than the full list.

### Response Format
```json
{
  "totalCount": 757,
  "packageNames": [
    "APPL",
    "BASIS",
    "ABA",
    "..."
  ]
}
```

### Token Usage
~5,000 tokens (vs 35,000 for full list)

### Use Cases
- Quick package discovery
- Autocomplete scenarios
- When you only need names
- Reducing context window usage

### Example
```typescript
// MCP Protocol
ReadResourceRequest {
  uri: "abap://packages/top-level/names"
}
```

---

## 3. Customizable (GraphQL-Style)

### URI Template
```
abap://packages/top-level?fields={fields}&limit={limit}&offset={offset}&prefix={prefix}&minObjects={minObjects}
```

### Parameters

#### `fields` (optional)
Comma-separated list of fields to include in response.

**Available fields:**
- `name` - Package name
- `description` - Package description
- `objectCount` - Number of objects in package
- `uri` - ADT URI for the package

**Default:** All fields (`name,description,objectCount,uri`)

**Examples:**
- `fields=name` - Only names
- `fields=name,objectCount` - Names and object counts
- `fields=name,description` - Names and descriptions

#### `limit` (optional)
Maximum number of packages to return.

**Range:** 1-500  
**Default:** No limit (all packages)

#### `offset` (optional)
Number of packages to skip (for pagination).

**Default:** 0

#### `prefix` (optional)
Filter packages by name prefix (case-insensitive).

**Examples:**
- `prefix=APPL` - Only packages starting with "APPL"
- `prefix=S` - Only packages starting with "S"

#### `minObjects` (optional)
Minimum number of objects a package must contain.

**Examples:**
- `minObjects=100` - Only packages with 100+ objects
- `minObjects=1000` - Only large packages

### Response Format

#### With Pagination
```json
{
  "totalCount": 757,
  "limit": 50,
  "offset": 0,
  "packages": [
    {
      "name": "APPL",
      "objectCount": 310910
    }
  ]
}
```

#### Without Pagination
```json
{
  "totalCount": 25,
  "packages": [
    {
      "name": "APPL_FIN_ACCOUNTING"
    }
  ]
}
```

### Use Cases

#### 1. Lightweight Discovery
Get only names for quick browsing:
```
abap://packages/top-level?fields=name&limit=100
```

#### 2. Paginated Browsing
Browse packages 50 at a time:
```
abap://packages/top-level?limit=50&offset=0
abap://packages/top-level?limit=50&offset=50
abap://packages/top-level?limit=50&offset=100
```

#### 3. Filtered Search
Find specific packages:
```
abap://packages/top-level?prefix=APPL&fields=name,description
```

#### 4. Large Packages Only
Find packages with many objects:
```
abap://packages/top-level?minObjects=1000&fields=name,objectCount
```

#### 5. Custom Combinations
Combine multiple parameters:
```
abap://packages/top-level?prefix=S&minObjects=100&fields=name,objectCount&limit=20
```

---

## Comparison Table

| Feature | Full List | Names Only | Customizable |
|---------|-----------|------------|--------------|
| **URI Type** | Static Resource | Template | Template |
| **Parameters** | None | None | Multiple |
| **Token Usage** | ~35K | ~5K | Variable |
| **Fields** | All 4 | Name only | Selectable |
| **Filtering** | No | No | Yes |
| **Pagination** | No | No | Yes |
| **Best For** | Complete discovery | Quick lookup | Custom queries |

---

## Examples

### Example 1: Get All Package Names
```typescript
ReadResourceRequest {
  uri: "abap://packages/top-level/names"
}
```

**Response:**
```json
{
  "totalCount": 757,
  "packageNames": ["APPL", "BASIS", "ABA", ...]
}
```

**Token Usage:** ~5,000 tokens

---

### Example 2: Get First 50 Packages with Names Only
```typescript
ReadResourceRequest {
  uri: "abap://packages/top-level?fields=name&limit=50"
}
```

**Response:**
```json
{
  "totalCount": 757,
  "limit": 50,
  "offset": 0,
  "packages": [
    { "name": "APPL" },
    { "name": "BASIS" },
    ...
  ]
}
```

**Token Usage:** ~2,000 tokens

---

### Example 3: Find APPL Packages with Descriptions
```typescript
ReadResourceRequest {
  uri: "abap://packages/top-level?prefix=APPL&fields=name,description"
}
```

**Response:**
```json
{
  "totalCount": 15,
  "packages": [
    {
      "name": "APPL",
      "description": "Structure Package: Logistics/Accounting"
    },
    {
      "name": "APPL_FIN_ACCOUNTING",
      "description": "Financial Accounting Application"
    }
  ]
}
```

**Token Usage:** ~1,000 tokens

---

### Example 4: Large Packages Only
```typescript
ReadResourceRequest {
  uri: "abap://packages/top-level?minObjects=10000&fields=name,objectCount"
}
```

**Response:**
```json
{
  "totalCount": 45,
  "packages": [
    {
      "name": "APPL",
      "objectCount": 310910
    },
    {
      "name": "BASIS",
      "objectCount": 477168
    }
  ]
}
```

**Token Usage:** ~500 tokens

---

## Best Practices

### 1. Choose the Right Template
- **Names Only**: When you just need to know what packages exist
- **Customizable**: When you need specific information or filtering
- **Full List**: When you need everything and will cache it

### 2. Use Pagination for Large Results
```
// Instead of getting all 757 packages at once
abap://packages/top-level?limit=50&offset=0

// Get them in chunks
abap://packages/top-level?limit=50&offset=50
```

### 3. Select Only Needed Fields
```
// Instead of all fields
abap://packages/top-level?fields=name,description

// Get only what you need
abap://packages/top-level?fields=name
```

### 4. Use Filtering to Reduce Results
```
// Instead of getting all packages
abap://packages/top-level?prefix=APPL&minObjects=100

// Filter to relevant subset
```

### 5. Combine Parameters Effectively
```
// Efficient query: filtered, paginated, minimal fields
abap://packages/top-level?prefix=S&minObjects=1000&fields=name,objectCount&limit=20
```

---

## Token Usage Optimization

| Query Type | Estimated Tokens | Use Case |
|------------|------------------|----------|
| Full list (all fields) | 35,000 | Complete discovery |
| Names only | 5,000 | Quick lookup |
| 50 packages, name only | 2,000 | Paginated browsing |
| 50 packages, all fields | 5,000 | Detailed browsing |
| Filtered (prefix), 2 fields | 1,000 | Targeted search |
| Large packages only | 500 | Finding major packages |

---

## Error Handling

All resource templates return errors in the same format:

```json
{
  "error": {
    "code": -32000,
    "message": "Failed to retrieve packages: ..."
  }
}
```

Common errors:
- Invalid field name in `fields` parameter
- Invalid number format in `limit`, `offset`, or `minObjects`
- Network/API errors from SAP system

---

## See Also

- [Top-Level Packages Resource](./TopLevelPackagesResource.md) - Static resource documentation
- [Package Resource](./PackageResource.md) - Individual package details
- [GetPackageContents Tool](./GetPackageContents.md) - Package contents retrieval
- [MCP Resources Specification](https://spec.modelcontextprotocol.io/specification/server/resources/)