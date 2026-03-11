# PR Reviewer Agent Documentation

## Overview

The PR Reviewer Agent is a specialized Claude Code agent designed to automate pull request reviews for the mcp-abap-adt project. It performs comprehensive code quality checks, validates adherence to project standards, and provides detailed feedback.

## Features

### Automated Checks

1. **TypeScript Type Safety**
   - Detects use of `any` types
   - Validates interface definitions
   - Checks function return types
   - Ensures proper type annotations

2. **Commit Message Validation**
   - Conventional commits format
   - Maximum length enforcement
   - Imperative mood verification
   - Issue reference checking

3. **Test Coverage Analysis**
   - Handler coverage (70% minimum)
   - Utility coverage (80% minimum)
   - Critical path coverage (90% minimum)
   - Test existence verification

4. **Handler Structure Validation**
   - 5-step pattern compliance
   - Error handling verification
   - MCP response format validation
   - Utility function usage

5. **Security Scanning**
   - Credential detection
   - Hardcoded secrets
   - .env file commits
   - URL pattern analysis

6. **Documentation Verification**
   - New tool documentation
   - README.md updates
   - JSDoc comments
   - Example inclusion

7. **ABAP ADT Patterns**
   - Endpoint path validation
   - XML parsing verification
   - HTTP method correctness
   - Parameter encoding

## Installation

The agent files are located in `.claude/agents/`:

```
.claude/
└── agents/
    ├── pr-reviewer.md              # Agent definition
    ├── pr-reviewer-config.json     # Configuration
    ├── run-pr-review.js            # Helper script
    └── PR_REVIEWER_GUIDE.md        # This file
```

No additional installation is required. The agent uses Claude Code's built-in capabilities.

## Usage

### Method 1: Direct Claude Code Invocation

The simplest way to use the agent:

```bash
# Start Claude Code
claude

# In Claude Code prompt:
"Review my current PR using the pr-reviewer agent"
```

Claude Code will automatically load the agent definition from `.claude/agents/pr-reviewer.md` and perform the review.

### Method 2: Using the Helper Script

For preparation and context gathering:

```bash
# Quick review preparation
node .claude/agents/run-pr-review.js

# Full review with test coverage
node .claude/agents/run-pr-review.js --full

# Quick review (skip tests)
node .claude/agents/run-pr-review.js --quick

# Review specific branch
node .claude/agents/run-pr-review.js --branch feature/my-feature --base main
```

The helper script will:
1. List changed files
2. Show commit messages
3. Display checklist
4. Optionally run tests
5. Provide Claude Code invocation instructions

### Method 3: GitHub Integration (Future)

*Coming soon: Integration with GitHub Actions for automatic PR reviews*

## Configuration

Edit `.claude/agents/pr-reviewer-config.json` to customize behavior:

### Check Severity Levels

- **critical**: Must be fixed before merge
- **high**: Should be fixed before merge
- **medium**: Nice to have
- **low**: Optional improvements

### Enabling/Disabling Checks

```json
{
  "checks": {
    "typescript_types": {
      "enabled": true,
      "severity": "critical"
    },
    "commit_messages": {
      "enabled": true,
      "severity": "high"
    }
  }
}
```

### Exclusion Patterns

```json
{
  "exclusions": {
    "files": [
      "node_modules/**",
      "*.test.ts"
    ],
    "patterns": {
      "typescript_types": {
        "allow_any_in": ["__tests__/**"]
      }
    }
  }
}
```

## Workflow Examples

### Example 1: Review Before Creating PR

```bash
# 1. Create feature branch
git checkout -b feature/new-tool

# 2. Make changes
# ... edit files ...

# 3. Commit changes
git add .
git commit -m "feat(handlers): add GetBehavior tool"

# 4. Run pre-review check
node .claude/agents/run-pr-review.js --full

# 5. Use Claude Code for detailed review
claude "Review my PR for feature/new-tool using pr-reviewer agent"

# 6. Fix issues found
# ... make corrections ...

# 7. Create PR
gh pr create --title "feat: Add GetBehavior tool" --body "..."
```

### Example 2: Review Existing PR

```bash
# 1. Checkout PR branch
gh pr checkout 123

# 2. Run review
claude "Review PR #123 using the pr-reviewer agent. Focus on test coverage and TypeScript types."

# 3. Address feedback
# ... fix issues ...

# 4. Push updates
git push
```

### Example 3: Quick Pre-commit Check

```bash
# Before committing
claude "Quick review of my staged changes. Check for any types and security issues only."
```

## Review Report Format

The agent generates structured reports:

```markdown
# PR Review Report

## Summary
Brief overview of changes and purpose

## ✅ Passed Checks
- TypeScript types properly defined
- Test coverage meets requirements (85%)
- Documentation updated
- No security issues found

## 🚨 Critical Issues
- [Issue description with file:line reference]

## ⚠️ High Priority Issues
- [Issue description with file:line reference]

## 💡 Medium Priority Recommendations
- [Suggestion with reasoning]

## ℹ️ Low Priority Notes
- [Optional improvements]

## Test Coverage
- Handlers: 75% (Target: 70%+) ✓
- Utilities: 82% (Target: 80%+) ✓
- Overall: 78%

## Approval Status
- [x] Approved - Ready to merge
- [ ] Approved with minor changes
- [ ] Changes requested
- [ ] Needs discussion
```

## Common Review Scenarios

### New Handler Added

The agent checks:
- Handler follows 5-step pattern
- TypeScript types are explicit
- Error handling is present
- Tests are included (70%+ coverage)
- Documentation exists in `docs/`
- Commit message follows format
- No security issues

### Bug Fix

The agent checks:
- Root cause addressed
- Tests added for the bug
- No regression introduced
- Commit message references issue
- Coverage maintained or improved

### Documentation Update

The agent checks:
- Markdown formatting correct
- Examples are accurate
- Links are valid
- Consistent with other docs

### Refactoring

The agent checks:
- No behavior changes
- Tests still pass
- Coverage maintained
- Code complexity reduced
- Clear reasoning in commit

## Integration with Development Workflow

### Pre-commit Hook (Optional)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running quick PR review checks..."
node .claude/agents/run-pr-review.js --quick
```

### VS Code Task (Optional)

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "PR Review",
      "type": "shell",
      "command": "node .claude/agents/run-pr-review.js --full",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

## Tips for Effective Reviews

### For Agent Users

1. **Be specific**: "Focus on security and test coverage"
2. **Provide context**: "This is a bug fix for issue #45"
3. **Ask questions**: "Is this handler structure acceptable?"
4. **Iterate**: Review, fix, review again

### For Code Authors

1. **Self-review first**: Run the agent before requesting review
2. **Fix critical issues**: Don't submit PRs with known critical issues
3. **Document decisions**: Explain non-obvious choices in comments
4. **Keep PRs focused**: Smaller PRs are easier to review

## Troubleshooting

### Agent Not Found

**Issue**: Claude Code can't find the pr-reviewer agent

**Solution**:
1. Ensure `.claude/agents/pr-reviewer.md` exists
2. Restart Claude Code
3. Try explicit path: "Use the agent at .claude/agents/pr-reviewer.md"

### False Positives

**Issue**: Agent flags valid code

**Solution**:
1. Add exclusion pattern in config
2. Add comment justifying the pattern
3. Update agent definition if pattern is common

### Missing Context

**Issue**: Agent doesn't have enough information

**Solution**:
1. Provide more context in prompt: "Review PR #45 which fixes authentication bug"
2. Run helper script first to gather context
3. Include relevant issue/PR numbers

### Test Coverage Not Detected

**Issue**: Agent can't determine coverage

**Solution**:
1. Run `npm test -- --coverage` first
2. Ensure coverage reports are generated
3. Check that `coverage/` directory exists

## Advanced Usage

### Custom Review Focus

```bash
claude "Review my PR with focus on:
1. ABAP ADT API endpoint usage
2. XML parsing error handling
3. Test coverage for edge cases"
```

### Comparative Review

```bash
claude "Compare my implementation in src/handlers/handleGetBehavior.ts
with the existing handleGetClass.ts pattern"
```

### Security-Only Review

```bash
claude "Security review only: Check for credentials, secrets,
and hardcoded URLs in my changes"
```

## Customization

### Adding Custom Checks

Edit `.claude/agents/pr-reviewer.md` to add new check sections:

```markdown
## Your Custom Check

### What to Look For
- Pattern 1
- Pattern 2

### How to Check
1. Step 1
2. Step 2

### Report Format
- Issue description
- Severity level
- Suggested fix
```

### Modifying Severity Levels

Edit `.claude/agents/pr-reviewer-config.json`:

```json
{
  "checks": {
    "your_check": {
      "enabled": true,
      "severity": "high",
      "patterns": ["pattern1", "pattern2"]
    }
  }
}
```

## Best Practices

1. **Review early and often**: Don't wait until PR is complete
2. **Use quick reviews**: During development for fast feedback
3. **Use full reviews**: Before submitting PR for human review
4. **Act on feedback**: Address critical and high priority issues
5. **Learn from reviews**: Common issues indicate need for templates or utilities
6. **Update agent**: As project evolves, update review criteria

## Future Enhancements

Planned improvements:
- [ ] GitHub Actions integration
- [ ] Automated fix suggestions
- [ ] Historical trend analysis
- [ ] Custom rule definitions
- [ ] Integration with CI/CD
- [ ] Comparison with previous PRs
- [ ] Team metrics dashboard

## Support

For issues or questions:
- Check [CONTRIBUTING.md](../../CONTRIBUTING.md)
- Open issue with label `agent-support`
- Review agent definition in `pr-reviewer.md`

## Version History

- **v1.0.0** (2024-03-05): Initial implementation
  - TypeScript type checking
  - Commit message validation
  - Test coverage analysis
  - Security scanning
  - Documentation verification
  - Handler structure validation
