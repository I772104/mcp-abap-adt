# GetClassInclude Tool Documentation

## Overview

The `GetClassInclude` tool retrieves a specific include from an ABAP class. This provides fine-grained access to individual class components such as local class definitions (CCDEF), implementations (CCIMP), macros (CCMAC), and test classes (CCAU).

## Purpose

In ABAP, classes can have multiple includes beyond the main source:

- **Main**: Global class definition and implementation
- **Definitions** (CCDEF): Local class definitions, types, and interfaces  
- **Implementations** (CCIMP): Local class implementations (e.g., `lcl_helper` implementations)
- **Macros** (CCMAC): Macro definitions used within the class
- **Test classes** (CCAU): Unit test class definitions and implementations

For many real-world ABAP classes, the local includes contain the majority of the code. `GetClassInclude` allows you to fetch these includes individually.

## Endpoints

```
GET /sap/bc/adt/oo/classes/{class_name}/source/main
GET /sap/bc/adt/oo/classes/{class_name}/includes/definitions
GET /sap/bc/adt/oo/classes/{class_name}/includes/implementations
GET /sap/bc/adt/oo/classes/{class_name}/includes/macros
GET /sap/bc/adt/oo/classes/{class_name}/includes/testclasses
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `class_name` | string | Yes | Name of the ABAP class |
| `include_type` | string (enum) | Yes | Type of include to fetch: `'definitions'`, `'implementations'`, `'macros'`, `'testclasses'`, or `'main'` |

### Include Types

| Type | ABAP Name | Description |
|------|-----------|-------------|
| `definitions` | CCDEF | Local class definitions, types, interfaces |
| `implementations` | CCIMP | Local class implementations |
| `macros` | CCMAC | Macro definitions |
| `testclasses` | CCAU | Unit test classes |
| `main` | Main | Global class definition and implementation |

## Response Structure

Returns the requested include source code as plain text. If the include doesn't exist (which is normal if not used), returns a helpful message:

```
// Include 'implementations' not found for class CL_MY_CLASS
// This is normal if the class does not use implementations
```

## Usage Examples

### Example 1: Get Local Class Implementations

```json
{
  "class_name": "CL_ABAP_UNIT_ASSERT",
  "include_type": "implementations"
}
```

**Use case**: Retrieve helper class implementations that contain the actual logic.

### Example 2: Get Local Type Definitions

```json
{
  "class_name": "ZCL_DATA_PROCESSOR",
  "include_type": "definitions"
}
```

**Use case**: See local type definitions and interfaces without the main class or implementations.

### Example 3: Get Test Classes

```json
{
  "class_name": "ZCL_MY_CLASS",
  "include_type": "testclasses"
}
```

**Use case**: Retrieve unit test classes. Note: `GetClassTests` is a convenience wrapper for this.

### Example 4: Get Macros

```json
{
  "class_name": "CL_ABAP_COMPILER",
  "include_type": "macros"
}
```

**Use case**: Retrieve macro definitions used in the class.

### Example 5: Get Main Source

```json
{
  "class_name": "ZCL_MY_CLASS",
  "include_type": "main"
}
```

**Use case**: Same as `GetClass` default behavior, but explicitly requests main source.

## Response Format

### Success Response

Plain text with the ABAP source code:

```abap
CLASS lcl_helper DEFINITION.
  PUBLIC SECTION.
    METHODS process
      IMPORTING iv_data TYPE string
      RETURNING VALUE(rv_result) TYPE string.
ENDCLASS.

CLASS lcl_helper IMPLEMENTATION.
  METHOD process.
    rv_result = |Processed: { iv_data }|.
  ENDMETHOD.
ENDCLASS.
```

### Include Not Found (Normal)

```
// Include 'macros' not found for class ZCL_MY_CLASS
// This is normal if the class does not use macros
```

This is **not an error** - many classes don't use all include types.

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

**Invalid Include Type**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Invalid include type 'invalid'. Valid types: definitions, implementations, macros, testclasses, main"
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

The tool handles these scenarios:

1. **Missing Parameters**: Returns error if `class_name` or `include_type` not provided
2. **Invalid Include Type**: Validates against enum values
3. **Class Not Found**: Returns 404 error if class doesn't exist
4. **Include Not Found**: Returns helpful message (not an error)
5. **Authorization Error**: Requires S_DEVELOP with ACTVT=03 (display)
6. **Network Issues**: Connection problems with SAP system

## Use Cases

### 1. Focused Code Review

Review only local implementations without the noise of the main class definition:

```json
{
  "class_name": "ZCL_COMPLEX_CLASS",
  "include_type": "implementations"
}
```

### 2. Type Definition Analysis

Extract local type definitions to understand data structures:

```json
{
  "class_name": "ZCL_MY_CLASS",
  "include_type": "definitions"
}
```

### 3. Test-Driven Development

Fetch test classes separately to focus on test coverage:

```json
{
  "class_name": "ZCL_MY_CLASS",
  "include_type": "testclasses"
}
```

### 4. Macro Documentation

Document macro definitions used in legacy code:

```json
{
  "class_name": "CL_OLD_CLASS",
  "include_type": "macros"
}
```

### 5. Incremental Loading

Load class components on-demand rather than fetching everything at once, improving performance for large classes.

## Best Practices

1. **Check for Missing Includes**: Not all classes have all includes - handle null responses gracefully
2. **Use Specific Includes**: Request only what you need for better performance
3. **Combine with GetClass**: Use `GetClass` with `include_types=['all']` for complete class retrieval
4. **Authorization**: Ensure S_DEVELOP authorization with ACTVT=03 (display)
5. **Error Handling**: Always check for errors before processing source code

## Integration Examples

### Sequential Include Loading

```javascript
// Load includes one at a time as needed
const definitions = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetClassInclude",
  arguments: {
    class_name: "ZCL_MY_CLASS",
    include_type: "definitions"
  }
});

// If definitions exist, load implementations
if (!definitions.includes("not found")) {
  const implementations = await use_mcp_tool({
    server_name: "mcp-abap-adt",
    tool_name: "GetClassInclude",
    arguments: {
      class_name: "ZCL_MY_CLASS",
      include_type: "implementations"
    }
  });
}
```

### With GetClass for Complete View

```javascript
// Get main source with GetClass
const main = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetClass",
  arguments: { class_name: "ZCL_MY_CLASS" }
});

// Get specific include for detailed analysis
const localImpl = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetClassInclude",
  arguments: {
    class_name: "ZCL_MY_CLASS",
    include_type: "implementations"
  }
});
```

## Technical Implementation

### Request Headers
- `Accept: text/plain` - Request plain text response
- `x-csrf-token: fetch` - CSRF token for security

### Response Format
- Content-Type: `text/plain`
- Character encoding: UTF-8
- Line endings: System-dependent

### Security Considerations
- **Authorization Required**: S_DEVELOP with ACTVT=03 (display)
- **Object-Level Security**: Additional authorization objects may apply
- **CSRF Protection**: Automatic token management

## Performance Considerations

- **Single Request**: Each call fetches one include (fast, ~100ms)
- **Network Latency**: Response time depends on connection to SAP system
- **Caching**: Consider caching for frequently accessed includes
- **Lightweight**: More efficient than fetching all includes when you only need one

## Comparison with Related Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `GetClass` | Fetch main source (or multiple includes) | Default choice, backward compatible |
| `GetClassInclude` | Fetch specific single include | When you need fine-grained control |
| `GetClassTests` | Convenience wrapper for test classes | Specifically for test classes only |

**Rule of thumb**:
- Need main source only? Use `GetClass` (default)
- Need all includes? Use `GetClass` with `include_types: ['all']`
- Need one specific include? Use `GetClassInclude`
- Need test classes? Use `GetClassTests` (convenience) or `GetClassInclude`

## Related Tools

- **GetClass**: Retrieve main source or multiple includes at once
- **GetClassTests**: Convenience wrapper for fetching test classes
- **GetClassCoverage**: Run tests and analyze coverage
- **CheckSyntax**: Validate syntax of retrieved source code
- **SearchObject**: Find classes by name pattern

## Limitations

1. **Single Include**: Returns one include at a time (use `GetClass` for multiple)
2. **Active Version**: Returns active version only, not inactive changes
3. **No Metadata**: Returns source code only, not metadata
4. **Plain Text**: Requires parsing for structured analysis

## Version History

- **v1.2**: Initial implementation with multi-include support

## Additional Notes

- Include names are case-insensitive but stored internally with specific casing
- The tool automatically URL-encodes the class name
- Timeout is set to 30 seconds
- Missing includes return helpful messages, not errors
- All includes support UTF-8 encoding and Unicode characters
