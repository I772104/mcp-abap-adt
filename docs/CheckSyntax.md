# CheckSyntax Tool

The CheckSyntax tool provides comprehensive ABAP source code syntax validation using SAP ADT (ABAP Development Tools) infrastructure. This tool helps developers identify syntax errors, warnings, and other issues in ABAP code before deployment.

## Features

- **Automatic Object Type Detection**: Intelligently detects ABAP object types (Classes, Programs, Function Modules, etc.) from source code patterns
- **Comprehensive Error Reporting**: Returns detailed syntax errors with line numbers, error messages, and severity levels
- **Multiple Object Type Support**: Works with Classes, Programs, Function Modules, Interfaces, and other ABAP objects
- **Structured Response Format**: Provides both parsed results and raw ADT response for detailed analysis

## Usage

### Basic Syntax Check

```json
{
  "source_code": "CLASS zcl_example DEFINITION PUBLIC.\n  PUBLIC SECTION.\n    METHODS: hello_world.\nENDCLASS."
}
```

### With Object Information

```json
{
  "source_code": "REPORT ztest_program.\nWRITE: 'Hello World'.",
  "object_name": "ZTEST_PROGRAM",
  "object_type": "PROG"
}
```

### Class Definition Example

```json
{
  "source_code": "CLASS ltc_test_double DEFINITION FOR TESTING FRIENDS lcl_util_helper.\n  PUBLIC SECTION.\n    INTERFACES: lif_util_helper PARTIALLY IMPLEMENTED.\n    DATA: mv_test_case TYPE numc2.\nENDCLASS.",
  "object_name": "LTC_TEST_DOUBLE",
  "object_type": "CLAS"
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source_code` | string | Yes | ABAP source code to check for syntax errors |
| `object_name` | string | No | Name of the ABAP object (improves error reporting) |
| `object_type` | string | No | ABAP object type (CLAS, PROG, FUGR, etc.) - auto-detected if not provided |

## Supported Object Types

The tool automatically detects and supports various ABAP object types:

- **CLAS/OC** - Classes (detected by `CLASS ... DEFINITION`)
- **INTF/OI** - Interfaces (detected by `INTERFACE ... DEFINITION`)
- **PROG/P** - Programs/Reports (detected by `REPORT` or `PROGRAM`)
- **FUGR/FF** - Function Modules (detected by `FUNCTION ... ENDFUNCTION`)

## Response Format

The tool returns a structured response containing:

```json
{
  "syntaxCheck": {
    "status": "success|warning|error",
    "errors": [
      {
        "type": "error",
        "message": "Error description",
        "line": "line_number",
        "severity": "error"
      }
    ],
    "warnings": [
      {
        "type": "warning", 
        "message": "Warning description",
        "line": "line_number",
        "severity": "warning"
      }
    ],
    "info": [],
    "summary": {
      "totalIssues": 0,
      "errorCount": 0,
      "warningCount": 0,
      "infoCount": 0
    }
  },
  "rawResponse": "Raw ADT XML response",
  "requestInfo": {
    "objectName": "Object name used",
    "objectType": "Object type used",
    "connectionId": "Unique connection ID",
    "requestId": "Unique request ID",
    "timestamp": "2024-01-21T08:00:00.000Z"
  }
}
```

## Status Codes

- **success**: No syntax errors or warnings found
- **warning**: Code compiles but has warnings
- **error**: Syntax errors prevent compilation

## Example Scenarios

### 1. Valid ABAP Class

```json
{
  "source_code": "CLASS zcl_hello DEFINITION PUBLIC FINAL CREATE PUBLIC.\n  PUBLIC SECTION.\n    METHODS: hello.\nENDCLASS.\n\nCLASS zcl_hello IMPLEMENTATION.\n  METHOD hello.\n    WRITE: 'Hello World'.\n  ENDMETHOD.\nENDCLASS."
}
```

**Response**: Status "success" with no errors.

### 2. ABAP Code with Syntax Error

```json
{
  "source_code": "CLASS zcl_error DEFINITION.\n  PUBLIC SECTION\n    METHODS: test.\nENDCLASS."
}
```

**Response**: Status "error" with missing period syntax error.

### 3. ABAP Program with Warning

```json
{
  "source_code": "REPORT ztest.\nDATA: lv_unused TYPE string.\nWRITE: 'Hello'."
}
```

**Response**: Status "warning" with unused variable warning.

## Integration with Other Tools

The CheckSyntax tool works well with other MCP ABAP ADT tools:

1. **GetClass** + **CheckSyntax**: Retrieve class source and validate syntax
2. **CheckSyntax** + **RunClassTests**: Validate syntax before running tests
3. **SearchObject** + **CheckSyntax**: Find objects and validate their syntax

### Example Workflow

```javascript
// 1. Get class source code
const classSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClass",
  arguments: { class_name: "ZCL_EXAMPLE" }
});

// 2. Check syntax
const syntaxResult = await use_mcp_tool({
  server_name: "mcp-abap-adt-1", 
  tool_name: "CheckSyntax",
  arguments: {
    source_code: classSource.data,
    object_name: "ZCL_EXAMPLE",
    object_type: "CLAS"
  }
});
```

## Error Handling

The tool provides comprehensive error handling:

- **Invalid Parameters**: Returns clear error messages for missing required parameters
- **Connection Issues**: Handles SAP system connectivity problems
- **Authentication Errors**: Manages CSRF token and authentication failures
- **Parsing Errors**: Gracefully handles unexpected ADT responses

## Technical Implementation

### ADT Endpoint
- **URL**: `/sap/bc/adt/checkruns`
- **Method**: POST
- **Content-Type**: `application/vnd.sap.adt.checkobjects+xml`
- **Accept**: `application/vnd.sap.adt.checkmessages+xml`

### XML Payload Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun" xmlns:adtcore="http://www.sap.com/adt/core">
    <chkrun:checkObject adtcore:name="OBJECT_NAME" adtcore:type="OBJECT_TYPE" chkrun:version="active">
        <chkrun:source>ABAP_SOURCE_CODE</chkrun:source>
    </chkrun:checkObject>
</chkrun:checkObjectList>
```

## Troubleshooting

### Common Issues

1. **CSRF Token Errors**
   - The tool automatically handles CSRF token management
   - Uses multiple fallback endpoints for token retrieval

2. **Object Type Detection**
   - If auto-detection fails, explicitly provide the `object_type` parameter
   - Ensure source code contains clear object definition patterns

3. **Large Source Code**
   - Tool handles large ABAP programs and classes
   - XML encoding automatically escapes special characters

4. **SAP System Connectivity**
   - Ensure ADT services are enabled in the target SAP system
   - Verify network connectivity and authentication credentials

### Debug Information

The tool provides detailed logging:
- Connection IDs for request tracing
- Raw ADT responses for detailed analysis
- Timestamp information for performance monitoring

## Best Practices

1. **Always validate syntax** before deploying ABAP code to production systems
2. **Use specific object names** for better error reporting and traceability
3. **Check both errors and warnings** to ensure code quality
4. **Combine with unit testing** tools for comprehensive quality assurance
5. **Review raw responses** for detailed SAP system feedback when needed

## Version History

- **v1.0**: Initial implementation with basic syntax checking
- **v1.1**: Added comprehensive error parsing and object type detection
- **v1.2**: Enhanced CSRF token handling and multiple endpoint support
