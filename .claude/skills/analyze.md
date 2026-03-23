# /analyze - Proactive Bug Analysis

Analyze ABAP code issues using the Analyzer agent. Automatically investigates runtime errors, code quality, regressions, and test failures.

## Usage

```
/analyze <description of the issue>
```

## Examples

```
/analyze DUMP_NO_ROLL_MEMORY errors for user SMITH
/analyze ZCL_ORDER_PROCESSOR rejecting orders over 1000 quantity
/analyze Performance issue in ZREPORT_SALES after last transport
/analyze Unit tests failing for ZCL_INVOICE_PROCESSOR
```

## What the Agent Does

The Analyzer agent proactively:

1. **Checks for runtime errors** (ST22 dumps)
2. **Runs ATC static analysis** for code quality
3. **Examines version history** for regressions
4. **Executes unit tests** to verify behavior
5. **Queries data** to validate assumptions
6. **Traces dependencies** to find root causes

## Agent Behavior

**Proactive**: The agent automatically runs relevant checks without asking permission for each step. It follows the evidence and stops when it has identified the root cause and recommended fix.

**Thorough**: Checks multiple sources (dumps, code, tests, history, ATC) to build a complete picture.

**Efficient**: Stops investigating once the root cause is clear.

## Output

The agent provides:

- **Root Cause**: What's causing the issue
- **Evidence**: Dumps, ATC findings, version diffs, test results
- **Impact**: Which functionality is affected
- **Recommended Fix**: Specific code changes needed
- **Verification Steps**: How to confirm the fix works

## Tips

- Provide as much context as possible in your description
- Mention error messages if you have them
- Include usernames, transaction codes, or program names
- Note when the issue started if it's a regression
