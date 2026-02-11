# RAP (RESTful ABAP Programming) Tools Documentation

This document describes the new MCP tools for analyzing and working with RAP Business Objects in SAP S/4HANA systems.

## Overview

The RAP tools provide comprehensive capabilities for analyzing RESTful ABAP Programming business objects, including:

- **CDS Views**: Data model analysis and source code retrieval
- **Behavior Definitions**: Business logic and operations analysis
- **Service Definitions**: OData service exposure analysis
- **Service Bindings**: Service deployment and configuration analysis
- **Metadata Extensions**: UI annotations and Fiori Elements configuration
- **Access Control**: Authorization and security analysis
- **Dependency Analysis**: Complete RAP BO dependency mapping

## Available Tools

### 1. GetCDSView

Retrieves CDS view source code and analyzes its structure.

**Usage:**
```json
{
  "view_name": "I_SalesOrder",
  "include_annotations": true
}
```

**Returns:**
- Complete source code
- View type classification (BASIC, PROJECTION, COMPOSITE, etc.)
- Extracted annotations
- Association definitions
- Parameters
- Base entity information

**Example:**
```bash
# Get a standard SAP CDS view
GetCDSView view_name=I_SalesOrder

# Get custom CDS view without annotations
GetCDSView view_name=ZC_MY_SALESORDER include_annotations=false
```

### 2. GetBehaviorDefinition

Retrieves RAP behavior definition source code and analyzes business logic.

**Usage:**
```json
{
  "cds_view_name": "R_SalesOrderTP"
}
```

**Returns:**
- Complete behavior definition source
- Implementation type (managed/unmanaged)
- Implementation class name
- Strict mode level
- Draft enablement status
- CRUD operations configuration
- Actions, determinations, and validations
- Authorization configuration
- Side effects definitions
- Field controls

**Example:**
```bash
# Analyze RAP behavior definition
GetBehaviorDefinition cds_view_name=R_SalesOrderTP
```

### 3. GetServiceDefinition

Retrieves RAP service definition source code and analyzes exposed entities.

**Usage:**
```json
{
  "service_name": "ZUI_SALESORDER_O4"
}
```

**Returns:**
- Complete service definition source
- Service type (OData V2/V4, RAP Service Definition)
- Exposed entities with aliases
- Service version information
- Namespace information
- Service annotations

**Example:**
```bash
# Get OData service definition
GetServiceDefinition service_name=ZUI_SALESORDER_O4
```

### 4. GetServiceBinding

Retrieves RAP service binding configuration and deployment details.

**Usage:**
```json
{
  "binding_name": "ZUI_SALESORDER_O4_02"
}
```

**Returns:**
- Service binding configuration
- Associated service definition
- Binding type (OData V2/V4, REST, SOAP)
- Service URL
- Protocol information
- Authentication configuration
- Binding status

**Example:**
```bash
# Get service binding details
GetServiceBinding binding_name=ZUI_SALESORDER_O4_02
```

### 5. GetCDSViewDependencies

Analyzes CDS view dependencies and builds dependency trees.

**Usage:**
```json
{
  "view_name": "C_SalesOrderTP"
}
```

**Returns:**
- Base views and database tables
- Association targets
- Used-by analysis (where available)
- Function dependencies
- Parameter definitions
- Multi-level dependency tree
- Dependency classification

**Example:**
```bash
# Analyze CDS view dependencies
GetCDSViewDependencies view_name=C_SalesOrderTP
```

### 6. GetMetadataExtension

Retrieves metadata extension source code and analyzes UI annotations.

**Usage:**
```json
{
  "extension_name": "C_SalesOrderTP"
}
```

**Returns:**
- Complete metadata extension source
- Annotated view name
- Metadata layer information
- UI annotations (lineItem, identification, selectionField, facet, etc.)
- Consumption annotations (valueHelpDefinition, filter)
- Object model annotations
- Analytics annotations

**Example:**
```bash
# Get Fiori Elements UI annotations
GetMetadataExtension extension_name=C_SalesOrderTP
```

### 7. GetAccessControl

Retrieves access control (DCL) definition and analyzes authorization rules.

**Usage:**
```json
{
  "dcl_name": "R_SalesOrderTP"
}
```

**Returns:**
- Complete DCL source code
- Protected view name
- Role definitions
- Authorization checks (PFCG_AUTH, PFCG_MAPPING, USER aspects)
- Access conditions
- Grant statements with conditions
- Mapping role configuration

**Example:**
```bash
# Analyze access control rules
GetAccessControl dcl_name=R_SalesOrderTP
```

## RAP Business Object Analysis Workflow

### Complete RAP BO Analysis

To fully analyze a RAP Business Object, use the tools in this sequence:

1. **Start with the root CDS view:**
   ```bash
   GetCDSView view_name=R_SalesOrderTP
   ```

2. **Analyze the behavior definition:**
   ```bash
   GetBehaviorDefinition cds_view_name=R_SalesOrderTP
   ```

3. **Check dependencies:**
   ```bash
   GetCDSViewDependencies view_name=R_SalesOrderTP
   ```

4. **Analyze projection views:**
   ```bash
   GetCDSView view_name=C_SalesOrderTP
   GetCDSViewDependencies view_name=C_SalesOrderTP
   ```

5. **Check UI annotations:**
   ```bash
   GetMetadataExtension extension_name=C_SalesOrderTP
   ```

6. **Analyze service exposure:**
   ```bash
   GetServiceDefinition service_name=ZUI_SALESORDER_O4
   GetServiceBinding binding_name=ZUI_SALESORDER_O4_02
   ```

7. **Check authorization:**
   ```bash
   GetAccessControl dcl_name=R_SalesOrderTP
   ```

### Finding RAP Objects

Use the existing `SearchObject` tool to find RAP-related objects:

```bash
# Find CDS views
SearchObject query=*TP maxResults=50

# Find behavior definitions
SearchObject query=R_* maxResults=50

# Find service definitions
SearchObject query=*UI_* maxResults=50
```

## Common Use Cases

### 1. RAP BO Modernization Analysis

When modernizing classic ABAP to RAP:

1. Identify the data model with `GetCDSView`
2. Understand business logic with `GetBehaviorDefinition`
3. Map dependencies with `GetCDSViewDependencies`
4. Analyze UI requirements with `GetMetadataExtension`

### 2. Service Consumption Analysis

When consuming RAP services:

1. Check service definition with `GetServiceDefinition`
2. Verify service binding with `GetServiceBinding`
3. Understand data model with `GetCDSView`
4. Check authorization with `GetAccessControl`

### 3. Performance Analysis

For RAP performance optimization:

1. Analyze CDS view structure with `GetCDSView`
2. Map dependency chains with `GetCDSViewDependencies`
3. Check behavior implementation efficiency with `GetBehaviorDefinition`

### 4. Security Audit

For RAP security analysis:

1. Review access control with `GetAccessControl`
2. Check behavior authorization with `GetBehaviorDefinition`
3. Verify service security with `GetServiceBinding`

## Error Handling

All RAP tools follow consistent error handling:

- **404 Not Found**: Object doesn't exist or insufficient authorization
- **403 Forbidden**: Missing authorization for ADT access
- **500 Internal Error**: System or network issues

Tools attempt multiple ADT endpoints and provide fallback mechanisms where possible.

## Technical Implementation

### ADT Endpoints Used

| Tool | Primary Endpoint | Fallback Endpoints |
|------|------------------|-------------------|
| GetCDSView | `/sap/bc/adt/ddic/ddlx/sources/{name}` | `/sap/bc/adt/ddic/ddls/sources/{name}` |
| GetBehaviorDefinition | `/sap/bc/adt/bo/behaviors/{name}` | `/sap/bc/adt/ddic/behaviors/{name}` |
| GetServiceDefinition | `/sap/bc/adt/businessservices/odatav4/{name}` | `/sap/bc/adt/businessservices/odatav2/{name}` |
| GetServiceBinding | `/sap/bc/adt/businessservices/bindings/{name}` | Multiple OData-specific endpoints |
| GetMetadataExtension | `/sap/bc/adt/ddic/ddlx/sources/{name}` | `/sap/bc/adt/ddic/extensions/{name}` |
| GetAccessControl | `/sap/bc/adt/ddic/dcls/sources/{name}` | `/sap/bc/adt/ddic/accesscontrols/{name}` |

### Source Code Analysis

Tools perform intelligent parsing of:
- CDS syntax and annotations
- Behavior definition keywords
- Service definition structures
- DCL authorization patterns
- UI annotation formats

## Best Practices

### 1. Systematic Analysis
- Always start with the root business object view
- Follow the dependency chain systematically
- Document findings for team knowledge sharing

### 2. Performance Considerations
- Use dependency analysis to identify performance bottlenecks
- Check for unnecessary associations in CDS views
- Verify efficient behavior implementations

### 3. Security Review
- Always check access control definitions
- Verify authorization in behavior definitions
- Review service binding security configurations

### 4. Cloud Readiness
- Ensure all dependencies use released APIs
- Check for cloud-compatible patterns
- Verify S/4HANA compatibility

## Integration with Development Workflows

### With ADT (ABAP Development Tools)
- Use tools to understand objects before opening in ADT
- Complement ADT's where-used analysis with dependency mapping
- Verify changes don't break dependent objects

### With Fiori Development
- Analyze metadata extensions before UI development
- Understand service definitions for frontend consumption
- Check authorization requirements for UI features

### With Testing
- Use behavior analysis to understand test requirements
- Map dependencies for comprehensive test coverage
- Verify authorization scenarios

## Troubleshooting

### Common Issues

1. **"CDS view not found"**
   - Verify object name spelling
   - Check if object exists in the system
   - Ensure sufficient authorization

2. **"Behavior definition not found"**
   - Verify the CDS view has an associated behavior definition
   - Check if it's a transactional view (usually ends with TP)

3. **"Service not accessible"**
   - Verify service is published
   - Check service binding status
   - Ensure OData service is active

4. **"Access control not found"**
   - Not all CDS views have access control
   - Check if authorization is handled at behavior level

### Authorization Requirements

Users need the following authorizations:
- `S_DEVELOP` for development object access
- `S_ADT_RES` for ADT resource access
- Specific authorizations for the analyzed objects

## Future Enhancements

Planned enhancements include:
- Create/Update operations for RAP artifacts
- Cloud compliance checking
- ATC integration for quality checks
- Performance analysis integration
- Enhanced dependency visualization

---

*This documentation covers the core RAP analysis capabilities. For specific implementation details, refer to the individual handler source code.*