# GetTransportVersions Tool Documentation

> **✨ NEW TOOL (2026-02-26)**: One-command transport analysis with automatic hierarchy handling and intelligent version filtering.

## Overview

The `GetTransportVersions` tool is a **helper tool** that combines transport analysis and version history lookup in a single command. It automatically handles the complexity of SAP transport hierarchy (task → parent request) and intelligently filters versions to suggest the most relevant comparison.

**This is the recommended starting point** for analyzing what changed in a specific transport.

## What Problem Does It Solve?

In SAP's transport system:
- **Tasks** (child transports) belong to **Requests** (parent transports)
- When you add objects to a task, the version is often recorded under the **parent request**
- Test transports clutter version history
- Untransported versions (saved but not released) can confuse comparisons

**Before GetTransportVersions:** You needed 3-4 tool calls and manual investigation to connect the dots.

**After GetTransportVersions:** One command handles everything automatically.

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transport_number` | string | Yes | Transport number (can be either a task or parent request, e.g., ER1K8AK0XI) |
| `object_name` | string | Yes | Name of the ABAP object (e.g., CL_MAN_CHANGELOG, P_PURCHASEORDERITEMFORPEGGING) |
| `object_type` | string | Yes | Object type: CLAS, PROG, FUGR, INTF, DDLS, BDEF, DCLS |

## Output Structure

The tool returns a comprehensive analysis with:

1. **Transport Hierarchy Analysis**
   - Identifies if transport is a task or request
   - Shows parent request relationship
   - Confirms object is in the transport

2. **Version Discovery**
   - Finds the version in the parent request (if applicable)
   - Automatically filters out test transports
   - Skips untransported versions (no transport number)

3. **Comparison Suggestion**
   - Identifies the most recent non-test version before the current one
   - Provides version pair suggestions for CompareObjectVersions

4. **Complete Version History**
   - Full version history included at the end for reference

## Usage Examples

### Example 1: Analyze Class Changes in a Task

```json
{
  "transport_number": "ER1K8AK0XI",
  "object_name": "CL_MAN_CHANGELOG",
  "object_type": "CLAS"
}
```

**Output:**
```
================================================================================
TRANSPORT VERSION ANALYSIS
================================================================================

STEP 1: Analyzing transport ER1K8AK0XI...

Transport Type: TASK
Task Number: ER1K8AK0XI
Parent Request: ER1K8AK0XH

NOTE: Versions are typically recorded under the parent request.
      Searching for versions in: ER1K8AK0XH

✓ Object CL_MAN_CHANGELOG (CLAS) is included in this transport

================================================================================
STEP 2: Retrieving version history for CL_MAN_CHANGELOG...

VERSIONS IN TRANSPORT ER1K8AK0XH:
================================================================================
20260201144253/00000 2026-02-23 16:51:15  DEVELOPER01     ER1K8AK0XH      Change log for production order

VERSION FOUND: 20260201144253/00000

PREVIOUS VERSION (for comparison): 20260201144253/00006
20260201144253/00006 2026-02-01 14:42:53  DEVELOPER01     ER1K8AK0DO      Change log for production order

================================================================================
NEXT STEPS TO SEE CHANGES:
================================================================================

Use CompareObjectVersions to see the diff:
   CompareObjectVersions(
     object_type="CLAS",
     object_name="CL_MAN_CHANGELOG",
     version_old="20260201144253/00006",
     version_new="20260201144253/00000",
     format="unified"
   )
```

### Example 2: Analyze CDS View Changes

```json
{
  "transport_number": "ER1K8AKK35",
  "object_name": "P_PURCHASEORDERITEMFORPEGGING",
  "object_type": "DDLS"
}
```

**Benefits:**
- Automatically identifies it's a task with parent ER1K8AKK35
- Finds version 00014 in the transport
- Skips version 00013 (test transport)
- Skips version 00000 (no transport number - untransported)
- Suggests comparing 00014 vs 00012 (actual previous release)

## How It Works

### Step 1: Transport Analysis
1. Calls GetTransportRequest for the specified transport
2. Parses the response to determine:
   - Is it a task or parent request?
   - What's the parent request number (if task)?
   - Is the specified object in this transport?

### Step 2: Version Discovery
1. Calls GetVersionHistory for the object
2. Searches for versions matching:
   - The transport number provided, OR
   - The parent request (if transport is a task)

### Step 3: Intelligent Filtering
Filters out:
- **Test transports**: Lines containing `[TEST]` or `Generated test transport`
- **Untransported versions**: Lines with empty transport field
- **Test versions**: Versions explicitly marked as test

### Step 4: Comparison Suggestion
1. Finds the current version in the transport
2. Looks for the previous non-test, transported version
3. Provides both version IDs ready for CompareObjectVersions

## Comparison with Manual Workflow

### Manual Workflow (Before)
```javascript
// Step 1: Get transport details
const transport = await use_mcp_tool({
  tool_name: "GetTransportRequest",
  arguments: { transport_number: "ER1K8AK0XI" }
});
// Parse XML to find parent request...

// Step 2: Get version history
const history = await use_mcp_tool({
  tool_name: "GetVersionHistory",
  arguments: {
    object_type: "CLAS",
    object_name: "CL_MAN_CHANGELOG"
  }
});
// Parse table to find version in parent request...

// Step 3: Manually identify previous non-test version
// Step 4: Compare versions
```

**Problems**: 4+ tool calls, manual XML/table parsing, risk of errors

### Automated Workflow (After)
```javascript
// One command!
const analysis = await use_mcp_tool({
  tool_name: "GetTransportVersions",
  arguments: {
    transport_number: "ER1K8AK0XI",
    object_name: "CL_MAN_CHANGELOG",
    object_type: "CLAS"
  }
});
// Output includes everything + next steps
```

**Benefits**: 1 tool call, automatic hierarchy handling, intelligent filtering

## When to Use

✅ **Use GetTransportVersions when:**
- Analyzing a specific transport to see what changed
- Starting transport change analysis (recommended first step)
- You want quick results without manual investigation

❌ **Use step-by-step tools when:**
- You need to understand the underlying process
- Building custom workflows
- Teaching transport system concepts

## Error Handling

### Transport Not Found
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Failed to get transport details: HTTP 404: Transport not found"
  }]
}
```

### Object Not in Transport
Output includes:
```
✗ WARNING: Object CL_MY_CLASS (CLAS) NOT found in this transport
  The object may not be part of this transport or may use a different name.
```

### No Versions Found
Output includes:
```
✗ NO VERSIONS FOUND in transport ER1K8AK0XH

TROUBLESHOOTING:
  - Checked parent request ER1K8AK0XH (versions usually recorded there)
  - Object may have been added without activation
  - Object may be in a different transport
```

## Version Filtering Logic

### What Gets Filtered Out

1. **Test Transports**
   - Contains `[TEST]` marker
   - Contains "Generated test transport" in description
   - Example: `ER1K8AK0XJ      ER1K8AK0DO : Generated test transport`

2. **Untransported Versions**
   - Empty transport field (less than 5 characters)
   - Example: `20260220162734/00000 2026-02-20 16:03:44  DEVELOPER02                     `

3. **Invalid Transport Numbers**
   - Transport field too short to be valid SAP transport number

### What Gets Kept

- Real transports with full transport numbers (e.g., ER1K8AK0DO)
- Non-test descriptions
- Versions with complete metadata

## Object Type Support

Supports all standard ABAP object types:

| Object Type | Description | Notes |
|-------------|-------------|-------|
| CLAS | ABAP Class | Fully supported |
| PROG | ABAP Program | Fully supported |
| FUGR | Function Group | Fully supported |
| INTF | Interface | Fully supported |
| DDLS | CDS View | Fully supported |
| BDEF | Behavior Definition | Fully supported |
| DCLS | Access Control | Fully supported |

## Performance Considerations

- **Two backend calls**: GetTransportRequest + GetVersionHistory
- **Response time**: Typically 2-5 seconds depending on version history size
- **Network dependency**: Both calls must succeed
- **Timeout**: 30 seconds per backend call

## Best Practices

1. **Start Here**: Use GetTransportVersions as your first step for transport analysis
2. **Use CompareObjectVersions**: Use the suggested version pairs with CompareObjectVersions
3. **Check Warnings**: Pay attention to warnings about objects not found
4. **Review Full History**: Scroll to the end to see complete version history
5. **Use for Automation**: Perfect for scripted transport analysis workflows

## Related Tools

- **GetTransportRequest**: Shows transport hierarchy and objects (used internally)
- **GetVersionHistory**: Shows all versions of an object (used internally)
- **CompareObjectVersions**: Compares two versions (use after GetTransportVersions)
- **ListUserTransports**: Find transports by user/system (use before this tool)

## Complete Workflow Example

```javascript
// 1. Find transports for a user
const transports = await use_mcp_tool({
  tool_name: "ListUserTransports",
  arguments: { user: "DEVELOPER01" }
});

// 2. Analyze a specific transport
const analysis = await use_mcp_tool({
  tool_name: "GetTransportVersions",
  arguments: {
    transport_number: "ER1K8AK0XI",
    object_name: "CL_MAN_CHANGELOG",
    object_type: "CLAS"
  }
});

// Output shows version IDs: 20260201144253/00000 and 20260201144253/00006

// 3. Compare the versions
const diff = await use_mcp_tool({
  tool_name: "CompareObjectVersions",
  arguments: {
    object_type: "CLAS",
    object_name: "CL_MAN_CHANGELOG",
    version_old: "20260201144253/00006",
    version_new: "20260201144253/00000",
    format: "unified"
  }
});

// Output: Immediate diff showing exact changes
```

## Technical Implementation

### Handler Location
`src/handlers/handleGetTransportVersions.ts`

### Dependencies
- handleGetTransportRequest
- handleGetVersionHistory

### Response Format
- Content-Type: `text/plain`
- Formatted text with sections and tables
- Full version history appended at end

## Version History

- **v1.1** (2026-02-26): Initial release with full hierarchy and filtering support

## Additional Resources

- [Transport Workflows Guide](TRANSPORT_WORKFLOWS.md) - Complete workflow documentation
- [GetTransportRequest.md](GetTransportRequest.md) - Transport details tool
- [GetVersionHistory.md](GetVersionHistory.md) - Version history tool
- [CompareObjectVersions.md](CompareObjectVersions.md) - Version comparison tool

## FAQ

**Q: Why does it search in the parent request?**
A: SAP records versions under the parent request when objects are added to child tasks.

**Q: What does version 00000 mean?**
A: Version 00000 is ALWAYS the CURRENT/ACTIVE version for ALL object types (CLAS, DDLS, etc.). It may have an earlier timestamp than transported versions because it represents when the code was saved/activated, while numbered versions represent when the code was added to a transport. Both may contain identical code.

**Q: What if the object isn't in the transport?**
A: The tool warns you and still shows the version history for reference.

**Q: Can I use this for parent requests too?**
A: Yes! It works for both tasks and parent requests.

**Q: Why are some versions skipped?**
A: Test transports and untransported versions are filtered to show only meaningful comparisons.

**Q: What if I need a different previous version?**
A: Check the full version history at the end of the output and use GetObjectVersion manually.
