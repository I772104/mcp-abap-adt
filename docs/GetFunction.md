# GetFunction Tool Documentation

## Overview

The `GetFunction` tool retrieves the complete source code of an ABAP function module from the SAP system via the ADT (ABAP Development Tools) API. It returns the function module implementation including interface parameters, exceptions, and the complete source code.

## Endpoint

```
GET /sap/bc/adt/functions/groups/{function_group}/fmodules/{function_name}/source/main
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `function_name` | string | Yes | Name of the function module to retrieve |
| `function_group` | string | Yes | Name of the function group containing the function module |

## Response Structure

The tool returns the complete ABAP function module source code as plain text, including:

- Function module signature (IMPORTING, EXPORTING, CHANGING, TABLES parameters)
- Exception definitions
- Local data declarations
- Function module implementation logic

### Example Response

```abap
FUNCTION z_calculate_vat.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING
*"     VALUE(IV_AMOUNT) TYPE  P DECIMALS 2
*"     VALUE(IV_RATE) TYPE  P DECIMALS 2 DEFAULT '0.19'
*"  EXPORTING
*"     VALUE(EV_VAT_AMOUNT) TYPE  P DECIMALS 2
*"     VALUE(EV_TOTAL) TYPE  P DECIMALS 2
*"  EXCEPTIONS
*"      INVALID_AMOUNT
*"      INVALID_RATE
*"----------------------------------------------------------------------

  " Local data declarations
  DATA: lv_vat TYPE p DECIMALS 2.

  " Validate input
  IF iv_amount < 0.
    RAISE invalid_amount.
  ENDIF.

  IF iv_rate < 0 OR iv_rate > 1.
    RAISE invalid_rate.
  ENDIF.

  " Calculate VAT
  lv_vat = iv_amount * iv_rate.
  ev_vat_amount = lv_vat.
  ev_total = iv_amount + lv_vat.

ENDFUNCTION.
```

## Usage Examples

### Example 1: Retrieve a Standard Function Module

```json
{
  "function_name": "BAPI_USER_GET_DETAIL",
  "function_group": "BAPI_USER"
}
```

### Example 2: Retrieve a Custom Function Module

```json
{
  "function_name": "Z_CALCULATE_VAT",
  "function_group": "ZFINANCE"
}
```

### Example 3: Retrieve Function for Analysis

```json
{
  "function_name": "Z_PROCESS_DATA",
  "function_group": "ZDATA_PROCESSING"
}
```

## Response Format

### Success Response

The tool returns the raw ABAP function module source code as a text string:

```
FUNCTION z_calculate_vat.
[Complete function module source code]
ENDFUNCTION.
```

### Error Response Examples

**Missing Parameters**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Function name and group are required"
  }]
}
```

**Function Module Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Function module not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read function module"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Parameters**: If `function_name` or `function_group` parameter is not provided
2. **Function Not Found**: If the specified function module doesn't exist in the function group
3. **Function Group Not Found**: If the specified function group doesn't exist
4. **Authorization Error**: If the user doesn't have permission to read the function module (requires S_DEVELOP authorization with ACTVT=03)
5. **Network Issues**: Connection problems with the SAP system

## Function Module Structure

### Function Signature

```abap
FUNCTION function_name.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING
*"     [VALUE(parameter) TYPE type] [OPTIONAL] [DEFAULT value]
*"  EXPORTING
*"     [VALUE(parameter) TYPE type]
*"  CHANGING
*"     [VALUE(parameter) TYPE type]
*"  TABLES
*"     table_parameter [STRUCTURE structure | TYPE type]
*"  EXCEPTIONS
*"     exception_name
*"----------------------------------------------------------------------
```

### Parameter Types

**IMPORTING Parameters:**
- Input parameters passed to the function
- Can be optional with default values
- Passed by value or reference

**EXPORTING Parameters:**
- Output parameters returned by the function
- Always passed by value

**CHANGING Parameters:**
- Input/output parameters
- Modified by the function and returned
- Can be passed by value or reference

**TABLES Parameters:**
- Legacy table parameters (deprecated in new code)
- Used for passing internal tables

### Exception Handling

```abap
EXCEPTIONS
  exception_name_1
  exception_name_2.
```

Raised using:
```abap
RAISE exception_name.
```

Or with message:
```abap
MESSAGE e001(message_class) RAISING exception_name.
```

## Use Cases

### 1. Code Review and Analysis
Review function module logic and implementation.

### 2. Documentation Generation
Extract function specifications for technical documentation.

### 3. Migration Support
Retrieve function modules for migration or modernization.

### 4. Learning and Training
Study function module patterns and best practices.

### 5. Refactoring Planning
Analyze function logic before refactoring to classes.

### 6. Interface Analysis
Understand function parameters and exceptions.

### 7. Dependency Analysis
Examine function calls and dependencies.

## Best Practices

1. **Specify Both Parameters**: Always provide both function_name and function_group
2. **Cache Results**: Function module code doesn't change frequently
3. **Error Handling**: Check for errors before processing the returned source code
4. **Authorization**: Ensure users have appropriate S_DEVELOP authorization
5. **Naming Conventions**: Use uppercase for function names
6. **Consider Modernization**: Evaluate converting function modules to classes

## Integration Examples

### With GetFunctionGroup Tool

```javascript
// 1. Get function group main program
const functionGroup = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetFunctionGroup",
  arguments: {
    function_group: "ZFINANCE"
  }
});

// 2. Get specific function module
const functionModule = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetFunction",
  arguments: {
    function_name: "Z_CALCULATE_VAT",
    function_group: "ZFINANCE"
  }
});
```

### With CheckSyntax Tool

```javascript
// 1. Retrieve function module
const functionSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetFunction",
  arguments: {
    function_name: "Z_MY_FUNCTION",
    function_group: "ZUTILS"
  }
});

// 2. Validate syntax
const syntaxCheck = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "CheckSyntax",
  arguments: {
    source_code: functionSource.data,
    object_name: "Z_MY_FUNCTION",
    object_type: "FUGR"
  }
});
```

### With SearchObject Tool

```javascript
// 1. Search for function groups
const searchResults = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "SearchObject",
  arguments: {
    query: "Z*FINANCE*",
    maxResults: 50
  }
});

// 2. Retrieve function from found group
const functionModule = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetFunction",
  arguments: {
    function_name: "Z_CALCULATE_VAT",
    function_group: "ZFINANCE"
  }
});
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/functions/groups/{function_group}/fmodules/{function_name}/source/main` - Retrieve function source

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

## Function Module Patterns

### Simple Calculation Function
```abap
FUNCTION z_calculate.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING VALUE(iv_value1) TYPE i
*"            VALUE(iv_value2) TYPE i
*"  EXPORTING VALUE(ev_result) TYPE i
*"----------------------------------------------------------------------
  ev_result = iv_value1 + iv_value2.
ENDFUNCTION.
```

### Data Retrieval Function
```abap
FUNCTION z_get_data.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING VALUE(iv_id) TYPE string
*"  EXPORTING VALUE(et_data) TYPE tt_data
*"  EXCEPTIONS not_found
*"----------------------------------------------------------------------
  SELECT * FROM ztable
    INTO TABLE et_data
    WHERE id = iv_id.
  
  IF sy-subrc <> 0.
    RAISE not_found.
  ENDIF.
ENDFUNCTION.
```

### Validation Function
```abap
FUNCTION z_validate.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING VALUE(iv_data) TYPE string
*"  EXPORTING VALUE(ev_valid) TYPE abap_bool
*"            VALUE(ev_message) TYPE string
*"----------------------------------------------------------------------
  ev_valid = abap_true.
  
  IF iv_data IS INITIAL.
    ev_valid = abap_false.
    ev_message = 'Data is required'.
  ENDIF.
ENDFUNCTION.
```

## Limitations

1. **Function Module Only**: Returns only the function module source, not the entire function group
2. **No Metadata**: Returns source code only, not function attributes
3. **Active Version**: Returns the active version, not inactive changes
4. **No Includes**: Does not return separate include files
5. **Text Format**: Returns plain text, requires parsing for structured analysis

## Performance Considerations

- **Response Size**: Large function modules may take longer to retrieve
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching for frequently accessed functions

## Troubleshooting

### Function Not Found
- Verify both function name and function group are correct
- Check that the function exists in the specified group
- Ensure the function is activated

### Wrong Function Group
- Use transaction SE37 to verify the correct function group
- Function groups are case-insensitive but typically uppercase

### Authorization Issues
- Verify S_DEVELOP authorization with ACTVT=03
- Check authorization for the specific function group package

## Related Tools

- **GetFunctionGroup**: Retrieve the function group main program
- **GetProgram**: Retrieve programs that call the function
- **CheckSyntax**: Validate function module syntax
- **SearchObject**: Search for function modules by name pattern
- **GetInclude**: Retrieve include programs used by the function group

## Version History

- **v1.0**: Initial implementation with basic function retrieval
- **v1.1**: Enhanced error handling for missing parameters
- **v1.2**: Improved character encoding support

## Additional Notes

- Function names are case-insensitive but typically stored in uppercase
- Both function_name and function_group are required parameters
- The tool automatically URL-encodes both parameters
- Timeout is set to 30 seconds for large function retrievals
- The response includes all comments and documentation within the source code
- Function modules are part of function groups (containers)
- Consider modernizing function modules to ABAP OO classes for new development