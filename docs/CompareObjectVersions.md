# CompareObjectVersions Tool Documentation

> **✨ NEW TOOL (2026-02-26)**: Direct version comparison with multiple output formats. Eliminates manual diff work.

## Overview

The `CompareObjectVersions` tool fetches two versions of an ABAP object and returns a formatted diff showing exactly what changed. This eliminates the need to manually fetch and compare source code.

**Recommended workflow**: Use `GetTransportVersions` to identify version pairs → Use `CompareObjectVersions` to see changes.

## What Problem Does It Solve?

### Before CompareObjectVersions

```javascript
// Manual workflow - no longer needed!
// 1. Fetch old version manually
// 2. Fetch new version manually
// 3. Extract source from JSON with escaped characters
// 4. Paste into external diff tool
// 5. Try to find changes in 50KB+ of text
```

**Problems:**
- Multiple manual steps
- Source code embedded in JSON with escaping (`\n`, `\"`, etc.)
- Single-character changes hard to detect
- Requires external diff tools

### After CompareObjectVersions

```javascript
// One command!
const diff = await CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "20260201144253/00006",
  version_new: "20260201144253/00000",
  format: "unified"
});

// Returns:
// @@ -787,11 +787,11 @@
// -        res = VALUE #( " ( 'PROJN' ) " I_ManufacturingOrderItem-WBSElementInternalID_2
// +        res = VALUE #( ( 'PROJN' ) " I_ManufacturingOrderItem-WBSElementInternalID_2
```

**Benefits:**
- 1 command instead of 3+
- Clear, readable diff output
- Exact line numbers and context
- Multiple output formats
- No external tools needed

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `object_type` | string | Yes | Object type: CLAS, PROG, FUGR, INTF, DDLS, BDEF, DCLS |
| `object_name` | string | Yes | Name of the ABAP object (e.g., CL_MAN_CHANGELOG) |
| `version_old` | string | Yes | Older version in timestamp/version format (e.g., 20260201144253/00006) |
| `version_new` | string | Yes | Newer version in timestamp/version format (e.g., 20260201144253/00000) |
| `context_lines` | number | No | Context lines around changes for unified format (default: 3) |
| `format` | string | No | Output format: 'unified', 'side-by-side', 'summary' (default: 'unified') |

### Version Format

Version identifiers must be in **timestamp/version** format as returned by `GetVersionHistory`:
- ✅ Correct: `"20260201144253/00006"`
- ❌ Wrong: `"00006"` (missing timestamp)

## Output Formats

### 1. Unified Format (Default)

Like `git diff` - shows changes with +/- markers and context lines.

**Best for:** Developers reviewing code changes, code reviews, understanding modifications

```diff
================================================================================
UNIFIED DIFF: CL_MAN_CHANGELOG
================================================================================
Old version: 20260201144253/00006
New version: 20260201144253/00000
================================================================================

Index: CL_MAN_CHANGELOG
===================================================================
--- CL_MAN_CHANGELOG	version 20260201144253/00006
+++ CL_MAN_CHANGELOG	version 20260201144253/00000
@@ -787,11 +787,11 @@
                        ( 'SFCPF'    ) " I_ManufacturingOrder-ProductionSchedulingProfile
                        ( 'BMEINS'   ) " n/a
                        ( 'BMENGE'   ) " n/a
               ).
       WHEN enum_entity_table-itm_afpo. " redundant fields with AFKO and RESB !!
-        res = VALUE #( " ( 'PROJN' ) " I_ManufacturingOrderItem-WBSElementInternalID_2
+        res = VALUE #( ( 'PROJN' ) " I_ManufacturingOrderItem-WBSElementInternalID_2
               ).
 *      WHEN enum_entity_table-seq_affl.
 *        res = VALUE #(  " no relevant fields with log_flg available!  tbc
```

**Features:**
- Shows line numbers with `@@` hunks
- `-` prefix for removed lines
- `+` prefix for added lines
- Configurable context lines (default: 3)

### 2. Side-by-Side Format

Shows old and new versions side-by-side with line numbers.

**Best for:** Presentations, visual comparison, understanding structure changes

```
================================================================================
SIDE-BY-SIDE DIFF: CL_MAN_CHANGELOG
================================================================================
Old version: 20260201144253/00006
New version: 20260201144253/00000
================================================================================

OLD (20260201144253/00006)                         | NEW (20260201144253/00000)
-------------------------------------------------- | --------------------------------------------------
   785:                        ( 'SFCPF'    )     |    785:                        ( 'SFCPF'    )
   786:                        ( 'BMEINS'   )     |    786:                        ( 'BMEINS'   )
   787:                        ( 'BMENGE'   )     |    787:                        ( 'BMENGE'   )
   788:               ).                          |    788:               ).
   789:       WHEN enum_entity_table-itm_afpo.    |    789:       WHEN enum_entity_table-itm_afpo.
-  790:         res = VALUE #( " ( 'PROJN' ) "   |
                                                  | +  790:         res = VALUE #( ( 'PROJN' ) "
   791:               ).                          |    791:               ).
```

**Features:**
- Line-by-line alignment
- `-` prefix for lines only in old version
- `+` prefix for lines only in new version
- Clear visual separation

### 3. Summary Format

Statistics and overview without detailed line changes.

**Best for:** Quick overview, release notes, change tracking, management reports

```
================================================================================
DIFF SUMMARY: CL_MAN_CHANGELOG
================================================================================
Old version: 20260201144253/00006
New version: 20260201144253/00000
================================================================================

Statistics:
  Lines added:     1
  Lines removed:   1
  Lines unchanged: 992
  Total sections:  4

Changed sections:
  [Line ~792] Removed 1 line(s)
  [Line ~792] Added 1 line(s)

================================================================================
Use format='unified' to see detailed line-by-line changes.
Use format='side-by-side' to see old and new versions side-by-side.
```

**Features:**
- Change statistics
- Section locations
- Minimal output
- Quick assessment

## Usage Examples

### Example 1: Complete Workflow (Recommended)

```javascript
// Step 1: Find versions in a transport
const analysis = await GetTransportVersions({
  transport_number: "ER1K8AK0XI",
  object_name: "CL_MAN_CHANGELOG",
  object_type: "CLAS"
});

// Output shows:
// VERSION FOUND: 20260201144253/00000
// PREVIOUS VERSION (for comparison): 20260201144253/00006

// Step 2: Compare the versions
const diff = await CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "20260201144253/00006",
  version_new: "20260201144253/00000",
  format: "unified"
});

// Immediately see what changed!
```

### Example 2: Quick Summary

```javascript
// Get quick statistics without detailed diff
const summary = await CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "20260201144253/00006",
  version_new: "20260201144253/00000",
  format: "summary"
});

// Output: 1 line added, 1 line removed, 992 unchanged
```

### Example 3: Detailed Review with Context

```javascript
// Show 10 context lines for thorough review
const detailedDiff = await CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "20260201144253/00006",
  version_new: "20260201144253/00000",
  format: "unified",
  context_lines: 10
});
```

### Example 4: CDS View Comparison

```javascript
// Compare CDS view versions
const cdsDiff = await CompareObjectVersions({
  object_type: "DDLS",
  object_name: "P_PURCHASEORDERITEMFORPEGGING",
  version_old: "20260220162734/00012",
  version_new: "20260220162734/00014",
  format: "unified"
});
```

### Example 5: Side-by-Side for Presentation

```javascript
// Generate side-by-side comparison for presentation
const presentation = await CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "20260201144253/00006",
  version_new: "20260201144253/00000",
  format: "side-by-side"
});
```

## Integration with Other Tools

### GetTransportVersions → CompareObjectVersions

**Perfect workflow** for analyzing transport changes:

```javascript
// 1. GetTransportVersions suggests version pairs
const transportAnalysis = await GetTransportVersions({
  transport_number: "ER1K8AK0XI",
  object_name: "CL_MAN_CHANGELOG",
  object_type: "CLAS"
});

// Output includes:
// VERSION FOUND: 20260201144253/00000
// PREVIOUS VERSION (for comparison): 20260201144253/00006

// 2. Use CompareObjectVersions to see the diff
const diff = await CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "20260201144253/00006",
  version_new: "20260201144253/00000",
  format: "unified"
});
```

### GetVersionHistory → CompareObjectVersions

Manual version selection from history:

```javascript
// 1. Get full version history
const history = await GetVersionHistory({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG"
});

// 2. Pick any two versions from the table
// 3. Compare them
const diff = await CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "20260201144253/00006",
  version_new: "20260201144253/00002", // Compare older versions
  format: "unified"
});
```

## Object Type Support

| Object Type | Description | Supported |
|-------------|-------------|-----------|
| CLAS | ABAP Class | ✅ Fully supported |
| PROG | ABAP Program | ✅ Fully supported |
| FUGR | Function Group | ✅ Fully supported |
| INTF | Interface | ✅ Fully supported |
| DDLS | CDS View | ✅ Fully supported |
| BDEF | Behavior Definition | ✅ Fully supported |
| DCLS | Access Control | ✅ Fully supported |

## Performance

- **Parallel fetching**: Both versions fetched simultaneously
- **Typical response time**: 1-3 seconds for 1000-line files
- **Network dependency**: Requires 2 successful ADT requests
- **Diff computation**: Client-side using `diff` npm package (fast)

**Example timing:**
```
Fetching two 993-line class versions: 484ms
Generating unified diff: <50ms
Total: ~550ms
```

## Error Handling

### Invalid Format

```javascript
CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "20260201144253/00006",
  version_new: "20260201144253/00000",
  format: "invalid"
});

// Error: Invalid format: invalid. Must be 'unified', 'side-by-side', or 'summary'
```

### Missing Parameters

```javascript
CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG"
  // Missing version_old and version_new
});

// Error: version_old is required (timestamp/version format from GetVersionHistory)
```

### Version Not Found

```javascript
CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "99999999999999/99999", // Non-existent version
  version_new: "20260201144253/00000"
});

// Error: HTTP 404: Version not found
```

### Unsupported Object Type

```javascript
CompareObjectVersions({
  object_type: "TABL", // Not supported (use GetTable instead)
  object_name: "MARA",
  version_old: "...",
  version_new: "..."
});

// Error: Unsupported object type: TABL. Supported types: CLAS, PROG, FUGR, INTF, DDLS, BDEF, DCLS
```

## Best Practices

1. **Use GetTransportVersions first** - It suggests the correct version pairs to compare
2. **Start with summary format** - Quick overview before detailed review
3. **Use unified for code review** - Standard format familiar to developers
4. **Use side-by-side for presentations** - Visual format for non-technical audiences
5. **Adjust context lines** - More context for complex changes, less for simple ones
6. **Compare adjacent versions** - Comparing v1 vs v2 is clearer than v1 vs v10

## Limitations

- **No inline comments**: Diff output doesn't explain *why* changes were made
- **Large files**: Side-by-side format can be very long for large files
- **Formatting-only changes**: Changing only whitespace shows as modified lines
- **Binary content**: Not supported (only text-based ABAP objects)

## Use Cases

### Development

- **Code review**: See exactly what changed before approving transport
- **Debugging**: Identify when a bug was introduced by comparing versions
- **Learning**: Understand how code evolved over time

### Release Management

- **Release notes**: Generate summary of changes for each transport
- **Impact analysis**: Assess scope of changes before production release
- **Audit trail**: Document what changed and when

### Troubleshooting

- **Regression analysis**: Compare working version with broken version
- **Emergency rollback**: Verify differences before reverting changes
- **Configuration drift**: Detect unexpected changes in production

## Technical Implementation

### Handler Location
`src/handlers/handleCompareObjectVersions.ts`

### Dependencies
- `diff` npm package (v5.1.0+)
- Existing ADT infrastructure (makeAdtRequest, etc.)

### Diff Algorithm
Uses the `diff` package's unified diff algorithm (Myers diff algorithm), same as used by Git.

### Endpoint Patterns
```
CLAS/FUGR/INTF:
  /sap/bc/adt/{objectPath}/includes/main/versions/{timestamp}/{version}/content

PROG/BDEF/INCL:
  /sap/bc/adt/{objectPath}/source/main/versions/{timestamp}/{version}/content

DDLS/DCLS:
  /sap/bc/adt/{objectPath}/versions/{timestamp}/{version}/content
```

**Note:** PROG objects use `/source/main/` pattern (not `/includes/main/`). This was corrected in 2026-02-26 bug fix.

## Related Tools

- **GetTransportVersions** ⭐ - Identifies version pairs to compare (use this first!)
- **GetVersionHistory** - Lists all versions for manual selection
- **GetTransportRequest** - Shows transport hierarchy and objects

## Complete Workflow Example

```javascript
// 1. Find transports for a developer
const transports = await ListUserTransports({ user: "DEVELOPER01" });

// 2. Analyze specific transport
const analysis = await GetTransportVersions({
  transport_number: "ER1K8AK0XI",
  object_name: "CL_MAN_CHANGELOG",
  object_type: "CLAS"
});

// 3. Compare versions (suggested by GetTransportVersions)
const diff = await CompareObjectVersions({
  object_type: "CLAS",
  object_name: "CL_MAN_CHANGELOG",
  version_old: "20260201144253/00006",
  version_new: "20260201144253/00000",
  format: "unified"
});

// 4. Review the diff output
// Result: Clearly shows PROJN field was uncommented
```

## FAQ

**Q: Can I compare versions from different transports?**
A: Yes! You can compare any two versions, regardless of which transport they're from.

**Q: What's the difference between unified and side-by-side?**
A: Unified shows changes inline with +/- markers (like git diff). Side-by-side shows old and new versions in columns.

**Q: Why use summary format?**
A: For quick statistics without detailed changes. Perfect for release notes or impact assessment.

**Q: Can I compare non-adjacent versions?**
A: Yes, but comparing v1 vs v10 (skipping v2-v9) may show accumulated changes that are harder to understand.

**Q: Does it work for all object types?**
A: Works for all object types that support version history: CLAS, PROG, FUGR, INTF, DDLS, BDEF, DCLS.

**Q: How do I get version identifiers?**
A: Use GetVersionHistory or GetTransportVersions - both return version IDs in the correct format.

**Q: Can I compare the current active version?**
A: Yes! Version 00000 is the current/active version. Compare it with any historical version.

**Q: What if versions are identical?**
A: Summary format will show "No changes detected - versions are identical."

## Version History

- **v1.0** (2026-02-26): Initial release with unified, side-by-side, and summary formats

## Additional Resources

- [GetTransportVersions.md](GetTransportVersions.md) - Recommended first step
- [Transport Workflows Guide](TRANSPORT_WORKFLOWS.md) - Complete workflows
- [GetVersionHistory.md](GetVersionHistory.md) - Version history tool

---

**Pro Tip**: Use `GetTransportVersions` → `CompareObjectVersions` for the fastest workflow. GetTransportVersions suggests the exact version pairs you need!
