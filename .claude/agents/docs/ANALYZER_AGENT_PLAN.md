# Bug Analyzer Agent Plan

## Overview

Create an agent called "Analyzer" (not "debugger" - it can't set breakpoints or create debug sessions) that helps analyze ABAP code issues using static analysis, runtime error inspection, code quality checks, and test execution. The agent is **proactive** - it automatically runs relevant checks during investigation.

## Reference Implementation Analysis

The `ai-sap-abap-adt` Java implementation has these capabilities we DON'T have:

### High-Value Missing Handlers

| Handler | Purpose | ADT Endpoint | Priority |
|---------|---------|--------------|----------|
| **ListRuntimeErrors** | List ST22 dumps (short dumps) | `/sap/bc/adt/runtime/dumps` | HIGH |
| **GetRuntimeError** | Get specific dump details | `/sap/bc/adt/runtime/dump/{id}/formatted` | HIGH |
| **RunATC** | Run ABAP Test Cockpit checks | `/sap/bc/adt/atc/runs` | HIGH |
| **ListATCCheckVariants** | List available ATC variants | `/sap/bc/adt/atc/variants` | MEDIUM |
| **SelectSQLQuery** | Execute read-only SQL queries | `/sap/bc/adt/datapreview/freestyle` | LOW (GetTableContents sufficient) |

**Note**: `GetTableContents` already supports WHERE conditions, column selection, ORDER BY, and pagination via `/sap/bc/adt/datapreview/ddic`. The `SelectSQLQuery` endpoint adds JOINs/subqueries/CTEs but for most bug investigation, single-table queries suffice.

### What We Already Have (Leverage These)

| Handler | Bug Investigation Use |
|---------|----------------------|
| `GetClass/Program/Function` | Read source code |
| `GetVersionHistory` | See recent changes (regression hunting) |
| `CompareObjectVersions` | Diff versions to find changes |
| `GetObjectUsages` | Find dependencies/callers |
| `RunClassTests` | Execute unit tests |
| `GetClassCoverage` | Check test coverage |
| `CheckSyntax` | Validate code |
| `GetTableContents` | Query configuration/data |
| `GetCDSViewContents` | Query CDS views |

## New Handlers to Implement

### 1. ListRuntimeErrors (HIGH Priority)

List recent ST22 dumps filtered by user, time, error type.

```typescript
// Parameters
{
  user?: string;          // SAP username (uppercase)
  from?: string;          // ISO timestamp "2024-01-15T00:00:00"
  to?: string;            // ISO timestamp
  max_results?: number;   // Default 50, max 100
}

// ADT endpoint
GET /sap/bc/adt/runtime/dumps
Accept: application/atom+xml;type=feed
Query params: $query=and(equals(user,{USER})), from={ts}, to={ts}, $top={n}

// Returns Atom feed with entries containing:
// - Error type (atom:category)
// - Program name
// - User
// - Timestamp
// - Dump ID (for GetRuntimeError)
```

### 2. GetRuntimeError (HIGH Priority)

Get detailed dump analysis with call stack, variables, source excerpt.

```typescript
// Parameters
{
  dump_id: string;        // From ListRuntimeErrors
  content?: 'formatted' | 'metadata' | 'summary';  // Default: formatted
}

// ADT endpoints (based on content mode)
GET /sap/bc/adt/runtime/dump/{id}/formatted  → text/plain (full dump)
GET /sap/bc/adt/runtime/dump/{id}            → XML metadata
GET /sap/bc/adt/runtime/dump/{id}/summary    → HTML summary

// Formatted output includes:
// - Error analysis
// - What happened
// - Source code extract (with highlighted line)
// - Call stack
// - Variable values at crash time
```

### 3. RunATC (HIGH Priority)

Run static code analysis (ABAP Test Cockpit).

```typescript
// Parameters
{
  object_name: string;
  object_type: 'class' | 'interface' | 'program' | 'function_group' | 'package';
  check_variant?: string;   // Default: system default
  max_findings?: number;    // Default: 100
  with_exemptions?: boolean;
}

// Multi-step flow:
// 1. POST /sap/bc/adt/atc/worklists?checkVariant={variant} → worklistId
// 2. POST /sap/bc/adt/atc/runs?worklistId={id} → runId (from Location header)
// 3. Poll GET /sap/bc/adt/atc/runs/{runId} until status="finished"
// 4. GET /sap/bc/adt/atc/worklists/{worklistId} → findings XML

// Returns findings with:
// - Priority (error, warning, info)
// - Message
// - Location (file, line)
// - Check ID
```

### 4. ListATCCheckVariants (MEDIUM Priority)

Discover available ATC check variants.

```typescript
// Parameters
{
  // None required
}

// ADT endpoint
GET /sap/bc/adt/atc/variants?maxItemCount=500&name=*
Accept: application/vnd.sap.adt.nameditems.v1+xml

// Returns list of variant names and descriptions
```

### 5. ~~ExecuteSQLQuery~~ (SKIPPED)

Not needed - `GetTableContents` already provides:
- Column selection
- WHERE conditions (equality only, but sufficient for most cases)
- ORDER BY
- Pagination
- Batch queries (up to 10 tables)

For complex JOINs/subqueries, users can use SE16N or Eclipse ADT directly.

## Agent Definition

### Name: `analyzer`

### Invocation: `/analyze` slash command

### Behavior: **Proactive**
The agent automatically runs relevant checks without being asked:
- When investigating an issue, auto-checks for related ST22 dumps
- When looking at code, auto-runs ATC if issues seem code-quality related
- When checking for regressions, auto-fetches version history

### Description
Analyze ABAP issues using runtime errors, static analysis, tests, and code examination. Cannot set breakpoints or create debug sessions - focuses on post-mortem analysis and code quality.

### Available Tools

**Code Reading:**
- GetClass, GetProgram, GetFunction, GetFunctionGroup, GetInclude, GetInterface
- GetCDSView, GetBehaviorDefinition

**Runtime Error Analysis (NEW):**
- ListRuntimeErrors - Find ST22 dumps
- GetRuntimeError - Analyze dump details

**Static Analysis (NEW):**
- RunATC - Run ABAP Test Cockpit
- ListATCCheckVariants - Discover check variants
- CheckSyntax - Validate syntax

**Testing:**
- RunClassTests - Execute unit tests
- GetClassCoverage - Analyze coverage
- GetClassTests - Read test code

**History & Dependencies:**
- GetVersionHistory - Find recent changes
- CompareObjectVersions - Diff versions
- GetObjectUsages - Find callers/dependencies

**Data Analysis:**
- GetTableContents - Query tables (supports WHERE, ORDER BY, batch)
- GetCDSViewContents - Query CDS views

### Workflow Prompt

```markdown
You are an Analyzer agent for ABAP systems. You **proactively** investigate issues.

You CANNOT:
- Set breakpoints
- Create debug sessions
- Step through code interactively

You CAN and SHOULD automatically:
- Check for ST22 runtime errors when a user reports crashes/dumps
- Run ATC static analysis when code quality might be the issue
- Fetch version history when investigating potential regressions
- Execute unit tests to verify behavior
- Query tables to validate data assumptions

## Proactive Investigation Workflow

1. **Understand the Issue**
   - What's the symptom?
   - When did it start? (regression check)
   - Which user/transaction/program?

2. **Check Runtime Errors**
   - ListRuntimeErrors to find related dumps
   - GetRuntimeError for detailed analysis
   - Examine call stack and variable values

3. **Analyze Code**
   - Read relevant source code
   - Check version history for recent changes
   - Compare versions to find potential regression

4. **Run Static Analysis**
   - RunATC to find code quality issues
   - CheckSyntax to validate code

5. **Execute Tests**
   - RunClassTests to see test results
   - GetClassCoverage to find untested paths

6. **Investigate Data**
   - Query relevant tables
   - Check configuration data
   - Validate business logic assumptions

7. **Report Findings**
   - Summarize root cause
   - Identify affected code location
   - Suggest fix approach
```

## Implementation Plan

### Phase 1: Runtime Error Analysis
1. Implement `ListRuntimeErrors` handler
2. Implement `GetRuntimeError` handler
3. Test against real ST22 dumps

### Phase 2: Static Analysis
1. Implement `RunATC` handler (multi-step with polling)
2. Implement `ListATCCheckVariants` handler
3. Test ATC workflow

### Phase 3: Agent & Skill
1. Create `analyzer.md` agent definition
2. Create `/analyze` slash command skill
3. Test end-to-end scenarios

## Example Usage

```
User: "/analyze DUMP_NO_ROLL_MEMORY errors for user SMITH"

Analyzer Agent (proactively):
1. ListRuntimeErrors(user="SMITH", from="2024-03-15")
   → Finds 3 recent dumps

2. GetRuntimeError(dump_id="...", content="formatted")
   → Shows error at line 142 of ZCL_ORDER_PROCESSOR
   → Call stack shows deep recursion
   → Variables show order quantity = 999999

3. GetClass("ZCL_ORDER_PROCESSOR")
   → Reads source code

4. GetVersionHistory("CLAS", "ZCL_ORDER_PROCESSOR")
   → Shows change on 2024-03-14 by developer JONES

5. CompareObjectVersions(...)
   → Diff shows removed recursion guard

6. RunATC("ZCL_ORDER_PROCESSOR", "class")
   → ATC warns about unbounded recursion

7. Report:
   "Root cause: Transport ER1K12345 on 2024-03-14 removed recursion guard.
    Location: ZCL_ORDER_PROCESSOR line 142
    Fix: Restore recursion depth check before recursive call"
```

## Files to Create

```
src/handlers/
├── handleListRuntimeErrors.ts
├── handleGetRuntimeError.ts
├── handleRunATC.ts
└── handleListATCCheckVariants.ts

.claude/agents/
└── analyzer.md

.claude/skills/
└── analyze.md

## Estimated Effort

| Component | Effort |
|-----------|--------|
| ListRuntimeErrors | 4 hours |
| GetRuntimeError | 4 hours |
| RunATC (complex) | 8 hours |
| ListATCCheckVariants | 2 hours |
| Agent + Skill | 2 hours |
| Testing | 4 hours |
| **Total** | **~24 hours** |

## Decisions Made

1. **ExecuteSQLQuery**: SKIPPED - `GetTableContents` is sufficient for most investigation needs
2. **Agent behavior**: PROACTIVE - auto-runs relevant checks
3. **Slash command**: YES - `/analyze` to invoke the agent
