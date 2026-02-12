# GetStructure Tool Documentation

## Overview

The `GetStructure` tool retrieves the definition of an ABAP structure (DDIC structure) from the SAP system via the ADT (ABAP Development Tools) API. It returns the complete structure definition including all fields, data types, and technical attributes.

## Endpoint

```
GET /sap/bc/adt/ddic/structures/{structure_name}/source/main
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `structure_name` | string | Yes | Name of the ABAP structure to retrieve |

## Response Structure

The tool returns the complete ABAP structure definition in ABAP source format, including:

- Structure name and description
- Component fields with data types
- Field lengths and decimals
- Include structures
- Technical settings

### Example Response

```abap
@EndUserText.label : 'Customer Data Structure'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
define structure zcustomer_data {
  customer_id   : abap.char(10);
  customer_name : abap.char(40);
  email         : abap.char(50);
  phone         : abap.char(20);
  address       : abap.char(100);
  city          : abap.char(40);
  postal_code   : abap.char(10);
  country       : abap.char(3);
  created_date  : abap.dats;
  created_by    : abap.char(12);
  changed_date  : abap.dats;
  changed_by    : abap.char(12);
  status        : abap.char(1);
  credit_limit  : abap.curr(15,2);
  currency      : abap.cuky(5);
}
```

## Usage Examples

### Example 1: Retrieve a Standard Structure

```json
{
  "structure_name": "BAPIRET2"
}
```

### Example 2: Retrieve a Custom Structure

```json
{
  "structure_name": "ZCUSTOMER_DATA"
}
```

### Example 3: Retrieve Structure for Type Definition

```json
{
  "structure_name": "ZORDER_HEADER"
}
```

## Response Format

### Success Response

The tool returns the structure definition in ABAP DDL or traditional ABAP format:

```
define structure zcustomer_data {
  [Complete structure definition]
}
```

### Error Response Examples

**Missing Structure Name**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Structure name is required"
  }]
}
```

**Structure Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Structure not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read structure"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Structure Name**: If `structure_name` parameter is not provided
2. **Structure Not Found**: If the specified structure doesn't exist in the system
3. **Authorization Error**: If the user doesn't have permission to read the structure (requires S_DEVELOP authorization with ACTVT=03)
4. **Network Issues**: Connection problems with the SAP system
5. **Invalid Structure Name**: If the structure name contains invalid characters

## Structure Components

### Field Definition

Each field in a structure includes:
- **Field Name**: Component identifier
- **Data Type**: ABAP data type or reference to data element
- **Length**: Field length (for CHAR, NUMC, etc.)
- **Decimals**: Decimal places (for numeric types)
- **Description**: Field description (from data element)

### Include Structures

Structures can include other structures:
```abap
.include structure_name
```

### Nested Structures

Structures can contain other structures as components:
```abap
nested_component : other_structure;
```

## Use Cases

### 1. Data Modeling
Understand structure definitions for data modeling and design.

### 2. Type Definition
Use structure definitions to create typed variables in ABAP programs.

### 3. Interface Design
Review structure definitions for interface parameters.

### 4. Documentation Generation
Extract structure specifications for technical documentation.

### 5. Data Migration
Understand structure layout for data migration projects.

### 6. API Development
Use structure definitions for API parameter design.

### 7. Code Generation
Generate code based on structure definitions.

## Best Practices

1. **Cache Results**: Structure definitions don't change frequently
2. **Error Handling**: Always check for errors before processing
3. **Authorization**: Ensure users have appropriate S_DEVELOP authorization
4. **Naming Conventions**: Use uppercase for structure names
5. **Combine with GetTable**: Use together for complete data dictionary analysis
6. **Document Dependencies**: Track which programs use which structures

## Integration Examples

### With GetTable Tool

```javascript
// 1. Get table structure
const table = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetTable",
  arguments: {
    table_name: "MARA"
  }
});

// 2. Get related structure
const structure = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetStructure",
  arguments: {
    structure_name: "MARAV"
  }
});
```

### With GetClass Tool

```javascript
// 1. Get class that uses structure
const classSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClass",
  arguments: {
    class_name: "ZCL_DATA_PROCESSOR"
  }
});

// 2. Extract structure references
const structures = classSource.data.match(/TYPE\s+(\w+)/g);

// 3. Get structure definition
const structure = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetStructure",
  arguments: {
    structure_name: "ZCUSTOMER_DATA"
  }
});
```

### Code Generation from Structure

```javascript
// Generate ABAP code from structure definition
async function generateCodeFromStructure(structureName) {
  const structure = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "GetStructure",
    arguments: {
      structure_name: structureName
    }
  });
  
  // Parse structure and generate code
  // (parsing logic here)
  
  return generatedCode;
}
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/ddic/structures/{structure_name}/source/main` - Retrieve structure definition

### Request Headers
- `Accept: text/plain` - Request plain text response
- `x-csrf-token: fetch` - CSRF token for security

### Response Format
- Content-Type: `text/plain`
- Character encoding: UTF-8
- May return DDL format or traditional ABAP format

### Security Considerations
- **Authorization Required**: S_DEVELOP with ACTVT=03 (display)
- **Object-Level Security**: Additional authorization objects may apply
- **CSRF Protection**: Automatic token management for secure requests

## Structure Types

### Flat Structures
Simple structures with only elementary fields.

### Deep Structures
Structures containing nested structures or internal tables.

### Include Structures
Structures that include other structures.

### Append Structures
Enhancement structures that extend existing structures.

## Common Structure Patterns

### Header-Item Pattern
```abap
define structure zorder_header {
  order_id    : abap.char(10);
  customer_id : abap.char(10);
  order_date  : abap.dats;
  total_amount: abap.curr(15,2);
}

define structure zorder_item {
  order_id    : abap.char(10);
  item_number : abap.numc(6);
  material_id : abap.char(18);
  quantity    : abap.quan(13,3);
  unit        : abap.unit(3);
  price       : abap.curr(15,2);
}
```

### Status Structure
```abap
define structure zstatus_info {
  status_code : abap.char(1);
  status_text : abap.char(40);
  timestamp   : abap.dec(15,0);
  user_id     : abap.char(12);
}
```

## Limitations

1. **Definition Only**: Returns only the structure definition, not data
2. **No Usage Information**: Does not show where the structure is used
3. **Active Version**: Returns the active version, not inactive changes
4. **Text Format**: Returns plain text, requires parsing for structured analysis
5. **No Enhancement Info**: May not include all enhancement details

## Performance Considerations

- **Response Size**: Large structures may take longer to retrieve
- **Network Latency**: Response time depends on network connection
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching

## Troubleshooting

### Structure Not Found
- Verify the structure name is correct
- Check that the structure exists in DDIC
- Ensure the structure is activated

### Incomplete Definition
- Structure may have includes that need separate retrieval
- Check for append structures
- Verify all components are activated

### Authorization Issues
- Verify S_DEVELOP authorization with ACTVT=03
- Check authorization for the structure's package

## Related Tools

- **GetTable**: Retrieve database table definitions
- **GetClass**: Retrieve classes that use the structure
- **GetProgram**: Retrieve programs that use the structure
- **SearchObject**: Search for structures by name pattern
- **GetTableContents**: Retrieve data based on structure

## Version History

- **v1.0**: Initial implementation with basic structure retrieval
- **v1.1**: Enhanced error handling and timeout management
- **v1.2**: Improved support for DDL format structures

## Additional Notes

- Structure names are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the structure name
- Timeout is set to 30 seconds for structure retrievals
- Structures are part of the ABAP Data Dictionary (DDIC)
- Structures define reusable data types
- Structures can be used as types for variables, parameters, and table types
- Modern structures may be defined using DDL (Data Definition Language)
- Traditional structures use SE11 transaction for maintenance