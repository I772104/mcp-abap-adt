# Data Querying Workflow

## Query Tables and CDS Views

Efficient data retrieval with filtering, pagination, and batch operations.

## Table Data Querying

### Basic Table Query

```
use_mcp_tool: GetTableContents
  table_name: "T001"
  max_rows: 100
→ Returns: First 100 rows from T001
```

### With Column Selection

```
use_mcp_tool: GetTableContents
  table_name: "MARA"
  columns: ["MATNR", "MTART", "MATKL"]
  max_rows: 50
→ Returns: Only specified columns
```

### With Filtering

```
use_mcp_tool: GetTableContents
  table_name: "MARA"
  columns: ["MATNR", "MTART", "MBRSH"]
  where_conditions: {"MTART": "FERT"}
  max_rows: 100
→ Returns: Filtered rows where MTART = 'FERT'
→ Note: Only equality (=) operator supported
```

### With Pagination

```
use_mcp_tool: GetTableContents
  table_name: "MARA"
  max_rows: 100
  offset: 200
→ Returns: Rows 201-300
→ Warning: Performance impact on large tables
```

### With Metadata

```
use_mcp_tool: GetTableContents
  table_name: "MARA"
  include_column_metadata: true
→ Returns: Data + column types and descriptions
```

### Batch Table Queries

Query multiple tables in one call:

```
use_mcp_tool: GetTableContents
  queries: [
    {
      table_name: "MARA",
      columns: ["MATNR", "MTART"],
      max_rows: 20
    },
    {
      table_name: "MAKT",
      columns: ["MATNR", "MAKTX"],
      max_rows: 20
    }
  ]
→ Returns: Results from both tables
→ Limit: Max 10 tables per batch
```

## CDS View Data Querying

### Using Resource Template (Cacheable)

For simple, repetitive queries:

```
access_mcp_resource: uri=cds-view-data:///I_Currency?columns=CURRENCY,DECIMALS&max_rows=10&where=DECIMALS:2
→ Cacheable by MCP client
→ Best for: Repeated queries, dropdown data
```

### Using Tool (Complex Queries)

For parameters and dynamic queries:

```
use_mcp_tool: GetCDSViewContents
  view_name: "I_SalesOrder"
  columns: ["SalesOrder", "SalesOrderType", "CreationDate"]
  where_conditions: {"SalesOrderType": "OR"}
  max_rows: 50
→ Returns: Filtered CDS view data
```

### With CDS Parameters

```
use_mcp_tool: GetCDSViewContents
  view_name: "I_SalesOrderWithParameters"
  parameters: {"p_date": "2024-01-01", "p_status": "OPEN"}
  columns: ["SalesOrder", "CreationDate"]
  max_rows: 50
→ Returns: Data with parameters applied
```

### With Sorting

```
use_mcp_tool: GetCDSViewContents
  view_name: "I_SalesOrder"
  columns: ["SalesOrder", "CreationDate"]
  order_by: ["CreationDate", "SalesOrder"]
  max_rows: 100
→ Returns: Sorted results
```

### Batch CDS Queries

Query multiple CDS views:

```
use_mcp_tool: GetCDSViewContents
  queries: [
    {
      view_name: "I_SalesOrder",
      columns: ["SalesOrder", "SalesOrderType"],
      max_rows: 20
    },
    {
      view_name: "I_Customer",
      columns: ["Customer", "CustomerName"],
      max_rows: 20
    }
  ]
→ Returns: Results from both views
→ Limit: Max 5 CDS views per batch
```

## Workflow Prompt

Use MCP prompt for guided table analysis:

```
invoke_prompt: table-analysis-workflow
arguments: {
  table_name: "MARA",
  max_rows: 50
}
```

## Query Best Practices

### Column Validation
- Tool automatically validates column names
- Fetches table/view metadata first
- Returns error if column doesn't exist

### WHERE Conditions
- Only equality (=) operator supported
- ADT Data Preview API limitation
- Use format: `{"FIELD": "VALUE"}`

### Pagination Warning
- CDS views recalculate on each query
- Offset causes full recalculation
- Use WHERE conditions instead when possible

### Performance
```
✅ Good: WHERE condition to limit rows
❌ Avoid: Large offset values (offset: 10000)
✅ Good: Select only needed columns
❌ Avoid: Select all columns when few needed
```

## CDS View Resource URIs

### Query Parameters
```
columns         Comma-separated column names
max_rows        Maximum rows (default: 100, max: 500)
where           FIELD1:VALUE1,FIELD2:VALUE2
order_by        Comma-separated column names
offset          Pagination offset
parameters      PARAM1:VALUE1,PARAM2:VALUE2
include_metadata  true/false
```

### Example URIs
```
# Basic query
cds-view-data:///I_Currency?max_rows=10

# With columns
cds-view-data:///I_Currency?columns=CURRENCY,DECIMALS&max_rows=10

# With filter
cds-view-data:///I_Currency?columns=CURRENCY&where=DECIMALS:2

# With sorting
cds-view-data:///I_Currency?columns=CURRENCY&order_by=CURRENCY&max_rows=20

# With parameters
cds-view-data:///I_SalesOrder?parameters=p_date:2024-01-01&max_rows=50

# Combined
cds-view-data:///I_Currency?columns=CURRENCY,DECIMALS&where=DECIMALS:2&order_by=CURRENCY&max_rows=10
```

## Understanding Table Structure

Before querying, understand the structure:

```
# Table structure
access_mcp_resource: uri=abap://table/{table_name}
→ Returns: Fields, keys, data elements, descriptions

# CDS view structure
access_mcp_resource: uri=abap://cds/{view_name}
→ Returns: Source code, annotations, associations
```

## Common Query Patterns

### Master Data Lookup
```
use_mcp_tool: GetTableContents
  table_name: "MARA"
  columns: ["MATNR", "MTART", "MATKL"]
  where_conditions: {"MATNR": "000000000012345678"}
  max_rows: 1
```

### Reference Data
```
access_mcp_resource: uri=cds-view-data:///I_Currency?columns=CURRENCY,DECIMALS&max_rows=500
→ All currencies for dropdown/validation
```

### Transaction Data
```
use_mcp_tool: GetCDSViewContents
  view_name: "I_SalesOrder"
  where_conditions: {"SalesOrderType": "OR", "CreationDate": "2024-01-01"}
  max_rows: 100
```

### Batch Validation
```
use_mcp_tool: GetTableContents
  queries: [
    {table_name: "MARA", where_conditions: {"MATNR": "123"}, max_rows: 1},
    {table_name: "KNA1", where_conditions: {"KUNNR": "456"}, max_rows: 1}
  ]
→ Validate multiple master data records
```

## Integration with RAP Analysis

After analyzing RAP BO, query its data:

```
1. Analyze RAP BO → rap-bo-analysis:///I_SalesOrder
2. Identify CDS view → I_SalesOrder
3. Query data → GetCDSViewContents or cds-view-data:///
```

## Error Handling

### Invalid Column Names
```
Error: Column 'INVALID' not found in table MARA
→ Tool validates columns before query
→ Check table structure first
```

### Too Many Rows
```
Error: max_rows exceeds limit (500)
→ Maximum 500 rows per query
→ Use pagination or filtering
```

### Invalid WHERE Condition
```
Error: Only equality operator supported
→ Use: {"FIELD": "VALUE"}
→ Don't use: {"FIELD": {"gt": "VALUE"}}
```

## Related Documentation

- [../GetTableContents.md](../GetTableContents.md) - Table query tool
- [../GetCDSViewContents.md](../GetCDSViewContents.md) - CDS view query tool
- [../GetTable.md](../GetTable.md) - Table structure
- [../Resources.md](../Resources.md) - Resource URIs
- [RAPAnalysis.md](RAPAnalysis.md) - RAP BO analysis
