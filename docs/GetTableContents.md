# GetTableContents Tool Documentation

## Overview

The `GetTableContents` tool retrieves data from ABAP database tables using the ADT Data Preview API. It provides secure, read-only access with pagination, filtering, query statistics, and batch query support.

## Security Features

This tool implements multiple security layers:

1. **Metadata Validation**: Always validates table existence before query execution
2. **Column Validation**: All column names validated against actual table columns
3. **Read-Only Operations**: Only SELECT statements allowed (enforced by ADT API)
4. **Parameterized Queries**: Uses ADT API which safely handles SQL construction
5. **Row Limit Enforcement**: Maximum 500 rows per request
6. **Value Escaping**: Single quotes and special characters properly escaped

## Parameters

### Single Query Mode

| Parameter                 | Type      | Default       | Description                             |
|---------------------------|-----------|---------------|-----------------------------------------|
| `table_name`              | string    | **required**  | ABAP table name (e.g., "T001", "USR02") |
| `columns`                 | string[]  | all columns   | Specific columns to retrieve            |
| `max_rows`                | number    | 100           | Maximum rows (max: 500)                 |
| `offset`                  | number    | 0             | Rows to skip for pagination             |
| `where_conditions`        | object    | none          | Equality filter conditions              |
| `order_by`                | string[]  | none          | Columns for sorting                     |
| `include_column_metadata` | boolean   | **false**     | Include column type/description         |

### Batch Query Mode

| Parameter                     | Type      | Description                       |
|-------------------------------|-----------|-----------------------------------|
| `queries`                     | array     | Array of query objects (max: 10)  |
| `queries[].id`                | string    | Optional identifier for results   |
| `queries[].table_name`        | string    | **required** - Table name         |
| `queries[].columns`           | string[]  | Optional column selection         |
| `queries[].max_rows`          | number    | Optional row limit                |
| `queries[].offset`            | number    | Optional pagination offset        |
| `queries[].where_conditions`  | object    | Optional filter conditions        |
| `queries[].order_by`          | string[]  | Optional sort columns             |

## WHERE Conditions

### Simple Equality
```json
{
  "where_conditions": {
    "LAND1": "DE",
    "WAERS": "EUR"
  }
}
```

### Explicit Equality Operator
```json
{
  "where_conditions": {
    "MATNR": {"eq": "ABC123"}
  }
}
```

## Response Format

```json
{
  "table": "T001",
  "total_rows": 0,
  "execution_time": "0.407",
  "rows": [
    {"BUKRS": "0001", "BUTXT": "SAP DEMO Company", "WAERS": "EUR"},
    {"BUKRS": "1000", "BUTXT": "MDG Company Code 1000", "WAERS": "EUR"}
  ],
  "pagination": {
    "offset": 0,
    "limit": 100,
    "has_more": false
  },
  "stats": {
    "metadata_fetch_ms": 251,
    "query_time_ms": 156,
    "rows_returned": 2,
    "total_time_ms": 407
  }
}
```

### With Column Metadata
```json
{
  "table": "T001",
  "total_rows": 0,
  "execution_time": "0.562",
  "columns": [
    {"name": "BUKRS", "type": "C", "description": "Company Code"},
    {"name": "BUTXT", "type": "C", "description": "Company Name"},
    {"name": "WAERS", "type": "C", "description": "Currency"}
  ],
  "rows": [...],
  "pagination": {...},
  "stats": {...}
}
```

### Batch Query Response
```json
{
  "batch_results": {
    "company_codes": {
      "table": "T001",
      "rows": [...],
      "pagination": {...},
      "stats": {...}
    },
    "users": {
      "table": "USR02",
      "rows": [...],
      "pagination": {...},
      "stats": {...}
    }
  },
  "stats": {
    "total_queries": 2,
    "successful": 2,
    "failed": 0,
    "total_time_ms": 450
  }
}
```

## Usage Examples

### Example 1: Basic Query
```json
{
  "table_name": "T001",
  "max_rows": 10
}
```

### Example 2: Specific Columns
```json
{
  "table_name": "T001",
  "columns": ["BUKRS", "BUTXT", "WAERS"],
  "max_rows": 50
}
```

### Example 3: With Equality Filter
```json
{
  "table_name": "T001",
  "columns": ["BUKRS", "BUTXT", "WAERS", "LAND1"],
  "where_conditions": {
    "LAND1": "DE"
  },
  "max_rows": 10
}
```

### Example 4: With Sorting
```json
{
  "table_name": "T001",
  "columns": ["BUKRS", "BUTXT", "WAERS"],
  "order_by": ["BUKRS"],
  "max_rows": 20
}
```

### Example 5: With Pagination
```json
{
  "table_name": "USR02",
  "columns": ["BNAME", "TRDAT", "LTIME"],
  "max_rows": 100,
  "offset": 0,
  "order_by": ["BNAME"]
}
```

### Example 6: With Column Metadata
```json
{
  "table_name": "T001",
  "columns": ["BUKRS", "BUTXT"],
  "include_column_metadata": true,
  "max_rows": 5
}
```

### Example 7: Batch Queries
```json
{
  "queries": [
    {
      "id": "company_codes",
      "table_name": "T001",
      "columns": ["BUKRS", "BUTXT", "WAERS"],
      "max_rows": 5
    },
    {
      "id": "users",
      "table_name": "USR02",
      "columns": ["BNAME", "TRDAT"],
      "max_rows": 5
    }
  ]
}
```

### Example 8: Multiple Filters
```json
{
  "table_name": "DD02L",
  "columns": ["TABNAME", "TABCLASS", "AS4USER"],
  "where_conditions": {
    "TABCLASS": "TRANSP",
    "AS4USER": "SAP"
  },
  "max_rows": 10
}
```

## Pagination Workflow

```typescript
// Page 1
const page1 = await getTableContents({
  table_name: "T001",
  columns: ["BUKRS", "BUTXT"],
  max_rows: 100,
  offset: 0,
  order_by: ["BUKRS"]
});

// Page 2
const page2 = await getTableContents({
  table_name: "T001",
  columns: ["BUKRS", "BUTXT"],
  max_rows: 100,
  offset: 100,
  order_by: ["BUKRS"]
});

// Continue until has_more = false
```

## Query Statistics

Every response includes performance metrics:

```json
{
  "stats": {
    "metadata_fetch_ms": 251,
    "query_time_ms": 156,
    "rows_returned": 6,
    "total_time_ms": 407
  }
}
```

## Performance Best Practices

### 1. Select Only Needed Columns
```json
// Better performance
{
  "table_name": "T001",
  "columns": ["BUKRS", "BUTXT"]
}
```

### 2. Use Equality Filters
```json
{
  "table_name": "T001",
  "where_conditions": {"LAND1": "DE"},
  "max_rows": 50
}
```

### 3. Always Use ORDER BY for Pagination
```json
{
  "table_name": "T001",
  "order_by": ["BUKRS"],
  "offset": 0,
  "max_rows": 100
}
```

### 4. Use Batch Queries for Multiple Tables
```json
{
  "queries": [
    {"id": "t001", "table_name": "T001", "max_rows": 10},
    {"id": "usr02", "table_name": "USR02", "max_rows": 10}
  ]
}
```

## Advanced Use Cases

### Use Case 1: Export Large Table
```typescript
async function exportTable(tableName: string, columns: string[]) {
  let offset = 0;
  const maxRows = 500;
  const allRows: any[] = [];
  
  while (true) {
    const result = await getTableContents({
      table_name: tableName,
      columns: columns,
      max_rows: maxRows,
      offset: offset,
      order_by: [columns[0]]
    });
    
    allRows.push(...result.rows);
    
    if (!result.pagination.has_more) break;
    offset += maxRows;
  }
  
  return allRows;
}
```

### Use Case 2: Related Data Fetch
```typescript
const relatedData = await getTableContents({
  queries: [
    {
      id: "company",
      table_name: "T001",
      columns: ["BUKRS", "BUTXT"],
      where_conditions: {"BUKRS": "0001"}
    },
    {
      id: "users",
      table_name: "USR02",
      columns: ["BNAME", "TRDAT"],
      max_rows: 10
    }
  ]
});

const company = relatedData.batch_results.company;
const users = relatedData.batch_results.users;
```

## Common Errors

| Error | Solution |
|-------|----------|
| `table_name is required` | Provide table_name parameter |
| `Table X not found` | Check table name and permissions |
| `max_rows cannot exceed 500` | Reduce max_rows or use pagination |
| `Invalid column name: X` | Use GetTable to see available columns |
| `Cannot execute more than 10 queries` | Split into multiple batch calls |

## Troubleshooting

### Empty Result Set
Check if data exists and filters are correct:
```json
{
  "rows": [],
  "stats": {
    "rows_returned": 0
  }
}
```

### Pagination Issues
Always use ORDER BY for consistent pagination:
```json
{
  "table_name": "T001",
  "offset": 100,
  "max_rows": 100,
  "order_by": ["BUKRS"]
}
```

## Real-World Examples

### Company Codes Query
```json
{
  "table_name": "T001",
  "columns": ["BUKRS", "BUTXT", "WAERS", "LAND1"],
  "where_conditions": {"LAND1": "DE"},
  "order_by": ["BUKRS"],
  "max_rows": 50
}
```

### User Login Data
```json
{
  "table_name": "USR02",
  "columns": ["BNAME", "TRDAT", "LTIME"],
  "order_by": ["TRDAT"],
  "max_rows": 100
}
```

### Table Definitions
```json
{
  "table_name": "DD02L",
  "columns": ["TABNAME", "TABCLASS", "AS4DATE"],
  "where_conditions": {"TABCLASS": "TRANSP"},
  "max_rows": 50
}
```

## Technical Details

### ADT Endpoints
- **Metadata**: `GET /sap/bc/adt/datapreview/ddic/{table}/metadata`
- **Data**: `POST /sap/bc/adt/datapreview/ddic?rowNumber={max}&ddicEntityName={table}`

### Offset Implementation
The ADT API doesn't support native OFFSET. The tool:
1. Requests `maxRows + offset` total rows
2. Receives full result from API
3. Slices array to skip first `offset` rows
4. Returns only requested page

## Related Tools

- **GetTable**: Get table structure and column definitions
- **GetStructure**: Get ABAP structure definitions
- **SearchObject**: Find tables by name pattern