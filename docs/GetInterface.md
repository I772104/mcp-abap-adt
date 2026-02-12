# GetInterface Tool Documentation

## Overview

The `GetInterface` tool retrieves the complete source code of an ABAP interface from the SAP system via the ADT (ABAP Development Tools) API. It returns the interface definition including all method signatures, events, types, and constants.

## Endpoint

```
GET /sap/bc/adt/oo/interfaces/{interface_name}/source/main
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `interface_name` | string | Yes | Name of the ABAP interface to retrieve |

## Response Structure

The tool returns the complete ABAP interface source code as plain text, including:

- Interface definition
- Method signatures
- Event definitions
- Type definitions
- Constants
- Aliases

### Example Response

```abap
INTERFACE zif_data_processor PUBLIC.

  TYPES:
    BEGIN OF ty_data,
      id    TYPE i,
      name  TYPE string,
      value TYPE p LENGTH 16 DECIMALS 2,
    END OF ty_data,
    tt_data TYPE STANDARD TABLE OF ty_data WITH DEFAULT KEY.

  CONSTANTS:
    c_max_records TYPE i VALUE 1000,
    c_version     TYPE string VALUE '1.0.0'.

  METHODS:
    process_data
      IMPORTING
        it_input        TYPE tt_data
      RETURNING
        VALUE(rt_output) TYPE tt_data
      RAISING
        cx_processing_error,

    validate_data
      IMPORTING
        it_data         TYPE tt_data
      RETURNING
        VALUE(rv_valid) TYPE abap_bool,

    get_statistics
      EXPORTING
        ev_count TYPE i
        ev_sum   TYPE p.

  EVENTS:
    data_processed
      EXPORTING
        VALUE(record_count) TYPE i.

ENDINTERFACE.
```

## Usage Examples

### Example 1: Retrieve a Standard Interface

```json
{
  "interface_name": "IF_BADI_INTERFACE"
}
```

### Example 2: Retrieve a Custom Interface

```json
{
  "interface_name": "ZIF_MY_INTERFACE"
}
```

### Example 3: Retrieve Interface for Implementation

```json
{
  "interface_name": "ZIF_DATA_PROCESSOR"
}
```

## Response Format

### Success Response

The tool returns the raw ABAP interface source code as a text string:

```
INTERFACE zif_data_processor PUBLIC.
[Complete interface definition]
ENDINTERFACE.
```

### Error Response Examples

**Missing Interface Name**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Interface name is required"
  }]
}
```

**Interface Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Interface not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read interface"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Interface Name**: If `interface_name` parameter is not provided
2. **Interface Not Found**: If the specified interface doesn't exist in the system
3. **Authorization Error**: If the user doesn't have permission to read the interface (requires S_DEVELOP authorization with ACTVT=03)
4. **Network Issues**: Connection problems with the SAP system
5. **Invalid Interface Name**: If the interface name contains invalid characters

## Interface Structure

### Interface Definition

```abap
INTERFACE interface_name [PUBLIC].
  " Interface components
ENDINTERFACE.
```

### Method Signatures

```abap
METHODS method_name
  [IMPORTING parameters]
  [EXPORTING parameters]
  [CHANGING parameters]
  [RETURNING VALUE(result) TYPE type]
  [RAISING exceptions].
```

### Type Definitions

```abap
TYPES:
  type_name TYPE type_definition,
  BEGIN OF structure_name,
    field1 TYPE type1,
    field2 TYPE type2,
  END OF structure_name.
```

### Constants

```abap
CONSTANTS:
  constant_name TYPE type VALUE value.
```

### Events

```abap
EVENTS event_name
  [EXPORTING parameters].
```

### Aliases

```abap
ALIASES alias_name FOR interface~component.
```

## Use Cases

### 1. Interface Analysis
Review interface contracts before implementing classes.

### 2. Documentation Generation
Extract interface specifications for technical documentation.

### 3. Implementation Planning
Understand required methods before creating implementing classes.

### 4. API Design Review
Review interface design and method signatures.

### 5. Dependency Analysis
Identify interfaces used across the codebase.

### 6. Template Creation
Use existing interfaces as templates for new interfaces.

### 7. Contract Verification
Verify that implementing classes fulfill interface contracts.

## Best Practices

1. **Review Before Implementation**: Always retrieve and review interface before implementing
2. **Cache Results**: Interface definitions don't change frequently, consider caching
3. **Error Handling**: Always check for errors before processing the returned source code
4. **Authorization**: Ensure users have appropriate S_DEVELOP authorization
5. **Naming Conventions**: Use IF_ or ZIF_ prefix for interface names
6. **Combine with GetClass**: Use with GetClass to see implementations

## Integration Examples

### With GetClass Tool

```javascript
// 1. Get interface definition
const interfaceSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetInterface",
  arguments: {
    interface_name: "ZIF_MY_INTERFACE"
  }
});

// 2. Get implementing class
const classSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClass",
  arguments: {
    class_name: "ZCL_MY_IMPLEMENTATION"
  }
});

// Verify class implements all interface methods
```

### With SearchObject Tool

```javascript
// 1. Search for interfaces
const searchResults = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "SearchObject",
  arguments: {
    query: "ZIF_*",
    maxResults: 50
  }
});

// 2. Retrieve specific interface
const interfaceSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetInterface",
  arguments: {
    interface_name: "ZIF_MY_INTERFACE"
  }
});
```

### Implementation Verification

```javascript
// 1. Get interface
const interfaceDef = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetInterface",
  arguments: {
    interface_name: "ZIF_PROCESSOR"
  }
});

// 2. Extract method signatures
const methods = interfaceDef.data.match(/METHODS\s+\w+/g);

// 3. Get implementing class and verify all methods are implemented
const implementation = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClass",
  arguments: {
    class_name: "ZCL_PROCESSOR_IMPL"
  }
});
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/oo/interfaces/{interface_name}/source/main` - Retrieve interface source

### Request Headers
- `Accept: text/plain` - Request plain text response
- `x-csrf-token: fetch` - CSRF token for security

### Response Format
- Content-Type: `text/plain`
- Character encoding: UTF-8
- Line endings: System-dependent (typically CRLF on Windows, LF on Unix)

### Security Considerations
- **Authorization Required**: S_DEVELOP with ACTVT=03 (display)
- **Object-Level Security**: Additional authorization objects may apply based on package
- **CSRF Protection**: Automatic token management for secure requests

## Interface Design Patterns

### Marker Interface
```abap
INTERFACE zif_marker PUBLIC.
  " No methods - just marks implementing classes
ENDINTERFACE.
```

### Service Interface
```abap
INTERFACE zif_service PUBLIC.
  METHODS:
    execute
      IMPORTING iv_param TYPE string
      RETURNING VALUE(rv_result) TYPE string.
ENDINTERFACE.
```

### Observer Interface
```abap
INTERFACE zif_observer PUBLIC.
  METHODS:
    update
      IMPORTING io_subject TYPE REF TO object.
  EVENTS:
    state_changed.
ENDINTERFACE.
```

### Strategy Interface
```abap
INTERFACE zif_strategy PUBLIC.
  METHODS:
    calculate
      IMPORTING iv_value TYPE i
      RETURNING VALUE(rv_result) TYPE i.
ENDINTERFACE.
```

## Limitations

1. **Definition Only**: Returns only the interface definition, not implementations
2. **No Metadata**: Returns source code only, not interface attributes
3. **Active Version**: Returns the active version, not inactive changes
4. **No Usage Information**: Does not show which classes implement the interface
5. **Text Format**: Returns plain text, requires parsing for structured analysis

## Performance Considerations

- **Response Size**: Large interfaces may take longer to retrieve
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching for frequently accessed interfaces

## Related Tools

- **GetClass**: Retrieve classes that implement the interface
- **GetClassUsages**: Find where the interface is used
- **CheckSyntax**: Validate interface syntax
- **SearchObject**: Search for interfaces by name pattern
- **CreateClass**: Create classes implementing the interface

## Version History

- **v1.0**: Initial implementation with basic interface retrieval
- **v1.1**: Enhanced error handling and timeout management
- **v1.2**: Improved character encoding support

## Additional Notes

- Interface names are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the interface name
- Timeout is set to 30 seconds for large interface retrievals
- The response includes all comments and documentation within the source code
- Interfaces define contracts that implementing classes must fulfill
- All interface methods are implicitly public
- Interfaces cannot contain implementations, only signatures