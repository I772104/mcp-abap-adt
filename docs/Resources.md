# MCP Resources Documentation

## Overview

MCP Resources provide **cacheable, structured access** to ABAP system information. Resources are more efficient than tools because they:
- Can be cached by MCP clients
- Provide comprehensive data in a single call
- Reduce token usage significantly
- Are self-describing with metadata

**⭐ ALWAYS prefer resources over tools when available!**

---

## Resource Types

### 1. Static Resources
Static resources have fixed URIs with no parameters. They return the same data structure and can be cached.

### 2. Resource Templates
Resource templates have variable parameters in the URI (e.g., `{package_name}`). They provide dynamic access to specific objects.

---



### Package Resources

#### `abap://packages/top-level`
**Type**: Static Resource  
**Description**: Complete list of top-level packages (no super package)  
**Token Usage**: ~35K tokens  
**Caching**: Recommended - use once per session

**Returns**:
```json
{
  "packages": [
    {
      "name": "APPL",
      "description": "Application Platform",
      "objectCount": 4206,
      "uri": "abap://package/APPL"
    },
    ...
  ],
  "metadata": {
    "totalPackages": 757,
    "filters": {
      "excludeSystem": true,
      "excludeTest": true,
      "excludeEmpty": true
    }
  }
}
```

**Use Cases**:
- Initial package discovery
- Browse all available packages
- Cache for subsequent filtering

**Example**:
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: abap://packages/top-level
```

---

#### `abap://packages/top-level/names`
**Type**: Static Resource  
**Description**: Lightweight list of package names only  
**Token Usage**: ~5K tokens (85% lighter than full list)  
**Caching**: Recommended

**Returns**:
```json
{
  "packageNames": [
    "APPL",
    "BASIS",
    "ABA",
    ...
  ],
  "count": 757
}
```

**Use Cases**:
- Quick package name lookup
- Autocomplete scenarios
- Minimal token usage for discovery

**Example**:
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: abap://packages/top-level/names
```

---

#### `abap://package/{package_name}`
**Type**: Resource Template  
**Description**: Comprehensive information about a specific package  
**Replaces**: GetPackage tool

**Parameters**:
- `package_name` (required): Name of the ABAP package

**Returns**:
```json
{
  "package": {
    "name": "APPL",
    "description": "Application Platform",
    "packageType": "structure",
    "softwareComponent": "SAP_BASIS",
    "applicationComponent": "BC-ABA",
    "responsible": "SAP",
    "hierarchy": {
      "superPackage": null,
      "subPackages": [...]
    },
    "transport": {
      "layer": "SAP",
      "translationRelevance": true
    },
    "interfaces": [...],
    "objectCount": 4206
  }
}
```

**Use Cases**:
- Get detailed package metadata
- Understand package hierarchy
- Check transport settings
- View package interfaces

**Example**:
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: abap://package/FINANCIAL_BASIS
```

---

#### `abap://packages/top-level?fields={fields}&limit={limit}&offset={offset}&prefix={prefix}&minObjects={minObjects}`
**Type**: Resource Template  
**Description**: Customizable package query with filtering  
**Token Usage**: Highly efficient (~500-2K tokens depending on parameters)

**Parameters** (all optional):
- `fields`: Comma-separated list (name, description, objectCount, uri)
- `limit`: Maximum results (default: all, max: 500)
- `offset`: Skip N packages for pagination
- `prefix`: Filter by package name prefix
- `minObjects`: Minimum object count filter

**Returns**:
```json
{
  "packages": [...],
  "metadata": {
    "totalMatching": 50,
    "returned": 50,
    "filters": {...}
  }
}
```

**Use Cases**:
- Token-efficient package discovery
- Filtered searches (by prefix, size)
- Pagination for large result sets
- Custom field selection

**Examples**:
```
# Get first 50 package names only (~2K tokens)
abap://packages/top-level?fields=name&limit=50

# Find all FIN* packages with descriptions
abap://packages/top-level?prefix=FIN&fields=name,description

# Find large packages (1000+ objects)
abap://packages/top-level?minObjects=1000&fields=name,objectCount

# Pagination: Get packages 100-150
abap://packages/top-level?offset=100&limit=50
```

---

### RAP Business Object Resources

#### `rap-bo-analysis:///I_SalesOrder`
**Type**: Static Resource  
**Description**: Pre-analyzed Sales Order RAP Business Object

**Returns**: Complete RAP BO structure including:
- Behavior definitions
- CDS views (root, projections, dependencies)
- Service exposure (definitions, bindings)
- Access control (DCL)
- Implementation classes
- Recommendations

**Use Cases**:
- Example of complete RAP BO structure
- Reference for RAP BO analysis
- Quick access to common BO

---

#### `rap-bo-analysis:///I_PurchaseOrder`
**Type**: Static Resource  
**Description**: Pre-analyzed Purchase Order RAP Business Object

**Returns**: Same structure as Sales Order

---

#### `rap-bo-analysis:///{rap_bo_name}`
**Type**: Resource Template  
**Description**: Comprehensive analysis of any RAP Business Object  
**Replaces**: Multiple tool calls (GetBehaviorDefinition, GetCDSView, GetServiceDefinition, etc.)

**Parameters**:
- `rap_bo_name` (required): Name of the RAP BO root entity
- Query parameters (optional):
  - `include_implementation=false`: Skip implementation analysis
  - `include_services=false`: Skip service analysis
  - `include_dependencies=false`: Skip dependency analysis
  - `include_security=false`: Skip security analysis
  - `depth=summary|detailed|comprehensive`: Analysis depth

**Returns**:
```json
{
  "analysis_metadata": {
    "rap_bo_name": "I_InspectionLot",
    "analysis_timestamp": "2026-02-13T13:08:01.259Z",
    "status": "complete",
    "options_used": {...},
    "errors": [],
    "warnings": []
  },
  "behavior_definitions": {
    "interface_behaviors": [...],
    "behavior_definitions": [...],
    "implementation_classes": [...],
    "operations_summary": {...}
  },
  "cds_views": {
    "root_views": [...],
    "projection_views": [...],
    "dependencies": [...]
  },
  "service_exposure": {
    "service_definitions": [...],
    "service_bindings": [...],
    "odata_services": [...]
  },
  "access_control": {
    "dcl_definitions": [...],
    "authorization_summary": {...}
  },
  "implementation_analysis": {
    "classes": [...],
    "class_dependencies": [...],
    "usage_analysis": [...]
  },
  "recommendations": [...]
}
```

**Use Cases**:
- Complete RAP BO structure analysis
- Understand BO hierarchy and relationships
- Analyze service exposure
- Check security implementation
- Review implementation classes

**Examples**:
```
# Full analysis
rap-bo-analysis:///I_InspectionLot

# Summary only (faster, fewer tokens)
rap-bo-analysis:///I_InspectionLot?depth=summary

# Skip services and security
rap-bo-analysis:///I_InspectionLot?include_services=false&include_security=false

# Comprehensive analysis
rap-bo-analysis:///I_InspectionLot?depth=comprehensive
```

---

### ABAP Object Resources

#### `abap://cds/{view_name}`
**Type**: Resource Template  
**Description**: CDS view source code and metadata  
**Replaces**: GetCDSView tool

**Parameters**:
- `view_name` (required): Name of the CDS view

**Returns**:
```json
{
  "view_name": "I_SalesOrder",
  "source_code": "...",
  "view_type": "BASIC|COMPOSITE|CONSUMPTION",
  "annotations": [...],
  "associations": [...],
  "parameters": [],
  "base_entity": "..."
}
```

**Example**:
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: abap://cds/I_SalesOrder
```

---

#### `abap://class/{class_name}`
**Type**: Resource Template  
**Description**: ABAP class source code  
**Replaces**: GetClass tool

**Parameters**:
- `class_name` (required): Name of the ABAP class

**Returns**:
```json
{
  "class_name": "CL_ABAP_TYPEDESCR",
  "source_code": "...",
  "definition": "...",
  "implementation": "...",
  "metadata": {...}
}
```

**Example**:
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: abap://class/CL_ABAP_TYPEDESCR
```

---

#### `abap://table/{table_name}`
**Type**: Resource Template  
**Description**: Database table structure  
**Replaces**: GetTable tool

**Parameters**:
- `table_name` (required): Name of the database table

**Returns**:
```json
{
  "table_name": "MARA",
  "description": "General Material Data",
  "fields": [...],
  "keys": [...],
  "technical_settings": {...}
}
```

**Example**:
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: abap://table/MARA
```

---

## Best Practices

### 1. Always Prefer Resources Over Tools
```
❌ DON'T: use_mcp_tool GetPackage with package_name="APPL"
✅ DO: access_mcp_resource uri="abap://package/APPL"
```

### 2. Cache Static Resources
```
# Use once per session, cache the result
access_mcp_resource uri="abap://packages/top-level/names"
# Then filter locally instead of repeated calls
```

### 3. Use Query Parameters for Efficiency
```
# Instead of getting all packages and filtering
❌ abap://packages/top-level (35K tokens)

# Use targeted query
✅ abap://packages/top-level?prefix=FIN&limit=20 (~500 tokens)
```

### 4. Start with RAP BO Analysis Resource
```
# Instead of multiple tool calls
❌ GetBehaviorDefinition → GetCDSView → GetServiceDefinition → ...

# Use single resource
✅ rap-bo-analysis:///I_SalesOrder
```

### 5. Use Appropriate Analysis Depth
```
# For quick overview
rap-bo-analysis:///I_SalesOrder?depth=summary

# For detailed analysis (default)
rap-bo-analysis:///I_SalesOrder

# For comprehensive analysis
rap-bo-analysis:///I_SalesOrder?depth=comprehensive
```

---

## Token Efficiency Comparison

| Scenario | Old Way (Tools) | New Way (Resources) | Savings |
|----------|----------------|---------------------|---------|
| Package Discovery | GetPackage × 757 | abap://packages/top-level/names | 95% |
| Filtered Package Search | GetPackage × N | abap://packages/top-level?prefix=X | 90% |
| RAP BO Analysis | 5-10 tool calls | rap-bo-analysis:///X | 80% |
| Package Details | GetPackage tool | abap://package/X | 30% |

---

## Documentation Files

- **PackageResource.md** - Detailed package resource documentation
- **TopLevelPackagesResource.md** - Top-level packages resource
- **TopLevelPackagesResourceTemplates.md** - Customizable package queries
- **RAP_Analysis_Resource.md** - RAP BO analysis resource documentation

---

## See Also

- [.clinerules](.clinerules) - Complete Cline rules with resource usage patterns
- [README.md](README.md) - Server overview and setup
- [RAP_Tools.md](RAP_Tools.md) - RAP-specific tools documentation