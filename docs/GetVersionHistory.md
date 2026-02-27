# GetVersionHistory Tool Documentation

## Overview

The `GetVersionHistory` tool retrieves the complete version history of an ABAP object across transports from the SAP system via the ADT (ABAP Development Tools) API. It returns formatted table output with version IDs ready for use with CompareObjectVersions, including dates, authors, and transport information.

**Supported object types:** CLAS, PROG, INCL, FUGR, INTF, DDLS, BDEF, DCLS

## Endpoint Pattern

Different object types use different ADT API path patterns:

```
CLAS, FUGR, INTF: /sap/bc/adt/{path}/includes/main/versions
PROG, BDEF, INCL: /sap/bc/adt/{path}/source/main/versions
DDLS, DCLS:       /sap/bc/adt/{path}/versions
```

See [ADT_PATH_PATTERNS.md](ADT_PATH_PATTERNS.md) for detailed technical reference.

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `object_type` | string | Yes | Object type: CLAS, PROG, INCL, FUGR, INTF, DDLS, BDEF, DCLS |
| `object_name` | string | Yes | Name of the ABAP object |

## Response Structure

The tool returns a formatted table with version history:

```
Version History for CL_MAN_CHANGELOG (CLAS)
Total versions: 3
====================================================================================================

Ver      Date                 Author          Transport       Description
-------- -------------------- --------------- --------------- ----------------------------------------
20260201144253/00000  2026-02-23 16:51:15  DEVELOPER01     ER1K8AK0XH      Change log for production order
20260201144253/00006  2026-02-01 14:42:53  DEVELOPER01     ER1K8AK0DO      Change log for production order
20260201144253/00004  2026-01-30 11:57:52  DEVELOPER01     ER1K8AJZZ4      Change log for production order

====================================================================================================

NOTE: Version numbering for all object types:
      - Version "00000" = CURRENT/ACTIVE version (most recent code in system)
      - Numbered versions (00001+) = Historical transported versions
      - Version 00000 may have earlier timestamp but contains current code
      [TEST] = Generated test transport

TRANSPORT HIERARCHY:
      - Transport numbers can be either TASKS or REQUESTS (parent transports)
      - Tasks belong to a parent Request (e.g., ER1K8AK0XI is task of ER1K8AK0XH)
      - When analyzing a transport, the version may be recorded under the parent request
      - Use GetTransportRequest(<transport_number>) to see hierarchy and objects

Use CompareObjectVersions with version IDs shown above to see changes between versions.
```

**Key fields:**
- **Ver (Version ID)**: Format `timestamp/version` - ready for use with CompareObjectVersions
- **Date**: When the version was created
- **Author**: Who made the change
- **Transport**: Transport request or task number
- **Description**: Transport description

### Raw XML Response (Internal)

```xml
<?xml version="1.0" encoding="utf-8"?>
<atom:feed xmlns:atom="http://www.w3.org/2005/Atom">
  <atom:entry>
    <atom:id>/sap/bc/adt/oo/classes/zcl_example/source/main?version=67890</atom:id>
    <atom:title>Version 67890</atom:title>
    <atom:updated>2024-01-20T14:30:00Z</atom:updated>
    <atom:author>
      <atom:name>DEVELOPER</atom:name>
    </atom:author>
    <atom:link rel="http://www.sap.com/adt/relations/source"
               href="/sap/bc/adt/oo/classes/zcl_example/source/main?version=67890"/>
    <atom:content type="text">Transport: NPLK900042</atom:content>
  </atom:entry>
  <atom:entry>
    <atom:id>/sap/bc/adt/oo/classes/zcl_example/source/main?version=12345</atom:id>
    <atom:title>Version 12345</atom:title>
    <atom:updated>2024-01-15T10:15:00Z</atom:updated>
    <atom:author>
      <atom:name>DEVELOPER</atom:name>
    </atom:author>
    <atom:link rel="http://www.sap.com/adt/relations/source"
               href="/sap/bc/adt/oo/classes/zcl_example/source/main?version=12345"/>
    <atom:content type="text">Transport: NPLK900041</atom:content>
  </atom:entry>
  <!-- Additional version entries -->
</atom:feed>
```

## Usage Examples

### Example 1: Get Class Version History

```json
{
  "object_type": "CLAS",
  "object_name": "ZCL_MY_CLASS"
}
```

### Example 2: Get Program Version History

```json
{
  "object_type": "PROG",
  "object_name": "Z_MY_PROGRAM"
}
```

### Example 3: Get Function Group Version History

```json
{
  "object_type": "FUGR",
  "object_name": "Z_MY_FUNCTION_GROUP"
}
```

### Example 4: Get Interface Version History

```json
{
  "object_type": "INTF",
  "object_name": "ZIF_MY_INTERFACE"
}
```

## Response Format

### Success Response

The tool returns Atom XML with version history entries:

```xml
<atom:feed xmlns:atom="http://www.w3.org/2005/Atom">
  <atom:entry>
    <!-- Version details -->
  </atom:entry>
</atom:feed>
```

### Error Response Examples

**Missing Object Type**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Object type is required (e.g., CLAS, PROG, FUGR, INTF)"
  }]
}
```

**Missing Object Name**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Object name is required"
  }]
}
```

**Unsupported Object Type**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Unsupported object type: TABL. Supported types: CLAS, PROG, FUGR, INTF"
  }]
}
```

**Object Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Object not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read version history"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Parameters**: If object_type or object_name is not provided
2. **Unsupported Object Type**: If the object type is not CLAS, PROG, FUGR, or INTF
3. **Object Not Found**: If the specified object doesn't exist in the system
4. **Authorization Error**: If the user doesn't have permission to read version history (requires S_DEVELOP authorization)
5. **Network Issues**: Connection problems with the SAP system
6. **No Version History**: Some objects may not have version history available

## Use Cases

### 1. Version Comparison Preparation
Retrieve version identifiers to compare different versions of an object across transports.

### 2. Change Tracking
Track when and by whom an object was modified over time.

### 3. Transport Impact Analysis
Understand which transports affected a specific object.

### 4. Rollback Planning
Identify previous versions for potential rollback scenarios.

### 5. Code Review Historical Changes
Review the evolution of an object's implementation over time.

### 6. Audit Trail
Generate audit reports showing modification history for compliance.

### 7. Developer Activity Analysis
Analyze which developers modified specific objects and when.

## Best Practices

1. **Combine with GetObjectVersion**: Use version identifiers to retrieve actual source code
2. **Parse XML Response**: Extract version numbers, dates, and authors for analysis
3. **Cache Results**: Version history changes infrequently; consider caching
4. **Filter by Date**: Focus on recent versions for most use cases
5. **Authorization Check**: Ensure users have S_DEVELOP authorization for the object

## Integration Examples

### Version Comparison Workflow

```javascript
// 1. Get version history
const history = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetVersionHistory",
  arguments: {
    object_type: "CLAS",
    object_name: "ZCL_MY_CLASS"
  }
});

// 2. Parse XML to extract version identifiers (e.g., "67890" and "12345")
// 3. Get source code for each version
const version1 = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetObjectVersion",
  arguments: {
    object_type: "CLAS",
    object_name: "ZCL_MY_CLASS",
    version: "67890"
  }
});

const version2 = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetObjectVersion",
  arguments: {
    object_type: "CLAS",
    object_name: "ZCL_MY_CLASS",
    version: "12345"
  }
});

// 4. Compare version1.data with version2.data to see changes
```

### With ListUserTransports Tool

```javascript
// 1. List transports for a user
const transports = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "ListUserTransports",
  arguments: {
    user: "DEVELOPER"
  }
});

// 2. Get version history for an object
const history = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetVersionHistory",
  arguments: {
    object_type: "CLAS",
    object_name: "ZCL_MY_CLASS"
  }
});

// Cross-reference to see which versions correspond to which transports
```

### Change Tracking Over Time

```javascript
// Get version history
const history = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetVersionHistory",
  arguments: {
    object_type: "PROG",
    object_name: "Z_MY_REPORT"
  }
});

// Parse XML to create timeline:
// - 2024-01-20: Developer A (Transport NPLK900042)
// - 2024-01-15: Developer B (Transport NPLK900041)
// - 2024-01-10: Developer A (Transport NPLK900040)
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/oo/classes/{class_name}/includes/main/versions` - For classes
- **GET** `/sap/bc/adt/programs/programs/{program_name}/includes/main/versions` - For programs
- **GET** `/sap/bc/adt/functions/groups/{group_name}/includes/main/versions` - For function groups
- **GET** `/sap/bc/adt/oo/interfaces/{interface_name}/includes/main/versions` - For interfaces

### Request Headers
- `Accept: application/atom+xml;type=feed` - Request Atom feed XML response (note: ;type=feed is required)
- `Authorization: Basic <credentials>` - Basic authentication
- `X-SAP-Client: <client>` - SAP client number

### Response Format
- Content-Type: `application/atom+xml;type=feed`
- Character encoding: UTF-8
- Structure: Atom feed with version entries

### Security Considerations
- **Authorization Required**: S_DEVELOP with ACTVT=03 (display)
- **Object-Level Security**: Additional authorization objects may apply based on package
- **Version Access**: All users with display authorization can see version history

## Version Entry Structure

Each version entry in the Atom feed contains:

| Element | Description |
|---------|-------------|
| `atom:id` | Unique identifier with version parameter |
| `atom:title` | Version identifier |
| `atom:updated` | Timestamp of the version |
| `atom:author/atom:name` | Developer who created the version |
| `atom:link` | URL to retrieve the version's source code |
| `atom:content` | Additional information (transport number, etc.) |

## Supported Object Types

| Object Type | Code | ADT Path Component |
|-------------|------|-------------------|
| Class | CLAS | `oo/classes/{name}` |
| Program | PROG | `programs/programs/{name}` |
| Function Group | FUGR | `functions/groups/{name}` |
| Interface | INTF | `oo/interfaces/{name}` |

## Limitations

1. **Object Type Support**: Only CLAS, PROG, FUGR, and INTF are currently supported
2. **Active Versions Only**: Returns versions that were activated, not intermediate saves
3. **Transport-Based**: Version history is based on transport releases
4. **No Source Code**: Returns metadata only; use GetObjectVersion to retrieve actual code
5. **System-Dependent**: Version numbering may vary by SAP system configuration

## Performance Considerations

- **Response Size**: Objects with many versions may have large responses
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Version history changes infrequently; aggressive caching is safe

## Related Tools

- **GetObjectVersion**: Retrieve source code for a specific version
- **ListUserTransports**: List transport requests to cross-reference with versions
- **GetClass**: Retrieve current active version of a class
- **GetProgram**: Retrieve current active version of a program
- **GetInterface**: Retrieve current active version of an interface
- **GetFunction**: Retrieve current active version of a function module

## Version History

- **v1.0**: Initial implementation with support for CLAS, PROG, FUGR, INTF
- **v1.1**: Enhanced error handling and validation

## Additional Notes

- Object names are case-insensitive but typically stored in uppercase
- The tool automatically URL-encodes the object name
- Timeout is set to 30 seconds for version history retrieval
- Version identifiers are system-generated and unique within each object
- The most recent version appears first in the feed
- Empty version history indicates the object has never been transported
