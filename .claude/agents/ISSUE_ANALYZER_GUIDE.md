# GitHub Issue Analyzer Agent - Complete Guide

## Overview

The Issue Analyzer Agent is an AI-powered tool that evaluates GitHub issues to determine their clarity, assess implementation feasibility, propose solution approaches, and generate detailed implementation plans.

## Table of Contents

- [Quick Start](#quick-start)
- [Use Cases](#use-cases)
- [How It Works](#how-it-works)
- [Usage Examples](#usage-examples)
- [Analysis Output](#analysis-output)
- [Issue Type Handling](#issue-type-handling)
- [Best Practices](#best-practices)
- [Integration Workflows](#integration-workflows)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Step 1: Prepare Issue Context

```bash
# Option A: By issue number (auto-detects repository)
npm run analyze-issue -- --issue 42

# Option B: By full URL
npm run analyze-issue -- --url https://github.com/user/repo/issues/42

# Option C: From file
npm run analyze-issue -- --file path/to/issue.txt

# Option D: From stdin
cat issue.txt | npm run analyze-issue -- --text
```

### Step 2: Invoke Claude Code

The script will display instructions like:

```bash
claude "Analyze GitHub issue: https://github.com/user/repo/issues/42"
```

### Step 3: Review Analysis

The agent produces a comprehensive report with:
- Clarity assessment
- Clarifying questions (if needed)
- Feasibility analysis
- Alternative solutions
- Implementation plan

## Use Cases

### 1. Pre-Implementation Planning

**When:** Before starting work on any issue

**Why:** Understand scope, identify unknowns, plan approach

**Example:**
```bash
npm run analyze-issue -- --issue 47
# Get implementation plan before coding
```

### 2. Issue Triage

**When:** Reviewing new or existing issues

**Why:** Determine if more information is needed

**Example:**
```bash
npm run analyze-issue -- --issue 51
# Agent identifies missing details and generates questions
```

### 3. Complexity Estimation

**When:** Planning sprints or prioritizing backlog

**Why:** Get realistic effort estimates

**Example:**
```bash
npm run analyze-issue -- --issue 53
# Complexity: Medium, Effort: 4-6 hours
```

### 4. Solution Design

**When:** Multiple approaches are possible

**Why:** Compare trade-offs systematically

**Example:**
```bash
npm run analyze-issue -- --issue 55
# Agent proposes 3 options with pros/cons
```

### 5. Feasibility Assessment

**When:** Evaluating if a request is technically possible

**Why:** Check API availability, identify blockers

**Example:**
```bash
npm run analyze-issue -- --issue 58
# Agent checks if ABAP ADT API supports the feature
```

## How It Works

### Analysis Process

```
┌────────────────────────────────────────────────────────┐
│                  Issue Analyzer Flow                    │
└────────────────────────────────────────────────────────┘

1. Parse Issue Content
   ├─ Extract title, description, labels
   ├─ Identify issue type (bug/feature/enhancement)
   └─ Check for structured format

2. Assess Clarity
   ├─ Problem statement clarity
   ├─ Context sufficiency
   ├─ Scope definition
   ├─ Acceptance criteria
   └─ Examples/reproduction steps

3. Generate Questions (if unclear)
   ├─ Problem understanding
   ├─ Technical details
   ├─ Scope boundaries
   ├─ Expected behavior
   └─ Context/environment

4. Feasibility Analysis (if clear)
   ├─ Technical complexity assessment
   ├─ Affected components identification
   ├─ Dependency checking
   ├─ Risk identification
   ├─ ABAP ADT API verification
   └─ Architecture compatibility

5. Propose Solutions
   ├─ Approach 1: Description, pros/cons, effort
   ├─ Approach 2: Description, pros/cons, effort
   ├─ Approach 3: Description, pros/cons, effort
   └─ Recommended approach with rationale

6. Draft Implementation Plan
   ├─ Prerequisites checklist
   ├─ Files to create/modify
   ├─ Step-by-step tasks
   ├─ Testing strategy
   ├─ Documentation requirements
   └─ Validation checklist

7. Estimate Effort
   ├─ Development time
   ├─ Testing time
   ├─ Documentation time
   └─ Confidence level
```

### Clarity Assessment Criteria

The agent evaluates issues on these dimensions:

**Problem Statement** (25%)
- Is the problem clearly defined?
- Is it specific and concrete?
- Is the impact/motivation explained?

**Context** (20%)
- Is background information provided?
- Are environment details included?
- Are relevant examples given?

**Scope** (20%)
- Are boundaries clearly defined?
- Is it clear what's in/out of scope?
- Are edge cases mentioned?

**Acceptance Criteria** (20%)
- Are success conditions specified?
- Is expected behavior described?
- Are there measurable outcomes?

**Reproducibility** (15%)
- Are steps to reproduce provided? (for bugs)
- Are use cases described? (for features)
- Are examples included?

**Overall Rating:**
- **Clear** (80%+) → Proceed with full analysis
- **Needs Clarification** (50-80%) → Generate focused questions
- **Unclear** (<50%) → Request comprehensive information

## Usage Examples

### Example 1: Analyzing a Feature Request

**Issue Content:**
```
Title: Add support for retrieving ABAP package hierarchy

It would be useful to get the full package hierarchy including
parent and child packages. This would help when exploring
package structures in the SAP system.
```

**Command:**
```bash
echo "..." > feature-request.txt
npm run analyze-issue -- --file feature-request.txt
claude "Analyze the issue in feature-request.txt"
```

**Expected Output:**

```markdown
# GitHub Issue Analysis Report

## Issue Summary
**Title:** Add support for retrieving ABAP package hierarchy
**Type:** Feature Request
**Labels:** None specified

## Clarity Assessment
**Overall Rating:** Needs Clarification

### Problem Statement
✅ Clear - wants package hierarchy retrieval

### Context & Scope
⚠️ Limited - needs more details on:
- What constitutes "full hierarchy"?
- Both directions (parents and children)?
- How deep should it traverse?

### Acceptance Criteria
❌ Not specified

---

## Clarifying Questions

### Problem Understanding
- Do you want to retrieve parent packages only, child packages only, or both?
- Should this be a single query or separate operations?

### Technical Details
- What should the output format be (tree structure, flat list, JSON)?
- Should package descriptions be included?
- Do you need transport layer information?

### Scope & Boundaries
- How many levels deep should the hierarchy go? (1 level, all levels, configurable?)
- Should it include packages from all software components?
- Are there performance concerns with deep hierarchies?

### Expected Behavior
- Should this be a parameter on GetPackage tool or a new tool?
- What happens for packages with no parent/children?
- Should circular references be detected?

---

## Preliminary Feasibility Assessment

**Overall Complexity:** Medium

**Justification:**
The ABAP ADT API supports package hierarchy via `/sap/bc/adt/packages/{name}`
endpoint with proper navigation. Implementation requires recursive traversal
and relationship mapping.

**Required ABAP ADT APIs:**
- `/sap/bc/adt/packages/{packageName}` - includes superpackage info
- May need multiple calls for deep hierarchy

**Potential Approaches:**
1. Extend GetPackage tool with hierarchy parameter
2. Create new GetPackageHierarchy tool
3. Add separate GetSubPackages tool

**Recommendation:** Wait for clarifications before detailed analysis

---

## Next Steps

1. Post clarifying questions to the GitHub issue
2. Wait for issue author to provide details
3. Re-run analysis once requirements are clearer
4. Proceed with implementation planning
```

### Example 2: Analyzing a Clear Bug Report

**Issue Content:**
```
Title: GetTableContents fails with more than 5 WHERE conditions

Steps to reproduce:
1. Call GetTableContents with table_name: "MARA"
2. Provide 6 WHERE conditions in where_conditions parameter
3. Error: "Too many conditions"

Expected: Should support multiple WHERE conditions
Actual: Fails with error after 5 conditions

Environment: SAP S/4HANA 2022, mcp-abap-adt v1.1.0
Additional context: Works fine with 5 or fewer conditions
```

**Command:**
```bash
npm run analyze-issue -- --issue 63
```

**Expected Output:**

```markdown
# GitHub Issue Analysis Report

## Issue Summary
**Title:** GetTableContents fails with more than 5 WHERE conditions
**Type:** Bug Report
**Labels:** bug, enhancement

## Clarity Assessment
**Overall Rating:** Clear ✅

### Problem Statement
✅ Excellent - Clear description with reproduction steps

### Context & Scope
✅ Good - Environment specified, additional context provided

### Acceptance Criteria
✅ Defined - Should support more than 5 conditions

---

## Feasibility Analysis

### Complexity Assessment
**Overall Complexity:** Simple to Medium

**Justification:**
This appears to be an arbitrary limit. Need to check:
1. If limit is in code or from ADT API
2. Whether ADT API has actual limitations
3. How to construct WHERE clause properly

### Affected Components
- `src/handlers/handleGetTableContents.ts` - Main handler
- `src/lib/__tests__/handleGetTableContents.test.ts` - Add test
- `docs/GetTableContents.md` - Document limitation or fix

### Dependencies
None - isolated fix

### Risks & Challenges
- **Low Risk:** If it's a code limitation, easy fix
- **Medium Risk:** If ADT API has hard limit, need alternative approach
- Need to verify ADT API behavior with many conditions

### ABAP ADT API Considerations
- **Endpoint:** `/sap/bc/adt/datapreview/freestyle`
- **Limitation:** Need to verify if 5 is API limit or code limit
- **Alternative:** If API limited, could use multiple queries

---

## Alternative Solutions

### Option 1: Remove arbitrary limit in code
**Description:**
If the 5-condition limit is in our code, simply remove it and
let the ADT API handle whatever it supports.

**Pros:**
- Simple fix, likely 1-line change
- Delegates limit handling to API
- No additional complexity

**Cons:**
- If API has actual limit, error not caught early
- May result in confusing API errors

**Effort:** Simple (30 minutes)

**Recommendation:** ✅ Start here - check if limit is artificial

### Option 2: Increase limit with validation
**Description:**
Increase limit to higher number (e.g., 50) and add validation
that provides clear error message when exceeded.

**Pros:**
- Provides clear, early error message
- Prevents confusing API errors
- Better user experience

**Cons:**
- Still has an arbitrary limit
- Requires knowing actual API limit

**Effort:** Simple (1 hour)

**Recommendation:** ✅ Good if API has actual limit

### Option 3: Pagination/chunking approach
**Description:**
For many conditions, split into multiple queries and merge results.
E.g., if 10 conditions, do 2 queries with 5 each.

**Pros:**
- Workaround for hard API limits
- Supports unlimited conditions
- Transparent to user

**Cons:**
- Much more complex
- Performance implications
- Results may need deduplication
- AND vs OR logic complications

**Effort:** Complex (4-6 hours)

**Recommendation:** ⚠️ Only if Options 1 & 2 don't work

### Recommended Approach
**Selected:** Option 1, fallback to Option 2

**Rationale:**
Start by investigating if the limit is in our code or the API.
If in code, remove it. If API has limit, implement Option 2
with clear error messaging.

---

## Implementation Plan

### Prerequisites
- [ ] Test GetTableContents with 6+ conditions against real SAP system
- [ ] Check ADT API documentation for limits
- [ ] Review handler code to find where limit is enforced

### Files to Modify

**Investigation Phase:**
- `src/handlers/handleGetTableContents.ts` - Find the limit

**If Code Limit (Option 1):**
- `src/handlers/handleGetTableContents.ts` - Remove limit check
- `src/handlers/__tests__/handleGetTableContents.test.ts` - Add test with 10 conditions

**If API Limit (Option 2):**
- `src/handlers/handleGetTableContents.ts` - Update limit, improve error
- `src/handlers/__tests__/handleGetTableContents.test.ts` - Test limit validation
- `docs/GetTableContents.md` - Document limitation

### Implementation Steps

#### Phase 1: Investigation (30 min)
1. **Locate limit enforcement**
   - [ ] Read handleGetTableContents.ts
   - [ ] Search for "5" or "condition" in code
   - [ ] Identify where limit is checked

2. **Test API behavior**
   - [ ] Manually test with 10 conditions
   - [ ] Check ADT API response
   - [ ] Document actual API behavior

#### Phase 2: Implementation (1-2 hours)

**If Code Limit:**
3. **Remove artificial limit**
   - [ ] Delete or modify limit check
   - [ ] Test with 10+ conditions
   - [ ] Verify no regressions

**If API Limit:**
4. **Improve limit handling**
   - [ ] Update max limit constant
   - [ ] Add parameter validation
   - [ ] Improve error message: "ADT API supports max X conditions"
   - [ ] Consider documenting workaround

#### Phase 3: Testing (1 hour)
5. **Add comprehensive tests**
   - [ ] Test with 1, 5, 10, 50 conditions
   - [ ] Test error handling if over limit
   - [ ] Test with real SAP system
   - [ ] Verify existing tests still pass

6. **Update documentation**
   - [ ] Document behavior in docs/GetTableContents.md
   - [ ] Add example with many conditions
   - [ ] Note any limitations discovered

### Testing Strategy

**Unit Tests:**
- Parameter validation with various condition counts
- Error handling for over-limit cases
- WHERE clause construction logic

**Integration Tests:**
- Real ADT API call with 10 conditions
- Verify correct SQL WHERE clause
- Test error scenarios

**Manual Verification:**
- Test with MARA table and complex conditions
- Verify results are correct
- Check performance with many conditions

### Documentation Requirements

**docs/GetTableContents.md:**
- Update parameter description for `where_conditions`
- Add example with 10+ conditions
- Document any discovered limitations
- Explain workaround if API limited

**Code comments:**
- Explain why limit exists (if it must remain)
- Document ADT API behavior discovered

### Validation Checklist

- [ ] Can use 10+ WHERE conditions successfully
- [ ] Error message is clear if limit hit
- [ ] All tests pass with good coverage
- [ ] Documentation is updated
- [ ] No performance degradation
- [ ] Backward compatible (still works with ≤5 conditions)

---

## Effort Estimate

**Total Development Time:** 2-3 hours

**Breakdown:**
- Investigation: 30 min
- Implementation: 1 hour
- Testing: 1 hour
- Documentation: 30 min

**Confidence Level:** High

**Assumptions:**
- Limit is in code (Option 1) - lower effort
- If API limited, Option 2 adds 1-2 hours
- No need for Option 3 (chunking approach)

---

## Next Steps

1. **Investigate**: Check handleGetTableContents.ts for limit
2. **Test**: Try 10 conditions against real SAP system
3. **Decide**: Choose Option 1 or 2 based on findings
4. **Implement**: Make the fix
5. **Validate**: Comprehensive testing
6. **Document**: Update docs and comments
7. **Close**: Resolve the issue with fix description

## Additional Notes

**Questions for issue author:**
- How many conditions do you typically need? (helps prioritize)
- Can you provide example conditions that fail?

**Consider for future:**
- If conditions are a common pain point, consider query builder helper
- Could add support for complex expressions (OR, parentheses)
```

### Example 3: Quick Triage Analysis

**Command:**
```bash
# Quick analysis of multiple issues
npm run analyze-issue -- --issue 71
npm run analyze-issue -- --issue 72
npm run analyze-issue -- --issue 73

# Agent quickly identifies which need clarification
```

## Analysis Output

### Report Structure

Every analysis produces a consistent markdown report:

```markdown
# GitHub Issue Analysis Report

## Issue Summary
- Title, type, labels

## Clarity Assessment
- Overall rating: Clear/Needs Clarification/Unclear
- Assessment of each dimension
  - Problem Statement
  - Context & Scope
  - Acceptance Criteria

## Clarifying Questions
[Only if not Clear]
- Organized by category
- Specific, actionable questions

## Feasibility Analysis
[Only if Clear]
- Complexity rating
- Affected components
- Dependencies
- Risks
- ABAP ADT API considerations

## Alternative Solutions
- Multiple approaches
- Pros, cons, effort for each
- Recommended approach with rationale

## Implementation Plan
- Prerequisites checklist
- Files to create/modify
- Step-by-step implementation tasks
- Testing strategy
- Documentation requirements
- Validation checklist

## Effort Estimate
- Time breakdown
- Confidence level

## Next Steps
- Immediate actions
```

### Complexity Ratings

**Simple** (1-3 hours)
- Single file changes
- No new dependencies
- Clear requirements
- Minimal testing needed

**Medium** (4-8 hours)
- Multiple file changes
- Some new logic
- Moderate testing
- May need research

**Complex** (1-3 days)
- Significant new functionality
- Multiple components affected
- Extensive testing required
- May need design decisions

**Very Complex** (3+ days)
- Major architectural changes
- High risk/impact
- Comprehensive testing
- Requires detailed planning

## Issue Type Handling

### Bug Reports

**Agent focuses on:**
- Reproduction steps clarity
- Error messages/logs
- Expected vs. actual behavior
- Environment details

**Questions asked:**
- Exact steps to reproduce?
- What error do you see?
- Which version/environment?
- Can you provide example input?

### Feature Requests

**Agent focuses on:**
- Use case and motivation
- User story or scenario
- Success criteria
- Integration with existing features

**Questions asked:**
- What problem does this solve?
- Who is the target user?
- How should this work?
- Any specific ABAP objects to support?

### Enhancements

**Agent focuses on:**
- Current limitation
- Proposed improvement
- Backward compatibility
- Breaking change assessment

**Questions asked:**
- What is limiting now?
- How would this improve the feature?
- Would this be breaking?
- Alternatives considered?

### Questions/Documentation

**Agent focuses on:**
- What information is needed
- Where documentation is lacking
- How to help user

**Questions asked:**
- What specifically is unclear?
- What docs have you checked?
- What's your use case?

## Best Practices

### For Issue Authors

**Write clear issues:**
- Use issue templates
- Provide context and examples
- Specify acceptance criteria
- Include reproduction steps (bugs)
- Describe use case (features)

**Respond to questions:**
- Check analysis report
- Answer clarifying questions
- Provide additional details
- Confirm understanding

### For Developers

**Use agent early:**
- Analyze before starting work
- Validate understanding
- Plan approach
- Identify unknowns

**Iterate analysis:**
- Re-analyze after clarifications
- Update as you learn more
- Share plan with team

**Follow the plan:**
- Use generated checklist
- Reference affected files
- Follow testing strategy
- Complete validation steps

### For Project Maintainers

**Triage efficiently:**
- Batch analyze new issues
- Identify incomplete issues quickly
- Generate questions automatically
- Prioritize by complexity

**Improve issue quality:**
- Share analysis with authors
- Use questions to educate
- Iterate on templates
- Build knowledge base

## Integration Workflows

### Workflow 1: Issue Creation

```bash
# New issue created → Analyze immediately
npm run analyze-issue -- --issue $NEW_ISSUE_NUMBER

# If unclear, post questions as comment
# If clear, proceed with implementation
```

### Workflow 2: Sprint Planning

```bash
# Analyze all backlog issues
for issue in 45 47 49 51; do
  npm run analyze-issue -- --issue $issue
done

# Review complexity estimates
# Prioritize based on effort/value
```

### Workflow 3: Pre-Implementation

```bash
# Before starting any work
npm run analyze-issue -- --issue $ASSIGNED_ISSUE

# Review implementation plan
# Identify blockers
# Estimate effort
# Begin implementation following the plan
```

### Workflow 4: GitHub Actions Integration

```yaml
# .github/workflows/issue-analysis.yml
name: Analyze Issue
on:
  issues:
    types: [opened]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run analyze-issue -- --issue ${{ github.event.issue.number }}
      - name: Comment analysis
        run: |
          # Post analysis as comment (requires Claude Code setup)
```

## Troubleshooting

### Issue: Agent not recognizing issue format

**Symptoms:** Analysis is incomplete or incorrect

**Solutions:**
1. Check issue content is complete
2. Ensure proper markdown formatting
3. Include title and description
4. Use issue templates when possible

### Issue: Questions too generic

**Symptoms:** Questions don't help clarify

**Solutions:**
1. Provide more context to agent
2. Specify focus areas: "Focus on ABAP API availability"
3. Include relevant project files
4. Reference similar implemented features

### Issue: Complexity rating seems wrong

**Symptoms:** Estimate doesn't match reality

**Solutions:**
1. Agent may not know all constraints
2. Provide more context about architecture
3. Mention if similar features exist
4. Consider constraints agent may not see

### Issue: Missing alternative approaches

**Symptoms:** Only one solution proposed

**Solutions:**
1. Ask explicitly: "Propose 3 alternative approaches"
2. Provide examples of different patterns used
3. Mention if you have preferences
4. Ask about specific approaches you're considering

### Issue: Implementation plan too vague

**Symptoms:** Steps not specific enough

**Solutions:**
1. Agent may need more clarity on issue
2. Ask for more detailed breakdown
3. Reference specific files to consider
4. Provide architecture context

## Advanced Usage

### Custom Focus Areas

```bash
# Emphasize specific aspects
claude "Analyze issue #42. Focus on:
- ABAP ADT API endpoint availability
- Security implications
- Test coverage strategy
- Backward compatibility"
```

### Comparative Analysis

```bash
# Compare similar issues
claude "Analyze issues #45 and #47.
Compare complexity and identify any overlap or dependencies."
```

### Impact Assessment

```bash
# Understand broader impact
claude "Analyze issue #50.
What other features would be affected?
What are the risks to existing functionality?"
```

## Tips & Tricks

1. **Batch analysis** - Analyze multiple issues before sprint planning
2. **Focus keywords** - Use "Focus on X" to emphasize concerns
3. **Iteration** - Re-analyze after clarifications received
4. **Team sharing** - Share analysis reports in PR description
5. **Learning** - Review past analyses to improve issue writing
6. **Templates** - Use agent output to create issue templates
7. **Estimation** - Track agent estimates vs. actuals to calibrate

## See Also

- [Issue Analyzer Agent Definition](issue-analyzer.md)
- [PR Reviewer Agent Guide](PR_REVIEWER_GUIDE.md)
- [Agent Architecture](ARCHITECTURE.md)
- [Quick Reference](ISSUE_ANALYZER_QUICK.md)
