# GetTransaction Tool Documentation

## Overview

The `GetTransaction` tool retrieves detailed information about an ABAP transaction code from the SAP system via the ADT (ABAP Development Tools) API. It returns transaction metadata including the associated program, screen, package, and application component.

## Endpoint

```
GET /sap/bc/adt/repository/informationsystem/objectproperties/values
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transaction_name` | string | Yes | Name of the ABAP transaction code to retrieve |

## Response Structure

The tool returns transaction information in XML format, including:

- Transaction code
- Transaction description
- Associated program
- Initial screen number
- Package assignment
- Application component
- Transaction type
- Authorization object

### Example Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<objectProperties xmlns="http://www.sap.com/adt/repository/informationsystem">
  <property name="TCODE" value="SE38"/>
  <property name="TEXT" value="ABAP Editor"/>
  <property name="PGMNA" value="SAPMS38M"/>
  <property name="DYPNO" value="0100"/>
  <property name="DEVCLASS" value="S_ABAP_WORKBENCH_TOOLS"/>
  <property name="PS_POSID" value="BC-DWB-TOO-EDI"/>
  <property name="CINFO" value="Dialog Transaction"/>
  <property name="TCODE_TYPE" value="Dialog"/>
</objectProperties>
```

## Usage Examples

### Example 1: Retrieve Standard Transaction

```json
{
  "transaction_name": "SE38"
}
```

### Example 2: Retrieve Custom Transaction

```json
{
  "transaction_name": "ZMY_TRANSACTION"
}
```

### Example 3: Retrieve Transaction for Analysis

```json
{
  "transaction_name": "VA01"
}
```

## Response Format

### Success Response

Returns XML with transaction properties:

```xml
<objectProperties>
  <property name="TCODE" value="SE38"/>
  <property name="TEXT" value="ABAP Editor"/>
  <property name="PGMNA" value="SAPMS38M"/>
  ...
</objectProperties>
```

### Error Response Examples

**Missing Transaction Name**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Transaction name is required"
  }]
}
```

**Transaction Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Transaction not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read transaction"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Transaction Name**: If `transaction_name` parameter is not provided
2. **Transaction Not Found**: If the specified transaction doesn't exist in the system
3. **Authorization Error**: If the user doesn't have permission to read transaction information
4. **Network Issues**: Connection problems with the SAP system
5. **Invalid Transaction Name**: If the transaction name contains invalid characters

## Transaction Properties

### Common Properties

| Property | Description |
|----------|-------------|
| `TCODE` | Transaction code |
| `TEXT` | Transaction description |
| `PGMNA` | Associated program name |
| `DYPNO` | Initial screen number |
| `DEVCLASS` | Development package |
| `PS_POSID` | Application component |
| `CINFO` | Transaction classification |
| `TCODE_TYPE` | Transaction type |

### Transaction Types

- **Dialog Transaction**: Interactive screen-based transaction
- **Report Transaction**: Executes a report program
- **Parameter Transaction**: Calls another transaction with parameters
- **Variant Transaction**: Calls transaction with predefined variant
- **Object Transaction**: OO transaction for class methods

## Use Cases

### 1. Transaction Analysis
Understand transaction configuration and associated programs.

### 2. Documentation Generation
Extract transaction specifications for documentation.

### 3. Authorization Planning
Identify authorization objects for transaction access.

### 4. Package Analysis
Understand transaction distribution across packages.

### 5. Application Component Mapping
Map transactions to application components.

### 6. Migration Planning
Analyze transactions before system migrations.

### 7. Custom Transaction Development
Use as reference for creating custom transactions.

## Best Practices

1. **Cache Results**: Transaction metadata doesn't change frequently
2. **Error Handling**: Always check for errors before processing
3. **Authorization**: Ensure users have appropriate authorization
4. **Naming Conventions**: Use uppercase for transaction codes
5. **Combine with GetProgram**: Use together to get complete picture
6. **Document Usage**: Track which users/roles use which transactions

## Integration Examples

### With GetProgram Tool

```javascript
// 1. Get transaction information
const transaction = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetTransaction",
  arguments: {
    transaction_name: "SE38"
  }
});

// 2. Extract program name from XML
const programMatch = transaction.data.match(/name="PGMNA" value="([^"]+)"/);
const programName = programMatch ? programMatch[1] : null;

// 3. Get program source
if (programName) {
  const program = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "GetProgram",
    arguments: {
      program_name: programName
    }
  });
}
```

### With SearchObject Tool

```javascript
// 1. Search for transactions
const searchResults = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "SearchObject",
  arguments: {
    query: "Z*",
    maxResults: 50
  }
});

// 2. Get details for specific transaction
const transaction = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetTransaction",
  arguments: {
    transaction_name: "ZMY_TCODE"
  }
});
```

### Transaction Analysis Workflow

```javascript
// Analyze transaction and its components
async function analyzeTransaction(tcode) {
  // 1. Get transaction info
  const transaction = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "GetTransaction",
    arguments: {
      transaction_name: tcode
    }
  });
  
  // 2. Parse XML response
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(transaction.data, 'text/xml');
  const properties = {};
  
  const propertyNodes = xmlDoc.getElementsByTagName('property');
  for (let node of propertyNodes) {
    const name = node.getAttribute('name');
    const value = node.getAttribute('value');
    properties[name] = value;
  }
  
  return {
    tcode: properties.TCODE,
    description: properties.TEXT,
    program: properties.PGMNA,
    screen: properties.DYPNO,
    package: properties.DEVCLASS,
    component: properties.PS_POSID,
    type: properties.TCODE_TYPE
  };
}
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/repository/informationsystem/objectproperties/values` - Retrieve transaction properties

### Request Parameters
- `uri`: Encoded URI pointing to the transaction object
- `facet`: Property facets to retrieve (package, application component)

### Request Headers
- `Accept: application/xml` - Request XML response
- `x-csrf-token: fetch` - CSRF token for security

### Response Format
- Content-Type: `application/xml`
- Character encoding: UTF-8

### Security Considerations
- **Authorization Required**: S_TCODE authorization object
- **Display Authorization**: User must have display access to transaction
- **CSRF Protection**: Automatic token management for secure requests

## Transaction Creation Types

### Dialog Transaction
- Calls a program with a specific screen
- Most common transaction type
- Interactive user interface

### Report Transaction
- Executes a report program
- Can include selection screen
- Displays output list

### Parameter Transaction
- Calls another transaction with parameters
- Skips initial screens
- Pre-fills field values

### Variant Transaction
- Calls transaction with saved variant
- Predefined selection criteria
- Simplified user interface

### Object Transaction
- Calls class method
- Object-oriented approach
- Modern transaction type

## Limitations

1. **Metadata Only**: Returns only transaction metadata, not the actual program
2. **No Screen Details**: Does not return screen layout or field information
3. **Active Version**: Returns information for active transaction only
4. **XML Format**: Requires XML parsing for structured access
5. **No Usage Statistics**: Does not include transaction usage information

## Performance Considerations

- **Response Size**: Transaction metadata is typically small
- **Network Latency**: Response time depends on network connection
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching

## Troubleshooting

### Transaction Not Found
- Verify the transaction code is correct
- Check that the transaction exists in the system
- Ensure transaction is not locked or deleted

### Empty Response
- Transaction may exist but have minimal metadata
- Check authorization to view transaction details
- Verify transaction is properly configured

### Authorization Issues
- Verify S_TCODE authorization
- Check display authorization for the transaction
- Verify package authorization if applicable

## Related Tools

- **GetProgram**: Retrieve the program associated with the transaction
- **SearchObject**: Search for transactions by name pattern
- **GetPackage**: Retrieve package information for the transaction
- **GetClass**: Retrieve classes called by object transactions

## Version History

- **v1.0**: Initial implementation with basic transaction retrieval
- **v1.1**: Enhanced error handling and XML parsing
- **v1.2**: Improved support for different transaction types

## Additional Notes

- Transaction codes are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the transaction name
- Timeout is set to 30 seconds for transaction retrievals
- Transaction codes are unique identifiers in SAP systems
- Maximum transaction code length is 20 characters
- Transaction codes starting with Z or Y are customer namespace
- Use transaction SE93 to create or maintain transactions
- Parameter transactions can skip initial screens
- Variant transactions simplify complex transactions
- Authorization object S_TCODE controls transaction access