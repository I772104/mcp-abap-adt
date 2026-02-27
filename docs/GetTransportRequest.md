# GetTransportRequest Tool Documentation

> **📢 UPDATED (2026-02-26)**: This tool now returns **formatted, human-readable output** with automatic task/parent request hierarchy visualization. See [Response Format](#response-format-updated) section below for the new output format. Raw XML is still included for detailed inspection.

## Overview

The `GetTransportRequest` tool retrieves detailed information for a specific transport request from the SAP Change and Transport System (CTS) via the ADT (ABAP Development Tools) API. Unlike `ListUserTransports` which only returns transport metadata, this tool returns the **complete transport details including all objects, tasks, and locked objects** contained in the transport.

**NEW FEATURES (v1.1)**:
- ✅ **Formatted output** with clear hierarchy visualization
- ✅ **Automatic task/parent detection** - shows "TASK → Parent Request" relationship
- ✅ **Object list table** - readable format with numbering
- ✅ **Guided next steps** - suggests using GetVersionHistory with parent request
- ✅ **Educational context** - explains why versions may be in parent request

## Endpoint

```
GET /sap/bc/adt/cts/transportrequests/{TRANSPORT_NUMBER}
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transport_number` | string | Yes | The transport request number (e.g., ER1K8AKL0L, NPLK900042) |

## Response Structure

The tool returns transport request details in Atom XML format, including:

- Transport request metadata (number, description, owner, status, dates)
- All tasks associated with the transport
- Complete list of objects locked in the transport
  - Object type (CLAS, PROG, TABL, FUGR, etc.)
  - Object name
  - Lock type
  - Lock owner
  - Lock date/time
- Subtransport information
- Target system information

### Example Response

```xml
<?xml version="1.0" encoding="utf-8"?>
<tm:abapTransportRequest xmlns:tm="http://www.sap.com/adt/tm">
  <tm:header>
    <tm:trkorr>ER1K8AKL0L</tm:trkorr>
    <tm:trfunction>K</tm:trfunction>
    <tm:trstatus>D</tm:trstatus>
    <tm:as4user>DEVELOPER01</tm:as4user>
    <tm:as4text>Review Order Progress Dump</tm:as4text>
  </tm:header>
  <tm:tasks>
    <tm:task>
      <tm:trkorr>ER1K8AKL0M</tm:trkorr>
      <tm:trfunction>S</tm:trfunction>
      <tm:trstatus>D</tm:trstatus>
    </tm:task>
  </tm:tasks>
  <tm:objects>
    <tm:object>
      <tm:pgmid>R3TR</tm:pgmid>
      <tm:object>CLAS</tm:object>
      <tm:obj_name>ZCL_MY_CLASS</tm:obj_name>
      <tm:lockflag>X</tm:lockflag>
    </tm:object>
    <tm:object>
      <tm:pgmid>R3TR</tm:pgmid>
      <tm:object>PROG</tm:object>
      <tm:obj_name>Z_MY_PROGRAM</tm:obj_name>
      <tm:lockflag>X</tm:lockflag>
    </tm:object>
  </tm:objects>
</tm:abapTransportRequest>
```

## Usage Examples

### Example 1: Get Transport Details

```json
{
  "transport_number": "ER1K8AKL0L"
}
```

This retrieves complete details for transport request ER1K8AKL0L including all objects.

### Example 2: Find Objects Changed by a User

```javascript
// 1. List transports for a user
const transports = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "ListUserTransports",
  arguments: {
    user: "DEVELOPER01"
  }
});

// 2. Get details for each transport to see objects
const transport1 = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetTransportRequest",
  arguments: {
    transport_number: "ER1K8AKL0L"
  }
});
```

## Response Format (UPDATED)

### New Formatted Output (v1.1+)

The tool now returns formatted, human-readable output followed by the raw XML:

```
================================================================================
TRANSPORT DETAILS: ER1K8AK0XI
================================================================================

Type: T
Description: Change log for production order
Last Changed: 2026-02-23T18:09:38Z by DEVELOPER01

TASK: ER1K8AK0XI
  Parent Request: ER1K8AK0XH ← This is the parent transport
  Owner: DEVELOPER01
  Type: Development/Correction
  Status: Modifiable
  Description: Change log for production order

================================================================================
OBJECTS IN TRANSPORT (15)
================================================================================
#     Object Name                              Type
----- ---------------------------------------- ------------------------------
   1. PP_MFGORDER_CHGDOC                       Feature Toggle
   2. CL_MAN_CHANGELOG                         Class Include (ABAP Objects)
   3. CL_MAN_CHANGELOG              GET_TABLE_FIELDS_ATTRIBUTES_CD Method
   ...

================================================================================

NEXT STEPS:
  - Use GetVersionHistory(<object_name>, <object_type>) to see versions
  - When checking version history, look for transport: ER1K8AK0XH
    (versions may be recorded under parent request, not the task)
  - Use GetObjectVersion to retrieve specific version source code

================================================================================

RAW XML RESPONSE (for detailed inspection):
================================================================================
<?xml version="1.0" encoding="utf-8"?>
<tm:root ...>
```

**Key Benefits:**
- **Immediate clarity**: Task/Request hierarchy shown with arrow indicator
- **Readable object list**: No XML parsing needed
- **Guided workflow**: Next steps tell you exactly what to do
- **Educational**: Explains transport hierarchy concepts

### Legacy XML-Only Response (pre-v1.1)

Prior versions returned only raw XML (still available at end of new output).

## Response Format

### Success Response

The tool returns Atom XML with complete transport details (now formatted for readability):

```xml
<tm:abapTransportRequest xmlns:tm="http://www.sap.com/adt/tm">
  <!-- Transport header with metadata -->
  <!-- Tasks list -->
  <!-- Objects list with types and names -->
</tm:abapTransportRequest>
```

### Error Response Examples

**Transport Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Transport request ER1K8AKL0L not found"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read transport request"
  }]
}
```

**Missing Parameter**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Missing required parameter: transport_number"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Parameter**: If transport_number is not provided
2. **Transport Not Found**: If the transport request doesn't exist (HTTP 404)
3. **Authorization Error**: If the user doesn't have permission to read the transport (requires S_CTS_ADMI or similar authorization)
4. **Network Issues**: Connection problems with the SAP system
5. **Invalid Transport Number**: If transport number contains invalid characters

## Use Cases

### 1. Analyze Transport Contents
View all objects included in a transport request before releasing it.

### 2. Track Developer Changes
After listing transports for a user, get details to see exactly what objects they modified.

### 3. Code Review Preparation
Identify all objects in a transport for thorough code review.

### 4. Impact Analysis
Understand the scope of changes by seeing all affected objects.

### 5. Transport Comparison
Compare objects between multiple transports to identify overlaps.

### 6. Audit Trail
Generate detailed reports of what was transported including object types and names.

### 7. Release Validation
Verify that all expected objects are included in a transport before release.

## Object Types

Common object types (tm:object) you may see:

| Code | Description |
|------|-------------|
| CLAS | ABAP Class |
| PROG | ABAP Program |
| FUGR | Function Group |
| TABL | Database Table |
| DTEL | Data Element |
| DOMA | Domain |
| DDLS | CDS View |
| BDEF | Behavior Definition |
| SRVD | Service Definition |
| SRVB | Service Binding |
| INTF | Interface |
| TRAN | Transaction Code |

## PGMID Values

| Code | Description |
|------|-------------|
| R3TR | Workbench object |
| LIMU | Subobject (e.g., method in a class) |
| LANG | Language-dependent texts |

## Best Practices

1. **Use with ListUserTransports**: First list transports, then get details for specific ones
2. **Check Authorization**: Ensure users have appropriate CTS authorization
3. **Cache Results**: Transport details can be cached for short periods to reduce system load
4. **Combine with Version History**: Use with GetVersionHistory to track changes across versions
5. **Parse Object List**: Extract and analyze the object list for impact assessment
6. **Error Handling**: Handle HTTP 404 gracefully for transports that may have been deleted

## Integration Examples

### Complete Workflow: Find Changes by User

```javascript
// Step 1: List transports for the user
const transports = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "ListUserTransports",
  arguments: { user: "DEVELOPER01" }
});

// Step 2: Get details for each transport
for (const transport of parseTransports(transports)) {
  const details = await use_mcp_tool({
    server_name: "mcp-abap-adt",
    tool_name: "GetTransportRequest",
    arguments: { transport_number: transport.number }
  });

  // Step 3: For each object, get version history
  for (const obj of parseObjects(details)) {
    const history = await use_mcp_tool({
      server_name: "mcp-abap-adt",
      tool_name: "GetVersionHistory",
      arguments: {
        object_type: obj.type,
        object_name: obj.name
      }
    });
  }
}
```

### Diff Between Versions

```javascript
// 1. Get transport details to find objects
const transport = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetTransportRequest",
  arguments: { transport_number: "ER1K8AKL0L" }
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

// 3. Compare two versions
const version1 = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetObjectVersion",
  arguments: {
    object_type: "CLAS",
    object_name: "ZCL_MY_CLASS",
    version: "00001"
  }
});

const version2 = await use_mcp_tool({
  server_name: "mcp-abap-adt",
  tool_name: "GetObjectVersion",
  arguments: {
    object_type: "CLAS",
    object_name: "ZCL_MY_CLASS",
    version: "00000"
  }
});

// Perform diff on version1 and version2
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/cts/transportrequests/{TRANSPORT_NUMBER}` - Retrieve transport details

### Request Headers
- `Accept: application/vnd.sap.adt.transportrequests.v1+xml` - Request SAP ADT transport request XML response
- `Authorization: Basic <credentials>` - Basic authentication
- `X-SAP-Client: <client>` - SAP client number

### Response Format
- Content-Type: `application/vnd.sap.adt.transportrequests.v1+xml`
- Character encoding: UTF-8
- Structure: SAP ADT transport request with tasks and objects

### Security Considerations
- **Authorization Required**: S_CTS_ADMI or equivalent transport authorization
- **Client Filtering**: Results filtered by user's client access
- **CSRF Protection**: Not required for GET requests

## Limitations

1. **Single Transport**: Retrieves one transport at a time (no batch support)
2. **User Context**: Results depend on the user's authorization
3. **No Diff Support**: Does not compare transport versions
4. **No Release Capability**: Read-only, cannot modify or release transports
5. **Object Source**: Does not return object source code (use GetClass, GetProgram, etc. for that)

## Performance Considerations

- **Response Size**: Transport with many objects may take time to retrieve
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on CTS system load
- **Timeout**: 30-second timeout configured for requests

## Related Tools

- **ListUserTransports**: List all transports with filtering (use first to find transport numbers)
- **GetVersionHistory**: Retrieve version history for objects in transports
- **GetObjectVersion**: Get source code for specific versions
- **GetClass**: Retrieve current class source code
- **GetProgram**: Retrieve current program source code
- **GetCDSView**: Retrieve CDS view source code

## Comparison with ListUserTransports

| Feature | ListUserTransports | GetTransportRequest |
|---------|---------------------|---------------------|
| Lists multiple transports | ✅ Yes | ❌ No |
| Shows transport metadata | ✅ Yes | ✅ Yes |
| Shows objects in transport | ❌ No | ✅ Yes |
| Shows tasks | ❌ No | ✅ Yes |
| Supports filtering | ✅ Yes (user, target) | ❌ No |
| Use case | Discovery | Detailed analysis |

## Version History

- **v1.0** (2026-02-25): Initial implementation with transport details and object list

## Additional Notes

- Transport request numbers follow SAP naming conventions (e.g., NPLK900042, ER1K8AKL0L)
- The tool automatically URL-encodes the transport number
- Timeout is set to 30 seconds for transport detail retrieval
- Tasks (subtransports) are also included in the response
- Object lock information indicates which objects are actively locked in the transport
