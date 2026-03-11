# `/prr` - Pull Request Review Command

Automated pull request review command that performs comprehensive code quality analysis and posts results as a PR comment.

## Usage

```bash
/prr <pr-number>
```

**Examples:**
```bash
/prr 60
/prr 61
/prr #42  # Also accepts with # prefix
```

## What It Does

The `/prr` command automatically:

1. ✅ **Fetches PR metadata** - title, description, files, commits
2. 🔍 **Reviews commit messages** - checks conventional commit format
3. 📝 **Analyzes TypeScript code** - type safety, interfaces, return types
4. 🏗️ **Validates handler structure** - follows project patterns
5. 🔒 **Security scan** - checks for credentials, secrets, vulnerabilities
6. 🧪 **Test coverage** - runs tests and verifies coverage thresholds
7. 📚 **Documentation check** - ensures docs exist for new features
8. 🚀 **ABAP ADT patterns** - validates endpoint paths, XML parsing
9. 📊 **Generates review report** - comprehensive markdown report
10. 💬 **Posts comment** - automatically comments on the PR

## Review Criteria

### TypeScript Type Safety
- ❌ No `any` types without justification
- ✅ Explicit function return types
- ✅ Well-defined interfaces
- ✅ Proper parameter types

### Commit Messages
- Format: `<type>(<scope>): <subject>`
- Valid types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`
- Max 72 characters for subject
- Imperative mood ("add" not "added")

### Test Coverage
- Handlers: **70%** minimum
- Utilities: **80%** minimum
- Critical paths: **90%** minimum

### Handler Structure
Follows 5-step pattern:
1. Validate parameters
2. Build request
3. Make API call
4. Process response
5. Return formatted result

### Security
- No credentials in code
- No `.env` files committed
- No hardcoded SAP URLs
- Proper input sanitization

### Documentation
- Tool docs in `docs/` folder
- README.md updated if needed
- JSDoc comments for exports
- Examples provided

## Issue Severity Levels

| Severity | Symbol | Criteria | Action |
|----------|--------|----------|--------|
| **Critical** | 🚨 | Blocks merge | Must fix before approval |
| **High** | ⚠️ | Should fix | Strongly recommend fixing |
| **Medium** | 💡 | Nice to have | Suggest improvement |
| **Low** | ℹ️ | Optional | Minor suggestion |

## Sample Review Output

```markdown
# PR #60 Review Report

## Summary
Added new GetBehavior handler for retrieving ABAP behavior definitions.
Includes proper error handling and documentation.

**Changed Files:** 3
**Commits:** 2
**Additions:** +245 | **Deletions:** -12

## ✅ Passed Checks
- TypeScript types properly defined
- Follows handler structure pattern
- Error handling present
- Documentation included in docs/GetBehavior.md
- No security issues found

## ⚠️ Issues Found

### 🚨 Critical (Must Fix)
None

### ⚠️ High Priority (Should Fix)
- Commit message format: "Added GetBehavior handler"
  → Should be: `feat(handlers): add GetBehavior tool`

### 💡 Medium Priority (Nice to Have)
- Consider extracting XML parsing to `lib/utils.ts` for reuse

### ℹ️ Low Priority (Optional)
None

## 📝 Commit Message Review
- ❌ `Added GetBehavior handler` → `feat(handlers): add GetBehavior tool`
- ✅ `docs: update README with GetBehavior example`

## 🧪 Test Coverage
**Handler Coverage:** 0% (Target: 70%+) ✗
**Utility Coverage:** 85% (Target: 80%+) ✓
**Overall Coverage:** 78%

**Missing Tests:**
- `src/handlers/handleGetBehavior.ts`

## 📚 Documentation Status
- ✓ Tool documentation in `docs/GetBehavior.md`
- ✓ README.md updated
- ✓ JSDoc comments present
- ✓ Examples provided

## 🔒 Security Review
- ✓ No credentials in code
- ✓ No hardcoded SAP URLs
- ✓ No `.env` files committed
- ✓ Proper input sanitization

## 💡 Recommendations
1. **High Priority**: Add unit tests for `handleGetBehavior.ts` (target: 70%+)
2. **High Priority**: Fix commit message to follow conventional format
3. **Medium Priority**: Extract XML parsing logic to utility function if reused

## 📊 Approval Status
- [ ] ✅ Approved - Ready to merge
- [ ] ✅ Approved with minor changes (non-blocking)
- [x] ⚠️ Changes requested (blocking issues)
- [ ] 💬 Needs discussion

---
*Review performed by PR Reviewer Agent* 🤖
```

## Permissions

The following commands are pre-approved in `.claude/settings.local.json`:

- `Bash(gh pr:*)` - GitHub PR operations
- `Bash(gh api:*)` - GitHub API calls
- `Bash(git diff:*)` - Git diff commands
- `Bash(git log:*)` - Git log commands
- `Bash(npm test:*)` - Test execution
- `Read` - File reading
- `Grep` - Pattern searching
- `Glob` - File pattern matching

This allows the agent to run **autonomously** without user prompts.

## Implementation Details

### Agent Configuration
- **Context**: `fork` - Runs in isolated subagent
- **Agent type**: `general-purpose` - Full tool access
- **Allowed tools**: Pre-approved for autonomous operation

### Review Process
1. Fetches PR using `gh pr view` and `gh pr diff`
2. Analyzes all changed files
3. Runs tests with coverage
4. Generates structured markdown report
5. Posts comment using `gh pr comment`

### Integration
- Leverages `.claude/agents/pr-reviewer.md` logic
- Uses `.claude/agents/config/pr-reviewer-config.json` for check definitions
- Follows project-specific review criteria

## Testing the Command

1. **Create a test PR** or use an existing one
2. **Run the command**:
   ```bash
   /prr 60
   ```
3. **Check the PR** for the review comment

## Customization

To customize review criteria, edit:
- `.claude/agents/config/pr-reviewer-config.json` - Check definitions
- `.claude/skills/prr/SKILL.md` - Review process steps

## Troubleshooting

**Command not found:**
- Verify file exists: `.claude/skills/prr/SKILL.md`
- Restart Claude Code to reload skills

**Permission errors:**
- Check `.claude/settings.local.json` has required permissions
- Ensure GitHub CLI (`gh`) is authenticated

**Agent not posting comment:**
- Verify GitHub CLI has write access to repository
- Check PR number is correct
- Review agent output for errors

## Related

- `.claude/agents/pr-reviewer.md` - Agent definition
- `.claude/agents/scripts/run-pr-review.js` - Helper script
- `.claude/agents/config/pr-reviewer-config.json` - Configuration
