# PR Reviewer Agent - Architecture & Workflow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PR Review Workflow                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │         │              │         │              │
│  Developer   │────────▶│  npm run     │────────▶│   Helper     │
│              │         │  review      │         │   Script     │
│              │         │              │         │              │
└──────────────┘         └──────────────┘         └──────┬───────┘
                                                          │
                                                          ▼
                         ┌────────────────────────────────────┐
                         │  Collect Context:                  │
                         │  • Changed files                   │
                         │  • Commit messages                 │
                         │  • Git diff                        │
                         │  • Coverage report (optional)      │
                         └────────────┬───────────────────────┘
                                      │
                                      ▼
┌──────────────┐         ┌────────────────────────┐
│              │         │                        │
│   Claude     │◀────────│  Display Instructions  │
│    Code      │         │  & Checklist           │
│              │         │                        │
└──────┬───────┘         └────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PR Reviewer Agent                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Read       │  │   Grep       │  │    Bash      │         │
│  │   Files      │  │  Patterns    │  │   Commands   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
│         └──────────┬───────┴──────────────────┘                │
│                    ▼                                            │
│         ┌──────────────────────┐                               │
│         │  Analysis Engine:    │                               │
│         │  • Type Safety       │                               │
│         │  • Commit Format     │                               │
│         │  • Test Coverage     │                               │
│         │  • Security Scan     │                               │
│         │  • Documentation     │                               │
│         │  • Handler Structure │                               │
│         │  • ABAP Patterns     │                               │
│         └──────────┬───────────┘                               │
│                    ▼                                            │
│         ┌──────────────────────┐                               │
│         │  Configuration:      │                               │
│         │  pr-reviewer-        │                               │
│         │  config.json         │                               │
│         └──────────┬───────────┘                               │
│                    ▼                                            │
│         ┌──────────────────────┐                               │
│         │  Generate Report:    │                               │
│         │  • Summary           │                               │
│         │  • Passed Checks     │                               │
│         │  • Issues Found      │                               │
│         │  • Recommendations   │                               │
│         │  • Approval Status   │                               │
│         └──────────┬───────────┘                               │
└────────────────────┼───────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Review Report │
            │  (Markdown)    │
            └────────┬───────┘
                     │
                     ▼
            ┌────────────────┐
            │   Developer    │
            │   Actions:     │
            │   • Fix Issues │
            │   • Update PR  │
            │   • Re-review  │
            └────────────────┘
```

## Component Breakdown

### 1. Helper Script (`run-pr-review.js`)
**Purpose:** Prepare the review context

**Responsibilities:**
- Detect current branch
- Compare with base branch
- List changed files
- Extract commit messages
- Load configuration
- Display checklist
- Run tests (optional)

**Output:** Context summary + Claude Code invocation instructions

### 2. Agent Definition (`pr-reviewer.md`)
**Purpose:** Define agent behavior and process

**Contains:**
- Agent responsibilities
- 8-step review process
- Check categories and patterns
- Output format specification
- Example reviews
- Tool usage guidelines

**Claude Code reads this to understand how to perform reviews**

### 3. Configuration (`pr-reviewer-config.json`)
**Purpose:** Customize agent behavior

**Settings:**
- Enable/disable checks
- Severity levels
- Pattern definitions
- Exclusion rules
- Output formatting

**Allows customization without modifying agent definition**

### 4. Documentation (`*.md`)
**Purpose:** Guide users

**Files:**
- `PR_REVIEWER_GUIDE.md` - Complete usage guide
- `README.md` - Agents overview
- `QUICK_REFERENCE.md` - Quick commands
- `IMPLEMENTATION_SUMMARY.md` - Technical details

## Review Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Step-by-Step Review                          │
└─────────────────────────────────────────────────────────────────┘

Step 1: Analyze Changed Files
├─ Get list of modified files
├─ Filter by file type (.ts, .js, .json)
└─ Exclude test files and node_modules

Step 2: Review Commit Messages
├─ Extract all commit messages
├─ Check conventional format
├─ Verify length limits
├─ Check for issue references
└─ Report violations

Step 3: Check TypeScript Types
├─ Read each .ts file
├─ Search for 'any' patterns
├─ Verify interface definitions
├─ Check function return types
└─ Report findings

Step 4: Verify Test Coverage
├─ Parse coverage reports
├─ Check handler coverage (≥70%)
├─ Check utility coverage (≥80%)
├─ Check critical paths (≥90%)
└─ Report gaps

Step 5: Validate Handler Structure
├─ Identify new handlers
├─ Check 5-step pattern:
│  1. Parameter validation
│  2. Request building
│  3. API call
│  4. Response processing
│  5. Formatted return
├─ Verify error handling
└─ Check MCP response format

Step 6: Security Scan
├─ Search for credential patterns
├─ Check for hardcoded secrets
├─ Detect URLs with credentials
├─ Check .env commits
└─ Report security issues

Step 7: Documentation Check
├─ Identify new tools/handlers
├─ Check docs/ folder for .md files
├─ Verify README.md updates
├─ Check JSDoc comments
└─ Report missing docs

Step 8: Generate Report
├─ Summarize findings
├─ Group by severity
├─ Provide specific line numbers
├─ Include code examples
├─ Suggest fixes
└─ Recommend approval status
```

## Check Categories

### Critical (🚨) - Must Fix Before Merge
1. **TypeScript Types**
   - Pattern: `\bany\b`, `:\s*any\s*[,;)]`
   - Impact: Type safety compromised
   - Fix: Replace with specific types

2. **Test Coverage**
   - Threshold: 70%/80%/90%
   - Impact: Insufficient testing
   - Fix: Add unit tests

3. **Security**
   - Pattern: `password\s*=`, credentials in URLs
   - Impact: Security vulnerability
   - Fix: Use environment variables

### High (⚠️) - Should Fix Before Merge
1. **Commit Messages**
   - Format: `<type>(<scope>): <subject>`
   - Impact: Changelog generation, history clarity
   - Fix: Amend commit message

2. **Documentation**
   - Required: New tools need docs
   - Impact: User experience, maintainability
   - Fix: Add documentation files

3. **Handler Structure**
   - Pattern: 5-step pattern
   - Impact: Consistency, error handling
   - Fix: Follow handler template

### Medium (💡) - Nice to Have
1. **Code Quality**
   - DRY principle violations
   - Complex logic without comments
   - Non-descriptive variable names

2. **Performance**
   - Unnecessary API calls
   - Missing caching opportunities
   - Inefficient algorithms

### Low (ℹ️) - Optional
1. **Style**
   - Minor formatting issues
   - Subjective preferences
   - Micro-optimizations

## Configuration Examples

### Strict Mode (Production)
```json
{
  "checks": {
    "typescript_types": { "enabled": true, "severity": "critical" },
    "test_coverage": { "enabled": true, "severity": "critical" },
    "security": { "enabled": true, "severity": "critical" },
    "commit_messages": { "enabled": true, "severity": "high" },
    "documentation": { "enabled": true, "severity": "high" },
    "handler_structure": { "enabled": true, "severity": "high" }
  }
}
```

### Lenient Mode (Development)
```json
{
  "checks": {
    "typescript_types": { "enabled": true, "severity": "high" },
    "test_coverage": { "enabled": false },
    "security": { "enabled": true, "severity": "critical" },
    "commit_messages": { "enabled": false },
    "documentation": { "enabled": false },
    "handler_structure": { "enabled": true, "severity": "medium" }
  }
}
```

### Security-Only Mode
```json
{
  "checks": {
    "security": { "enabled": true, "severity": "critical" }
  }
}
```

## Integration Patterns

### Pattern 1: Pre-Commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running quick PR review..."
npm run review:quick

if [ $? -ne 0 ]; then
  echo "Review found issues. Continue anyway? (y/n)"
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

### Pattern 2: GitHub Actions
```yaml
name: PR Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run review:full
```

### Pattern 3: VS Code Task
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Review PR",
      "type": "shell",
      "command": "npm run review:full",
      "group": {
        "kind": "test",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      },
      "problemMatcher": []
    }
  ]
}
```

## Extensibility

### Adding Custom Checks

1. **Update Configuration:**
```json
{
  "checks": {
    "custom_check": {
      "enabled": true,
      "severity": "medium",
      "patterns": ["pattern1", "pattern2"]
    }
  }
}
```

2. **Update Agent Definition:**
Add new section to `pr-reviewer.md`:
```markdown
## Custom Check

### What to Look For
- Pattern descriptions

### How to Check
1. Step-by-step instructions

### Report Format
- Expected output
```

### Custom Patterns

Examples of useful patterns:
```javascript
// Detect TODO comments
"TODO:", "FIXME:", "HACK:"

// Detect console.log
"console\\.log\\("

// Detect debugger statements
"debugger;"

// Detect non-descriptive names
"\\bdata\\b", "\\btemp\\b", "\\bx\\b"
```

## Performance Considerations

### Fast Review (< 5 seconds)
- Changed files only
- Pattern matching
- No test execution
- Configuration-driven

### Full Review (30-60 seconds)
- Full test suite
- Coverage analysis
- Integration tests
- Detailed reporting

### Optimization Tips
1. Use exclusion patterns effectively
2. Run quick reviews during development
3. Reserve full reviews for PR submission
4. Cache test results when possible

## Troubleshooting Guide

### Issue: Agent Not Loading
**Symptoms:** Claude Code doesn't recognize agent
**Solutions:**
1. Verify `.claude/agents/pr-reviewer.md` exists
2. Check file permissions (should be readable)
3. Restart Claude Code
4. Use absolute path in prompt

### Issue: Incorrect Results
**Symptoms:** False positives or missed issues
**Solutions:**
1. Review configuration patterns
2. Check exclusion rules
3. Update agent definition
4. Provide more context in prompt

### Issue: Performance Problems
**Symptoms:** Agent takes too long
**Solutions:**
1. Use `--quick` mode
2. Add exclusion patterns
3. Limit file scope
4. Run tests separately

## Best Practices

1. **Review Early** - Don't wait until PR is complete
2. **Iterate** - Fix issues and re-review
3. **Be Specific** - Tell the agent what to focus on
4. **Self-Review First** - Fix obvious issues before agent review
5. **Learn Patterns** - Common issues suggest need for utilities
6. **Update Configuration** - Adjust as project evolves
7. **Document Decisions** - Explain non-obvious code choices

## Version History

- **v1.0.0** (2024-03-05)
  - Initial implementation
  - 7 check categories
  - Configurable severity levels
  - Helper script with options
  - Comprehensive documentation

## Future Enhancements

- [ ] Machine learning for pattern detection
- [ ] Historical trend analysis
- [ ] Auto-fix suggestions with code patches
- [ ] Integration with CI/CD pipelines
- [ ] Team metrics and dashboards
- [ ] Custom rule definitions via UI
- [ ] Comparison with previous PRs
- [ ] Automatic issue creation for findings
