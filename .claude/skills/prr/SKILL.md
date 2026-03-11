---
name: prr
description: Review a GitHub pull request by number and post the review as a comment. Performs comprehensive code quality analysis following project standards.
argument-hint: <pr-number>
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, Write
context: fork
agent: general-purpose
---

# Pull Request Review Command

Review GitHub PR #$ARGUMENTS and post a comprehensive review comment.

## Your Task

You are a specialized code review agent for the mcp-abap-adt project. Perform a comprehensive pull request review and post the results as a comment on the PR.

### Step 1: Fetch PR Metadata

```bash
gh pr view $ARGUMENTS --json number,title,body,author,headRefName,baseRefName,files,commits,additions,deletions
```

Parse the JSON output to understand:
- PR title and description
- Author
- Branch names (head and base)
- Files changed
- Commit list

### Step 2: Get Changed Files and Diff

```bash
# Get list of changed files
gh pr diff $ARGUMENTS --name-only

# Get full diff for analysis
gh pr diff $ARGUMENTS
```

### Step 3: Review Commit Messages

```bash
# Get all commit messages in the PR
gh api repos/:owner/:repo/pulls/$ARGUMENTS/commits --jq '.[].commit.message'
```

Check each commit against conventional commit format:
- Format: `<type>(<scope>): <subject>`
- Valid types: feat, fix, docs, test, refactor, perf, chore, ci
- Subject line max 72 characters
- Imperative mood ("add" not "added")
- Check for issue references (Closes #XX, Fixes #XX)

### Step 4: Analyze TypeScript Files

For each changed `.ts` file:
- Read the file using the Read tool
- Check for `any` types (search for pattern `:\s*any\b`)
- Verify proper interface definitions
- Ensure function return types are explicit
- Validate parameter types are well-defined

Use Grep to search for problematic patterns:
```bash
# Find 'any' types
grep -n ":\s*any\b" <changed-ts-files>
```

### Step 5: Validate Handler Structure

For any new or modified handlers in `src/handlers/`:
- Verify they follow the 5-step pattern:
  1. Validate parameters
  2. Build request
  3. Make API call
  4. Process response
  5. Return formatted result
- Check for proper error handling with try-catch
- Verify use of utility functions from `lib/utils.ts`
- Ensure proper MCP response format

### Step 6: Security Scan

Search for security issues using Grep:
```bash
# Search for credentials or secrets
grep -rni "password\|token\|secret\|api[_-]?key" <changed-files>

# Check for hardcoded URLs with credentials
grep -rn "://.*:.*@" <changed-files>

# Look for .env files being committed
git diff $ARGUMENTS --name-only | grep "\.env"
```

### Step 7: Test Coverage Verification

```bash
# Run tests with coverage
npm test -- --coverage
```

Verify coverage meets requirements:
- New handlers: Minimum 70% coverage
- Utilities: Minimum 80% coverage
- Critical paths: 90%+ coverage
- Check if new files have corresponding test files

### Step 8: Documentation Check

For new tools or features:
- Verify `docs/` folder has corresponding `.md` file
- Check if README.md needs updates
- Verify JSDoc comments for exported functions
- Ensure examples are included

### Step 9: ABAP ADT API Patterns

For any ADT-related changes:
- Correct ADT endpoint paths (`/sap/bc/adt/...`)
- Proper XML parsing with error handling
- CSRF token handling if needed
- Correct HTTP methods (GET, POST, etc.)
- Proper URL encoding of parameters

### Step 10: Generate Review Report

Create a comprehensive review report in markdown format:

```markdown
# PR #$ARGUMENTS Review Report

## Summary
[Brief overview of the changes - 2-3 sentences]

**Changed Files:** [count]
**Commits:** [count]
**Additions:** [+lines] | **Deletions:** [-lines]

## ✅ Passed Checks
- [List items that passed review with checkmarks]
- TypeScript types properly defined
- Follows handler structure pattern
- Error handling present
- Documentation included
- No security issues

## ⚠️ Issues Found

### 🚨 Critical (Must Fix)
- [Issues that block merge]
- Use of `any` types without justification
- Missing error handling in handlers
- Credentials or secrets in code

### ⚠️ High Priority (Should Fix)
- [Issues that should be addressed]
- Non-conventional commit messages
- Missing documentation for new features
- Code duplication

### 💡 Medium Priority (Nice to Have)
- [Suggestions for improvement]
- Optimization opportunities
- Better variable naming
- Additional test cases

### ℹ️ Low Priority (Optional)
- [Minor suggestions]
- Minor formatting issues
- Subjective style preferences

## 📝 Commit Message Review

[For each commit, indicate if it follows conventional format]
- ✅ `feat(handlers): add GetBehavior tool`
- ❌ `Added new feature` → Should be: `feat(scope): add new feature`

## 🧪 Test Coverage

**Handler Coverage:** X% (Target: 70%+) [✓/✗]
**Utility Coverage:** Y% (Target: 80%+) [✓/✗]
**Overall Coverage:** Z%

**Missing Tests:**
- [List files that need tests]

## 📚 Documentation Status
- [✓/✗] Tool documentation in `docs/` folder
- [✓/✗] README.md updated (if needed)
- [✓/✗] JSDoc comments present
- [✓/✗] Examples provided

## 🔒 Security Review
- [✓/✗] No credentials in code
- [✓/✗] No hardcoded SAP URLs
- [✓/✗] No `.env` files committed
- [✓/✗] Proper input sanitization

## 💡 Recommendations
1. [Actionable recommendation with priority]
2. [Actionable recommendation with priority]
3. [Consider extracting common logic to utility function]

## 📊 Approval Status
- [ ] ✅ Approved - Ready to merge
- [ ] ✅ Approved with minor changes (non-blocking)
- [ ] ⚠️ Changes requested (blocking issues)
- [ ] 💬 Needs discussion

---
*Review performed by PR Reviewer Agent* 🤖
```

### Step 11: Post Review Comment

After generating the review report, post it as a comment on the PR:

```bash
gh pr comment $ARGUMENTS --body "<your-review-report-here>"
```

**Important:** Escape any special characters in the markdown before posting. Use a heredoc for multi-line content:

```bash
gh pr comment $ARGUMENTS --body "$(cat <<'EOF'
[Your full review report here]
EOF
)"
```

## Review Guidelines

### Issue Severity Levels

| Severity | Criteria | Action |
|----------|----------|--------|
| **Critical** | Blocks merge | Must fix before approval |
| **High** | Should fix | Strongly recommend fixing |
| **Medium** | Nice to have | Suggest improvement |
| **Low** | Optional | Minor suggestion |

### Critical Issues (Must Fix)
- Use of `any` types without justification
- Missing error handling in handlers
- Credentials or secrets in code
- Test coverage below minimum requirements (handlers <70%, utils <80%)
- Breaking changes without migration guide
- Security vulnerabilities

### High Priority (Should Fix)
- Non-conventional commit messages
- Missing documentation for new features
- Code duplication
- Improper handler structure
- Missing tests for new functionality

### Medium Priority (Nice to Have)
- Optimization opportunities
- Better variable naming
- Additional test cases
- More detailed comments

### Low Priority (Optional)
- Minor formatting issues (Prettier handles this)
- Subjective style preferences
- Performance micro-optimizations

## Important Notes

1. **Be constructive**: Focus on helping the contributor improve
2. **Be specific**: Point to exact lines and file paths using `file:line` format
3. **Prioritize**: Not every issue blocks a merge
4. **Context matters**: This is an evaluation project, not production-level software
5. **Encourage**: Recognize good practices and improvements

## Tools to Use

- **Read**: Read source files to analyze code
- **Grep**: Search for patterns (e.g., `any` types, credentials, security issues)
- **Bash**: Run git commands, gh CLI, tests, coverage reports
- **Glob**: Find all changed TypeScript files by pattern

## Execution Flow

1. Fetch PR metadata → understand context
2. Get diff and files → know what changed
3. Review commits → check message format
4. Analyze code → TypeScript, handlers, structure
5. Security scan → credentials, secrets, vulnerabilities
6. Test coverage → run tests, check percentages
7. Documentation → verify docs exist
8. Generate report → comprehensive markdown review
9. Post comment → publish review to PR

## Examples of Good Feedback

✅ **Good:**
> **Critical**: `src/handlers/handleGetClass.ts:45` - Using `any` type for `result` parameter. Should be `GetClassResult` interface.
>
> **Recommendation**: Define interface in `src/types.ts`:
> ```typescript
> interface GetClassResult {
>   content: string;
>   metadata: ClassMetadata;
> }
> ```

❌ **Avoid:**
> You used `any` which is bad. Fix it.

## Start Your Review Now

Execute the steps above for PR #$ARGUMENTS and post the comprehensive review as a comment on the PR.
