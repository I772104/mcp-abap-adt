# GetTableContents Tool Documentation

## Overview

The `GetTableContents` tool retrieves data from ABAP database tables using the ADT Data Preview API. It provides secure, read-only access with advanced features including pagination, enhanced filtering, query statistics, and batch query support.

## Security Features

This tool implements multiple security layers:

1. **Metadata Validation**: Always validates table existence before query execution
2. **Column Validation**: All column names validated against actual table columns
3. **Read-Only Operations**: Only SELECT statements allowed (enforced by ADT API)
4. **Parameterized Queries**: Uses ADT API which safely handles SQL construction
5. **Row Limit Enforcement**: Maximum 500 rows per request
6. **Value Escaping**: Single quotes and special characters properly escaped
7. **Operator Whitelisting**: Only safe SQL operators allowed
8. **Pattern Validation**: LIKE patterns sanitized to prevent injection

## Parameters

### Single Query Mode

| Parameter                 | Type      | Default       | Description                             |
|---------------------------|-----------|---------------|-----------------------------------------|
| `table_name`              | string    | **required**  | ABAP table name (e.g., "MARA", "VBAK")  |
| `columns`                 | string[]  | all columns   | Specific columns to retrieve            |
| `max_rows`                | number    | 100           | Maximum rows (max: 500)                 |
| `offset`                  | number    | 0             | Rows to skip for pagination             |
| `where_conditions`        | object    | none          | Filter conditions with operators        |
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
    "MATNR": "ABC123"
  }
}
```

### Advanced Operators
```json
{
  "where_conditions": {
    "ERSDA": {"gte": "20250101"},              // Greater or equal
    "LAEDA": {"lt": "20251231"},               // Less than
    "MTART": {"in": ["FERT", "HALB", "ROH"]}, // IN clause (max 100 values)
    "MAKTX": {"like": "Test%"},                // LIKE with wildcards
    "ERSDA": {"between": ["20250101", "20250131"]} // Range
  }
}
```

### Supported Operators
- `eq`: Equals (=)
- `gt`: Greater than (>)
- `gte`: Greater or equal (>=)
- `lt`: Less than (<)
- `lte`: Less or equal (<=)
- `in`: IN clause (array, max 100 values)
- `like`: LIKE with % and _ wildcards
- `between`: BETWEEN range (2-element array)

## Response Formats

### Default Response (Column Metadata OFF)
```json
{
  "table": "MARA",
  "total_rows": 100,
  "execution_time": "66.194",
  "rows": [
    {"MATNR": "ABC123", "ERSDA": "20250101"},
    {"MATNR": "DEF456", "ERSDA": "20250102"}
  ],
  "pagination": {
    "offset": 0,
    "limit": 100,
    "has_more": true
  },
  "stats": {
    "metadata_fetch_ms": 120,
    "query_time_ms": 66,
    "rows_returned": 100,
    "total_time_ms": 186
  }
}
```

### With Column Metadata (include_column_metadata: true)
```json
{
  "table": "MARA",
  "total_rows": 100,
  "execution_time": "66.194",
  "columns": [
    {"name": "MATNR", "type": "C", "description": "Material"},
    {"name": "ERSDA", "type": "D", "description": "Created On"}
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
    "materials": {
      "table": "MARA",
      "rows": [...],
      "pagination": {...},
      "stats": {...}
    },
    "descriptions": {
      "table": "MAKT",
      "rows": [...],
      "pagination": {...},
      "stats": {...}
    }
  },
  "stats": {
    "total_queries": 2,
    "successful": 2,
    "failed": 0,
    "total_time_ms": 350
  }
}
```

## Usage Examples

### Example 1: Basic Query
```json
{
  "table_name": "MARA",
  "max_rows": 50
}
```

### Example 2: Specific Columns
```json
{
  "table_name": "MARA",
  "columns": ["MATNR", "ERSDA", "ERNAM"],
  "max_rows": 100
}
```

### Example 3: Pagination
```json
{
  "table_name": "MARA",
  "columns": ["MATNR", "ERSDA"],
  "max_rows": 100,
  "offset": 200,
  "order_by": ["MATNR"]
}
```

### Example 4: Simple Filter
```json
{
  "table_name": "MARA",
  "where_conditions": {
    "MTART": "FERT"
  },
  "max_rows": 50
}
```

### Example 5: Advanced Filtering
```json
{
  "table_name": "MARA",
  "columns": ["MATNR", "ERSDA", "MTART"],
  "where_conditions": {
    "ERSDA": {"gte": "20250101"},
    "MTART": {"in": ["FERT", "HALB"]},
    "MAKTX": {"like": "Prod%"}
  },
  "order_by": ["ERSDA", "MATNR"],
  "max_rows": 100
}
```

### Example 6: With Column Metadata
```json
{
  "table_name": "MARA",
  "columns": ["MATNR", "ERSDA"],
  "include_column_metadata": true,
  "max_rows": 50
}
```

### Example 7: Batch Queries
```json
{
  "queries": [
    {
      "id": "materials",
      "table_name": "MARA",
      "columns": ["MATNR", "ERSDA"],
      "max_rows": 10
    },
    {
      "id": "descriptions",
      "table_name": "MAKT",
      "columns": ["MATNR", "MAKTX"],
      "where_conditions": {"SPRAS": "E"},
      "max_rows": 10
    }
  ],
  "include_column_metadata": false
}
```

### Example 8: Date Range Query
```json
{
  "table_name": "MARA",
  "columns": ["MATNR", "ERSDA", "ERNAM"],
  "where_conditions": {
    "ERSDA": {"between": ["20250101", "20250131"]}
  },
  "order_by": ["ERSDA"],
  "max_rows": 200
}
```

## Pagination Workflow

To retrieve large datasets:

```typescript
// Page 1
const page1 = await getTableContents({
  table_name: "MARA",
  max_rows: 100,
  offset: 0,
  order_by: ["MATNR"]  // Important for consistent pagination
});

// Page 2
const page2 = await getTableContents({
  table_name: "MARA",
  max_rows: 100,
  offset: 100,
  order_by: ["MATNR"]
});

// Continue until has_more = false
```

## Generated SQL Examples

### Basic Query
```sql
SELECT MARA~* FROM MARA
```

### With Operators
```sql
-- Greater or equal
SELECT MARA~MATNR, MARA~ERSDA FROM MARA 
WHERE MARA~ERSDA >= '20250101'

-- IN clause
SELECT MARA~* FROM MARA 
WHERE MARA~MTART IN ('FERT', 'HALB', 'ROH')

-- LIKE pattern
SELECT MARA~* FROM MARA 
WHERE MARA~MAKTX LIKE 'Test%'

-- BETWEEN range
SELECT MARA~* FROM MARA 
WHERE MARA~ERSDA BETWEEN '20250101' AND '20250131'

-- Combined conditions
SELECT MARA~MATNR FROM MARA 
WHERE MARA~MTART = 'FERT' AND MARA~ERSDA >= '20250101'
```

## Query Statistics

Every response includes performance metrics:

```json
{
  "stats": {
    "metadata_fetch_ms": 120,    // Time to fetch/validate columns
    "query_time_ms": 66,         // Time to execute SELECT
    "rows_returned": 100,        // Actual rows in response
    "total_time_ms": 186         // End-to-end time
  }
}
```

**Use stats to:**
- Identify slow queries
- Optimize column selection
- Debug performance issues
- Compare query strategies

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `table_name is required` | Missing parameter | Provide table_name |
| `Table X not found` | Invalid table or no access | Check name and permissions |
| `max_rows cannot exceed 500` | Limit exceeded | Reduce max_rows or use pagination |
| `Invalid column name: X` | Column doesn't exist | Validate against GetTable |
| `IN clause cannot contain more than 100 values` | Too many IN values | Split into multiple queries |
| `LIKE pattern contains invalid characters` | Unsafe pattern | Use only alphanumeric, %, _ |
| `Cannot execute more than 10 queries` | Too many batch queries | Split into multiple calls |

## Performance Best Practices

### 1. Column Selection
```json
// ❌ Bad: Fetches all 100+ columns
{"table_name": "MARA"}

// ✅ Good: Only needed columns
{"table_name": "MARA", "columns": ["MATNR", "ERSDA"]}
```

### 2. Use Filters
```json
// ❌ Bad: Fetches all, filter client-side
{"table_name": "MARA", "max_rows": 500}

// ✅ Good: Filter server-side
{
  "table_name": "MARA",
  "where_conditions": {"MTART": "FERT"},
  "max_rows": 100
}
```

### 3. Pagination Strategy
```json
// ✅ Efficient: Consistent ORDER BY
{
  "table_name": "MARA",
  "order_by": ["MATNR"],  // Ensures consistent pages
  "offset": 0,
  "max_rows": 100
}
```

### 4. Batch Queries
```json
// ❌ Bad: Sequential calls (400ms total)
await getTableContents({table_name: "MARA"});  // 200ms
await getTableContents({table_name: "MAKT"});  // 200ms

// ✅ Good: Batch call (220ms total)
await getTableContents({
  queries: [
    {id: "mara", table_name: "MARA"},
    {id: "makt", table_name: "MAKT"}
  ]
});
```

### 5. Column Metadata
```json
// ✅ Default: Faster, smaller response
{"table_name": "MARA"}

// ⚠️ When needed: Use GetTable first, then query
{"table_name": "MARA", "include_column_metadata": true}
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
      order_by: columns[0] // Use first column for sorting
    });
    
    allRows.push(...result.rows);
    
    if (!result.pagination.has_more) break;
    offset += maxRows;
  }
  
  return allRows;
}
```

### Use Case 2: Filtered Analytics
```typescript
const analytics = await getTableContents({
  table_name: "MARA",
  columns: ["MTART", "ERSDA"],
  where_conditions: {
    "ERSDA": {"between": ["20250101", "20251231"]},
    "MTART": {"in": ["FERT", "HALB"]}
  },
  order_by: ["ERSDA"],
  max_rows: 500
});

// Process stats locally
const byType = analytics.rows.reduce((acc, row) => {
  acc[row.MTART] = (acc[row.MTART] || 0) + 1;
  return acc;
}, {});
```

### Use Case 3: Related Data Fetch
```typescript
const relatedData = await getTableContents({
  queries: [
    {
      id: "material",
      table_name: "MARA",
      columns: ["MATNR", "MTART"],
      where_conditions: {"MATNR": "ABC123"}
    },
    {
      id: "description",
      table_name: "MAKT",
      columns: ["MATNR", "MAKTX", "SPRAS"],
      where_conditions: {"MATNR": "ABC123"}
    },
    {
      id: "stock",
      table_name: "MARD",
      columns: ["MATNR", "WERKS", "LABST"],
      where_conditions: {"MATNR": "ABC123"}
    }
  ]
});

// Access results by ID
const material = relatedData.batch_results.material;
const description = relatedData.batch_results.description;
const stock = relatedData.batch_results.stock;
```

## Limitations

1. **WHERE Operators**: Only safe operators supported
   - ✅ Supported: eq, gt, gte, lt, lte, in, like, between
   - ❌ Not supported: OR, NOT, nested conditions, sub-queries

2. **Maximum Rows**: 500 per single query
   - Use pagination for larger datasets
   - Batch queries still limited per individual query

3. **IN Clause**: Maximum 100 values
   - Split larger lists into multiple queries

4. **LIKE Patterns**: Only alphanumeric, %, _, space, and -
   - No special regex characters

5. **No Joins**: Single table per query
   - Use batch queries to fetch related tables separately

6. **Batch Limit**: Maximum 10 queries per batch
   - Make multiple batch calls if needed

## Troubleshooting

### Issue: "Invalid column name"
```json
// ❌ Wrong
{"table_name": "MARA", "columns": ["MATERIAL"]}

// ✅ Correct - use GetTable first to see columns
{"table_name": "MARA", "columns": ["MATNR"]}
```

### Issue: Pagination Returns Duplicates
```json
// ❌ Wrong - No ORDER BY causes inconsistent pages
{
  "table_name": "MARA",
  "offset": 100,
  "max_rows": 100
}

// ✅ Correct - ORDER BY ensures consistent results
{
  "table_name": "MARA",
  "offset": 100,
  "max_rows": 100,
  "order_by": ["MATNR"]
}
```

### Issue: Slow Performance
**Diagnosis using stats:**
```json
{
  "stats": {
    "metadata_fetch_ms": 2000,  // ⚠️ Very slow metadata fetch
    "query_time_ms": 5000,      // ⚠️ Slow query execution
    "total_time_ms": 7000
  }
}
```

**Solutions:**
- High metadata_fetch_ms: Network/authorization issue
- High query_time_ms: Add WHERE filters, reduce columns, add index

### Issue: Empty Result Set
```json
// Check stats to understand
{
  "rows": [],
  "stats": {
    "rows_returned": 0  // No data matched filters
  }
}
```

**Possible causes:**
- WHERE conditions too restrictive
- No data exists
- Wrong value format (dates need leading zeros: "20250101" not "2025-01-01")

## Real-World Examples

### Example 1: Material Master Query
```json
{
  "table_name": "MARA",
  "columns": ["MATNR", "ERSDA", "MTART", "MATKL"],
  "where_conditions": {
    "MTART": {"in": ["FERT", "HALB"]},
    "ERSDA": {"gte": "20250101"}
  },
  "order_by": ["ERSDA", "MATNR"],
  "max_rows": 200
}
```

### Example 2: Paginated Export
```json
// First page
{
  "table_name": "VBAK",
  "columns": ["VBELN", "ERDAT", "AUART"],
  "order_by": ["VBELN"],
  "max_rows": 500,
  "offset": 0
}

// Next page (check pagination.has_more first)
{
  "table_name": "VBAK",
  "columns": ["VBELN", "ERDAT", "AUART"],
  "order_by": ["VBELN"],
  "max_rows": 500,
  "offset": 500
}
```

### Example 3: Related Data Batch
```json
{
  "queries": [
    {
      "id": "header",
      "table_name": "VBAK",
      "columns": ["VBELN", "ERDAT", "KUNNR"],
      "where_conditions": {"VBELN": "1234567890"},
      "max_rows": 1
    },
    {
      "id": "items",
      "table_name": "VBAP",
      "columns": ["VBELN", "POSNR", "MATNR", "KWMENG"],
      "where_conditions": {"VBELN": "1234567890"},
      "max_rows": 100
    },
    {
      "id": "partner",
      "table_name": "VBPA",
      "columns": ["VBELN", "PARVW", "KUNNR"],
      "where_conditions": {"VBELN": "1234567890"},
      "max_rows": 50
    }
  ]
}
```

### Example 4: Date Range with Stats
```json
{
  "table_name": "MARA",
  "columns": ["MATNR", "ERSDA", "ERNAM"],
  "where_conditions": {
    "ERSDA": {"between": ["20250101", "20250131"]}
  },
  "order_by": ["ERSDA"],
  "max_rows": 500,
  "include_column_metadata": false
}

// Response includes timing breakdown
{
  "rows": [...],
  "stats": {
    "metadata_fetch_ms": 115,
    "query_time_ms": 245,
    "rows_returned": 487,
    "total_time_ms": 360
  }
}
```

## Security Notes

- **SQL Injection**: Prevented via column validation and value escaping
- **Read-Only**: ADT API enforces SELECT-only operations
- **Authorization**: Respects SAP user permissions
- **Resource Protection**: Row limits prevent excessive data extraction
- **Pattern Validation**: LIKE patterns sanitized
- **Operator Whitelisting**: Only safe operators allowed

## Technical Implementation

### Data Flow
1. Validate parameters
2. Fetch table metadata (validates existence)
3. Parse and cache column definitions
4. Validate all column references
5. Build safe SELECT statement with operators
6. Execute via ADT API
7. Parse XML response
8. Apply offset (slice rows)
9. Add pagination metadata
10. Collect timing statistics
11. Format and return result

### ADT Endpoints
- **Metadata**: `GET /sap/bc/adt/datapreview/ddic/{table}/metadata`
- **Data**: `POST /sap/bc/adt/datapreview/ddic?rowNumber={max}&ddicEntityName={table}`

### Offset Implementation
Since ADT API doesn't support native OFFSET, we:
1. Request `maxRows + offset` total rows
2. Receive full result from API
3. Slice array to skip first `offset` rows
4. Return only requested page

**Trade-off:** For `offset: 1000, max_rows: 100`, we fetch 1100 rows and return 100.

## Related Tools

- **GetTable**: Get table structure and all column definitions
- **GetStructure**: Get ABAP structure definitions
- **SearchObject**: Find tables by name pattern

## Migration Guide

### From Old Version
```json
// Old (still works)
{
  "table_name": "MARA",
  "max_rows": 100
}

// New (enhanced)
{
  "table_name": "MARA",
  "columns": ["MATNR", "ERSDA"],
  "max_rows": 100,
  "offset": 0,
  "include_column_metadata": false,
  "where_conditions": {
    "MTART": {"in": ["FERT", "HALB"]}
  }
}
```

### Breaking Changes
None - all new parameters are optional and backward compatible.

## When to Use Column Metadata

**Include metadata (true) when:**
- First-time exploration of unknown table
- Need to display column descriptions to users
- Building UI forms that need data types
- Generating documentation

**Skip metadata (false - default) when:**
- You already know the columns (performance)
- Bulk data export
- Performance-critical queries
- Large batch operations
- Repeated queries to same table


