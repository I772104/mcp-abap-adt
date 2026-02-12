# GetClass Tool Documentation

## Overview

The `GetClass` tool retrieves the complete source code of an ABAP class from the SAP system via the ADT (ABAP Development Tools) API. It returns the main class definition and implementation, including public, protected, and private sections.

## Endpoint

```
GET /sap/bc/adt/oo/classes/{class_name}/source/main
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `class_name` | string | Yes | Name of the ABAP class to retrieve |

## Response Structure

The tool returns the complete ABAP class source code as plain text, including:

- Class definition (PUBLIC, PROTECTED, PRIVATE sections)
- Class implementation
- Method definitions and implementations
- Type definitions
- Constants and data declarations
- Aliases and interfaces

### Example Response

```abap
CLASS zcl_example DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    METHODS: constructor,
             process_data
               IMPORTING
                 iv_input TYPE string
               RETURNING
                 VALUE(rv_result) TYPE string.

  PROTECTED SECTION.

  PRIVATE SECTION.
    DATA: mv_internal_data TYPE string.
    METHODS: validate_input
               IMPORTING
                 iv_data TYPE string
               RETURNING
                 VALUE(rv_valid) TYPE abap_bool.
ENDCLASS.

CLASS zcl_example IMPLEMENTATION.

  METHOD constructor.
    mv_internal_data = 'Initialized'.
  ENDMETHOD.

  METHOD process_data.
    IF validate_input( iv_input ).
      rv_result = |Processed: { iv_input }|.
    ELSE.
      rv_result = 'Invalid input'.
    ENDIF.
  ENDMETHOD.

  METHOD validate_input.
    rv_valid = xsmark.
    IF iv_data IS INITIAL.
      rv_valid = space.
    ENDIF.
  ENDMETHOD.

ENDCLASS.
```

## Usage Examples

### Example 1: Retrieve a Standard Class

```json
{
  "class_name": "CL_ABAP_TYPEDESCR"
}
```

### Example 2: Retrieve a Custom Class

```json
{
  "class_name": "ZCL_MY_UTILITY"
}
```

### Example 3: Retrieve a Class for Analysis

```json
{
  "class_name": "ZCL_DATA_PROCESSOR"
}
```

## Response Format

### Success Response

The tool returns the raw ABAP source code as a text string:

```
CLASS zcl_example DEFINITION...
[Complete class source code]
...ENDCLASS.
```

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

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read class"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Class Name**: If `class_name` parameter is not provided
2. **Class Not Found**: If the specified class doesn't exist in the system
3. **Authorization Error**: If the user doesn't have permission to read the class (requires S_DEVELOP authorization with ACTVT=03)
4. **Network Issues**: Connection problems with the SAP system
5. **Invalid Class Name**: If the class name contains invalid characters

## Use Cases

### 1. Code Review and Analysis
Retrieve class source code for manual or automated code review processes.

### 2. Documentation Generation
Extract class definitions to generate technical documentation.

### 3. Code Migration
Retrieve source code for migration to other systems or for backup purposes.

### 4. Learning and Training
Study existing class implementations to learn ABAP patterns and best practices.

### 5. Refactoring Support
Analyze class structure before making refactoring decisions.

### 6. Template Creation
Use existing classes as templates for creating new similar classes.

### 7. Dependency Analysis
Examine class implementations to understand dependencies and relationships.

## Best Practices

1. **Cache Results**: Class source code doesn't change frequently, consider caching for repeated access
2. **Error Handling**: Always check for errors before processing the returned source code
3. **Authorization**: Ensure users have appropriate S_DEVELOP authorization
4. **Naming Conventions**: Use uppercase for class names (automatically handled by the system)
5. **Combine with Other Tools**: Use with CheckSyntax, GetClassTests, or GetClassUsages for comprehensive analysis

## Integration Examples

### With CheckSyntax Tool

```javascript
// 1. Retrieve class source code
const classSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClass",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// 2. Validate syntax
const syntaxCheck = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "CheckSyntax",
  arguments: {
    source_code: classSource.data,
    object_name: "ZCL_MY_CLASS",
    object_type: "CLAS"
  }
});
```

### With GetClassTests Tool

```javascript
// 1. Get main class source
const mainClass = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClass",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// 2. Get test classes
const testClasses = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassTests",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// Now you have both main implementation and tests
```

### With CreateClass Tool (Template Pattern)

```javascript
// 1. Get template class
const template = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClass",
  arguments: {
    class_name: "ZCL_TEMPLATE"
  }
});

// 2. Modify and create new class
const modifiedSource = template.data.replace(/ZCL_TEMPLATE/g, 'ZCL_NEW_CLASS');
const newClass = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "CreateClass",
  arguments: {
    class_name: "ZCL_NEW_CLASS",
    source_code: modifiedSource,
    description: "Class based on template"
  }
});
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/oo/classes/{class_name}/source/main` - Retrieve main class source

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

## Class Source Code Structure

### Definition Section
```abap
CLASS <class_name> DEFINITION
  [PUBLIC|PRIVATE|ABSTRACT]
  [FINAL]
  [CREATE PUBLIC|PROTECTED|PRIVATE]
  [GLOBAL FRIENDS <friend_classes>]
  [RISK LEVEL <level>]
  [FOR TESTING]
  [DURATION SHORT|MEDIUM|LONG].

  PUBLIC SECTION.
    [Type definitions, constants, data, methods, events, interfaces]

  PROTECTED SECTION.
    [Type definitions, constants, data, methods, events]

  PRIVATE SECTION.
    [Type definitions, constants, data, methods]

ENDCLASS.
```

### Implementation Section
```abap
CLASS <class_name> IMPLEMENTATION.

  METHOD <method_name>.
    [Method implementation]
  ENDMETHOD.

  [Additional methods...]

ENDCLASS.
```

## Limitations

1. **Main Source Only**: Returns only the main class source, not test classes (use GetClassTests for tests)
2. **No Metadata**: Returns source code only, not class metadata like creation date or responsible person
3. **Active Version**: Returns the active version, not inactive changes
4. **No Includes**: Does not return separate include files if the class uses them
5. **Text Format**: Returns plain text, requires parsing for structured analysis

## Performance Considerations

- **Response Size**: Large classes may take longer to retrieve
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching for frequently accessed classes

## Related Tools

- **GetClassTests**: Retrieve unit test classes for the class
- **GetClassUsages**: Find where the class is used in the codebase
- **GetClassCoverage**: Run tests and get code coverage information
- **CheckSyntax**: Validate the syntax of retrieved source code
- **CreateClass**: Create a new class based on retrieved source
- **SearchObject**: Search for classes by name pattern
- **GetInterface**: Retrieve interface definitions implemented by the class

## Version History

- **v1.0**: Initial implementation with basic class retrieval
- **v1.1**: Enhanced error handling and timeout management
- **v1.2**: Improved character encoding support

## Additional Notes

- Class names are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the class name
- Timeout is set to 30 seconds for large class retrievals
- The response includes all comments and documentation within the source code