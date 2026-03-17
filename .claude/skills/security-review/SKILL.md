---
name: security-review
description: Automated security scanning for credentials, vulnerabilities, and SAP-specific security patterns
argument-hint: [--pr <number> | --file <path> | --quick | --full]
disable-model-invocation: false
allowed-tools: Bash, Read, Grep, Glob
context: fork
agent: general-purpose
---

# Security Review Skill

Perform automated security scanning for credentials, vulnerabilities, input validation gaps, and SAP-specific security patterns.

## Invocation Modes

**Default** (no arguments): Scan current uncommitted changes
```
/security-review
```

**PR Mode**: Scan specific pull request
```
/security-review --pr 68
```

**File Mode**: Audit specific file
```
/security-review --file src/handlers/handleCreateTransport.ts
```

**Quick Mode**: Fast critical-issues-only scan (<30 seconds)
```
/security-review --quick
```

**Full Mode**: Comprehensive audit with dependency check (~2-3 minutes)
```
/security-review --full
```

**Alias**: Use `/sec` as shorthand for `/security-review`

## Your Responsibilities

As the security review skill, you must:

1. **Scan for credential exposure** - Detect hardcoded passwords, API keys, tokens, secrets
2. **Audit input validation** - Check for missing parameter validation, injection risks
3. **Check SAP-specific security** - Verify authorization documentation, system validation
4. **Review authentication patterns** - Ensure proper credential storage and session handling
5. **Validate data protection** - Confirm HTTPS usage, no sensitive data in logs
6. **Audit dependencies** (full mode) - Run npm audit for known vulnerabilities
7. **Generate structured reports** - Provide pass/fail status with actionable recommendations
8. **Assign severity levels** - Rate issues as Critical/High/Medium/Low

## Workflow

### Step 1: Parse Arguments and Determine Scope

Parse `$ARGUMENTS` to determine scan mode:
- No arguments → Default mode (scan uncommitted changes)
- `--pr <number>` → PR mode (scan specific pull request)
- `--file <path>` → File mode (audit single file)
- `--quick` → Quick scan flag (skip dependency audit, focus on critical)
- `--full` → Full scan flag (include dependency audit)

**Initialize scan context:**

```bash
# Get current branch and status
git branch --show-current
git status --short

# For default mode: List uncommitted changes
git diff --name-only HEAD

# For PR mode: Get PR files
gh pr view $PR_NUMBER --json files --jq '.files[].path'

# For file mode: Validate file exists
test -f "$FILE_PATH" && echo "File exists" || echo "File not found"
```

**Determine target files:**
- Default: Files in `git diff --name-only HEAD`
- PR mode: Files from `gh pr view`
- File mode: Single specified file
- Filter: Focus on `src/` directory, especially `src/handlers/`

### Step 2: Credential Scanning (Always Run - Critical Priority)

Search for hardcoded credentials using pattern matching:

```bash
# Search for credential patterns in target files
# Pattern: password/api_key/token/secret = "value"

# For default/PR mode:
git diff HEAD | grep -iE '(\+.*)(password|api_key|token|secret|api.key|apikey)\s*[=:]\s*["\x27][^"\x27]+'

# For file mode:
grep -nE '(password|api_key|token|secret|api.key|apikey)\s*[=:]\s*["\x27][^"\x27]+' "$FILE_PATH"

# Check for .env files in commits
git diff --cached --name-only | grep -E '\.env$'

# Check for AWS keys
grep -rn 'AKIA[0-9A-Z]{16}' src/

# Check for private keys
grep -rn 'BEGIN.*PRIVATE KEY' src/
```

**Detect credentials but reduce false positives:**
- ✅ Flag: `password = "admin123"` (hardcoded credential)
- ✅ Flag: `const apiKey = "sk_live_abc123"` (hardcoded API key)
- ❌ Ignore: `password: process.env.PASSWORD` (environment variable - good)
- ❌ Ignore: `password: string;` (TypeScript type declaration)
- ❌ Ignore: `// password = "example"` (comment, not code)
- ❌ Ignore: Files in `test/` or `*.test.ts` with dummy credentials

**Findings to report:**
- File path and line number
- Matched pattern (password/token/key)
- Evidence snippet
- Risk description
- Fix recommendation

### Step 3: Input Validation Audit (Always Run - Critical Priority)

Check handlers for missing parameter validation:

```bash
# Find all handlers in scope
find src/handlers -name "*.ts" -type f

# For each handler, check for parameter validation patterns
```

**For each handler file, check:**

1. **Parameter null/undefined checks**
   ```typescript
   // ✅ Good: Validation present
   if (!args?.class_name) {
     throw new McpError(ErrorCode.InvalidParams, 'class_name is required');
   }

   // ❌ Bad: No validation, direct use
   const className = args.class_name;
   ```

2. **URL encoding applied**
   ```typescript
   // ✅ Good: Encoded before use
   const encoded = encodeURIComponent(args.class_name);

   // ❌ Bad: Used directly in URL
   const url = `/sap/bc/adt/oo/classes/${args.class_name}`;
   ```

3. **Command injection risks**
   ```typescript
   // 🔴 Critical: User input in shell command
   execSync(`rm -rf ${args.path}`);

   // ✅ Good: Validated and sanitized
   if (!/^[a-zA-Z0-9_-]+$/.test(args.path)) throw new Error('Invalid path');
   ```

4. **Path traversal protection**
   ```typescript
   // ❌ Bad: No protection
   fs.readFileSync(args.filename);

   // ✅ Good: Validated
   if (args.filename.includes('..')) throw new Error('Path traversal detected');
   ```

**Read handlers and analyze:**

```bash
# For each handler, use Read tool to check validation patterns
# Look for:
# - Missing parameter validation (args.X used without checking)
# - No URL encoding (direct string interpolation in URLs)
# - execSync/exec with user input
# - Path operations without traversal checks
```

**Report findings:**
- Handler file and line
- Missing validation type (null check, encoding, sanitization)
- Risk level (Critical for command injection, High for missing validation)
- Specific fix with code example

### Step 4: SAP-Specific Security (High Priority)

Check for SAP authorization documentation and system validation:

```bash
# Check for authorization documentation
grep -rn "@requires.*Authorization" src/handlers/

# Find transport operations
grep -rn "transport\|Transport" src/handlers/*.ts

# Check for system validation
grep -rn "SystemRegistry\|getActiveSystem" src/handlers/
```

**SAP Security Checks:**

1. **Authorization object documentation**
   ```typescript
   // ✅ Good: Documented
   /**
    * Release transport request
    * @requires SAP Authorization: S_TRANSPRT with activity 43 (Release)
    */

   // ❌ Bad: No documentation
   export async function handleReleaseTransport(args: any) {
   ```

2. **System validation before operations**
   ```typescript
   // ✅ Good: System whitelist check
   const systemId = SystemRegistry.getInstance().getActiveSystemId();
   if (!config.allowedSystems.includes(systemId)) {
     throw new McpError(ErrorCode.Forbidden, 'System not whitelisted');
   }

   // ❌ Bad: No system check before destructive operation
   await releaseTransport(transportNumber); // Could be PRD!
   ```

3. **Transport security patterns**
   - Check handlers: `handleCreateTransport`, `handleReleaseTransport`, `handleAddToTransport`
   - Verify: System validation, authorization docs, confirmation prompts

**Required Authorization Objects:**
- `S_TRANSPRT` - Transport operations (activity 43 = Release)
- `S_DEVELOP` - Development objects
- `S_RFC` - Remote function calls
- `S_TABU_DIS` - Table display/maintenance

**Report findings:**
- Handler name
- Missing authorization documentation
- Missing system validation
- Risk (High: undocumented auth, Medium: no system check)
- Fix with JSDoc example

### Step 5: Authentication & Authorization Patterns (High Priority)

Review credential storage and authentication flows:

```bash
# Check authentication infrastructure
grep -rn "password\|credential\|auth" src/infrastructure/auth/

# Check for session management
grep -rn "session\|timeout\|expir" src/

# Review cookie handling
grep -rn "cookie" src/infrastructure/
```

**Check for:**
1. ✅ Credentials via environment variables (`process.env.SAP_PASSWORD`)
2. ✅ SystemRegistry credential isolation per system
3. ✅ Cookie security flags (HttpOnly, Secure)
4. ❌ Hardcoded credentials (already caught in Step 2)
5. ❌ Session timeouts not configured
6. ❌ Missing authentication error handling

**This is usually PASSED if:**
- Credentials use environment variables
- SystemRegistry properly isolates credentials
- No auth bypass patterns found

### Step 6: Data Protection (Medium Priority)

Check for HTTPS enforcement and sensitive data exposure:

```bash
# Check for HTTP URLs (should be HTTPS only)
grep -rn 'http://' src/ | grep -v 'https://'

# Look for sensitive data in logs
grep -rn 'console\.\(log\|error\|warn\)' src/ | grep -iE '(password|token|secret|key)'

# Check for credential exposure in error messages
grep -rn 'throw.*Error' src/handlers/ | grep -iE '(password|token|credential)'
```

**Data Protection Checks:**
1. ✅ All URLs use HTTPS (no `http://` found)
2. ✅ No passwords/tokens in console.log statements
3. ✅ Error messages don't expose credentials
4. ❌ HTTP URL found (Critical if used for credentials)
5. ❌ Password logged to console (High)

### Step 7: Dependency Security Audit (Full Mode Only)

Run npm audit to check for known vulnerabilities:

```bash
# Run npm audit (only if --full flag present)
npm audit --json

# Check for outdated packages
npm outdated --json
```

**Parse npm audit output:**
- Count vulnerabilities by severity (critical/high/moderate/low)
- Identify affected packages
- Check if fixes available

**Skip this step if:**
- `--quick` flag present
- Default/file mode (not full)

**Report if vulnerabilities found:**
- Vulnerability count by severity
- Affected packages with versions
- Recommended fix: `npm audit fix` or manual update

### Step 8: Generate Security Report

Aggregate all findings and generate structured markdown report.

**Report Structure:**

#### Quick Mode Output (Default, --quick):

```markdown
# 🔒 Security Review - Quick Scan

**Status**: [✅ PASSED | ❌ FAILED | ⚠️ NEEDS ATTENTION]
**Scope**: [Current changes / PR #X / File: path]
**Duration**: Xs

## Critical Issues

[If any critical issues found:]

🔴 **[Issue Title]**
- **File**: `path/to/file.ts:LINE`
- **Pattern**: [Detected pattern]
- **Risk**: [Risk description]
- **Fix**: [Specific fix with code example]

## High Priority Issues

[If any high priority issues found:]

🟡 **[Issue Title]**
- **File**: `path/to/file.ts:LINE`
- **Issue**: [Description]
- **Risk**: [Risk description]
- **Fix**: [Specific fix with code example]

## Summary

- [✅|❌] Credentials: [Passed | X issues found]
- [✅|❌] Input Validation: [Passed | X issues found]
- [✅|❌] SAP Security: [Passed | X issues found]
- [✅|❌] Authentication: [Passed | X issues found]
- [✅|❌] Data Protection: [Passed | X issues found]
- [⏭️|✅] Dependencies: [Skipped (use --full) | Passed | X vulnerabilities]

**Recommendation**: [Fix critical issues before committing | Address high priority items | All checks passed]

---

**Next Steps**: [Action items based on findings]
```

#### Full Mode Output (--full):

```markdown
# 🔒 Security Audit Report

**Scan Date**: [ISO timestamp]
**Scope**: [Current changes / PR #X / File: path]
**Duration**: Xm Xs

## Executive Summary

**Overall Status**: [✅ PASSED | ❌ FAILED | ⚠️ NEEDS ATTENTION]
- 🔴 Critical: X issues
- 🟡 High: X issues
- 🟠 Medium: X issues
- 🟢 Low: X issues

---

## 1. Credential Scanning

**Status**: [✅ PASSED | ❌ FAILED]

[For each finding:]

### [🔴|🟡|🟠] [Severity]: [Issue Title]
- **Location**: `path/to/file.ts:LINE`
- **Pattern**: `[Matched pattern]`
- **Evidence**:
  ```typescript
  [Code snippet showing issue]
  ```
- **Risk**: [Detailed risk description]
- **Fix**:
  ```typescript
  [Corrected code example]
  ```
- **Priority**: [Fix immediately | Before PR merge | Future improvement]

---

## 2. Input Validation Audit

**Status**: [✅ PASSED | ⚠️ NEEDS IMPROVEMENT | ❌ FAILED]

[For each finding:]

### [🟡|🟠] [Severity]: [Issue Title]
- **Location**: `path/to/file.ts:LINE`
- **Issue**: [Description]
- **Risk**: [Risk description]
- **Fix**: [Specific code fix]

---

## 3. SAP-Specific Security

**Status**: [✅ PASSED | ⚠️ NEEDS IMPROVEMENT]

[For each finding:]

### [🟡|🟠] [Severity]: [Issue Title]
- **Location**: `path/to/file.ts`
- **Issue**: [Description]
- **Risk**: [Risk description]
- **Fix**: [Code example]

---

## 4. Authentication & Authorization

**Status**: [✅ PASSED | ⚠️ NEEDS IMPROVEMENT]

- [✅|❌] Credentials stored via environment variables
- [✅|❌] SystemRegistry properly isolates credentials per system
- [✅|❌] Cookie authentication handled securely
- [✅|❌] Session management configured

---

## 5. Data Protection

**Status**: [✅ PASSED | ⚠️ NEEDS ATTENTION]

- [✅|❌] All URLs use HTTPS
- [✅|❌] No sensitive data in error messages
- [✅|❌] No credentials in logs
- [✅|❌] File permissions validated

---

## 6. Dependency Security

**Status**: [✅ PASSED | ⚠️ NEEDS ATTENTION | ❌ VULNERABILITIES FOUND]

[If vulnerabilities found:]

### [🟠|🟢] [Severity]: Dependency Vulnerabilities Found
```
npm audit report

found X [severity] vulnerabilities
  - [package]: [old version] → [new version] ([vulnerability type])
```
- **Fix**: Run `npm audit fix` to update dependencies

---

## Security Checklist

[Generate checklist based on findings:]

- [ ] Fix critical credential issue ([file:line])
- [ ] Add input validation for [parameter]
- [ ] Document SAP authorization requirements
- [ ] Apply URL encoding consistently
- [ ] Update vulnerable dependencies
- [ ] Add system whitelist validation

---

## Recommendations

1. **Immediate Actions** (before commit):
   - [Critical fixes]

2. **Before PR Merge**:
   - [High priority fixes]

3. **Future Improvements**:
   - [Medium/Low priority improvements]

---

**Next Steps**: [Specific action to take]
```

## Severity Assignment Rules

### 🔴 Critical
- Hardcoded credentials (passwords, API keys, tokens)
- Command injection vulnerabilities
- SQL injection risks
- Path traversal without validation
- Credential exposure in version control

**Action**: Block commit/PR until fixed

### 🟡 High
- Missing input validation on user parameters
- Missing authorization documentation
- No system validation before destructive operations
- Session security issues
- Authentication bypass potential

**Action**: Fix before PR merge

### 🟠 Medium
- Missing URL encoding (non-critical paths)
- Dependency vulnerabilities (moderate severity)
- Missing system whitelist checks
- Suboptimal error messages
- Documentation gaps for authorization

**Action**: Should fix, acceptable technical debt if documented

### 🟢 Low
- Code style issues
- Missing debug logs
- Documentation improvements
- Edge case handling for rare scenarios

**Action**: Optional, can defer

## Output Guidelines

1. **Be specific**: Always include file path and line number
2. **Show evidence**: Include code snippets for critical issues
3. **Provide fixes**: Show exact code to fix the issue
4. **Prioritize clearly**: Use severity levels consistently
5. **Be actionable**: Tell user exactly what to do next
6. **No false positives**: Filter out test files, comments, env vars
7. **Balance thoroughness with speed**: Quick mode < 30s, Full mode < 3min

## False Positive Handling

**Ignore these patterns:**
- Environment variables: `process.env.PASSWORD` ✅
- TypeScript types: `password: string;` ✅
- Comments: `// password = "example"` ✅
- Test files: `*.test.ts`, `*.spec.ts` with dummy data ✅
- Documentation: `README.md` explaining security ✅

**Flag these patterns:**
- Hardcoded values: `password = "admin123"` 🔴
- Direct parameter use: `const name = args.name; // no validation` 🟡
- Shell commands: `execSync(userInput)` 🔴

## Integration with Existing Security Tools

At the end of your report, suggest deeper analysis if needed:

```markdown
---

## Deep Analysis Available

For comprehensive security audit including authentication flow analysis
and attack vector assessment, run:

  claude "Use the security-auditor agent to perform a full security audit"

For operational and business risk assessment of security implications, run:

  npm run review:risks -- --current

For general code quality review including security checks, run:

  /prr
```

## Examples

### Example 1: Clean Code (All Passed)

```markdown
# 🔒 Security Review - Quick Scan

**Status**: ✅ PASSED
**Scope**: Current changes (2 files)
**Duration**: 3s

## Summary

- ✅ Credentials: Passed
- ✅ Input Validation: Passed
- ✅ SAP Security: Passed
- ✅ Authentication: Passed
- ✅ Data Protection: Passed
- ⏭️ Dependencies: Skipped (use --full)

**Recommendation**: All checks passed. Code is ready to commit.

---

**Next Steps**: Commit your changes with `/commit`
```

### Example 2: Critical Credential Found

```markdown
# 🔒 Security Review - Quick Scan

**Status**: ❌ FAILED (1 critical issue)
**Scope**: Current changes (1 file)
**Duration**: 2s

## Critical Issues

🔴 **Hardcoded Password Detected**
- **File**: `src/handlers/handleCreateTransport.ts:45`
- **Pattern**: `password="admin123"`
- **Evidence**:
  ```typescript
  const auth = { username: 'admin', password: 'admin123' };
  ```
- **Risk**: Credential exposure in version control. Anyone with repository
  access can see this password. This is a critical security vulnerability.
- **Fix**: Use environment variable:
  ```typescript
  const auth = {
    username: process.env.SAP_USERNAME,
    password: process.env.SAP_PASSWORD
  };
  ```
- **Priority**: Fix immediately before commit

## Summary

- ❌ Credentials: 1 critical issue found
- ✅ Input Validation: Passed
- ✅ SAP Security: Passed
- ✅ Authentication: Passed
- ✅ Data Protection: Passed
- ⏭️ Dependencies: Skipped

**Recommendation**: Fix critical credential issue before committing.

---

**Next Steps**: Remove hardcoded password, use environment variable, re-run `/security-review`
```

### Example 3: Full Mode with Multiple Issues

```markdown
# 🔒 Security Audit Report

**Scan Date**: 2026-03-16T14:30:00Z
**Scope**: Current changes (3 files)
**Duration**: 2m 15s

## Executive Summary

**Overall Status**: ⚠️ NEEDS ATTENTION
- 🔴 Critical: 0 issues
- 🟡 High: 2 issues
- 🟠 Medium: 1 issue
- 🟢 Low: 0 issues

---

## 1. Credential Scanning

**Status**: ✅ PASSED

No hardcoded credentials detected.

---

## 2. Input Validation Audit

**Status**: ⚠️ NEEDS IMPROVEMENT

### 🟡 High: Missing Parameter Validation
- **Location**: `src/handlers/handleAddToTransport.ts:30`
- **Issue**: `transport_number` parameter used without validation
- **Risk**: Malformed input could cause ADT API errors or unexpected behavior.
  Invalid transport numbers may reach the SAP system, causing confusing errors.
- **Fix**: Add validation:
  ```typescript
  if (!args?.transport_number) {
    throw new McpError(ErrorCode.InvalidParams, 'transport_number is required');
  }
  if (!/^[A-Z0-9]{3}K\d{6}$/.test(args.transport_number)) {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid transport number format');
  }
  ```

### 🟠 Medium: URL Encoding Not Applied
- **Location**: `src/handlers/handleGetClass.ts:56`
- **Issue**: Class name passed to URL without encoding
- **Risk**: Special characters in class names could break URL or cause issues.
- **Fix**: Apply encoding:
  ```typescript
  const encoded = encodeURIComponent(args.class_name);
  const url = `/sap/bc/adt/oo/classes/${encoded}`;
  ```

---

## 3. SAP-Specific Security

**Status**: ⚠️ NEEDS IMPROVEMENT

### 🟡 High: Missing Authorization Documentation
- **Location**: `src/handlers/handleReleaseTransport.ts`
- **Issue**: No documentation of required SAP authorization object (S_TRANSPRT)
- **Risk**: Users may attempt operations without proper SAP authorizations,
  leading to cryptic error messages and wasted debugging time.
- **Fix**: Add JSDoc comment:
  ```typescript
  /**
   * Release transport request
   * @requires SAP Authorization: S_TRANSPRT with activity 43 (Release)
   */
  export async function handleReleaseTransport(args: ReleaseTransportArgs) {
  ```

---

## 4. Authentication & Authorization

**Status**: ✅ PASSED

- ✅ Credentials stored via environment variables
- ✅ SystemRegistry properly isolates credentials per system
- ✅ Cookie authentication handled securely

---

## 5. Data Protection

**Status**: ✅ PASSED

- ✅ All URLs use HTTPS
- ✅ No sensitive data in error messages
- ✅ No credentials in logs

---

## 6. Dependency Security

**Status**: ✅ PASSED

No known vulnerabilities found in dependencies.

---

## Security Checklist

- [ ] Add input validation for transport_number (handleAddToTransport.ts:30)
- [ ] Apply URL encoding for class_name (handleGetClass.ts:56)
- [ ] Document SAP authorization S_TRANSPRT (handleReleaseTransport.ts)

---

## Recommendations

1. **Before PR Merge**:
   - Add transport_number validation to prevent malformed input
   - Document SAP authorization requirements for transport operations

2. **Future Improvements**:
   - Apply URL encoding consistently across all handlers
   - Consider adding transport number format validation utility

---

**Next Steps**: Address high priority validation and documentation issues before PR merge.

---

## Deep Analysis Available

For comprehensive security audit including authentication flow analysis
and attack vector assessment, run:

  claude "Use the security-auditor agent to perform a full security audit"
```

## Important Notes

1. **Speed matters**: Quick mode must complete in < 30 seconds
2. **Be accurate**: False positives reduce trust in the tool
3. **Be helpful**: Every finding must have a specific fix
4. **Use severity correctly**: Critical = block, High = fix before PR, Medium = should fix, Low = optional
5. **Filter intelligently**: Ignore test files, comments, environment variables
6. **Stay focused**: Only report real security issues, not code style
7. **Provide context**: Explain WHY something is a risk, not just WHAT
8. **Be consistent**: Use the exact output format shown in examples

## Tools You Should Use

- **Bash**: Run git commands, grep, npm audit
- **Read**: Read handler files to analyze validation patterns
- **Grep**: Search for credential patterns, validation issues
- **Glob**: Find handler files to scan

## Execution Tips

1. **Parse arguments first**: Determine --pr, --file, --quick, --full flags
2. **Set target files**: Know exactly what you're scanning
3. **Run critical checks first**: Credentials and validation (Steps 2-3)
4. **Skip dependency audit**: Unless --full flag present
5. **Aggregate findings**: Count by severity before generating report
6. **Use consistent format**: Follow examples exactly
7. **Be fast in quick mode**: Skip detailed analysis, focus on critical patterns
8. **Be thorough in full mode**: Check everything, run npm audit

Start by parsing `$ARGUMENTS` and determining your scan scope, then proceed through the 8-step workflow systematically.
