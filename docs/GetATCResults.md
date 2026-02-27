# GetATCResults

> ⚠️ **WARNING: NOT YET FUNCTIONAL**
> This tool is work-in-progress and not yet fully working. The implementation exists but has issues preventing successful retrieval of ATC results. Testing shows "ATC Results Endpoint Not Found" - it's unclear if this is due to:
> - System configuration (ATC results API not enabled on test system)
> - Bugs in the discovery or handler logic
> - Missing authentication or permissions
>
> **Current Status**: Handler structure complete, discovery working, but end-to-end functionality not verified.
> Use at your own risk for testing/debugging purposes only.

Retrieves existing ABAP Test Cockpit (ATC) results from the last central run for a specified object.

## Overview

The `GetATCResults` tool fetches ATC quality check findings that already exist in the system from the last scheduled central ATC run. It does **not** execute new checks - it only retrieves historical results.

### Key Features

- ✅ Uses HATEOAS discovery to find ATC endpoints dynamically
- ✅ Retrieves results from last central ATC run
- ✅ Groups findings by priority (Error/Warning/Info)
- ✅ Shows check details, location, and quick fix availability
- ✅ Optional inclusion of exempted findings
- ✅ Graceful handling when no results exist

## Important Note

This tool **retrieves existing results** only. It does not:
- ❌ Trigger new ATC checks
- ❌ Create ATC worklists
- ❌ Run custom check variants

To run new ATC checks, use Eclipse ABAP Development Tools (ADT):
1. Right-click object → Run With → ABAP Test Cockpit
2. Select check variant (DEFAULT, ABAP_CLOUD_READINESS, etc.)
3. View results in ATC Results view

## Parameters

| Parameter         | Type    | Required | Description                                           |
| ----------------- | ------- | -------- | ----------------------------------------------------- |
| `object_name`     | string  | Yes      | Name of the ABAP object (e.g., class name, CDS view)  |
| `object_type`     | string  | Yes      | Object type (see supported types below)               |
| `include_exempted`| boolean | No       | Include exempted findings in results (default: false) |

### Supported Object Types

| Type   | Description             | Example                |
| ------ | ----------------------- | ---------------------- |
| `CLAS` | ABAP Class              | `ZCL_MY_CLASS`         |
| `INTF` | ABAP Interface          | `ZIF_MY_INTERFACE`     |
| `PROG` | ABAP Program            | `Z_MY_REPORT`          |
| `FUGR` | Function Group          | `Z_MY_FUNCTION_GROUP`  |
| `DDLS` | CDS View                | `Z_MY_CDS_VIEW`        |
| `BDEF` | Behavior Definition     | `Z_MY_BEHAVIOR`        |
| `DCLS` | Access Control (DCL)    | `Z_MY_ACCESS_CONTROL`  |

## Return Format

The tool returns formatted ATC results with:

### Summary Section
- Total findings count
- Breakdown by priority (Errors/Warnings/Info)
- Number of exempted findings (if any)

### Detailed Findings
Grouped by priority, showing for each finding:
- Check title and message
- Check ID for reference
- Location in code (file/line)
- Quick fix availability indicator (⚡)
- Exemption status (🔓)

## How It Works

1. **HATEOAS Discovery**: Calls `/sap/bc/adt/discovery` to find ATC endpoints
2. **Workspace Lookup**: Finds "ABAP Test Cockpit" workspace
3. **Endpoint Resolution**: Locates the "results" collection dynamically
4. **Object URI Construction**: Builds object URI based on type
5. **Results Query**: Fetches existing results for the object
6. **Parsing & Grouping**: Parses XML and groups findings by priority
7. **Formatting**: Returns human-readable formatted output

## Example Usage

### Basic Usage - Get ATC Results for a CDS View

```typescript
{
  "object_name": "A_PRODUCTIONORDER",
  "object_type": "DDLS"
}
```

**Sample Output:**
```markdown
# ATC Results: A_PRODUCTIONORDER (DDLS)

**Source:** Last Central ATC Run
**Total Findings:** 3

## Summary by Priority

- ❌ **Errors:** 0
- ⚠️  **Warnings:** 2
- ℹ️  **Info:** 1

## ⚠️  Warnings

### CDS View Performance Issue
- **Message:** Missing WHERE condition may cause performance issues
- **Check ID:** SLIN_CDS_001
- **Location:** Z_MY_CDS_VIEW
- **Line:** 15

### Unused Association
- **Message:** Association ASSOC_CUSTOMER is defined but not used
- **Check ID:** SLIN_CDS_015
- **Location:** Z_MY_CDS_VIEW
- **Line:** 23
- ⚡ **Quick Fix Available**

## ℹ️  Information

### Documentation Missing
- **Message:** CDS view annotation @EndUserText missing
- **Check ID:** DOCUMENTATION_001
- **Location:** Z_MY_CDS_VIEW
- **Line:** 1
```

### Include Exempted Findings

```typescript
{
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS",
  "include_exempted": true
}
```

Shows all findings including those that have been approved for exemption.

## Error Handling

### No ATC Workspace Found

If the SAP system doesn't have ATC REST API enabled:

```markdown
⚠️ ATC API Not Available

**ABAP Test Cockpit workspace not found in discovery document.**

This SAP system may not have ATC REST API enabled or configured.

**To view ATC results:**
1. Open Eclipse ABAP Development Tools (ADT)
2. Navigate to YOUR_OBJECT (TYPE)
3. View existing ATC results in the ATC Results view
```

### No Results Found (404)

If the object has never been checked or passed all checks:

```markdown
ℹ️  No ATC Results Found

**Object:** YOUR_OBJECT (TYPE)

No ATC results found for this object. This could mean:
- The object has never been checked by central ATC
- The object was created after the last central ATC run
- The object passed all checks with no findings
```

### Access Denied (403)

If user lacks authorization:

```markdown
⚠️ Access Denied

**Object:** YOUR_OBJECT (TYPE)

You don't have authorization to view ATC results for this object.
```

## Technical Details

### HATEOAS Implementation

Unlike traditional REST APIs with hardcoded URLs, this tool uses **HATEOAS** (Hypermedia As The Engine Of Application State):

1. Discovery phase fetches available services
2. Finds link relations (e.g., `http://www.sap.com/adt/atc/relations/results`)
3. Follows these links to actual endpoints
4. Works with any SAP system that implements ADT discovery

This approach:
- ✅ Future-proof: adapts to different SAP versions
- ✅ Flexible: works with varying endpoint structures
- ✅ Maintainable: no hardcoded URLs to update
- ✅ Correct: matches Eclipse ADT's implementation

### Object URI Patterns

The tool constructs object URIs based on type:

| Type   | URI Pattern                           |
| ------ | ------------------------------------- |
| CLAS   | `/sap/bc/adt/oo/classes/{name}`       |
| INTF   | `/sap/bc/adt/oo/interfaces/{name}`    |
| PROG   | `/sap/bc/adt/programs/programs/{name}`|
| FUGR   | `/sap/bc/adt/functions/groups/{name}` |
| DDLS   | `/sap/bc/adt/ddic/ddl/sources/{name}` |
| BDEF   | `/sap/bc/adt/ddic/bdef/sources/{name}`|
| DCLS   | `/sap/bc/adt/acm/dcl/sources/{name}`  |

## Best Practices

### When to Use This Tool

✅ **Good Use Cases:**
- Checking for existing ATC findings before transport
- Reviewing central ATC run results
- Monitoring ABAP Cloud compliance
- Identifying quick fix opportunities

❌ **Not Suitable For:**
- Running custom check variants (use Eclipse ADT)
- Ad-hoc quality checks on modified code
- CI/CD pipelines requiring on-demand checks

### Integration with Other Tools

Combine with other MCP tools for comprehensive analysis:

```typescript
// 1. Check API release state for ABAP Cloud
GetAPIReleaseState({ object_name: "CL_MY_CLASS", object_type: "CLAS" })

// 2. Get existing ATC results
GetATCResults({ object_name: "CL_MY_CLASS", object_type: "CLAS" })

// 3. Check where the class is used
GetObjectUsages({ object_name: "CL_MY_CLASS", object_type: "CLAS" })

// 4. Review version history
GetVersionHistory({ object_type: "CLAS", object_name: "CL_MY_CLASS" })
```

### Typical Workflow

1. **Development**: Develop/modify ABAP object
2. **Local Check**: Run ATC locally in Eclipse ADT
3. **Fix Issues**: Address findings before transport
4. **Central Run**: Wait for scheduled central ATC run
5. **MCP Check**: Use `GetATCResults` to verify in central system
6. **Transport**: Proceed with transport if clean

## Troubleshooting

### "ATC workspace not found"

**Cause**: SAP system doesn't have ATC REST API enabled

**Solution**:
- Use Eclipse ADT for ATC results
- Contact system administrator about ADT service configuration
- Verify system is SAP_BASIS 7.50 or higher

### "No results found" but Eclipse shows findings

**Cause**: Results haven't been synced to central system yet

**Solution**:
- Wait for next scheduled central ATC run
- Run ATC manually in Eclipse ADT and check there
- Use Eclipse ADT's ATC Results view for immediate findings

### Results seem outdated

**Cause**: Results are from last central run, not real-time

**Solution**:
- This is expected behavior (tool retrieves historical results)
- For latest results, run ATC manually in Eclipse ADT
- Check when central ATC last ran on your system

## Related Tools

- `GetAPIReleaseState` - Check ABAP Cloud API compliance
- `CheckSyntax` - Validate ABAP syntax
- `RunClassTests` - Execute unit tests
- `GetClassCoverage` - Analyze test coverage
- `GetObjectUsages` - Find where object is used

## References

- [SAP ADT Documentation](https://help.sap.com/doc/abapdocu/latest/en-US/index.htm)
- [ABAP Test Cockpit Guide](https://help.sap.com/docs/SAP_NETWEAVER_AS_ABAP_751_IP/ba879a6e2ea04d9bb94c7ccd7cdac446/4ec7641e6e391014adc9fffe4e204223.html)
- [HATEOAS Specification](https://en.wikipedia.org/wiki/HATEOAS)

---

*Last Updated: 2026-02-27*
