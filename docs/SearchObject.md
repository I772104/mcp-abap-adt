# SearchObject Tool Documentation

## Overview

The `SearchObject` tool performs a quick search for ABAP objects across the SAP system via the ADT (ABAP Development Tools) API. It allows searching for classes, programs, function modules, tables, and other repository objects using wildcard patterns.

## Endpoint

```
GET /sap/bc/adt/repository/informationsystem/search?operation=quickSearch
```

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query string (supports * wildcard for partial matching) |
| `maxResults` | number | No | 100 | Maximum number of results to return |

## Response Structure

The tool returns search results in XML format, including:

- Object name
- Object type
- Object description
- Package name
- Object URI for further access

### Example Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<objectReferences xmlns="http://www.sap.com/adt/repository/informationsystem">
  <objectReference adtcore:uri="/sap/bc/adt/oo/classes/zcl_customer_manager"
                   adtcore:type="CLAS/OC"
                   adtcore:name="ZCL_CUSTOMER_MANAGER"
                   adtcore:packageName="ZCUSTOMER"
                   adtcore:description="Customer Management Class"/>
  <objectReference adtcore:uri="/sap/bc/adt/programs/programs/zcustomer_report"
                   adtcore:type="PROG/P"
                   adtcore:name="ZCUSTOMER_REPORT"
                   adtcore:packageName="ZCUSTOMER"
                   adtcore:description="Customer Report"/>
  <objectReference adtcore:uri="/sap/bc/adt/ddic/tables/zcustomer"
                   adtcore:type="TABL/DT"
                   adtcore:name="ZCUSTOMER"
                   adtcore:packageName="ZCUSTOMER"
                   adtcore:description="Customer Master Data"/>
</objectReferences>
```

## Usage Examples

### Example 1: Search for All Z Objects

```json
{
  "query": "Z*",
  "maxResults": 50
}
```

### Example 2: Search for Specific Class Pattern

```json
{
  "query": "ZCL_CUSTOMER*",
  "maxResults": 20
}
```

### Example 3: Search for Function Modules

```json
{
  "query": "Z_*_CALCULATE*",
  "maxResults": 100
}
```

### Example 4: Exact Match Search

```json
{
  "query": "ZCL_MY_CLASS"
}
```

## Response Format

### Success Response

Returns XML with matching objects:

```xml
<objectReferences>
  <objectReference 
    adtcore:uri="/sap/bc/adt/oo/classes/zcl_example"
    adtcore:type="CLAS/OC"
    adtcore:name="ZCL_EXAMPLE"
    adtcore:packageName="ZPACKAGE"
    adtcore:description="Example Class"/>
  ...
</objectReferences>
```

### Error Response Examples

**Missing Query**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Search query is required"
  }]
}
```

**No Results Found**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<objectReferences xmlns="http://www.sap.com/adt/repository/informationsystem">
  <!-- Empty - no objects found -->
</objectReferences>
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to search objects"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Query**: If `query` parameter is not provided
2. **Authorization Error**: If the user doesn't have permission to search objects
3. **Network Issues**: Connection problems with the SAP system
4. **Invalid Query**: If the query contains invalid characters
5. **Timeout**: Search takes longer than 30 seconds

## Object Types

The search can return various ABAP object types:

### Common Object Types

| Type | Description |
|------|-------------|
| `CLAS/OC` | ABAP Class |
| `INTF/OI` | ABAP Interface |
| `PROG/P` | ABAP Program/Report |
| `FUGR/F` | Function Group |
| `TABL/DT` | Database Table |
| `DTEL/DE` | Data Element |
| `DOMA/DO` | Domain |
| `TTYP/TT` | Table Type |
| `DDLS/DF` | CDS View |
| `PINF/KI` | Package Interface |

## Wildcard Patterns

### Asterisk (*) Wildcard
- Matches zero or more characters
- Can be used at beginning, middle, or end of search term

### Pattern Examples

| Pattern | Matches |
|---------|---------|
| `Z*` | All objects starting with Z |
| `*CUSTOMER*` | Objects containing CUSTOMER |
| `ZCL_*_MANAGER` | Classes like ZCL_DATA_MANAGER, ZCL_USER_MANAGER |
| `Z_CALCULATE_*` | Functions starting with Z_CALCULATE_ |

## Use Cases

### 1. Object Discovery
Find objects by name pattern across the system.

### 2. Package Analysis
Discover all objects in a specific namespace.

### 3. Naming Convention Verification
Verify objects follow naming conventions.

### 4. Impact Analysis
Find related objects before making changes.

### 5. Code Review
Locate objects for code review processes.

### 6. Documentation
Generate object lists for documentation.

### 7. Cleanup Operations
Identify obsolete or unused objects.

## Best Practices

1. **Use Specific Patterns**: More specific patterns return faster results
2. **Limit Results**: Use maxResults to avoid overwhelming responses
3. **Cache Results**: Search results can be cached for repeated queries
4. **Error Handling**: Always check for errors before processing results
5. **Authorization**: Ensure users have appropriate search authorization
6. **Combine with Other Tools**: Use search results to retrieve detailed object information

## Integration Examples

### With GetClass Tool

```javascript
// 1. Search for classes
const searchResults = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "SearchObject",
  arguments: {
    query: "ZCL_CUSTOMER*",
    maxResults: 20
  }
});

// 2. Parse results and get first class
const classMatch = searchResults.data.match(/adtcore:name="([^"]+)".*adtcore:type="CLAS\/OC"/);
if (classMatch) {
  const className = classMatch[1];
  
  // 3. Get class details
  const classDetails = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "GetClass",
    arguments: {
      class_name: className
    }
  });
}
```

### Batch Object Retrieval

```javascript
// Search and retrieve multiple objects
async function searchAndRetrieve(pattern, objectType) {
  // 1. Search for objects
  const searchResults = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "SearchObject",
    arguments: {
      query: pattern,
      maxResults: 50
    }
  });
  
  // 2. Parse XML and extract object names
  const regex = new RegExp(`adtcore:name="([^"]+)".*adtcore:type="${objectType}"`, 'g');
  const matches = Array.from(searchResults.data.matchAll(regex));
  const objectNames = matches.map(m => m[1]);
  
  // 3. Retrieve each object
  const objects = [];
  for (const name of objectNames) {
    try {
      const obj = await use_mcp_tool({
        server_name: "mcp-abap-adt-1",
        tool_name: "GetClass", // or appropriate tool
        arguments: { class_name: name }
      });
      objects.push({ name, source: obj.data });
    } catch (error) {
      console.error(`Failed to retrieve ${name}`);
    }
  }
  
  return objects;
}
```

### Package Object Listing

```javascript
// List all objects in a package
async function listPackageObjects(packagePrefix) {
  const searchResults = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "SearchObject",
    arguments: {
      query: `${packagePrefix}*`,
      maxResults: 200
    }
  });
  
  // Parse and categorize objects by type
  const objects = {
    classes: [],
    programs: [],
    tables: [],
    functions: [],
    other: []
  };
  
  // Parse XML and categorize
  // (parsing logic here)
  
  return objects;
}
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/repository/informationsystem/search` - Perform quick search

### Request Parameters
- `operation=quickSearch` - Specifies quick search operation
- `query={search_pattern}` - URL-encoded search pattern
- `maxResults={number}` - Maximum results to return

### Request Headers
- `Accept: application/xml` - Request XML response
- `x-csrf-token: fetch` - CSRF token for security

### Response Format
- Content-Type: `application/xml`
- Character encoding: UTF-8

### Security Considerations
- **Authorization Required**: S_DEVELOP with ACTVT=03 (display)
- **Cross-Package Access**: May require additional authorization
- **CSRF Protection**: Automatic token management for secure requests

## Search Performance

### Factors Affecting Performance

1. **Pattern Specificity**: More specific patterns search faster
2. **Result Limit**: Lower maxResults improves response time
3. **System Size**: Larger systems take longer to search
4. **Network Latency**: Response time depends on connection
5. **System Load**: Performance varies with system load

### Optimization Tips

- Use specific prefixes (e.g., `ZCL_CUSTOMER*` vs `Z*`)
- Limit results to what you need
- Cache search results when possible
- Search during off-peak hours for large queries
- Use multiple specific searches instead of one broad search

## Limitations

1. **Wildcard Only**: Only supports * wildcard, not regex
2. **Active Objects**: Searches only activated objects
3. **No Content Search**: Searches object names, not content
4. **Result Limit**: Maximum results capped by maxResults parameter
5. **No Sorting**: Results are not sorted by relevance

## Performance Considerations

- **Response Size**: Large result sets may take longer
- **Network Latency**: Response time depends on network connection
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching for repeated searches

## Troubleshooting

### No Results Found
- Verify the search pattern is correct
- Check if objects exist with that pattern
- Ensure wildcard (*) is used correctly
- Verify authorization to view objects

### Too Many Results
- Make the search pattern more specific
- Reduce maxResults parameter
- Use additional filtering criteria
- Break into multiple targeted searches

### Slow Performance
- Reduce maxResults
- Use more specific search patterns
- Search during off-peak hours
- Check network connection

## Related Tools

- **GetClass**: Retrieve class details from search results
- **GetProgram**: Retrieve program details from search results
- **GetTable**: Retrieve table details from search results
- **GetFunction**: Retrieve function module details
- **GetPackageContents**: Alternative for package-specific searches

## Version History

- **v1.0**: Initial implementation with basic search
- **v1.1**: Enhanced error handling and result parsing
- **v1.2**: Improved performance for large result sets

## Additional Notes

- Search is case-insensitive
- The tool automatically URL-encodes the query
- Timeout is set to 30 seconds for searches
- Results include object URI for direct access
- Search covers all object types in the repository
- Wildcard (*) can be used multiple times in a pattern
- Empty results return valid XML with no object references
- Search respects user authorization for object visibility
- Results may include objects from all packages user has access to
- Use GetPackageContents for comprehensive package object listing