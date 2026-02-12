# GetInclude Tool Documentation

## Overview

The `GetInclude` tool retrieves the complete source code of an ABAP include program from the SAP system via the ADT (ABAP Development Tools) API. Include programs are reusable code segments that can be included in other programs, function groups, or classes.

## Endpoint

```
GET /sap/bc/adt/programs/includes/{include_name}/source/main
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_name` | string | Yes | Name of the ABAP include program to retrieve |

## Response Structure

The tool returns the complete ABAP include program source code as plain text, including:

- Data declarations
- Type definitions
- Constants
- Subroutines (FORMs)
- Macros
- Any other ABAP statements

### Example Response

```abap
*&---------------------------------------------------------------------*
*& Include          ZINCLUDE_UTILITIES
*& Description: Common utility routines for data processing
*&---------------------------------------------------------------------*

* Type Definitions
TYPES: BEGIN OF ty_result,
         status  TYPE char1,
         message TYPE string,
         value   TYPE i,
       END OF ty_result.

* Constants
CONSTANTS: c_success TYPE char1 VALUE 'S',
           c_error   TYPE char1 VALUE 'E',
           c_warning TYPE char1 VALUE 'W'.

*&---------------------------------------------------------------------*
*& Form validate_input
*&---------------------------------------------------------------------*
FORM validate_input
  USING    iv_value TYPE any
  CHANGING cs_result TYPE ty_result.

  CLEAR cs_result.
  
  IF iv_value IS INITIAL.
    cs_result-status = c_error.
    cs_result-message = 'Input value is required'.
  ELSE.
    cs_result-status = c_success.
    cs_result-message = 'Validation successful'.
  ENDIF.
ENDFORM.

*&---------------------------------------------------------------------*
*& Form format_message
*&---------------------------------------------------------------------*
FORM format_message
  USING    iv_type    TYPE char1
           iv_text    TYPE string
  CHANGING ev_message TYPE string.

  CASE iv_type.
    WHEN c_success.
      ev_message = |✓ { iv_text }|.
    WHEN c_error.
      ev_message = |✗ { iv_text }|.
    WHEN c_warning.
      ev_message = |⚠ { iv_text }|.
    WHEN OTHERS.
      ev_message = iv_text.
  ENDCASE.
ENDFORM.

*&---------------------------------------------------------------------*
*& Macro Definitions
*&---------------------------------------------------------------------*
DEFINE log_message.
  WRITE: / &1, &2.
END-OF-DEFINITION.
```

## Usage Examples

### Example 1: Retrieve a Standard Include

```json
{
  "include_name": "LSAPLATOP"
}
```

### Example 2: Retrieve a Custom Include

```json
{
  "include_name": "ZINCLUDE_UTILITIES"
}
```

### Example 3: Retrieve Function Group Include

```json
{
  "include_name": "LZFINANCETOP"
}
```

## Response Format

### Success Response

The tool returns the raw ABAP include program source code as a text string:

```
*& Include ZINCLUDE_UTILITIES
[Complete include source code]
```

### Error Response Examples

**Missing Include Name**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Include name is required"
  }]
}
```

**Include Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Include not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read include"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Include Name**: If `include_name` parameter is not provided
2. **Include Not Found**: If the specified include doesn't exist in the system
3. **Authorization Error**: If the user doesn't have permission to read the include (requires S_DEVELOP authorization with ACTVT=03)
4. **Network Issues**: Connection problems with the SAP system
5. **Invalid Include Name**: If the include name contains invalid characters

## Include Program Types

### Top Includes (Function Groups)
- Named L{function_group}TOP
- Contains global declarations for function groups
- Shared data, types, and constants

### Form Includes
- Named L{function_group}Fxx
- Contains subroutines (FORMs)
- Reusable logic for function groups

### UXX Includes (Function Modules)
- Named L{function_group}Uxx
- Contains function module implementations
- Generated automatically

### Custom Includes
- User-defined include programs
- Can be included in any program
- Reusable code segments

### Class Includes
- Named for class components
- Local definitions, implementations, macros

## Use Cases

### 1. Code Reuse Analysis
Understand shared code used across multiple programs.

### 2. Function Group Structure
Examine function group includes and organization.

### 3. Documentation Generation
Extract include specifications for documentation.

### 4. Refactoring Support
Analyze include content before refactoring.

### 5. Dependency Analysis
Identify programs that use specific includes.

### 6. Template Creation
Use existing includes as templates for new includes.

### 7. Code Migration
Retrieve includes for migration or modernization.

## Best Practices

1. **Cache Results**: Include code doesn't change frequently
2. **Error Handling**: Always check for errors before processing
3. **Authorization**: Ensure users have appropriate S_DEVELOP authorization
4. **Naming Conventions**: Follow SAP naming conventions for includes
5. **Combine with Parent Objects**: Use with GetProgram or GetFunctionGroup
6. **Document Dependencies**: Track which programs use which includes

## Integration Examples

### With GetProgram Tool

```javascript
// 1. Get main program
const program = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetProgram",
  arguments: {
    program_name: "ZREPORT"
  }
});

// 2. Extract include references
const includes = program.data.match(/INCLUDE\s+(\w+)/g);

// 3. Get include content
const includeSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetInclude",
  arguments: {
    include_name: "ZINCLUDE_UTILITIES"
  }
});
```

### With GetFunctionGroup Tool

```javascript
// 1. Get function group
const functionGroup = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetFunctionGroup",
  arguments: {
    function_group: "ZFINANCE"
  }
});

// 2. Get TOP include
const topInclude = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetInclude",
  arguments: {
    include_name: "LZFINANCETOP"
  }
});

// Now you have both main program and global declarations
```

### Complete Include Analysis

```javascript
// Analyze all includes in a program
async function analyzeIncludes(programName) {
  // 1. Get main program
  const program = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "GetProgram",
    arguments: {
      program_name: programName
    }
  });
  
  // 2. Extract include names
  const includeMatches = program.data.matchAll(/INCLUDE\s+(\w+)/g);
  const includeNames = Array.from(includeMatches).map(m => m[1]);
  
  // 3. Retrieve all includes
  const includes = {};
  for (const includeName of includeNames) {
    try {
      const include = await use_mcp_tool({
        server_name: "mcp-abap-adt-1",
        tool_name: "GetInclude",
        arguments: {
          include_name: includeName
        }
      });
      includes[includeName] = include.data;
    } catch (error) {
      console.error(`Failed to retrieve include ${includeName}`);
    }
  }
  
  return includes;
}
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/programs/includes/{include_name}/source/main` - Retrieve include source

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

## Include Naming Conventions

### Function Group Includes
- **L{group}TOP**: Top include (global declarations)
- **L{group}Fxx**: Form includes (subroutines)
- **L{group}Uxx**: Function module implementations
- **L{group}O01**: PBO modules
- **L{group}I01**: PAI modules

### Custom Includes
- **Z{name}**: Customer namespace
- **Y{name}**: Partner namespace
- Descriptive names recommended

### Generated Includes
- System-generated for classes, function groups
- Follow specific naming patterns
- Should not be manually modified

## Limitations

1. **Source Code Only**: Returns only source code, not metadata
2. **Active Version**: Returns the active version, not inactive changes
3. **No Dependency Info**: Does not show which programs use the include
4. **Text Format**: Returns plain text, requires parsing for structured analysis
5. **No Nested Includes**: Does not automatically retrieve nested includes

## Performance Considerations

- **Response Size**: Large includes may take longer to retrieve
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching for frequently accessed includes

## Troubleshooting

### Include Not Found
- Verify the include name is correct
- Check that the include exists in the system
- Ensure the include is activated

### Empty Response
- Include may exist but be empty
- Check if include is a generated placeholder
- Verify authorization to view the include

### Authorization Issues
- Verify S_DEVELOP authorization with ACTVT=03
- Check authorization for the include's package

## Related Tools

- **GetProgram**: Retrieve programs that use the include
- **GetFunctionGroup**: Retrieve function groups containing the include
- **GetClass**: Retrieve classes that may use the include
- **CheckSyntax**: Validate include syntax
- **SearchObject**: Search for includes by name pattern

## Version History

- **v1.0**: Initial implementation with basic include retrieval
- **v1.1**: Enhanced error handling and timeout management
- **v1.2**: Improved character encoding support

## Additional Notes

- Include names are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the include name
- Timeout is set to 30 seconds for large include retrievals
- The response includes all comments and documentation within the source code
- Includes are referenced using the INCLUDE statement in ABAP
- Includes promote code reuse and modular programming
- Function group includes follow specific naming conventions
- Custom includes should have meaningful, descriptive names