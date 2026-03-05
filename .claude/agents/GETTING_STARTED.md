# Getting Started with pr-reviewer Agent

Welcome! This guide will help you get started with the pr-reviewer agent in 5 minutes.

## What is the pr-reviewer Agent?

The pr-reviewer agent is an AI-powered code reviewer that automatically checks your pull requests for:
- TypeScript type safety issues
- Test coverage gaps
- Security vulnerabilities
- Code quality problems
- Documentation completeness
- And more!

## Quick Start (3 Steps)

### Step 1: Make Your Changes
```bash
# Create a feature branch
git checkout -b feature/my-feature

# Make your changes
# ... edit files ...

# Commit your changes
git add .
git commit -m "feat: add new feature"
```

### Step 2: Run the Review
```bash
# Option A: Quick review (recommended while developing)
npm run review:quick

# Option B: Full review (recommended before PR)
npm run review:full
```

### Step 3: Fix Issues
The review report will show:
- 🚨 **Critical issues** - Must fix
- ⚠️ **High priority** - Should fix
- 💡 **Medium priority** - Nice to have
- ℹ️ **Low priority** - Optional

Fix the critical and high priority issues, then commit and re-review.

## Your First Review

Let's walk through an example:

### 1. Create Test Changes
```bash
# Create a simple test file
cat > test-example.ts << 'EOF'
export function add(a: number, b: number): number {
  return a + b;
}
EOF

git add test-example.ts
git commit -m "feat: add simple add function"
```

### 2. Run Review
```bash
npm run review:quick
```

**Expected Output:**
```
📁 Changed Files: 1
📝 Commits: 1

Commit Messages:
  1. feat: add simple add function

📋 Review Checklist
  🚨 typescript types (critical)
  ⚠️ commit messages (high)
  🚨 test coverage (critical) ⚠️ No tests found!
  🚨 security (critical)
  ⚠️ documentation (high)
```

### 3. Review Results
The agent will identify:
- ✅ **Good**: TypeScript types are explicit
- ✅ **Good**: Commit message follows format
- ❌ **Issue**: No tests exist for new function
- ⚠️ **Warning**: No documentation

### 4. Fix Issues
```bash
# Add tests
cat > test-example.test.ts << 'EOF'
import { add } from './test-example';

describe('add', () => {
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});
EOF

git add test-example.test.ts
git commit -m "test: add tests for add function"
```

### 5. Re-review
```bash
npm run review:quick
```

Now the agent will show:
- ✅ **All checks passed!**
- ✅ **Test coverage: 100%**

## Common Commands

### During Development
```bash
# Quick checks while coding
npm run review:quick
```

### Before Creating PR
```bash
# Full review with test coverage
npm run review:full
```

### Using Claude Code Directly
```bash
# Start Claude Code
claude

# In Claude Code, type:
"Review my PR using the pr-reviewer agent"
```

### Focused Reviews
```bash
# Check only for security issues
claude "Use pr-reviewer to check for security issues only"

# Check specific files
claude "Review these files: src/handlers/myHandler.ts"
```

## Understanding the Review Report

### Report Structure
```markdown
# PR Review Report

## Summary
Brief overview of what changed

## ✅ Passed Checks
- List of things that passed

## 🚨 Critical Issues
- Issue 1: file.ts:42 - Description
- Issue 2: file.ts:57 - Description

## ⚠️ High Priority Issues
- Issue 1: file.ts:15 - Description

## 💡 Recommendations
- Suggestion 1
- Suggestion 2

## Test Coverage
- Handlers: 85%
- Overall: 78%

## Approval Status
- [x] Approved - Ready to merge
```

### Priority Guide

| Icon | Severity | Action |
|------|----------|--------|
| 🚨 | Critical | Must fix before merge |
| ⚠️ | High | Should fix before merge |
| 💡 | Medium | Nice to have |
| ℹ️ | Low | Optional |

## Typical Workflow

```
┌─────────────────────────────────────────────────┐
│  1. Create Feature Branch                       │
│     git checkout -b feature/xyz                 │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  2. Make Changes & Commit                       │
│     ... edit files ...                          │
│     git commit -m "feat: add feature"           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  3. Quick Review                                │
│     npm run review:quick                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
         ┌─────────┴──────────┐
         │  Issues Found?      │
         └─────────┬───────────┘
                   │
           ┌───────┴────────┐
          YES              NO
           │                │
           ▼                ▼
    ┌──────────┐      ┌──────────┐
    │ Fix      │      │ Continue │
    │ Issues   │      │ Work     │
    └────┬─────┘      └────┬─────┘
         │                 │
         └────────┬────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  4. Full Review Before PR                       │
│     npm run review:full                         │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  5. Create Pull Request                         │
│     gh pr create                                │
└─────────────────────────────────────────────────┘
```

## Tips for Success

### 1. Review Early and Often
Don't wait until you're done - review during development!
```bash
# After each significant change
npm run review:quick
```

### 2. Fix Critical Issues First
Focus on 🚨 and ⚠️ issues before the rest.

### 3. Use Focused Reviews
Be specific about what you want checked:
```bash
claude "Check my code for 'any' types only"
```

### 4. Learn from Reviews
If the same issue appears repeatedly, consider:
- Creating a utility function
- Adding a template
- Updating your workflow

### 5. Keep Commits Clean
Use conventional commit format from the start:
```bash
# Good
git commit -m "feat(handlers): add GetBehavior tool"

# Bad
git commit -m "Added stuff"
```

## Troubleshooting

### "No changes detected"
**Problem:** Agent says no changes to review

**Solution:**
- Ensure you've committed changes: `git status`
- Check you're on the right branch: `git branch`
- Verify commits exist: `git log main..HEAD`

### "Agent not found"
**Problem:** Claude Code can't find the agent

**Solution:**
- Verify file exists: `.claude/agents/pr-reviewer.md`
- Restart Claude Code
- Try: `claude "Use the agent at .claude/agents/pr-reviewer.md"`

### "Coverage not detected"
**Problem:** Test coverage shows 0%

**Solution:**
- Run tests first: `npm test -- --coverage`
- Check `coverage/` directory exists
- Verify Jest is configured correctly

## Next Steps

Now that you know the basics:

1. **Try it out** - Run a review on your current work
2. **Read the full guide** - See [PR_REVIEWER_GUIDE.md](PR_REVIEWER_GUIDE.md)
3. **Customize configuration** - Edit `pr-reviewer-config.json`
4. **Integrate with workflow** - Add to git hooks or VS Code tasks

## Need Help?

- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Complete Guide**: [PR_REVIEWER_GUIDE.md](PR_REVIEWER_GUIDE.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **GitHub Issues**: Report problems or ask questions

## Example Session

Here's what a typical session looks like:

```bash
# Start work
$ git checkout -b feature/new-handler
Switched to a new branch 'feature/new-handler'

# Create handler
$ vim src/handlers/handleGetBehavior.ts
# ... write code ...

# Commit
$ git add .
$ git commit -m "feat(handlers): add GetBehavior handler"
[feature/new-handler abc123] feat(handlers): add GetBehavior handler
 1 file changed, 45 insertions(+)

# Quick review
$ npm run review:quick
🔍 PR Reviewer Agent
📁 Changed Files: 1
📝 Commits: 1

⚠️  Issues Found:
  - No tests for new handler (handlers require 70% coverage)
  - Missing documentation in docs/

# Add tests
$ vim src/handlers/__tests__/handleGetBehavior.test.ts
# ... write tests ...

# Add docs
$ vim docs/GetBehavior.md
# ... write documentation ...

# Commit fixes
$ git add .
$ git commit -m "test: add tests for GetBehavior handler"
$ git commit -m "docs: add GetBehavior documentation"

# Final review
$ npm run review:full
✅ All checks passed!
Test coverage: 85%
Ready to create PR!

# Create PR
$ gh pr create --title "feat: Add GetBehavior handler"
```

## Summary

You now know how to:
- ✅ Run PR reviews with `npm run review`
- ✅ Understand review reports
- ✅ Fix issues by priority
- ✅ Integrate reviews into your workflow

**Start reviewing your code now!**
```bash
npm run review:quick
```

Happy coding! 🚀
