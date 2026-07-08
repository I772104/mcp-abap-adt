# GetClass Tool Documentation

## Overview

The `GetClass` tool retrieves the complete source code of an ABAP class from the SAP system via the ADT (ABAP Development Tools) API. It supports retrieving the main class source as well as local class includes (definitions, implementations, macros, and test classes).

## New in v1.2: Multi-Include Support

GetClass now supports fetching **local class includes** in addition to the main source:

- **CCDEF** (definitions): Local class definitions, types, and interfaces
- **CCIMP** (implementations): Local class implementations
- **CCMAC** (macros): Local macro definitions
- **CCAU** (testclasses): Local test classes

This allows you to retrieve the complete class including all helper classes, local types, and implementations that are crucial for understanding the full class structure.

## Endpoints

```
GET /sap/bc/adt/oo/classes/{class_name}/source/main              # Main source (default)
GET /sap/bc/adt/oo/classes/{class_name}/includes/definitions      # CCDEF
GET /sap/bc/adt/oo/classes/{class_name}/includes/implementations  # CCIMP
GET /sap/bc/adt/oo/classes/{class_name}/includes/macros           # CCMAC
GET /sap/bc/adt/oo/classes/{class_name}/includes/testclasses      # CCAU
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `class_name` | string | Yes | Name of the ABAP class to retrieve |
| `include_types` | array of strings | No | Include types to fetch. Options: `'main'`, `'definitions'`, `'implementations'`, `'macros'`, `'testclasses'`, `'all'`. Default: `['main']` |
| `output_format` | string | No | Output format: `'text'` (default) or `'structured'`. See below. |

### Include Types

- **`main`**: Main class definition and implementation (default)
- **`definitions`**: Local class definitions (CCDEF)
- **`implementations`**: Local class implementations (CCIMP)
- **`macros`**: Local macro definitions (CCMAC)
- **`testclasses`**: Test classes (CCAU)
- **`all`**: Fetch all available includes

## Output Formats

### `output_format: 'text'` (default)

Returns raw ABAP source as plain text — backward compatible with all existing callers.

### `output_format: 'structured'`

Returns a parsed JSON object instead of raw source text. Designed for use with the default `include_types: ['main']`; non-main includes (CCDEF, CCIMP, etc.) do not contain top-level `CLASS...DEFINITION/IMPLEMENTATION` headers and will produce empty sections.

**JSON structure:**

```json
{
  "object_type": "CLAS",
  "name": "ZCL_MY_CLASS",
  "definition": {
    "public":    "  METHODS: calculate ...",
    "protected": "",
    "private":   "  DATA mv_rate TYPE p DECIMALS 2."
  },
  "methods": [
    {
      "name": "CALCULATE",
      "body": "  rv_result = iv_input * mv_rate."
    }
  ]
}
```

**Why structured output?**

JSON-aware context compressors can reduce tokens significantly compared to plain text (method bodies become hashes when not actively needed). This is useful when working with large classes (50+ methods) where loading the full source would be expensive.

**Two-step pattern for large classes:**

```
Step 1: GetClass(class_name, output_format='structured')
        → see all method names + definition sections (much smaller)
Step 2: GetClass(class_name) or GetClassInclude(class_name, include_type='implementations')
        → load only the method(s) you need in full
```

## Response Structure

### Single Include (Default Behavior)

Returns the ABAP source code as plain text.

### Multiple Includes

When fetching multiple includes, the response is formatted with clear section separators:

```
================================================================================
MAIN SOURCE
================================================================================
[Main class definition and implementation]

================================================================================
LOCAL CLASS DEFINITIONS (CCDEF)
================================================================================
[Local class definitions, types, interfaces]

================================================================================
LOCAL CLASS IMPLEMENTATIONS (CCIMP)
================================================================================
[Local class implementations]

================================================================================
LOCAL MACROS (CCMAC)
================================================================================
[Macro definitions]

================================================================================
LOCAL TEST CLASSES (CCAU)
================================================================================
[Test class definitions and implementations]
```

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

### Example 1: Retrieve Main Source Only (Default, Backward Compatible)

```json
{
  "class_name": "CL_ABAP_TYPEDESCR"
}
```

### Example 2: Retrieve All Includes

```json
{
  "class_name": "ZCL_MY_UTILITY",
  "include_types": ["all"]
}
```

This fetches the main source plus all local includes (definitions, implementations, macros, test classes), formatted with section separators.

### Example 3: Retrieve Specific Includes

```json
{
  "class_name": "ZCL_DATA_PROCESSOR",
  "include_types": ["main", "implementations"]
}
```

Retrieves only the main source and local implementations (CCIMP).

### Example 4: Retrieve Only Local Implementations

```json
{
  "class_name": "ZCL_MY_CLASS",
  "include_types": ["implementations"]
}
```

Useful when you only need to see local helper class implementations.

### Example 5: Get Definitions and Test Classes

```json
{
  "class_name": "ZCL_MY_CLASS",
  "include_types": ["definitions", "testclasses"]
}
```

Fetch local type definitions and test classes together.

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

1. **Active Version**: Returns the active version, not inactive changes
2. **No Metadata**: Returns source code only, not class metadata like creation date or responsible person
3. **Missing Includes**: If an include doesn't exist (e.g., no local implementations), it returns a placeholder comment
4. **Structured output scope**: `output_format: 'structured'` parses `CLASS...DEFINITION/IMPLEMENTATION` blocks only. Non-main includes (CCDEF, CCIMP, etc.) do not contain these headers and will parse as empty sections/methods — use `output_format: 'text'` when fetching those includes.

## Performance Considerations

- **Response Size**: Large classes with all includes may take longer to retrieve
- **Parallel Fetching**: Multiple includes are fetched in parallel for ~5x performance improvement over sequential
- **Fast Path Optimization**: Default behavior (main only) uses optimized single-request path
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching for frequently accessed classes

### Performance Tips

- Use `include_types: ['main']` (or omit parameter) for fastest retrieval
- Request only the includes you need rather than using `'all'`
- For classes with many includes, expect ~200ms total response time (vs ~100ms for main only)

## Related Tools

- **GetClassInclude**: Retrieve a specific include individually (definitions, implementations, macros, testclasses, or main)
- **GetClassTests**: Retrieve unit test classes (convenience wrapper for testclasses include)
- **GetClassUsages**: Find where the class is used in the codebase
- **GetClassCoverage**: Run tests and get code coverage information
- **CheckSyntax**: Validate the syntax of retrieved source code
- **CreateClass**: Create a new class based on retrieved source
- **SearchObject**: Search for classes by name pattern
- **GetInterface**: Retrieve interface definitions implemented by the class
- **ExportClassToFile**: Export class source to file with multi-include support

## Version History

- **v1.0**: Initial implementation with basic class retrieval
- **v1.1**: Enhanced error handling and timeout management
- **v1.2**: Added multi-include support (CCIMP, CCDEF, CCMAC, CCAU) with parallel fetching
- **v1.3**: Added `output_format: 'structured'` for JSON output with definition sections and method array

## Additional Notes

- Class names are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the class name
- Timeout is set to 30 seconds for large class retrievals
- The response includes all comments and documentation within the source code