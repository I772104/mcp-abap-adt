# RAP Business Object Analysis Workflow

## Complete RAP BO Analysis

Use the RAP BO analysis resource for comprehensive structure analysis in a single call.

## Workflow Steps

### 1. Complete BO Analysis (Recommended)

Get entire RAP BO structure in one resource call:

```
access_mcp_resource: uri=rap-bo-analysis:///{rap_bo_name}
→ Returns: Complete structure, all components, relationships
→ Cacheable by MCP client
```

### 2. Summary Level (Faster)

For quick overview without implementation details:

```
access_mcp_resource: uri=rap-bo-analysis:///{rap_bo_name}?depth=summary
→ Returns: High-level structure overview
→ Faster execution
```

### 3. Analyze Specific Components

After understanding structure, drill into specifics:

```
# CDS View
access_mcp_resource: uri=abap://cds/{view_name}

# Behavior Definition
use_mcp_tool: GetBehaviorDefinition
  cds_view_name: {view_name}

# Service Definition
use_mcp_tool: GetServiceDefinition
  service_name: {service_name}

# Service Binding
use_mcp_tool: GetServiceBinding
  binding_name: {binding_name}
```

## Workflow Prompt

Use MCP prompt for guided analysis:

```
invoke_prompt: rap-bo-analysis-workflow
arguments: {
  rap_bo_name: "I_SalesOrder",
  depth: "summary"  # or "detailed" or "comprehensive"
}
```

## RAP BO Components

### Component Hierarchy
```
CDS View (Data Model)
    ↓
Behavior Definition (Business Logic)
    ↓
Service Definition (Exposure)
    ↓
Service Binding (Protocol - OData V2/V4)
    ↓
Metadata Extension (UI Annotations)
    ↓
Access Control (Authorization)
```

### Naming Conventions
```
I_{name}   Interface view (root entity)
R_{name}   Restricted view (behavior projection)
C_{name}   Consumption view (UI projection)
ZR_{name}  Custom restricted view
ZC_{name}  Custom consumption view
_M suffix  Managed scenario
_U suffix  Unmanaged scenario
```

## Analysis Depth Levels

### Summary
```
rap-bo-analysis:///{name}?depth=summary
→ Quick overview
→ Component list
→ Basic relationships
```

### Detailed (Default)
```
rap-bo-analysis:///{name}
→ Complete structure
→ Implementation details
→ All associations
```

### Comprehensive
```
rap-bo-analysis:///{name}?depth=comprehensive
→ Everything from detailed
→ Extended metadata
→ Service analysis
```

## Query Parameters

### Available Parameters
```
?depth=summary              Summary overview
?depth=detailed             Complete analysis (default)
?depth=comprehensive        Extended analysis
?include_services=false     Skip service analysis
?include_implementation=false  Skip implementation details
```

### Combine Parameters
```
rap-bo-analysis:///I_InspectionLot?depth=summary&include_services=false
```

## Common RAP BO Patterns

### Managed RAP BO
```
Characteristics:
- System-managed transactional behavior
- Automatic CRUD operations
- ETag for optimistic locking
- Draft support

Example:
rap-bo-analysis:///I_SalesOrderTP
```

### Unmanaged RAP BO
```
Characteristics:
- Custom transactional behavior
- Manual CRUD implementation
- Custom locking mechanism

Example:
rap-bo-analysis:///I_CustomOrder
```

### Projection RAP BO
```
Characteristics:
- Projects from restricted/interface view
- UI-specific annotations
- Consumption layer

Example:
rap-bo-analysis:///C_SalesOrder
```

## Finding RAP BOs

### Search by Name
```
use_mcp_tool: SearchObject
  query: "I_*TP"
→ Finds transactional interface views
```

### Search by Description
```
use_mcp_tool: SearchRapBo
  search_term: "Sales Order"
→ Returns best matching RAP BO technical name
```

### Get Behavior from BO Name
```
use_mcp_tool: GetBehaviorForRapBo
  rap_bo_name: "I_SalesOrder"
→ Returns behavior definition technical name
```

## Pre-Analyzed RAP BOs

Common SAP RAP BOs available via resource:

```
rap-bo-analysis:///I_SalesOrder
rap-bo-analysis:///I_PurchaseOrder
rap-bo-analysis:///I_InspectionLot
rap-bo-analysis:///I_ProductionOrder
rap-bo-analysis:///I_BusinessPartner
```

## Analysis Use Cases

### Understanding BO Structure
```
1. Get complete analysis → rap-bo-analysis:///{name}
2. Identify root entity and compositions
3. Map behavior operations (create, update, delete)
4. Understand associations and relationships
```

### Finding Implementation Classes
```
1. Get behavior definition → from analysis result
2. Locate behavior implementation class
3. Read implementation → abap://class/{impl_class}
```

### Tracing Service Exposure
```
1. Identify service definition → from analysis
2. Find service binding → OData V2/V4
3. Check metadata extension → UI annotations
4. Review access control → authorization rules
```

## Integration with Other Workflows

### After RAP BO Analysis
```
1. Analyze BO → rap-bo-analysis:///{name}
2. Read CDS view → abap://cds/{view_name}
3. Check behavior → GetBehaviorDefinition
4. Query data → GetCDSViewContents or cds-view-data:///
```

### Before Custom Development
```
1. Find similar BO → SearchRapBo
2. Analyze structure → rap-bo-analysis:///{name}
3. Review implementation patterns
4. Create custom BO following same patterns
```

## RAP Best Practices

### Behavior Definition
```
- Always use strict ( 2 )
- Use CORRESPONDING #( ) for operations
- Implement proper authorization (global + instance)
- Add validations with "on save" timing
- Use determinations for calculated fields
- Declare side effects for UI refresh
```

### Service Exposure
```
- Separate interface and consumption views
- Use metadata extensions for UI annotations
- Implement access control (DCL)
- Version services appropriately
```

### Testing
```
- Minimum 80% coverage for RAP behavior implementation
- Test all CRUD operations
- Test validations and determinations
- Test authorization checks
```

## Related Documentation

- [../RAP_Tools.md](../RAP_Tools.md) - Complete RAP tool reference
- [../RAP_Analysis_Resource.md](../RAP_Analysis_Resource.md) - Resource details
- [../Resources.md](../Resources.md) - All resource URIs
- [../ABAP_Standards.md](../ABAP_Standards.md) - RAP naming conventions
- [DataQuerying.md](DataQuerying.md) - Query RAP BO data
