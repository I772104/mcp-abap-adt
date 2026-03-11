---
name: commit
description: Create a git commit following conventional commit format with automatic formatting, validation, and hooks
argument-hint: [message-or-type]
disable-model-invocation: false
allowed-tools: Bash, Read, Grep, Glob
---

# Smart Commit Command

Create a well-formatted git commit following project standards with automatic pre-commit checks.

## Workflow

### Step 1: Check Current State

```bash
# Check git status
git status

# Get current branch
git branch --show-current

# Check recent commits for message pattern
git log --oneline -5 --pretty=format:"%s"
```

### Step 2: Auto-Format Code (if needed)

If there are TypeScript changes, run Prettier:

```bash
npm run format
```

### Step 3: Analyze Changes

```bash
# Get diff summary
git diff --stat

# Get list of changed files
git diff --name-only

# Get list of staged files
git diff --cached --name-only

# Show actual changes
git diff
```

### Step 4: Generate Commit Message

Based on the argument `$ARGUMENTS` and the changes:

**If argument is empty or just a type:**
- Analyze the changes and generate a descriptive commit message
- Follow conventional commit format

**If argument is a full message:**
- Use it as-is but validate format

**Conventional Commit Format:**
```
<type>(<scope>): <Subject starting with capital letter>

<Body - optional detailed description>

<Footer - optional issue references>
```

**Valid Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `test` - Adding or updating tests
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `chore` - Maintenance tasks
- `ci` - CI/CD changes
- `style` - Code style changes (formatting, no logic change)
- `build` - Build system changes

**Rules:**
1. Subject must start with a capital letter (sentence-case)
2. Subject max 72 characters
3. Use imperative mood: "Add" not "Added" or "Adds"
4. No period at end of subject
5. Body wraps at 72 characters
6. Reference issues: "Closes #123" or "Fixes #456"

**Scope Examples for this project:**
- `handlers` - Handler functions
- `agents` - Claude Code agents
- `skills` - Claude Code skills
- `auth` - Authentication
- `tests` - Test files
- `docs` - Documentation
- `infra` - Infrastructure
- `config` - Configuration files

### Step 5: Stage Files

```bash
# Stage all changes
git add .

# Or stage specific files if needed
git add <files>
```

### Step 6: Commit with Hooks

The project has pre-commit hooks that will run:
1. **.env file check** - Prevents committing environment files
2. **Prettier format check** - Validates code formatting
3. **TypeScript type check** - Validates types compile

And commit-msg hook:
1. **Commitlint** - Validates conventional commit format

```bash
git commit -m "$(cat <<'EOF'
<your-commit-message-here>
EOF
)"
```

### Step 7: Handle Hook Failures

**If pre-commit fails:**

**Prettier format check failed:**
```bash
npm run format
git add .
# Retry commit
```

**TypeScript type check failed:**
- Fix type errors in the code
- Re-stage files
- Retry commit

**Commit-msg validation failed:**
- Subject must be sentence-case (start with capital letter)
- Must follow `type(scope): Subject` format
- Adjust message and retry

## Argument Handling

**No argument - Analyze and generate:**
```
/commit
```
→ Analyze changes, generate appropriate commit message

**Type only - Generate with type:**
```
/commit feat
/commit fix
/commit docs
```
→ Generate commit message with specified type

**Full message:**
```
/commit "feat(skills): Add commit skill"
```
→ Use provided message (validate format)

## Examples

### Example 1: Auto-generate from changes

**Input:** `/commit`

**Process:**
1. Analyze: Added new file `.claude/skills/commit/SKILL.md`
2. Generate: `feat(skills): Add smart commit command`
3. Create body describing the feature
4. Commit

### Example 2: Specify type

**Input:** `/commit fix`

**Process:**
1. Analyze: Modified `src/handlers/handleGetClass.ts`
2. Generate: `fix(handlers): Handle special characters in class names`
3. Create body explaining the fix
4. Commit

### Example 3: Full message provided

**Input:** `/commit "docs: Update README with new examples"`

**Process:**
1. Validate format ✓
2. Stage files
3. Commit with provided message

### Example 4: Multiple file changes

**Input:** `/commit feat`

**Process:**
1. Analyze:
   - Added `.claude/skills/prr/`
   - Modified `.gitignore`
   - Modified `src/` (formatting)
2. Generate comprehensive message:
   ```
   feat(skills): Add /prr command for automated PR reviews

   Add new /prr skill that performs comprehensive pull request reviews
   and automatically posts review comments.

   Also updates .gitignore to include skills directory.
   Includes Prettier formatting fixes.
   ```

## Auto-Recovery from Hook Failures

### Prettier Formatting Failure

```bash
# Hook failed? Auto-fix:
npm run format
git add .
# Retry commit with same message
```

### Commitlint Failure (subject-case)

```bash
# If message was: "feat(skills): add commit skill"
# Auto-fix to: "feat(skills): Add commit skill"
# (Capitalize first letter of subject)
```

## Smart Features

1. **Auto-format before commit** - Runs Prettier if TS files changed
2. **Generate descriptive messages** - Analyzes changes intelligently
3. **Handle multi-file commits** - Summarizes all changes
4. **Validate before commit** - Prevents hook failures
5. **Auto-recover from failures** - Fixes formatting and retries
6. **Follow project patterns** - Learns from recent commits

## Commit Message Templates

### New Feature
```
feat(<scope>): Add <feature-name>

Implement <detailed-description>. This feature allows users to
<benefit-or-capability>.

Key changes:
- <change-1>
- <change-2>
- <change-3>
```

### Bug Fix
```
fix(<scope>): Handle <issue-description>

Fix issue where <problem-description>. The bug occurred when
<reproduction-steps>.

Solution: <how-it-was-fixed>
```

### Refactoring
```
refactor(<scope>): Reorganize <what-was-refactored>

Restructure <component> to improve <benefit>. No functional
changes, only organizational improvements.
```

### Documentation
```
docs: Update <document-name>

Add documentation for <feature-or-topic>. Includes:
- <section-1>
- <section-2>
- Examples and usage instructions
```

### Tests
```
test(<scope>): Add tests for <component>

Implement unit tests for <feature>. Coverage increased from
X% to Y%.
```

### Chore/Maintenance
```
chore: <maintenance-task>

<Description of maintenance work>. Updates dependencies,
configuration, or build setup.
```

## Important Notes

1. **Always run format first** if TypeScript files changed
2. **Check git status** before committing to see what will be committed
3. **Review changes** with `git diff` to ensure correctness
4. **Follow project patterns** by checking recent commit messages
5. **Be descriptive** but concise in commit bodies
6. **Reference issues** when fixing bugs or closing tickets
7. **Don't commit** `.env` files or credentials
8. **Use imperative mood** in subject line

## Validation Checklist

Before committing, verify:
- [ ] Code formatted with Prettier
- [ ] TypeScript compiles without errors
- [ ] Commit message follows conventional format
- [ ] Subject starts with capital letter
- [ ] Subject is ≤72 characters
- [ ] No .env files in changeset
- [ ] Changes reviewed with `git diff`
- [ ] Issue references included if applicable

## Your Execution Flow

1. **Check status** - `git status`, `git branch`, recent commits
2. **Analyze changes** - `git diff`, understand what changed
3. **Auto-format** - Run `npm run format` if TS files changed
4. **Stage files** - `git add .` or specific files
5. **Generate message** - Create conventional commit message
6. **Commit** - Execute commit with proper heredoc format
7. **Handle failures** - Auto-fix formatting/message and retry
8. **Confirm** - Show commit SHA and summary

Start by checking the current git status and analyzing what needs to be committed.
