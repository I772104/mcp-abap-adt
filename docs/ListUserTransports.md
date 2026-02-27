# ListUserTransports

List ALL transport requests for a user by querying CTS database tables directly.

## Description

This tool queries SAP CTS (Change and Transport System) database tables (E070 and E07T) directly to retrieve all transport requests for a specific user. Unlike ADT API-based approaches, this works for both modifiable (in-development) and released transports with no time period limitations.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user` | string | ✅ Yes | Username to list transports for |
| `from_date` | string | No | Minimum date filter in YYYYMMDD format (e.g., "20260101"). **Auto-defaults to previous year if not provided** |
| `status` | string | No | Filter by status: D (Modifiable), R (Released), L (Modifiable+Protected), O (Released+Import) |
| `max_results` | number | No | Maximum number of results (default: 50) |

## ⚠️ Important: Smart Defaults & Limitations

### Auto-Default Behavior (NEW)

**The tool now automatically defaults to the previous year when `from_date` is not provided.**

- ✅ **Automatic date filtering** prevents missing recent transports
- ⚠️ **Prominent warning** appears if the 500-row API limit is reached
- ℹ️ **Clear indication** when default filter is applied

**Best Practice:** Always specify `from_date` explicitly for active developers:

```typescript
ListUserTransports(user="DEVELOPER", from_date="20260101")
```

### The 500-Row API Limitation

Due to SAP ADT API constraints:

- **Maximum 500 rows** can be fetched from the database per query
- If limit is reached, you'll see a **prominent warning at the top of results**
- The warning tells you exactly what `from_date` to use

**What the warning looks like:**
```
================================================================================
⚠️  WARNING: RESULT LIMIT REACHED
================================================================================
Found 500 transports (reached maximum limit).
More recent transports may exist but are NOT visible due to API limitations.

RECOMMENDED ACTION:
  Use from_date: "20260101" to see 2026 transports
================================================================================
```

### 🎯 Recommended Usage Patterns

### 🎯 Recommended Usage Patterns

#### ✅ BEST: Use from_date parameter (NEW - Recommended)

```typescript
// For current year transports
ListUserTransports(user="DEVELOPER", from_date="20260101")

// For recent released transports only
ListUserTransports(user="DEVELOPER", status="R", from_date="20260101")

// For modifiable transports (work in progress)
ListUserTransports(user="DEVELOPER", status="D", from_date="20260101")
```

The tool now uses raw SQL with date filtering at the database level, making this the most efficient approach.

#### ✅ GOOD: Let auto-default apply (for quick overview)

```typescript
// Auto-defaults to previous year
ListUserTransports(user="DEVELOPER")
```

The tool will show when the default is applied and warn if limits are reached.

#### ✅ ALTERNATIVE: Query E070 table directly for specific dates

Use `GetTableContents` when you need very specific date queries:

```typescript
GetTableContents({
  table_name: "E070",
  columns: ["TRKORR", "AS4DATE", "AS4TIME", "TRSTATUS", "TRFUNCTION"],
  where_conditions: {
    AS4USER: "DEVELOPER",
    AS4DATE: "20260226"  // Query specific date
  },
  max_rows: 100
})
```

Then get descriptions from E07T if needed.

#### ⚠️ AVOID: Omitting from_date for users with many transports

```typescript
// This may miss recent transports if developer has 500+ total transports
ListUserTransports(user="DEVELOPER", max_results=10)
```

#### ⚠️ AVOID: Omitting from_date for users with many transports

```typescript
// While the tool now auto-defaults to previous year,
// explicitly specifying from_date is still best practice for active users
ListUserTransports(user="LONG_TIME_DEVELOPER")  // Less precise
ListUserTransports(user="LONG_TIME_DEVELOPER", from_date="20260101")  // Better
```

### When to Use ListUserTransports

This tool is now reliable for most use cases thanks to smart defaults:
- ✅ Finding recent transports (with auto-default or explicit from_date)
- ✅ Querying by specific status (D/R) which reduces result set
- ✅ Getting a broad overview of user's work
- ⚠️ Watch for the warning if 500-row limit is reached

### Example: Finding Recent Modifiable Transports (UPDATED)

**Scenario:** Find what a developer is currently working on

**Recommended approach:**
```typescript
// Simple and effective with from_date
ListUserTransports(user="DEVELOPER", status="D", from_date="20260101")
```

**Alternative (using GetTableContents for very specific dates):**
```typescript
GetTableContents({
  table_name: "E070",
  columns: ["TRKORR", "AS4DATE", "TRSTATUS"],
  where_conditions: {
    AS4USER: "DEVELOPER",
    AS4DATE: "20260226"  // Today
  }
})
```

**Step 2:** If results found, get transport details
```typescript
GetTransportRequest("ER1K8AK123")
```

**Step 3:** Analyze changes
```typescript
GetTransportVersions(
  transport_number="ER1K8AK123",
  object_name="CL_EXAMPLE",
  object_type="CLAS"
)
```

## Transport Status Values

| Status | Description | Meaning |
|--------|-------------|---------|
| D | Modifiable | Transport is in development (not released) |
| R | Released | Transport has been released |
| L | Modifiable + Protected | Modifiable and protected against changes |
| O | Released + Import | Released and ready for import |
| N | Released + No Changes | Released and cannot be changed |

## Transport Type Values

| Type | Description |
|------|-------------|
| K (WB) | Workbench request |
| S (Task) | Task (subtransport) |
| W (Cust) | Customizing request |
| T (TOC) | Transport of Copies |
| X (Unrep) | Unrepaired |

## Examples

### List all transports for a user (with auto-default)
```typescript
ListUserTransports(user="DEVELOPER01")
```

Returns transports from previous year onwards (auto-default applied).
You'll see a note indicating the default date filter.

### List transports from specific date
```typescript
ListUserTransports(user="DEVELOPER01", from_date="20260101")
```

Returns all transports from January 1, 2026 onwards.

### List only modifiable transports from 2026
```typescript
ListUserTransports(user="DEVELOPER01", status="D", from_date="20260101")
```

Returns only transports that are in development (not yet released).

### List only released transports
```typescript
ListUserTransports(user="DEVELOPER01", status="R")
```

Returns only transports that have been released.

### Limit results
```typescript
ListUserTransports(user="DEVELOPER01", max_results=20)
```

Returns maximum 20 transports.

## Output Format

```
Found 2 transport request(s) for user: DEVELOPER01
Filtered by status: Modifiable

========================================================================================================================
#     Transport      Type  Status       Date         Target       Description
========================================================================================================================
1     ER1K8AK0XH     WB    Modifiable   2026-02-01   /SSCB_S4P/   Change log for production order
2     ER1K8AK0XI     Task  Modifiable   2026-02-23                Change log for production order
========================================================================================================================

LEGEND:
- Status 'D' (Modifiable): Transport is in development (not released)
- Status 'R' (Released): Transport has been released
- Status 'L' (Mod+Prot): Modifiable and protected
- Status 'O' (Rel+Import): Released and ready for import
- Type 'K': Workbench request
- Type 'S': Task (subtransport)
- Type 'W': Workbench request (customizing)

Use GetTransportRequest(<transport_number>) to see details of a specific transport.

Query Performance:
- E070 query time: 806ms
- Total rows: 2
```

## Technical Details

### Database Tables Used

**E070** - Transport Request Headers
- TRKORR: Transport number
- AS4USER: User who created the transport
- TRSTATUS: Transport status (D, R, L, O, N)
- TRFUNCTION: Transport type/function (K, S, W, T, X)
- AS4DATE: Creation date (YYYYMMDD)
- AS4TIME: Creation time (HHMMSS)
- TARSYSTEM: Target system
- KORRDEV: Development class
- STRKORR: Request/task reference

**E07T** - Transport Request Texts
- TRKORR: Transport number
- AS4TEXT: Description text
- LANGU: Language key

### Performance

- Average query time: 800-1500ms
- Includes both E070 and E07T table queries
- Returns formatted output with descriptions
- Sorts by date (oldest to newest)

## Workflow Integration

### Finding a Developer's Active Work

```
1. ListUserTransports(user="DEVELOPER", status="D")
   → Shows all modifiable transports

2. GetTransportRequest("ER1K8AK0XH")
   → Get details of specific transport

3. GetTransportVersions(transport_number="ER1K8AK0XH", object_name="CL_CLASS", object_type="CLAS")
   → See what changed in the transport
```

### Analyzing Released Transports

```
1. ListUserTransports(user="DEVELOPER", status="R")
   → Shows all released transports

2. GetTransportRequest("ER1K8AKL0L")
   → Get details

3. CompareObjectVersions(...)
   → Compare versions
```

## Advantages

✅ **Shows ALL transports** (modifiable + released + all other statuses)
✅ **No time limitation** (not restricted to 2 weeks like ADT API)
✅ **Fast performance** (~800ms)
✅ **Direct table access** (no API limitations)
✅ **Flexible filtering** (by status, with result limits)
✅ **Includes descriptions** (from E07T table)

## Related Tools

- `GetTransportRequest` - Get detailed information about a specific transport
- `GetTransportVersions` - Analyze what changed in a transport
- `GetVersionHistory` - View version history for an object
- `CompareObjectVersions` - Compare two versions to see changes

## Notes

- This tool queries database tables directly, so it requires appropriate authorization
- Results include both requests (parent transports) and tasks (subtransports)
- Transport descriptions are fetched in English (LANGU='E')
- Default sort order is by creation date (oldest first)
