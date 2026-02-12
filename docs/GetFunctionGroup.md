# GetFunctionGroup Tool Documentation

## Overview

The `GetFunctionGroup` tool retrieves the main program source code of an ABAP function group from the SAP system via the ADT (ABAP Development Tools) API. It returns the function group's main program including global data declarations, initialization logic, and common subroutines.

## Endpoint

```
GET /sap/bc/adt/functions/groups/{function_group}/source/main
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `function_group` | string | Yes | Name of the function group to retrieve |

## Response Structure

The tool returns the complete function group main program source code as plain text, including:

- Function group declaration
- Global data declarations (shared across all function modules)
- Global type definitions
- Global constants
- Initialization routines
- Common subroutines used by function modules

### Example Response

```abap
FUNCTION-POOL zfinance.                     "MESSAGE-ID ..

* Global Data Declarations
DATA: gv_initialized TYPE abap_bool,
      gv_tax_rate    TYPE p DECIMALS 2 VALUE '0.19',
      gt_cache       TYPE TABLE OF zfinance_cache.

* Global Type Definitions
TYPES: BEGIN OF ty_calculation,
         amount TYPE p DECIMALS 2,
         tax    TYPE p DECIMALS 2,
         total  TYPE p DECIMALS 2,
       END OF ty_calculation.

* Global Constants
CONSTANTS: gc_version TYPE string VALUE '1.0.0',
           gc_max_amount TYPE p DECIMALS 2 VALUE '999999.99'.

*&---------------------------------------------------------------------*
*& Form initialize
*&---------------------------------------------------------------------*
FORM initialize.
  IF gv_initialized = abap_false.
    " Initialization logic
    PERFORM load_configuration.
    gv_initialized = abap_true.
  ENDIF.
ENDFORM.

*&---------------------------------------------------------------------*
*& Form load_configuration
*&---------------------------------------------------------------------*
FORM load_configuration.
  " Load configuration from database
  SELECT SINGLE tax_rate
    FROM zconfig
    INTO gv_tax_rate
    WHERE config_key = 'TAX_RATE'.
ENDFORM.

*&---------------------------------------------------------------------*
*& Form validate_amount
*&---------------------------------------------------------------------*
FORM validate_amount
  USING    iv_amount TYPE p
  CHANGING ev_valid  TYPE abap_bool.
  
  ev_valid = abap_true.
  
  IF iv_amount < 0 OR iv_amount > gc_max_amount.
    ev_valid = abap_false.
  ENDIF.
ENDFORM.
```

## Usage Examples

### Example 1: Retrieve a Standard Function Group

```json
{
  "function_group": "BAPI_USER"
}
```

### Example 2: Retrieve a Custom Function Group

```json
{
  "function_group": "ZFINANCE"
}
```

### Example 3: Retrieve Function Group for Analysis

```json
{
  "function_group": "ZDATA_PROCESSING"
}
```

## Response Format

### Success Response

The tool returns the raw ABAP function group main program source code as a text string:

```
FUNCTION-POOL zfinance.
[Complete function group main program source code]
```

### Error Response Examples

**Missing Function Group**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Function Group is required"
  }]
}
```

**Function Group Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Function group not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read function group"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Function Group**: If `function_group` parameter is not provided
2. **Function Group Not Found**: If the specified function group doesn't exist in the system
3. **Authorization Error**: If the user doesn't have permission to read the function group (requires S_DEVELOP authorization with ACTVT=03)
4. **Network Issues**: Connection problems with the SAP system
5. **Invalid Function Group Name**: If the function group name contains invalid characters

## Function Group Structure

### Function Pool Declaration

```abap
FUNCTION-POOL function_group [MESSAGE-ID message_class].
```

### Global Data

```abap
DATA: global_variable TYPE type,
      global_table TYPE TABLE OF structure.
```

### Global Types

```abap
TYPES: custom_type TYPE ...,
       BEGIN OF structure_type,
         field1 TYPE type1,
         field2 TYPE type2,
       END OF structure_type.
```

### Global Constants

```abap
CONSTANTS: constant_name TYPE type VALUE value.
```

### Common Subroutines

```abap
FORM subroutine_name
  USING    parameter1 TYPE type1
  CHANGING parameter2 TYPE type2.
  " Subroutine logic
ENDFORM.
```

## Use Cases

### 1. Function Group Analysis
Understand the overall structure and global data of a function group.

### 2. Global Data Review
Review shared data declarations used across function modules.

### 3. Initialization Logic
Examine initialization routines and setup code.

### 4. Common Subroutines
Identify reusable subroutines shared by function modules.

### 5. Migration Planning
Analyze function groups before migrating to ABAP OO.

### 6. Documentation Generation
Extract function group specifications for documentation.

### 7. Refactoring Support
Understand function group structure before refactoring.

## Best Practices

1. **Cache Results**: Function group code doesn't change frequently
2. **Error Handling**: Always check for errors before processing
3. **Authorization**: Ensure users have appropriate S_DEVELOP authorization
4. **Naming Conventions**: Use uppercase for function group names
5. **Combine with GetFunction**: Use together to get complete picture
6. **Consider Modernization**: Evaluate converting to ABAP OO classes

## Integration Examples

### With GetFunction Tool

```javascript
// 1. Get function group main program
const functionGroup = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetFunctionGroup",
  arguments: {
    function_group: "ZFINANCE"
  }
});

// 2. Get specific function modules
const function1 = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetFunction",
  arguments: {
    function_name: "Z_CALCULATE_VAT",
    function_group: "ZFINANCE"
  }
});

// Now you have both global declarations and function implementation
```

### With SearchObject Tool

```javascript
// 1. Search for function groups
const searchResults = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "SearchObject",
  arguments: {
    query: "Z*",
    maxResults: 50
  }
});

// 2. Retrieve specific function group
const functionGroup = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetFunctionGroup",
  arguments: {
    function_group: "ZFINANCE"
  }
});
```

### Complete Function Group Analysis

```javascript
// Analyze complete function group structure
async function analyzeFunctionGroup(groupName) {
  // 1. Get main program
  const mainProgram = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "GetFunctionGroup",
    arguments: {
      function_group: groupName
    }
  });
  
  // 2. Extract global data declarations
  const globalData = mainProgram.data.match(/DATA:[\s\S]*?(?=\n\n|\nFORM|\nFUNCTION)/g);
  
  // 3. Extract subroutines
  const subroutines = mainProgram.data.match(/FORM\s+\w+[\s\S]*?ENDFORM\./g);
  
  return {
    mainProgram: mainProgram.data,
    globalData,
    subroutines
  };
}
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/functions/groups/{function_group}/source/main` - Retrieve function group main program

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

## Function Group Components

### Main Program (SAPL{function_group})
The main program retrieved by this tool containing:
- Global declarations
- Initialization logic
- Common subroutines

### Function Modules
Individual function modules within the group (retrieved separately with GetFunction tool).

### Include Programs
Additional include programs for:
- Top include (global declarations)
- UXX includes (function module implementations)
- Form includes (subroutines)

### Screens and GUI
Screen definitions and GUI status (not retrieved by this tool).

## Limitations

1. **Main Program Only**: Returns only the main program, not individual function modules
2. **No Metadata**: Returns source code only, not function group attributes
3. **Active Version**: Returns the active version, not inactive changes
4. **No Includes**: Does not return separate include files
5. **No Screens**: Does not return screen definitions or GUI status
6. **Text Format**: Returns plain text, requires parsing for structured analysis

## Performance Considerations

- **Response Size**: Large function groups may take longer to retrieve
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching for frequently accessed function groups

## Troubleshooting

### Function Group Not Found
- Verify the function group name is correct
- Check that the function group exists in the system
- Ensure the function group is activated

### Empty or Minimal Response
- Some function groups may have minimal main programs
- Most logic may be in function modules or includes
- Use GetFunction to retrieve individual function modules

### Authorization Issues
- Verify S_DEVELOP authorization with ACTVT=03
- Check authorization for the specific function group package

## Related Tools

- **GetFunction**: Retrieve individual function modules within the group
- **GetInclude**: Retrieve include programs used by the function group
- **GetProgram**: Retrieve programs that call functions from this group
- **CheckSyntax**: Validate function group syntax
- **SearchObject**: Search for function groups by name pattern

## Version History

- **v1.0**: Initial implementation with basic function group retrieval
- **v1.1**: Enhanced error handling and timeout management
- **v1.2**: Improved character encoding support

## Additional Notes

- Function group names are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the function group name
- Timeout is set to 30 seconds for large function group retrievals
- The response includes all comments and documentation within the source code
- Function groups are containers for related function modules
- The main program name follows the pattern SAPL{function_group}
- Consider modernizing function groups to ABAP OO classes for new development
- Function groups provide a way to share global data across function modules