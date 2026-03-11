# `/commit` - Smart Git Commit Command

Intelligent git commit command that automatically formats code, validates messages, and handles pre-commit hooks.

## Usage

```bash
/commit                              # Auto-generate message from changes
/commit feat                         # Generate message with type 'feat'
/commit fix                          # Generate message with type 'fix'
/commit "feat: Add new feature"      # Use provided message
```

## What It Does

The `/commit` command automatically:

1. ✅ **Checks git status** - Understands current state and branch
2. 📝 **Analyzes changes** - Reviews diffs to understand what changed
3. 🎨 **Auto-formats code** - Runs Prettier on TypeScript files
4. 📋 **Generates commit message** - Creates conventional commit format
5. ✔️ **Validates message** - Ensures proper format and sentence-case
6. 🔍 **Stages files** - Adds changes to git index
7. 🪝 **Handles hooks** - Manages pre-commit and commit-msg hooks
8. 🔄 **Auto-recovers** - Fixes formatting issues and retries
9. ✅ **Confirms commit** - Shows commit SHA and summary

## Conventional Commit Format

```
<type>(<scope>): <Subject starting with capital>

<Optional body with details>

<Optional footer with issue refs>
```

### Valid Types

| Type | Usage | Example |
|------|-------|---------|
| `feat` | New feature | `feat(handlers): Add GetBehavior tool` |
| `fix` | Bug fix | `fix(auth): Handle expired tokens` |
| `docs` | Documentation | `docs: Update API examples` |
| `test` | Tests | `test(handlers): Add unit tests` |
| `refactor` | Code refactoring | `refactor(utils): Extract common logic` |
| `perf` | Performance | `perf(parser): Optimize XML parsing` |
| `chore` | Maintenance | `chore: Update dependencies` |
| `ci` | CI/CD | `ci: Add test workflow` |
| `style` | Formatting | `style: Fix code formatting` |
| `build` | Build system | `build: Update TypeScript config` |

### Scopes for This Project

| Scope | Usage |
|-------|-------|
| `handlers` | Handler functions in `src/handlers/` |
| `agents` | Claude Code agents in `.claude/agents/` |
| `skills` | Claude Code skills in `.claude/skills/` |
| `auth` | Authentication providers |
| `tests` | Test files |
| `docs` | Documentation |
| `infra` | Infrastructure code |
| `config` | Configuration files |
| `lib` | Utility libraries |

### Message Rules

1. ✅ Subject starts with **capital letter** (sentence-case)
2. ✅ Subject max **72 characters**
3. ✅ Use **imperative mood**: "Add" not "Added"
4. ✅ No period at end of subject
5. ✅ Body wraps at 72 characters
6. ✅ Reference issues: `Closes #123`, `Fixes #456`

## Pre-Commit Hooks

The project runs these checks before each commit:

### 1. `.env` File Check
Prevents committing environment files with secrets:
```bash
# Blocked files: .env, .env.local, .env.production, etc.
```

### 2. Prettier Format Check
Validates all TypeScript files are formatted:
```bash
npm run format:check
```
**Auto-fix:** The skill runs `npm run format` if this fails

### 3. TypeScript Type Check
Ensures code compiles without type errors:
```bash
npm run typecheck
```
**Action required:** Fix type errors before committing

### 4. Commitlint Validation
Validates commit message format:
- Must follow `type(scope): Subject` pattern
- Subject must be sentence-case
- Must use valid type

**Auto-fix:** The skill capitalizes subject if needed

## Usage Examples

### Example 1: Auto-Generate Message

```bash
/commit
```

**What happens:**
1. Checks git status → sees new skill files
2. Analyzes changes → understands new feature added
3. Generates message:
   ```
   feat(skills): Add smart commit command

   Implement intelligent git commit skill that automatically
   formats code, validates messages, and handles hooks.
   ```
4. Runs Prettier → formats code
5. Stages files → `git add .`
6. Commits → Creates commit
7. Shows result → Displays commit SHA

### Example 2: Specify Type

```bash
/commit fix
```

**What happens:**
1. Analyzes: Modified `src/handlers/handleGetClass.ts`
2. Generates: `fix(handlers): Handle special characters in class names`
3. Auto-stages and commits

### Example 3: Provide Full Message

```bash
/commit "docs: Update README with installation steps"
```

**What happens:**
1. Validates message format ✓
2. Stages files
3. Commits with provided message

### Example 4: Multi-File Commit

```bash
/commit feat
```

**Changes:**
- Added `.claude/skills/prr/SKILL.md`
- Added `.claude/skills/prr/README.md`
- Modified `.gitignore`
- Modified 5 files in `src/` (formatting)

**Generated message:**
```
feat(skills): Add /prr command for automated PR reviews

Add new /prr skill that performs comprehensive pull request
reviews and automatically posts review comments. The skill runs
autonomously with pre-approved permissions.

Also updates .gitignore to include .claude/skills/ directory.
Includes Prettier formatting fixes for consistency.
```

## Auto-Recovery

### Prettier Failure

```bash
# Hook fails:
> prettier --check "src/**/*.ts"
❌ Code style issues found in 5 files

# Skill auto-fixes:
> npm run format
✓ Formatted 5 files

# Retries commit:
✓ Commit successful
```

### Commitlint Failure

```bash
# Hook fails:
✖ subject must be sentence-case
   Input: "feat(skills): add commit skill"

# Skill auto-fixes:
   Fixed: "feat(skills): Add commit skill"

# Retries commit:
✓ Commit successful
```

### TypeScript Error

```bash
# Hook fails:
> tsc --noEmit
❌ src/handlers/handleGetClass.ts:45:12 - error TS2345

# Skill reports:
⚠️ TypeScript errors must be fixed manually
   Please fix errors and run /commit again
```

## Smart Features

| Feature | Description |
|---------|-------------|
| **Change Analysis** | Understands what files changed and why |
| **Message Generation** | Creates descriptive conventional commits |
| **Auto-Formatting** | Runs Prettier before committing |
| **Pattern Learning** | Follows recent commit message style |
| **Multi-File Handling** | Summarizes complex changesets |
| **Issue Linking** | Adds issue references when applicable |
| **Hook Management** | Handles pre-commit and commit-msg hooks |
| **Error Recovery** | Auto-fixes formatting and retries |
| **Validation** | Prevents invalid commits |

## Commit Message Templates

### New Feature

```
feat(scope): Add feature-name

Implement detailed-description. This feature allows users to
benefit-or-capability.

Key changes:
- Added component X
- Updated configuration Y
- Integrated with service Z

Usage: /prr 123
```

### Bug Fix

```
fix(scope): Handle edge-case-description

Fix issue where problem-description. The bug occurred when
specific-conditions-were-met.

Root cause: Root cause explanation
Solution: How it was fixed

Fixes #123
```

### Refactoring

```
refactor(scope): Reorganize component-name

Restructure component to improve maintainability and
performance. No functional changes.

Changes:
- Extract common logic to utilities
- Simplify error handling
- Improve type safety
```

### Documentation

```
docs: Update document-name

Add documentation for feature-or-topic covering:
- Installation steps
- Configuration options
- Usage examples
- Troubleshooting guide
```

### Tests

```
test(scope): Add tests for component-name

Implement comprehensive unit tests for feature. Tests cover:
- Happy path scenarios
- Error conditions
- Edge cases

Coverage increased from 75% to 92%.
```

## Validation Checklist

Before committing, the skill verifies:
- ✅ Code formatted with Prettier
- ✅ TypeScript compiles without errors
- ✅ Commit message follows conventional format
- ✅ Subject starts with capital letter
- ✅ Subject ≤72 characters
- ✅ No `.env` files in changeset
- ✅ Issue references included (if applicable)

## Common Scenarios

### Scenario 1: Quick Fix

```bash
# Made a quick bug fix
/commit fix
# ✓ Auto-generates: "fix(handlers): Handle null values"
```

### Scenario 2: New Feature

```bash
# Added new feature with multiple files
/commit feat
# ✓ Analyzes all changes, generates comprehensive message
```

### Scenario 3: Documentation Update

```bash
# Updated README
/commit "docs: Add troubleshooting section"
# ✓ Uses provided message, validates format
```

### Scenario 4: Formatting Only

```bash
# Ran Prettier on codebase
/commit "style: Apply Prettier formatting"
# ✓ Commits formatting changes
```

### Scenario 5: Multiple Unrelated Changes

```bash
# Fixed bug AND updated docs
/commit
# ✓ Generates message mentioning both changes
# Or better: Split into separate commits
```

## Best Practices

1. **Commit frequently** - Small, focused commits are better
2. **One logical change** - Don't mix features and fixes
3. **Review before commit** - Check `git diff` output
4. **Write descriptive bodies** - Explain "why" not just "what"
5. **Reference issues** - Link commits to issue tracker
6. **Use consistent scopes** - Follow project conventions
7. **Keep subjects short** - Details go in body
8. **Test before commit** - Ensure code works

## Troubleshooting

### Commit Message Rejected

```bash
✖ subject must be sentence-case
```
**Solution:** Subject must start with capital letter
- ❌ `feat(skills): add commit skill`
- ✅ `feat(skills): Add commit skill`

### Prettier Errors

```bash
❌ Code style issues found in 5 files
```
**Solution:** The skill auto-runs `npm run format` and retries

### TypeScript Errors

```bash
❌ error TS2345: Type 'string' not assignable to 'number'
```
**Solution:** Fix type errors manually, then retry `/commit`

### Hook Failure

```bash
husky - pre-commit script failed (code 1)
```
**Solution:** Check the error output, fix the issue, retry

## Integration

The `/commit` skill integrates with:
- **Husky** - Git hooks manager
- **Commitlint** - Commit message validator
- **Prettier** - Code formatter
- **TypeScript** - Type checker
- **Git** - Version control

## Related Commands

- `/commit` - This skill
- `/prr` - PR review skill
- `npm run format` - Format code
- `npm run typecheck` - Check types
- `git status` - Check status
- `git diff` - View changes
- `git log` - View history

---

**Created**: March 11, 2026
**Status**: ✅ Ready for use
