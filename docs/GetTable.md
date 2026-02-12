# GetTable Tool Documentation

## Overview

The `GetTable` tool retrieves the definition of an ABAP database table from the SAP system via the ADT (ABAP Development Tools) API. It returns the complete table structure including all fields, data types, keys, indexes, and technical settings.

## Endpoint

```
GET /sap/bc/adt/ddic/tables/{table_name}/source/main
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `table_name` | string | Yes | Name of the ABAP database table to retrieve |

## Response Structure

The tool returns the complete ABAP table definition in ABAP source format, including:

- Table name and description
- Field definitions with data types
- Primary key fields
- Foreign key relationships
- Technical settings (table category, delivery class, etc.)
- Indexes

### Example Response

```abap
@EndUserText.label : 'Customer Master Data'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #ALLOWED
define table zcustomer {
  key client        : abap.clnt not null;
  key customer_id   : abap.char(10) not null;
  customer_name     : abap.char(40);
  email             : abap.char(50);
  phone             : abap.char(20);
  address           : abap.char(100);
  city              : abap.char(40);
  postal_code       : abap.char(10);
  country           : abap.char(3);
  created_date      : abap.dats;
  created_by        : abap.char(12);
  changed_date      : abap.dats;
  changed_by        : abap.char(12);
  status            : abap.char(1);
  credit_limit      : abap.curr(15,2);
  currency_key      : abap.cuky(5);
}
```

## Usage Examples

### Example 1: Retrieve a Standard Table

```json
{
  "table_name": "MARA"
}
```

### Example 2: Retrieve a Custom Table

```json
{
  "table_name": "ZCUSTOMER"
}
```

### Example 3: Retrieve Table for Data Analysis

```json
{
  "table_name": "ZORDER_HEADER"
}
```

## Response Format

### Success Response

The tool returns the table definition in ABAP DDL or traditional ABAP format:

```
define table zcustomer {
  [Complete table definition]
}
```

### Error Response Examples

**Missing Table Name**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Table name is required"
  }]
}
```

**Table Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Table not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read table"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Table Name**: If `table_name` parameter is not provided
2. **Table Not Found**: If the specified table doesn't exist in the system
3. **Authorization Error**: If the user doesn't have permission to read the table (requires S_DEVELOP authorization with ACTVT=03)
4. **Network Issues**: Connection problems with the SAP system
5. **Invalid Table Name**: If the table name contains invalid characters

## Table Components

### Field Definition

Each field in a table includes:
- **Field Name**: Column identifier
- **Data Type**: ABAP data type or reference to data element
- **Key Field**: Whether the field is part of the primary key
- **Not Null**: Whether the field is mandatory
- **Length**: Field length (for CHAR, NUMC, etc.)
- **Decimals**: Decimal places (for numeric types)

### Primary Key

```abap
key client      : abap.clnt not null;
key customer_id : abap.char(10) not null;
```

### Foreign Keys

Foreign key relationships to other tables (if defined).

### Technical Settings

- **Table Category**: TRANSP (transparent), POOL, CLUSTER
- **Delivery Class**: A (application), C (customizing), etc.
- **Data Maintenance**: Allowed or not allowed

## Table Categories

### Transparent Tables
- Most common table type
- One-to-one mapping with database table
- Can be accessed directly with SQL

### Pool Tables
- Stored in table pools
- Multiple pool tables in one database table
- Used for small tables with many entries

### Cluster Tables
- Stored in table clusters
- Multiple cluster tables in one database table
- Used for dependent data

## Use Cases

### 1. Data Modeling
Understand table structures for data modeling and design.

### 2. Database Analysis
Analyze table definitions for database optimization.

### 3. Interface Design
Review table structures for interface development.

### 4. Documentation Generation
Extract table specifications for technical documentation.

### 5. Data Migration
Understand table layout for data migration projects.

### 6. Query Development
Use table definitions to write SQL queries.

### 7. Code Generation
Generate code based on table definitions.

## Best Practices

1. **Cache Results**: Table definitions don't change frequently
2. **Error Handling**: Always check for errors before processing
3. **Authorization**: Ensure users have appropriate S_DEVELOP authorization
4. **Naming Conventions**: Use uppercase for table names
5. **Combine with GetTableContents**: Use together for complete analysis
6. **Document Dependencies**: Track which programs use which tables

## Integration Examples

### With GetTableContents Tool

```javascript
// 1. Get table structure
const tableStructure = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetTable",
  arguments: {
    table_name: "ZCUSTOMER"
  }
});

// 2. Get table data
const tableData = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetTableContents",
  arguments: {
    table_name: "ZCUSTOMER",
    max_rows: 100
  }
});

// Now you have both structure and data
```

### With GetStructure Tool

```javascript
// 1. Get table definition
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

### SQL Query Generation

```javascript
// Generate SQL query from table definition
async function generateSelectQuery(tableName, fields) {
  const table = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "GetTable",
    arguments: {
      table_name: tableName
    }
  });
  
  // Parse table definition and generate SQL
  const fieldList = fields.join(', ');
  const query = `SELECT ${fieldList} FROM ${tableName}`;
  
  return query;
}
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/ddic/tables/{table_name}/source/main` - Retrieve table definition

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

## Delivery Classes

- **A**: Application table (master and transaction data)
- **C**: Customizing table (customer-specific settings)
- **L**: Temporary table (for temporary data storage)
- **G**: Customizing table (protected against SAP upgrade)
- **E**: System table (control tables)
- **S**: System table (SAP internal use)
- **W**: System table (data during installation)

## Common Table Patterns

### Master Data Table
```abap
define table zcustomer_master {
  key client      : abap.clnt not null;
  key customer_id : abap.char(10) not null;
  customer_name   : abap.char(40);
  status          : abap.char(1);
  created_date    : abap.dats;
  created_by      : abap.char(12);
}
```

### Transaction Data Table
```abap
define table zorder_header {
  key client    : abap.clnt not null;
  key order_id  : abap.char(10) not null;
  customer_id   : abap.char(10);
  order_date    : abap.dats;
  total_amount  : abap.curr(15,2);
  currency      : abap.cuky(5);
}
```

### Customizing Table
```abap
define table zconfig {
  key client     : abap.clnt not null;
  key config_key : abap.char(20) not null;
  config_value   : abap.char(100);
  description    : abap.char(40);
}
```

## Limitations

1. **Definition Only**: Returns only the table definition, not data
2. **No Usage Information**: Does not show where the table is used
3. **Active Version**: Returns the active version, not inactive changes
4. **Text Format**: Returns plain text, requires parsing for structured analysis
5. **No Index Details**: May not include complete index information

## Performance Considerations

- **Response Size**: Large tables may take longer to retrieve
- **Network Latency**: Response time depends on network connection
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching

## Troubleshooting

### Table Not Found
- Verify the table name is correct
- Check that the table exists in DDIC
- Ensure the table is activated

### Incomplete Definition
- Table may have append structures
- Check for table enhancements
- Verify all components are activated

### Authorization Issues
- Verify S_DEVELOP authorization with ACTVT=03
- Check authorization for the table's package
- Verify S_TABU_DIS authorization for table access

## Related Tools

- **GetTableContents**: Retrieve actual data from the table
- **GetStructure**: Retrieve related structure definitions
- **GetClass**: Retrieve classes that use the table
- **GetProgram**: Retrieve programs that access the table
- **SearchObject**: Search for tables by name pattern

## Version History

- **v1.0**: Initial implementation with basic table retrieval
- **v1.1**: Enhanced error handling and timeout management
- **v1.2**: Improved support for DDL format tables

## Additional Notes

- Table names are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the table name
- Timeout is set to 30 seconds for table retrievals
- Tables are part of the ABAP Data Dictionary (DDIC)
- Tables define persistent data storage structures
- Client field is mandatory for client-dependent tables
- Primary keys ensure unique record identification
- Foreign keys maintain referential integrity
- Modern tables may be defined using DDL (Data Definition Language)
- Traditional tables use SE11 transaction for maintenance
- Use GetTableContents to retrieve actual table data