# GetProgram Tool Documentation

## Overview

The `GetProgram` tool retrieves the complete source code of an ABAP program (report) from the SAP system via the ADT (ABAP Development Tools) API. It returns the main program source including all statements, data declarations, and logic.

## Endpoint

```
GET /sap/bc/adt/programs/programs/{program_name}/source/main
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `program_name` | string | Yes | Name of the ABAP program to retrieve |

## Response Structure

The tool returns the complete ABAP program source code as plain text, including:

- Program declarations (REPORT, PROGRAM statements)
- Data declarations (DATA, TYPES, CONSTANTS)
- Selection screens (PARAMETERS, SELECT-OPTIONS)
- Event blocks (START-OF-SELECTION, END-OF-SELECTION, etc.)
- Subroutines (FORM...ENDFORM)
- All program logic and statements

### Example Response

```abap
REPORT zmy_report.

*&---------------------------------------------------------------------*
*& Report ZMY_REPORT
*& Description: Sample report for data processing
*&---------------------------------------------------------------------*

TABLES: mara, marc.

PARAMETERS: p_matnr TYPE mara-matnr OBLIGATORY,
            p_werks TYPE marc-werks.

SELECT-OPTIONS: s_mtart FOR mara-mtart.

DATA: gt_materials TYPE TABLE OF mara,
      gs_material  TYPE mara,
      gv_count     TYPE i.

START-OF-SELECTION.

  PERFORM get_materials.
  PERFORM display_results.

END-OF-SELECTION.

*&---------------------------------------------------------------------*
*& Form get_materials
*&---------------------------------------------------------------------*
FORM get_materials.
  SELECT * FROM mara
    INTO TABLE gt_materials
    WHERE matnr = p_matnr
      AND mtart IN s_mtart.
  
  gv_count = lines( gt_materials ).
ENDFORM.

*&---------------------------------------------------------------------*
*& Form display_results
*&---------------------------------------------------------------------*
FORM display_results.
  WRITE: / 'Materials found:', gv_count.
  
  LOOP AT gt_materials INTO gs_material.
    WRITE: / gs_material-matnr, gs_material-maktx.
  ENDLOOP.
ENDFORM.
```

## Usage Examples

### Example 1: Retrieve a Standard Report

```json
{
  "program_name": "RSUSR002"
}
```

### Example 2: Retrieve a Custom Report

```json
{
  "program_name": "ZMY_REPORT"
}
```

### Example 3: Retrieve a Module Pool Program

```json
{
  "program_name": "SAPMV45A"
}
```

## Response Format

### Success Response

The tool returns the raw ABAP program source code as a text string:

```
REPORT zmy_report.
[Complete program source code]
```

### Error Response Examples

**Missing Program Name**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Program name is required"
  }]
}
```

**Program Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Program not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read program"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Program Name**: If `program_name` parameter is not provided
2. **Program Not Found**: If the specified program doesn't exist in the system
3. **Authorization Error**: If the user doesn't have permission to read the program (requires S_DEVELOP authorization with ACTVT=03)
4. **Network Issues**: Connection problems with the SAP system
5. **Invalid Program Name**: If the program name contains invalid characters

## Program Types

### Executable Programs (Type 1)
Reports that can be executed directly via transaction SE38 or menu.

### Module Pool (Type M)
Dialog programs used with screen transactions.

### Include Programs (Type I)
Reusable code segments included in other programs.

### Subroutine Pool (Type S)
Programs containing only subroutines for external calls.

### Function Group (Type F)
Container programs for function modules.

### Interface Pool (Type J)
Programs for class interfaces.

## Use Cases

### 1. Code Review and Analysis
Retrieve program source code for manual or automated code review.

### 2. Documentation Generation
Extract program logic to generate technical documentation.

### 3. Code Migration
Retrieve source code for migration to other systems or backup.

### 4. Learning and Training
Study existing program implementations to learn ABAP patterns.

### 5. Refactoring Support
Analyze program structure before making refactoring decisions.

### 6. Template Creation
Use existing programs as templates for creating new programs.

### 7. Impact Analysis
Examine program logic to understand dependencies.

## Best Practices

1. **Cache Results**: Program source code doesn't change frequently, consider caching
2. **Error Handling**: Always check for errors before processing the returned source code
3. **Authorization**: Ensure users have appropriate S_DEVELOP authorization
4. **Naming Conventions**: Use uppercase for program names (automatically handled)
5. **Combine with Other Tools**: Use with CheckSyntax or SearchObject for comprehensive analysis

## Integration Examples

### With CheckSyntax Tool

```javascript
// 1. Retrieve program source code
const programSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetProgram",
  arguments: {
    program_name: "ZMY_REPORT"
  }
});

// 2. Validate syntax
const syntaxCheck = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "CheckSyntax",
  arguments: {
    source_code: programSource.data,
    object_name: "ZMY_REPORT",
    object_type: "PROG"
  }
});
```

### With SearchObject Tool

```javascript
// 1. Search for programs
const searchResults = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "SearchObject",
  arguments: {
    query: "Z*REPORT*",
    maxResults: 50
  }
});

// 2. Retrieve specific program
const program = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetProgram",
  arguments: {
    program_name: "ZMY_REPORT"
  }
});
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/programs/programs/{program_name}/source/main` - Retrieve program source

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

## Program Structure Elements

### Report Declaration
```abap
REPORT program_name [NO STANDARD PAGE HEADING] [LINE-SIZE n] [LINE-COUNT n].
```

### Data Declarations
```abap
DATA: variable TYPE type,
      table TYPE TABLE OF structure.
TYPES: custom_type TYPE ...
CONSTANTS: constant TYPE type VALUE value.
```

### Selection Screen
```abap
PARAMETERS: p_param TYPE type [OBLIGATORY] [DEFAULT value].
SELECT-OPTIONS: s_option FOR field [OBLIGATORY].
```

### Event Blocks
```abap
INITIALIZATION.
AT SELECTION-SCREEN.
START-OF-SELECTION.
END-OF-SELECTION.
TOP-OF-PAGE.
```

### Subroutines
```abap
FORM subroutine_name [USING...] [CHANGING...].
  " Logic here
ENDFORM.
```

## Limitations

1. **Main Source Only**: Returns only the main program source, not includes
2. **No Metadata**: Returns source code only, not program attributes
3. **Active Version**: Returns the active version, not inactive changes
4. **No Screen Definitions**: Does not return screen painter definitions for module pools
5. **Text Format**: Returns plain text, requires parsing for structured analysis

## Performance Considerations

- **Response Size**: Large programs may take longer to retrieve
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching for frequently accessed programs

## Related Tools

- **GetInclude**: Retrieve include programs referenced in the main program
- **GetFunction**: Retrieve function modules called by the program
- **CheckSyntax**: Validate the syntax of retrieved source code
- **SearchObject**: Search for programs by name pattern
- **GetClass**: Retrieve classes used by the program

## Version History

- **v1.0**: Initial implementation with basic program retrieval
- **v1.1**: Enhanced error handling and timeout management
- **v1.2**: Improved character encoding support

## Additional Notes

- Program names are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the program name
- Timeout is set to 30 seconds for large program retrievals
- The response includes all comments and documentation within the source code
- For module pools, only the main program source is returned (not screens or GUI status)
- Include programs must be retrieved separately using the GetInclude tool