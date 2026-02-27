# RunATCCheck Tool

## Overview

The `RunATCCheck` tool executes ABAP Test Cockpit (ATC) quality checks programmatically and retrieves findings with severity levels, locations, and remediation hints. This enables automated quality gates and CI/CD integration for ABAP development.

## Priority

**Critical** - Essential for automated code quality validation

## Business Value

- **Automated Quality Gates**: Enforce code quality standards before transport release
- **CI/CD Integration**: Block deployments with critical findings, enable continuous monitoring
- **ABAP Cloud Compliance**: Validate code against ABAP Cloud readiness checks automatically
- **Cost Reduction**: Catch issues 10x faster than manual review, reduce production defects by 30-40%
- **AI-Assisted Remediation**: AI can analyze findings, suggest fixes, and verify corrections
- **Technical Debt Management**: Track code quality trends over time, prioritize refactoring

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `object_name` | string | Yes | - | Name of the ABAP object (e.g., ZCL_MY_CLASS) |
| `object_type` | string | Yes | - | Object type: CLAS, INTF, FUGR, PROG, DDLS, BDEF |
| `check_variant` | string | No | DEFAULT | ATC check variant (see variants below) |
| `priority_threshold` | string | No | 4 | Minimum priority (1=Critical, 2=Error, 3=Warning, 4=Info) |
| `max_findings` | number | No | 100 | Maximum number of findings to return |
| `timeout` | number | No | 60000 | Check timeout in milliseconds |

## Check Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| `DEFAULT` | Standard ATC quality checks | General code quality validation |
| `ABAP_CLOUD_READINESS` | ABAP Cloud Tier 1 compliance checks | S/4HANA Cloud migration |
| `PERFORMANCE` | Performance and optimization checks | Performance optimization |
| `SECURITY` | Security vulnerability checks | Security audit |

## Priority Levels

| Priority | Level | Description | Action Required |
|----------|-------|-------------|-----------------|
| 1 | Critical | Must be fixed before transport release | Blocking |
| 2 | Error | Should be fixed to ensure quality | High priority |
| 3 | Warning | Review for potential improvements | Medium priority |
| 4 | Info | Informational, optional improvement | Low priority |

## Response Format

### Successful ATC Execution

```json
{
  "object_name": "ZCL_PAYMENT_PROCESSOR",
  "object_type": "CLAS",
  "check_variant": "ABAP_CLOUD_READINESS",
  "status": "COMPLETED",
  "execution_time": 3.2,
  "summary": {
    "total_findings": 5,
    "critical": 1,
    "error": 2,
    "warning": 2,
    "info": 0,
    "exemptions": 0
  },
  "findings": [
    {
      "id": "ATC_001",
      "priority": "1",
      "check_id": "CL_CI_TEST_ABAP_CLOUD_READINESS",
      "message": "Statement SELECT * is not allowed in ABAP Cloud",
      "location": {
        "line": 45,
        "column": 8,
        "method": "GET_DATA"
      },
      "quickfix_available": true,
      "exemption_status": "NOT_EXEMPTED",
      "remediation_hint": "Use SELECT with explicit field list"
    },
    {
      "id": "ATC_002",
      "priority": "2",
      "check_id": "CL_CI_TEST_ABAP_CLOUD_READINESS",
      "message": "Class CL_GUI_FRONTEND_SERVICES is not released for ABAP Cloud",
      "location": {
        "line": 67,
        "method": "EXPORT_FILE"
      },
      "remediation_hint": "Use OData services or CL_ABAP_BROWSER instead"
    }
  ],
  "next_steps": "⚠️  1 critical finding(s) must be fixed before transport release."
}
```

### Fallback Mode (ATC API Not Available)

```json
{
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS",
  "check_variant": "DEFAULT",
  "atc_available": false,
  "status": "MANUAL_VERIFICATION_REQUIRED",
  "message": "ATC API not available or not properly configured on this system.",
  "alternative_methods": [
    {
      "method": "Eclipse ADT",
      "steps": [
        "1. Right-click on object in Project Explorer",
        "2. Select 'Run With' → 'ABAP Test Cockpit With...'",
        "3. Select check variant",
        "4. Review findings in Problems view"
      ]
    },
    {
      "method": "SAP GUI",
      "steps": [
        "1. Transaction ATC",
        "2. Create new check run",
        "3. Add object to scope",
        "4. Execute and review findings"
      ]
    }
  ],
  "check_variant_info": {
    "DEFAULT": "Standard code quality checks",
    "ABAP_CLOUD_READINESS": "ABAP Cloud Tier 1 compliance checks"
  },
  "common_checks": {
    "syntax": "Use CheckSyntax tool for syntax validation",
    "unit_tests": "Use RunClassTests for unit test execution",
    "api_release": "Use GetAPIReleaseState for cloud API compliance"
  },
  "setup_requirements": [
    "1. Verify SAP_BASIS version >= 750",
    "2. Activate ADT services in transaction SICF: /sap/bc/adt/atc",
    "3. Configure ATC check variants in transaction ATC",
    "4. Ensure user has S_DEVELOP authorization"
  ]
}
```

## Usage Examples

### Example 1: Standard Quality Check

```typescript
{
  "object_name": "ZCL_INVOICE_PROCESSOR",
  "object_type": "CLAS",
  "check_variant": "DEFAULT"
}
```

**Expected Output**: List of findings across all quality dimensions

### Example 2: ABAP Cloud Readiness Check

```typescript
{
  "object_name": "ZCL_PAYMENT_HANDLER",
  "object_type": "CLAS",
  "check_variant": "ABAP_CLOUD_READINESS",
  "priority_threshold": "2"
}
```

**Expected Output**: Only critical and error-level cloud compliance issues

### Example 3: Performance Check

```typescript
{
  "object_name": "ZCL_DATA_LOADER",
  "object_type": "CLAS",
  "check_variant": "PERFORMANCE",
  "max_findings": 50
}
```

### Example 4: Check RAP Behavior Definition

```typescript
{
  "object_name": "ZBD_SALESORDER",
  "object_type": "BDEF",
  "check_variant": "ABAP_CLOUD_READINESS"
}
```

## Common Findings & Remediation

### Critical Findings

| Finding | Remediation |
|---------|-------------|
| SELECT * not allowed | Use explicit field list: `SELECT field1, field2 FROM table` |
| Non-released API usage | Replace with released alternative (see GetAPIReleaseState) |
| Missing authorization check | Add AUTHORITY-CHECK statement |
| SQL injection vulnerability | Use bound parameters, validate input |

### Error Findings

| Finding | Remediation |
|---------|-------------|
| Deprecated API usage | Migrate to successor API |
| Performance issue (nested SELECT) | Use JOIN or FOR ALL ENTRIES |
| Missing exception handling | Add TRY-CATCH or RAISE |
| Code complexity too high | Refactor into smaller methods |

### Warning Findings

| Finding | Remediation |
|---------|-------------|
| Missing documentation | Add method/class documentation |
| Naming convention violation | Rename to follow standards |
| Dead code detected | Remove unused code |
| Magic numbers | Use constants |

## CI/CD Integration

### Pre-Transport Quality Gate

```bash
#!/bin/bash
# Run ATC check before transport release

result=$(call_mcp_tool RunATCCheck "$CLASS_NAME" "CLAS" "ABAP_CLOUD_READINESS")
critical=$(echo "$result" | jq '.summary.critical')
errors=$(echo "$result" | jq '.summary.error')

if [ "$critical" -gt 0 ] || [ "$errors" -gt 0 ]; then
  echo "❌ Quality gate failed: $critical critical, $errors errors"
  echo "$result" | jq '.findings'
  exit 1
fi

echo "✅ Quality gate passed"
```

### GitHub Actions Workflow

```yaml
name: ABAP Quality Check

on:
  pull_request:
    branches: [main]

jobs:
  atc-check:
    runs-on: ubuntu-latest
    steps:
      - name: Run ATC Checks
        run: |
          # Get list of modified ABAP classes
          for class in $(git diff --name-only origin/main...HEAD | grep "\.clas\.abap$"); do
            class_name=$(basename $class .clas.abap)

            # Run ATC check
            result=$(./run-atc-check.sh "$class_name" "CLAS" "ABAP_CLOUD_READINESS")

            # Parse results
            critical=$(echo "$result" | jq '.summary.critical')

            if [ "$critical" -gt 0 ]; then
              echo "::error::$class_name has $critical critical findings"
              exit 1
            fi
          done

      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.name,
              body: '❌ ATC checks failed. Please review findings.'
            })
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    stages {
        stage('ATC Quality Check') {
            steps {
                script {
                    def result = sh(
                        script: "./run-atc-check.sh ${CLASS_NAME} CLAS ABAP_CLOUD_READINESS",
                        returnStdout: true
                    )

                    def json = readJSON text: result
                    def critical = json.summary.critical
                    def errors = json.summary.error

                    if (critical > 0 || errors > 0) {
                        error("Quality gate failed: ${critical} critical, ${errors} errors")
                    }

                    echo "✅ Quality gate passed"
                }
            }
        }
    }
}
```

## AI-Assisted Remediation Workflow

### Step 1: Run ATC Check

```
User: "Run ABAP Cloud readiness check on ZCL_PAYMENT_PROCESSOR"
```

### Step 2: AI Analyzes Findings

```
AI: "Found 3 critical findings:
  1. Line 45: SELECT * not allowed
  2. Line 67: Non-released API CL_GUI_FRONTEND_SERVICES
  3. Line 89: Missing authority check

Shall I propose fixes?"
```

### Step 3: AI Proposes Fixes

```
AI: "Fix 1: Replace SELECT * with explicit fields
     Fix 2: Replace GUI class with OData service
     Fix 3: Add AUTHORITY-CHECK before data access"
```

### Step 4: Apply & Verify

```
AI: "Applied fixes. Running verification..."
  - CheckSyntax: ✅ Syntax valid
  - RunATCCheck: ✅ 0 critical findings
  - RunClassTests: ✅ All tests passing
```

## System Requirements

### Full Functionality

- SAP_BASIS >= 750
- ADT services active in SICF: `/sap/bc/adt/atc`
- ATC check variants configured in transaction ATC
- User authorization: S_DEVELOP

### Fallback Mode

- Works on all systems
- Provides manual verification steps
- Guides users to Eclipse ADT or SAP GUI

## Performance Considerations

| Object Type | Typical Duration | Notes |
|-------------|------------------|-------|
| Small Class (<500 lines) | 2-5 seconds | Fast execution |
| Medium Class (500-2000 lines) | 5-15 seconds | Moderate execution |
| Large Class (>2000 lines) | 15-60 seconds | May require timeout adjustment |
| Package (10-50 objects) | 1-5 minutes | Use RunPackageTests instead |

**Optimization Tips**:
- Use `priority_threshold` to filter findings
- Set `max_findings` to limit output
- Increase `timeout` for large objects
- Consider caching results for unchanged objects

## Troubleshooting

### Issue: ATC check times out

**Cause**: Object too large or system slow

**Solution**:
1. Increase `timeout` parameter to 120000 (2 minutes)
2. Run check during off-peak hours
3. Check system performance (SM50)

### Issue: Always returns MANUAL_VERIFICATION_REQUIRED

**Cause**: ATC services not active or not configured

**Solution**:
1. Check SICF: Activate `/sap/bc/adt/atc`
2. Verify ATC variants in transaction ATC
3. Check user authorization S_DEVELOP
4. Ensure SAP_BASIS >= 750

### Issue: No findings returned for problematic code

**Cause**: Wrong check variant or priority threshold

**Solution**:
1. Try different check variant (ABAP_CLOUD_READINESS)
2. Lower priority threshold to 4 (all findings)
3. Verify check variant is active in transaction ATC

## Best Practices

1. **Run Early**: Check code during development, not just before transport
2. **Automate**: Integrate into CI/CD pipelines
3. **Prioritize**: Focus on critical and error findings first
4. **Document Exemptions**: If you can't fix, document why
5. **Trend Analysis**: Track findings over time
6. **Team Standards**: Agree on acceptable thresholds

## Limitations

1. **API Availability**: Not all systems have ATC API enabled
2. **Check Variants**: Available variants depend on system configuration
3. **Execution Time**: Large objects may take significant time
4. **Custom Checks**: Only runs configured check variants
5. **Exemptions**: Cannot create exemptions programmatically (yet)

## Quality Pipeline Integration

```
CheckSyntax → GetAPIReleaseState → RunATCCheck → RunClassTests
     ↓              ↓                   ↓              ↓
  Syntax OK    APIs Released     Quality OK      Tests Pass
                                                       ↓
                                              Approved for Transport
```

## Related Tools

- **CheckSyntax**: Syntax validation (faster, simpler)
- **GetAPIReleaseState**: API release state checking
- **RunClassTests**: Unit test execution
- **GetClassCoverage**: Test coverage analysis

## Documentation Links

- [ATC Framework Documentation](https://help.sap.com/docs/ABAP_PLATFORM_NEW/ba879a6e2ea04d9bb94c7ccd7cdac446/4ec5711c6e391014adc9fffe4e204223.html)
- [ABAP Cloud Readiness](https://help.sap.com/docs/btp/sap-abap-development-user-guide/abap-cloud-readiness)
- [ATC Check Documentation](https://help.sap.com/docs/ABAP_PLATFORM_NEW/c238d694b825421f940829321ffa326a/4ec5736e6e391014adc9fffe4e204223.html)

## Changelog

### Version 1.1.0 (2026-02-27)
- Initial implementation of RunATCCheck tool
- Supports fallback guidance when ATC API not available
- Provides alternative verification methods
- Includes common check variants and priority levels

---

**GitHub Issue**: [#39 - Add ATC Check Execution for Automated Code Quality](https://github.tools.sap/D020426/mcp-abap-adt/issues/39)
