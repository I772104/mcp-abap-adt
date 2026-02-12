# GetClassUsages Tool Documentation

## Overview

The `GetClassUsages` tool retrieves comprehensive usage information for an ABAP class from the SAP system via the ADT (ABAP Development Tools) API. It identifies where the class is referenced throughout the codebase, including other classes, interfaces, programs, function groups, and various other ABAP objects.

## Endpoint

```
POST /sap/bc/adt/repository/informationsystem/usageReferences
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `class_name` | string | Yes | Name of the ABAP class to find usages for |

## Response Structure

The tool returns an XML document containing detailed usage information:

### Example Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<usagereferences:usageReferences xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <usagereferences:usageReference>
    <usagereferences:object adtcore:uri="/sap/bc/adt/oo/classes/zcl_consumer_class" 
                            adtcore:type="CLAS/OC" 
                            adtcore:name="ZCL_CONSUMER_CLASS" 
                            adtcore:packageName="ZPACKAGE"
                            adtcore:description="Consumer Class Using Target Class"/>
    <usagereferences:usages>
      <usagereferences:usage line="15" column="10" snippet="DATA: lo_instance TYPE REF TO zcl_target_class."/>
      <usagereferences:usage line="23" column="5" snippet="CREATE OBJECT lo_instance."/>
      <usagereferences:usage line="45" column="12" snippet="lo_instance->process_data( )."/>
    </usagereferences:usages>
  </usagereferences:usageReference>
  
  <usagereferences:usageReference>
    <usagereferences:object adtcore:uri="/sap/bc/adt/programs/programs/zreport_using_class" 
                            adtcore:type="PROG/P" 
                            adtcore:name="ZREPORT_USING_CLASS" 
                            adtcore:packageName="ZPACKAGE"
                            adtcore:description="Report Using Target Class"/>
    <usagereferences:usages>
      <usagereferences:usage line="10" column="8" snippet="DATA(lo_processor) = NEW zcl_target_class( )."/>
    </usagereferences:usages>
  </usagereferences:usageReference>
</usagereferences:usageReferences>
```

## Usage Information Structure

### Usage Reference Object

Each usage reference contains:

| Field | Description |
|-------|-------------|
| `adtcore:uri` | ADT URI to the object using the class |
| `adtcore:type` | Type of the using object (CLAS/OC, PROG/P, INTF/OI, etc.) |
| `adtcore:name` | Name of the using object |
| `adtcore:packageName` | Package containing the using object |
| `adtcore:description` | Description of the using object |

### Usage Details

Each specific usage within an object includes:

| Field | Description |
|-------|-------------|
| `line` | Line number where the class is referenced |
| `column` | Column position of the reference |
| `snippet` | Code snippet showing the usage context |

## Object Types Searched

The tool searches for usages in the following object types by default:

### Primary Object Types (Always Searched)
- **CLAS/OC**: Classes
- **INTF/OI**: Interfaces
- **PROG/1P**: Programs (Reports)
- **PROG/1F**: Function Groups
- **PROG/1T**: Type Pools

### Additional Object Types (Optional)
- **WDYN/YT**: Web Dynpro Components
- **WAPA/WO**: Web Applications
- **FUGR/FF**: Function Groups
- **PINF/KI**: Package Interfaces
- **TRAN/T**: Transactions
- **DDLS/DF**: CDS Views
- **BDEF/BDO**: Behavior Definitions
- **SRVD/SRV**: Service Definitions
- And many more...

## Usage Examples

### Example 1: Find All Class Usages

```json
{
  "class_name": "ZCL_MY_UTILITY"
}
```

### Example 2: Analyze Class Dependencies

```json
{
  "class_name": "ZCL_DATA_PROCESSOR"
}
```

### Example 3: Impact Analysis Before Refactoring

```json
{
  "class_name": "ZCL_LEGACY_CLASS"
}
```

## Response Format

### Success Response

Returns XML with complete usage information including:
- List of all objects using the class
- Specific line numbers and code snippets
- Object metadata (type, package, description)

### Error Response Examples

**Missing Class Name**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Class name is required"
  }]
}
```

**Class Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Class not found"
  }]
}
```

**No Usages Found**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<usagereferences:usageReferences xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <!-- Empty - no usages found -->
</usagereferences:usageReferences>
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to search for usages"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Class Name**: If `class_name` parameter is not provided
2. **Class Not Found**: If the specified class doesn't exist in the system
3. **Authorization Error**: If the user doesn't have permission to search for usages
4. **Network Issues**: Connection problems with the SAP system
5. **Timeout**: Search takes longer than 30 seconds

## Use Cases

### 1. Impact Analysis
Understand the impact of changes before modifying or deleting a class.

### 2. Refactoring Support
Identify all locations that need updates when refactoring a class.

### 3. Dependency Mapping
Create dependency diagrams showing class relationships.

### 4. Code Review
Review how a class is being used across the codebase.

### 5. Cleanup Operations
Identify unused classes that can be safely removed.

### 6. Documentation
Generate usage documentation for classes.

### 7. Migration Planning
Plan migration strategies by understanding class dependencies.

## Best Practices

1. **Run Before Changes**: Always check usages before modifying public interfaces
2. **Document Dependencies**: Use usage information to document class dependencies
3. **Impact Assessment**: Evaluate the scope of changes based on usage count
4. **Refactoring Safety**: Ensure all usages are updated when refactoring
5. **Cleanup Validation**: Verify no usages exist before deleting classes
6. **Performance**: Be aware that searching large codebases may take time

## Integration Examples

### With GetClass Tool

```javascript
// 1. Get class implementation
const classSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClass",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// 2. Find where it's used
const usages = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassUsages",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// Analyze implementation and its usage together
```

### Impact Analysis Workflow

```javascript
// 1. Check class usages
const usages = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassUsages",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// 2. Parse usage count
const usageCount = (usages.data.match(/<usagereferences:usageReference>/g) || []).length;

// 3. Decide on refactoring strategy
if (usageCount === 0) {
  console.log("Class is unused - safe to delete");
} else if (usageCount < 5) {
  console.log("Limited usage - manual refactoring feasible");
} else {
  console.log(`High usage (${usageCount} objects) - careful planning required`);
}
```

### With DeleteLocalClass Tool

```javascript
// 1. Check if class is used
const usages = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassUsages",
  arguments: {
    class_name: "ZCL_TEMP_CLASS"
  }
});

// 2. Only delete if no usages found
const hasUsages = usages.data.includes('<usagereferences:usageReference>');
if (!hasUsages) {
  await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "DeleteLocalClass",
    arguments: {
      class_name: "ZCL_TEMP_CLASS"
    }
  });
}
```

### Dependency Graph Generation

```javascript
// Build dependency graph
async function buildDependencyGraph(className) {
  const graph = { nodes: [], edges: [] };
  
  // Get usages
  const usages = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "GetClassUsages",
    arguments: { class_name: className }
  });
  
  // Parse XML and build graph structure
  // (XML parsing logic here)
  
  return graph;
}
```

## Technical Implementation

### ADT Endpoint
- **POST** `/sap/bc/adt/repository/informationsystem/usageReferences` - Search for usages

### Request Headers
- `Content-Type: application/vnd.sap.adt.repository.usagereferences.request.v1+xml`
- `x-csrf-token: fetch` - CSRF token for security

### Request Payload Structure

```xml
<?xml version="1.0" encoding="ASCII"?>
<usagereferences:usageReferenceRequest xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <usagereferences:affectedObjects/>
  <usagereferences:scope localUsage="false">
    <usagereferences:objectIdentifier displayName="{CLASS_NAME} (Class)" globalType="CLAS/OC"/>
    <usagereferences:grade definitions="false" elements="true" indirectReferences="false"/>
    <usagereferences:objectTypes>
      <!-- List of object types to search -->
    </usagereferences:objectTypes>
  </usagereferences:scope>
</usagereferences:usageReferenceRequest>
```

### Search Configuration

**Scope Settings:**
- `localUsage="false"`: Search globally, not just local package
- `definitions="false"`: Don't include definition usages
- `elements="true"`: Include element-level usages
- `indirectReferences="false"`: Don't include indirect references

### Response Format
- Content-Type: `application/vnd.sap.adt.repository.usagereferences.v1+xml`
- Character encoding: UTF-8

### Security Considerations
- **Authorization Required**: S_DEVELOP with ACTVT=03 (display)
- **Cross-Package Access**: May require additional authorization for cross-package searches
- **CSRF Protection**: Automatic token management for secure requests

## Usage Analysis Patterns

### Identifying Usage Types

**Type Declaration:**
```abap
DATA: lo_instance TYPE REF TO zcl_target_class.
```

**Object Creation:**
```abap
CREATE OBJECT lo_instance.
" or
DATA(lo_instance) = NEW zcl_target_class( ).
```

**Method Calls:**
```abap
lo_instance->method_name( ).
```

**Static Method Calls:**
```abap
zcl_target_class=>static_method( ).
```

**Inheritance:**
```abap
CLASS zcl_child DEFINITION INHERITING FROM zcl_target_class.
```

**Interface Implementation:**
```abap
CLASS zcl_impl DEFINITION IMPLEMENTING zif_interface.
```

## Performance Considerations

- **Search Scope**: Searching across all object types takes longer
- **System Size**: Large codebases require more time to search
- **Network Latency**: Response time depends on network connection
- **Timeout**: Default 30-second timeout may need adjustment for large systems
- **Caching**: Consider caching results for frequently queried classes

## Limitations

1. **Active Objects Only**: Searches only activated objects, not inactive changes
2. **Direct References**: May not capture all dynamic or reflection-based usages
3. **Comment References**: Does not search within comments
4. **String References**: May not find class names in string literals
5. **Generated Code**: May not include usages in generated code
6. **Cross-System**: Only searches within the current system

## Troubleshooting

### No Usages Found
- Verify the class name is correct (case-insensitive)
- Check if the class is actually used in the system
- Ensure search scope includes relevant object types
- Verify authorization to view using objects

### Incomplete Results
- Check timeout settings for large searches
- Verify authorization for cross-package searches
- Ensure all relevant object types are included in search

### Performance Issues
- Reduce search scope to specific object types
- Search during off-peak hours
- Consider breaking down into multiple targeted searches

## Related Tools

- **GetClass**: Retrieve the class implementation being analyzed
- **SearchObject**: Find classes by name pattern
- **GetPackageContents**: See all objects in a package
- **DeleteLocalClass**: Delete unused local classes
- **CheckSyntax**: Validate changes before applying to used classes

## Version History

- **v1.0**: Initial implementation with basic usage search
- **v1.1**: Enhanced object type coverage
- **v1.2**: Improved performance for large codebases
- **v1.3**: Added detailed usage snippets with line numbers

## Additional Notes

- Class names are automatically converted to uppercase
- The tool searches for both direct and element-level usages
- Usage information includes exact line numbers and code context
- The search is performed across the entire system, not just local packages
- Results are returned in XML format for structured processing
- The tool uses ADT's native usage reference search infrastructure
- Indirect references (e.g., through inheritance chains) are not included by default
- The search respects SAP authorization objects for object visibility