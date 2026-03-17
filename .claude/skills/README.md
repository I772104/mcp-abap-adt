# Claude Code Skills

This directory contains custom Claude Code skills for the mcp-abap-adt project.

## Available Skills

### 🛡️ /security-review (v1.0.0)

**Status**: ✅ Implemented
**Alias**: `/sec`
**Purpose**: Automated security scanning for credentials, vulnerabilities, and SAP-specific security patterns

**Quick Start**:
```bash
# Scan current changes
/security-review

# Scan specific PR
/security-review --pr 68

# Quick scan (critical only)
/security-review --quick

# Full audit (includes npm audit)
/security-review --full
```

**Security Checks**:
- 🔴 Credential scanning (hardcoded passwords, API keys, tokens)
- 🔴 Input validation audit (missing validation, injection risks)
- 🟡 SAP-specific security (authorization docs, system validation)
- 🟡 Authentication & authorization patterns
- 🟠 Data protection (HTTPS enforcement, sensitive data in logs)
- 🟠 Dependency security (npm audit in full mode)

**Documentation**: [Quick Reference](security-review/README.md) | [Implementation](security-review/IMPLEMENTATION.md)

---

### 💬 /commit (v1.0.0)

**Status**: ✅ Implemented
**Purpose**: Create well-formatted git commits following conventional commit format with automatic pre-commit checks

**Quick Start**:
```bash
# Auto-generate commit message
/commit

# Specify type
/commit feat

# Provide full message
/commit "feat(skills): Add security review skill"
```

**Features**:
- Auto-generates conventional commit messages
- Runs Prettier formatting
- Validates TypeScript types
- Checks commitlint rules
- Auto-recovers from hook failures

**Documentation**: [Skill Definition](commit/SKILL.md)

---

### 📝 /prr (v1.0.0)

**Status**: ✅ Implemented
**Purpose**: Automated pull request review and posting review comments

**Quick Start**:
```bash
# Review current branch vs main
/prr

# Review specific PR
/prr --pr 68

# Review and post comments
/prr --post
```

**Features**:
- Comprehensive code quality review
- TypeScript type safety checking
- Test coverage analysis
- Security scanning (basic)
- Handler structure validation
- Automatic review comment posting

**Documentation**: [Skill Definition](prr/SKILL.md)

---

## Skill vs Agent

**Skills** are user-invoked slash commands that perform direct actions:
- Invoked with `/skill-name` syntax
- Execute autonomously without further prompting
- Have YAML frontmatter in SKILL.md
- Can run in isolated fork context
- Examples: `/commit`, `/security-review`, `/prr`

**Agents** are conversational tools invoked via natural language:
- Invoked with "Use the X agent to..." prompts
- Provide analysis and recommendations
- Defined in `.claude/agents/*.md` (no YAML frontmatter)
- Examples: risk-reviewer, security-auditor, pr-reviewer

See [Agents README](../agents/README.md) for agent documentation.

## Usage Patterns

### Development Workflow

**Standard workflow**:
```bash
# 1. Make code changes
vim src/handlers/handleGetClass.ts

# 2. Security check
/security-review

# 3. Commit changes
/commit

# 4. Review before PR
/prr

# 5. Create PR
gh pr create
```

**Quick workflow** (trusted changes):
```bash
# 1. Make changes
vim src/handlers/handleGetClass.ts

# 2. Quick security + commit
/security-review --quick
/commit
```

**Comprehensive workflow** (major changes):
```bash
# 1. Make changes
vim src/handlers/handleCreateTransport.ts

# 2. Full security audit
/security-review --full

# 3. Fix issues and commit
/commit

# 4. Deep risk assessment
npm run review:risks -- --current

# 5. PR review
/prr --post
```

### Pre-Commit Checks

Recommended pre-commit flow:
```bash
/security-review --quick  # Fast security scan
/commit                   # Auto-format and commit
```

### Pre-PR Checks

Recommended before creating PR:
```bash
/security-review --full   # Comprehensive security audit
/prr                      # Code quality review
gh pr create              # Create PR
```

### Security-Focused Development

For security-sensitive changes (auth, transport, credentials):
```bash
# 1. Make changes
# 2. File-specific audit
/security-review --file src/handlers/handleReleaseTransport.ts

# 3. Full security scan
/security-review --full

# 4. Operational risk assessment
npm run review:risks -- --current

# 5. Deep security audit (if needed)
claude "Use the security-auditor agent to perform full security audit"

# 6. Commit and review
/commit
/prr
```

## Integration with Agents

Skills and agents work together:

**Security Stack**:
- `/security-review` → Quick automated scanning
- `security-auditor agent` → Deep vulnerability analysis
- `risk-reviewer agent` → Operational and business risk assessment

**Code Quality Stack**:
- `/prr` → Automated PR review
- `pr-reviewer agent` → Comprehensive code analysis with recommendations

**Commit Stack**:
- `/commit` → Automated conventional commits
- `commit-msg hook` → Commitlint validation

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security and Quality Checks

on: [push, pull_request]

jobs:
  security-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm ci

      - name: Security Review
        run: |
          # Exit codes: 0=pass, 1=critical, 2=high, 3=medium
          claude "/security-review --full" || exit $?

      - name: PR Review
        if: github.event_name == 'pull_request'
        run: |
          claude "/prr --pr ${{ github.event.pull_request.number }}"
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash

# Quick security check before commit
echo "Running security review..."
claude "/security-review --quick"
if [ $? -eq 1 ]; then
  echo "❌ Critical security issues found. Commit blocked."
  exit 1
fi

echo "✅ Security review passed"
```

## Creating New Skills

### 1. Create Skill Directory
```bash
mkdir .claude/skills/your-skill-name
```

### 2. Create SKILL.md

```markdown
---
name: your-skill-name
description: Brief description
argument-hint: [optional-args]
disable-model-invocation: false
allowed-tools: Bash, Read, Grep, Glob
context: fork
agent: general-purpose
---

# Your Skill Name

Detailed instructions for Claude on how to execute this skill...

## Workflow

### Step 1: ...
### Step 2: ...
```

### 3. Create README.md (optional)

User-facing documentation explaining:
- What the skill does
- How to use it
- Examples
- Troubleshooting

### 4. Test the Skill

```bash
/your-skill-name
```

### 5. Document in Skills README

Add entry to this README with:
- Name and version
- Status (implemented/planned)
- Purpose
- Quick start
- Documentation links

## Skill Development Guidelines

### Naming Conventions
- Use kebab-case: `/security-review`, not `/securityReview`
- Keep names short: `/prr` not `/pull-request-review`
- Use aliases for long names: `/sec` → `/security-review`

### Frontmatter Configuration

**Required fields**:
- `name`: Skill name (matches directory and invocation)
- `description`: Brief one-line description

**Common fields**:
- `argument-hint`: Shown in autocomplete (e.g., `[--pr <number>]`)
- `disable-model-invocation`: `false` for full capabilities
- `allowed-tools`: Tools the skill can use
- `context`: `fork` for isolated execution
- `agent`: `general-purpose` or specialized agent

### Workflow Structure

Good skills have clear step-by-step workflows:
1. **Parse arguments** - Determine mode/flags
2. **Validate context** - Check prerequisites
3. **Execute main logic** - Perform the task
4. **Generate output** - Provide structured results
5. **Suggest next steps** - Guide the user

### Output Formatting

Use structured markdown output:
- Clear headers with emoji
- Severity levels with emoji (🔴 🟡 🟠 🟢)
- Code blocks for examples
- Specific file:line references
- Actionable recommendations

### Error Handling

Skills should gracefully handle errors:
- Invalid arguments → Show usage help
- Missing prerequisites → Explain what's needed
- Tool failures → Provide workarounds
- Unexpected state → Recover or fail cleanly

## Troubleshooting

### Skill Not Found

```bash
# Check skill file exists
ls .claude/skills/your-skill-name/SKILL.md

# Verify YAML frontmatter is valid
head -10 .claude/skills/your-skill-name/SKILL.md
```

### Skill Fails to Execute

1. Check `allowed-tools` - Does skill have necessary tools?
2. Check `context` - Should it run in fork or main context?
3. Check arguments - Are they parsed correctly?
4. Review error message - What failed?

### Skill Produces Incorrect Results

1. Test with simple case first
2. Verify workflow steps execute in order
3. Check tool outputs for errors
4. Review logic for edge cases

## Performance Tips

1. **Use parallel tool calls** when operations are independent
2. **Skip expensive operations** in quick mode
3. **Cache results** when running multiple checks
4. **Filter early** to reduce data processing
5. **Optimize patterns** to reduce false positives

## Related Documentation

- **Agents**: [.claude/agents/README.md](../agents/README.md)
- **Project Standards**: [docs/ABAP_Standards.md](../../docs/ABAP_Standards.md)
- **Contributing**: [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **Claude Code Docs**: [Official Documentation](https://docs.anthropic.com/claude/docs)

## Version History

- **v1.0.0** (2026-03-16): Initial skills implementation
  - security-review skill (v1.0.0)
  - commit skill (v1.0.0)
  - prr skill (v1.0.0)
  - Skills infrastructure and documentation

## License

These skills are part of the mcp-abap-adt project and follow the same MIT license.
