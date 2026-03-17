# Security Review Skill - Quick Reference

Fast, automated security scanning for credentials, vulnerabilities, and SAP-specific security patterns.

## Quick Start

```bash
# Scan current changes (default)
/security-review

# Scan specific PR
/security-review --pr 68

# Audit single file
/security-review --file src/handlers/handleCreateTransport.ts

# Quick scan (critical only, <30s)
/security-review --quick

# Full audit (includes npm audit, ~2-3min)
/security-review --full

# Shorthand alias
/sec
```

## What It Checks

### 1. **Credential Scanning** 🔴 Critical
- Hardcoded passwords, API keys, tokens
- AWS keys, SAP credentials, OAuth tokens
- Private keys, certificates
- `.env` files in commits
- Database connection strings

**Example findings:**
```typescript
// ❌ Bad: Hardcoded credential
const password = "admin123";

// ✅ Good: Environment variable
const password = process.env.SAP_PASSWORD;
```

### 2. **Input Validation** 🔴 Critical
- Missing parameter validation
- Unencoded URI parameters
- Command injection risks
- Path traversal vulnerabilities
- SQL/XML injection risks

**Example findings:**
```typescript
// ❌ Bad: No validation
const className = args.class_name;
const url = `/classes/${className}`;

// ✅ Good: Validated and encoded
if (!args?.class_name) {
  throw new McpError(ErrorCode.InvalidParams, 'class_name is required');
}
const encoded = encodeURIComponent(args.class_name);
```

### 3. **SAP-Specific Security** 🟡 High Priority
- SAP authorization object documentation
- System ID validation
- Transport security safeguards
- CSRF token handling
- Cookie security

**Example findings:**
```typescript
// ❌ Bad: No authorization documentation
export async function handleReleaseTransport(args: any) {

// ✅ Good: Documented authorization requirement
/**
 * Release transport request
 * @requires SAP Authorization: S_TRANSPRT with activity 43 (Release)
 */
export async function handleReleaseTransport(args: ReleaseTransportArgs) {
```

### 4. **Authentication & Authorization** 🟡 High Priority
- Credential storage patterns
- Session management
- Authentication flow validation
- Multi-system credential isolation

### 5. **Data Protection** 🟠 Medium Priority
- HTTPS enforcement
- Sensitive data in logs
- Credential exposure in error messages
- File permissions

### 6. **Dependency Security** 🟠 Medium Priority (Full Mode)
- Known vulnerabilities (npm audit)
- Outdated packages with security patches
- Package lock integrity

## Output Modes

### Quick Mode (Default)
Fast pass/fail report with critical issues only:

```markdown
# 🔒 Security Review - Quick Scan

**Status**: ❌ FAILED (2 critical issues found)

## Critical Issues

🔴 **Hardcoded Credential Detected**
- **File**: `src/handlers/handleCreateTransport.ts:45`
- **Fix**: Use environment variable: `process.env.SAP_PASSWORD`

## Summary
- ❌ Credentials: 1 issue found
- ✅ Input Validation: Passed
- ❌ SAP Security: 1 issue found

**Recommendation**: Fix critical issues before committing.
```

### Full Mode
Comprehensive audit report with all categories:

```markdown
# 🔒 Security Audit Report

**Overall Status**: ⚠️ NEEDS ATTENTION
- 🔴 Critical: 1 issue
- 🟡 High: 2 issues
- 🟠 Medium: 3 issues

## 1. Credential Scanning
[Detailed findings with code examples and fixes]

## 2. Input Validation Audit
[Detailed findings with code examples and fixes]

## Security Checklist
- [ ] Fix critical credential issue
- [ ] Add input validation for transport_number
- [ ] Document SAP authorization requirements
```

## Severity Levels

- 🔴 **Critical**: Credential exposure, command injection → Block commit/PR
- 🟡 **High**: Missing validation, auth issues → Fix before PR merge
- 🟠 **Medium**: Dependency vulnerabilities, config issues → Should fix
- 🟢 **Low**: Documentation gaps, style issues → Optional

## Use Cases

### Pre-Commit Security Check
```bash
# Make changes to code
vim src/handlers/handleCreateTransport.ts

# Quick security check before committing
/security-review

# If passed, commit
/commit
```

### Pre-PR Security Validation
```bash
# Before creating PR
/security-review --full

# Fix any issues
# Re-run quick check
/security-review --quick

# Create PR
/prr
```

### File-Specific Audit
```bash
# Deep audit of specific handler
/security-review --file src/handlers/handleReleaseTransport.ts

# Review findings and fix
```

### CI/CD Integration
```bash
# In GitHub Actions workflow
- name: Security Review
  run: |
    # Note: Exit codes for automation
    # 0 = passed, 1 = critical, 2 = high, 3 = medium/low
    claude "/security-review --full"
```

## Common Issues and Fixes

### Issue 1: Hardcoded Credentials

**Finding:**
```typescript
const auth = { username: 'admin', password: 'admin123' };
```

**Fix:**
```typescript
const auth = {
  username: process.env.SAP_USERNAME,
  password: process.env.SAP_PASSWORD
};
```

**Add to `.env`:**
```env
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
```

### Issue 2: Missing Parameter Validation

**Finding:**
```typescript
export async function handleGetClass(args: any) {
  const className = args.class_name;
  // ... use className directly
}
```

**Fix:**
```typescript
export async function handleGetClass(args: GetClassArgs) {
  if (!args?.class_name) {
    throw new McpError(ErrorCode.InvalidParams, 'class_name is required');
  }
  const className = args.class_name;
  // ... use className
}
```

### Issue 3: Missing URL Encoding

**Finding:**
```typescript
const url = `/sap/bc/adt/oo/classes/${args.class_name}`;
```

**Fix:**
```typescript
const encoded = encodeURIComponent(args.class_name);
const url = `/sap/bc/adt/oo/classes/${encoded}`;
```

### Issue 4: Missing SAP Authorization Documentation

**Finding:**
```typescript
export async function handleReleaseTransport(args: ReleaseTransportArgs) {
  // No documentation
}
```

**Fix:**
```typescript
/**
 * Release transport request
 * @requires SAP Authorization: S_TRANSPRT with activity 43 (Release)
 */
export async function handleReleaseTransport(args: ReleaseTransportArgs) {
  // Implementation
}
```

## SAP Authorization Objects Reference

Common authorization objects to document:

- **S_TRANSPRT**: Transport operations
  - Activity 02: Change
  - Activity 43: Release

- **S_DEVELOP**: Development objects
  - Activity 01: Create
  - Activity 02: Change
  - Activity 06: Delete

- **S_RFC**: Remote function calls

- **S_TABU_DIS**: Table display/maintenance

## False Positives

The skill **ignores** these patterns (not flagged as issues):

✅ **Environment variables**: `process.env.PASSWORD`
✅ **TypeScript types**: `password: string;`
✅ **Comments**: `// password = "example"`
✅ **Test files**: `*.test.ts`, `*.spec.ts` with dummy data
✅ **Documentation**: `README.md` explaining security

## Integration with Other Tools

### With Existing Agents

For deeper security analysis:
```bash
# Comprehensive vulnerability assessment
claude "Use the security-auditor agent to perform a full security audit"

# Operational and business risk assessment
npm run review:risks -- --current
```

### With Other Skills

```bash
# Security check → Commit workflow
/security-review
/commit

# Security check → PR workflow
/security-review --full
/prr
```

## Performance

- **Quick Mode**: < 30 seconds (critical checks only)
- **Default Mode**: 30-60 seconds (all checks except dependencies)
- **Full Mode**: 2-3 minutes (includes npm audit)

## Troubleshooting

### Skill Not Found
```bash
# Ensure you're in the project directory
cd /path/to/mcp-abap-adt

# Verify skill file exists
ls .claude/skills/security-review/SKILL.md
```

### No Issues Found But Expecting Some
```bash
# Check if scanning correct scope
/security-review --file src/handlers/yourFile.ts

# Try full mode for comprehensive scan
/security-review --full
```

### False Positive Reported
Check if the pattern matches false positive filters:
- Is it in a test file? (should be ignored)
- Is it a comment? (should be ignored)
- Is it using environment variable? (should be ignored)

If legitimate false positive, report as issue for filter improvement.

### Scan Taking Too Long
```bash
# Use quick mode for faster results
/security-review --quick

# Or scan specific file only
/security-review --file path/to/file.ts
```

## Exit Codes (for CI/CD)

When used in automation, the skill returns:
- `0`: All checks passed
- `1`: Critical issues found
- `2`: High priority issues found
- `3`: Medium/Low issues only

## Best Practices

1. **Run before every commit**
   ```bash
   /security-review
   ```

2. **Run full audit before PR**
   ```bash
   /security-review --full
   ```

3. **Fix critical issues immediately**
   - Don't commit with hardcoded credentials
   - Don't skip validation fixes

4. **Document SAP authorizations**
   - Add JSDoc comments for all SAP operations
   - Reference specific authorization objects

5. **Use environment variables**
   - Never hardcode credentials
   - Always use `process.env.*`

6. **Validate all user input**
   - Check for null/undefined
   - Apply URL encoding
   - Sanitize before shell execution

7. **Re-run after fixes**
   ```bash
   # Fix issues
   /security-review --quick  # Verify fixes
   ```

## Related Documentation

- **Security Auditor Agent**: `.claude/agents/security-auditor.md` (if exists)
- **Risk Reviewer Agent**: `.claude/agents/risk-reviewer.md`
- **PR Reviewer Skill**: `.claude/skills/prr/README.md`
- **Commit Skill**: `.claude/skills/commit/README.md`

## Support

For issues or improvements:
1. Check existing issues: `gh issue list --label security`
2. Report new issue: `gh issue create --label security`
3. Contribute: Submit PR with improved security checks

## Version

**Version**: 1.0.0
**Last Updated**: 2026-03-16
