# GetCDSViewContents Tool Documentation

## Overview

The `GetCDSViewContents` tool queries data from CDS (Core Data Services) views using the ADT Data Preview API. It provides secure, read-only access with pagination, filtering, CDS parameter support, query statistics, and batch query capabilities.

## Key Differences from GetTableContents

| Feature | Tables | CDS Views |
|---------|--------|-----------|
| **Data Source** | Physical tables | Virtual views (computed) |
| **Parameters** | ❌ Not supported | ✅ Supported (critical!) |
| **Performance** | Fast, consistent | Variable (depends on complexity) |
| **Batch Limit** | 10 queries | 5 queries (more expensive) |
| **Pagination** | Efficient | Expensive (recalculates data) |
| **Use Case** | Raw data access | Business logic, aggregations |

## Security Features

This tool implements multiple security layers:

1. **Metadata Validation**: Always validates view existence before query execution
2. **Column Validation**: All column names validated against actual view columns
3. **Read-Only Operations**: Only SELECT statements allowed (enforced by ADT API)
4. **Parameterized Queries**: Uses ADT API which safely handles SQL construction
5. **Row Limit Enforcement**: Maximum 500 rows per request
6. **Value Escaping**: Single quotes and special characters properly escaped

## Parameters

### Single Query Mode

| Parameter                 | Type      | Default       | Description                            |
|---------------------------|-----------|---------------|----------------------------------------|
| `view_name`               | string    | **required**  | CDS view name (e.g., "I_SalesOrder")   |
| `parameters`              | object    | none          | CDS view parameters                    |
| `columns`                 | string[]  | all columns   | Specific columns to retrieve           |
| `max_rows`                | number    | 100           | Maximum rows (max: 500)                |
| `offset`                  | number    | 0             | Rows to skip for pagination            |  
| `where_conditions`        | object    | none          | Equality filter conditions             |
| `order_by`                | string[]  | none          | Columns for sorting                    |
| `include_column_metadata` | boolean   | **false**     | Include column type/description        |

⭐ **NEW**: CDS views can have input parameters that must be provided  
⚠️ **WARNING**: Pagination with offset recalculates data on each query (expensive)

### Batch Query Mode

| Parameter                     | Type      | Description                       |
|-------------------------------|-----------|-----------------------------------|
| `queries`                     | array     | Array of query objects (max: 5)   |
| `queries[].id`                | string    | Optional identifier for results   |
| `queries[].view_name`         | string    | **required** - View name          |
| `queries[].parameters`        | object    | Optional CDS parameters           |
| `queries[].columns`           | string[]  | Optional column selection         |
| `queries[].max_rows`          | number    | Optional row limit                |
| `queries[].offset`            | number    | Optional pagination offset        |
| `queries[].where_conditions`  | object    | Optional filter conditions        |
| `queries[].order_by`          | string[]  | Optional sort columns             |

## CDS View Parameters

Many CDS views require input parameters to function. These are different from WHERE conditions.

### Example: View with Parameters

```abap
@EndUserText.label: 'Sales Orders by Date'
define view I_SalesOrderWithDate
  with parameters
    p_date : abap.dats,
    p_company : bukrs
  as select from vbak
  where erdat = :p_date
    and bukrs = :p_company
```

### Providing Parameters

```json
{
  "view_name": "I_SalesOrderWithDate",
  "parameters": {
    "p_date": "20240101",
    "p_company": "1000"
  },
  "max_rows": 50
}
```

## WHERE Conditions

### Simple Equality
```json
{
  "where_conditions": {
    "SalesOrderType": "OR",
    "SalesOrganization": "1000"
  }
}
```

### Explicit Equality Operator
```json
{
  "where_conditions": {
    "SalesOrder": {"eq": "1000000"}
  }
}
```

## Response Format

```json
{
  "view_name": "I_SalesOrder",
  "cds_type": "PROJECTION_ENTITY",
  "cds_entity_name": "I_SalesOrder",
  "total_rows": 0,
  "execution_time": "1.234",
  "rows": [
    {
      "SalesOrder": "1000000",
      "SalesOrderType": "OR",
      "SoldToParty": "17100001"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 100,
    "has_more": false
  },
  "stats": {
    "metadata_fetch_ms": 251,
    "query_time_ms": 983,
    "rows_returned": 1,
    "total_time_ms": 1234
  }
}
```

### With Parameters
```json
{
  "view_name": "I_SalesOrderWithDate",
  "cds_type": "BASIC",
  "parameters": {
    "p_date": "20240101",
    "p_company": "1000"
  },
  "rows": [...],
  "pagination": {...},
  "stats": {...}
}
```

### With Performance Warning
```json
{
  "view_name": "I_Material",
  "rows": [...],
  "pagination": {
    "offset": 100,
    "limit": 100,
    "has_more": true
  },
  "warnings": [
    "CDS view queries with offset recalculate data on each request. Consider using WHERE conditions to filter data instead for better performance."
  ],
  "stats": {...}
}
```

### With Column Metadata
```json
{
  "view_name": "I_SalesOrder",
  "columns": [
    {
      "name": "SALESORDER",
      "camelCaseName": "SalesOrder",
      "type": "C",
      "description": "Sales Order Number",
      "keyAttribute": true,
      "isKeyFigure": false
    }
  ],
  "rows": [...],
  "stats": {...}
}
```

### Batch Query Response
```json
{
  "batch_results": {
    "sales_orders": {
      "view_name": "I_SalesOrder",
      "rows": [...],
      "stats": {...}
    },
    "materials": {
      "view_name": "I_Material",
      "rows": [...],
      "stats": {...}
    }
  },
  "stats": {
    "total_queries": 2,
    "successful": 2,
    "failed": 0,
    "total_time_ms": 2450
  }
}
```

## Usage Examples

### Example 1: Basic Query
```json
{
  "view_name": "I_SalesOrder",
  "max_rows": 10
}
```

### Example 2: With CDS Parameters ⭐
```json
{
  "view_name": "I_SalesOrderWithDate",
  "parameters": {
    "p_date": "20240101",
    "p_company": "1000"
  },
  "max_rows": 50
}
```

### Example 3: Specific Columns
```json
{
  "view_name": "I_SalesOrder",
  "columns": ["SalesOrder", "SalesOrderType", "SoldToParty"],
  "max_rows": 50
}
```

### Example 4: With Equality Filter
```json
{
  "view_name": "I_SalesOrder",
  "columns": ["SalesOrder", "SalesOrderType", "CreationDate"],
  "where_conditions": {
    "SalesOrderType": "OR"
  },
  "max_rows": 20
}
```

### Example 5: With Sorting
```json
{
  "view_name": "I_Material",
  "columns": ["Material", "MaterialType", "MaterialGroup"],
  "order_by": ["Material"],
  "max_rows": 50
}
```

### Example 6: With Pagination (Use Carefully!)
```json
{
  "view_name": "I_BusinessPartner",
  "columns": ["BusinessPartner", "BusinessPartnerName"],
  "max_rows": 100,
  "offset": 0,
  "order_by": ["BusinessPartner"]
}
```

### Example 7: With Column Metadata
```json
{
  "view_name": "I_SalesOrder",
  "columns": ["SalesOrder", "SalesOrderType"],
  "include_column_metadata": true,
  "max_rows": 5
}
```

### Example 8: Batch Queries (Max 5)
```json
{
  "queries": [
    {
      "id": "sales_orders",
      "view_name": "I_SalesOrder",
      "columns": ["SalesOrder", "SalesOrderType"],
      "max_rows": 5
    },
    {
      "id": "materials",
      "view_name": "I_Material",
      "columns": ["Material", "MaterialType"],
      "max_rows": 5
    }
  ]
}
```

### Example 9: Complex Query with All Features
```json
{
  "view_name": "I_SalesOrderWithDate",
  "parameters": {
    "p_date": "20240101"
  },
  "columns": ["SalesOrder", "SalesOrderType", "SoldToParty", "NetAmount"],
  "where_conditions": {
    "SalesOrderType": "OR",
    "SalesOrganization": "1000"
  },
  "order_by": ["SalesOrder"],
  "max_rows": 100,
  "include_column_metadata": true
}
```

## Performance Best Practices

### 1. Provide Required Parameters
```json
// ✅ Good: Provides required parameters
{
  "view_name": "I_SalesOrderWithDate",
  "parameters": {"p_date": "20240101"}
}

// ❌ Bad: Missing required parameters (will fail)
{
  "view_name": "I_SalesOrderWithDate"
}
```

### 2. Select Only Needed Columns
```json
// ✅ Better performance
{
  "view_name": "I_SalesOrder",
  "columns": ["SalesOrder", "SalesOrderType"]
}

// ❌ Slower (retrieves all columns)
{
  "view_name": "I_SalesOrder"
}
```

### 3. Use WHERE Conditions Instead of Offset
```json
// ✅ Better: Filter with WHERE
{
  "view_name": "I_SalesOrder",
  "where_conditions": {"SalesOrderType": "OR"},
  "max_rows": 100
}

// ⚠️ Slower: Pagination recalculates
{
  "view_name": "I_SalesOrder",
  "offset": 100,
  "max_rows": 100
}
```

### 4. Always Use ORDER BY for Pagination
```json
{
  "view_name": "I_SalesOrder",
  "order_by": ["SalesOrder"],
  "offset": 0,
  "max_rows": 100
}
```

### 5. Limit Batch Queries
```json
// ✅ Good: 5 or fewer queries
{
  "queries": [
    {"view_name": "I_SalesOrder", "max_rows": 10},
    {"view_name": "I_Material", "max_rows": 10}
  ]
}

// ❌ Bad: More than 5 queries (will fail)
{
  "queries": [/* 6+ queries */]
}
```

## Common Errors

| Error | Solution |
|-------|----------|
| `view_name is required` | Provide view_name parameter |
| `CDS view X not found` | Check view name and permissions |
| `max_rows cannot exceed 500` | Reduce max_rows or use pagination |
| `Invalid column name: X` | Use GetCDSView to see available columns |
| `Cannot execute more than 5 queries` | Split into multiple batch calls |
| `Missing required parameter: p_date` | Provide required CDS parameters |

## Troubleshooting

### Empty Result Set
Check if data exists and filters/parameters are correct:
```json
{
  "rows": [],
  "stats": {
    "rows_returned": 0
  }
}
```

### Parameter Errors
If a view requires parameters, you must provide them:
```json
{
  "view_name": "I_SalesOrderWithDate",
  "parameters": {
    "p_date": "20240101"  // Required!
  }
}
```

### Performance Issues
CDS views can be slow. Check execution time:
```json
{
  "stats": {
    "query_time_ms": 5000  // 5 seconds - consider optimizing
  }
}
```

## Real-World Examples

### Sales Orders Query
```json
{
  "view_name": "I_SalesOrder",
  "columns": ["SalesOrder", "SalesOrderType", "SoldToParty", "CreationDate"],
  "where_conditions": {"SalesOrderType": "OR"},
  "order_by": ["CreationDate"],
  "max_rows": 50
}
```

### Material Master Data
```json
{
  "view_name": "I_Material",
  "columns": ["Material", "MaterialType", "MaterialGroup", "BaseUnit"],
  "where_conditions": {"MaterialType": "FERT"},
  "max_rows": 100
}
```

### Business Partner Search
```json
{
  "view_name": "I_BusinessPartner",
  "columns": ["BusinessPartner", "BusinessPartnerName", "BusinessPartnerCategory"],
  "order_by": ["BusinessPartnerName"],
  "max_rows": 50
}
```

## Technical Details

### ADT Endpoints
- **Metadata**: `GET /sap/bc/adt/datapreview/cds/{view}/metadata`
- **Data**: `POST /sap/bc/adt/datapreview/cds?rowNumber={max}&ddlSourceName={view}`

### CDS-Specific Metadata
- `cdsTypeKind`: PROJECTION_ENTITY, BASIC, ANALYTICAL, etc.
- `cdsEntityName`: Technical CDS entity name
- `cdsCamelCaseName`: Camel case variant

### Parameter Handling
Parameters are passed in the FROM clause:
```sql
SELECT * FROM I_SalesOrderWithDate( p_date = '20240101', p_company = '1000' )
```

### Offset Implementation
The ADT API doesn't support native OFFSET. The tool:
1. Requests `maxRows + offset` total rows
2. Receives full result from API
3. Slices array to skip first `offset` rows
4. Returns only requested page
5. Adds performance warning

## Related Tools

- **GetCDSView**: Get CDS view source code and metadata
- **GetBehaviorDefinition**: Get RAP behavior definition
- **GetTableContents**: Query database tables (faster for raw data)
- **SearchObject**: Find CDS views by name pattern

## Best Practices Summary

✅ **DO**:
- Provide required CDS parameters
- Select only needed columns
- Use WHERE conditions for filtering
- Use ORDER BY for consistent pagination
- Check execution time in stats
- Limit batch queries to 5 or fewer

❌ **DON'T**:
- Use offset without ORDER BY
- Query all columns unnecessarily
- Exceed 500 rows per query
- Batch more than 5 CDS views
- Ignore performance warnings
- Forget required parameters