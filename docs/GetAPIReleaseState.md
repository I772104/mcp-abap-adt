# GetAPIReleaseState Tool

## Overview

The `GetAPIReleaseState` tool checks if ABAP APIs (classes, interfaces, function modules, tables) are released for use in ABAP Cloud (Tier 1). This is critical for S/4HANA migration projects and ensuring cloud-ready development.

## Priority

**Critical** - Essential for ABAP Cloud compliance validation

## Business Value

- **ABAP Cloud Migration**: Validate code compatibility before migration, preventing costly rework
- **Future-Proof Development**: Ensure code uses only released, stable APIs from day one
- **CI/CD Integration**: Automated quality gates to block non-compliant code
- **S/4HANA Readiness**: Essential for customers migrating from ECC to S/4HANA Cloud
- **Developer Productivity**: Instant feedback instead of manual API checks

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `object_name` | string | Yes | Name of the ABAP object (e.g., CL_ABAP_TYPEDESCR, CL_GUI_ALV_GRID) |
| `object_type` | string | Yes | Object type: CLAS (class), INTF (interface), FUGR (function group), PROG (program), TABL (table), DDLS (CDS view) |
| `release_contract` | string | No | Release contract to check (default: C1 for ABAP Cloud). Values: C1 (ABAP Cloud), C0 (Classic ABAP) |

## Response Format

### When ADT API is Available (SAP_BASIS >= 756)

```json
{
  "object_name": "CL_ABAP_TYPEDESCR",
  "object_type": "CLAS",
  "release_state": "RELEASED",
  "contract": "C1",
  "api_available": true,
  "details": {
    "is_released_for_cloud": true,
    "is_deprecated": false,
    "stability": "STABLE"
  }
}
```

### When ADT API is Not Available (Fallback Mode)

```json
{
  "object_name": "CL_GUI_ALV_GRID",
  "object_type": "CLAS",
  "release_contract": "C1",
  "api_available": false,
  "status": "MANUAL_VERIFICATION_REQUIRED",
  "message": "ADT Release State API not available on this system. Manual verification required.",
  "verification_methods": [
    {
      "method": "Eclipse ADT",
      "steps": [
        "1. Open object in Eclipse ABAP Development Tools",
        "2. Right-click → Show API State",
        "3. Check 'Released for' section for C1 (Cloud API) contract"
      ]
    },
    {
      "method": "SAP GUI Transaction",
      "steps": [
        "1. Transaction SE24 (for classes) or SE80",
        "2. Display object",
        "3. Check API properties tab",
        "4. Look for release state annotations"
      ]
    }
  ],
  "common_indicators": {
    "released_apis": [
      "Classes starting with CL_ABAP_*",
      "Classes starting with CL_RAP_*",
      "RAP Business Objects and related artifacts"
    ],
    "non_released_apis": [
      "GUI-related classes (CL_GUI_*, CL_ALV_*)",
      "Classes with DYNPRO or screen programming",
      "RFC/BDC-related functionality"
    ]
  },
  "recommended_alternatives": {
    "has_alternative": true,
    "recommendation": "Use CL_SALV_TABLE for list output"
  }
}
```

## Release States

| State | Description |
|-------|-------------|
| `RELEASED` | API is officially released and stable for use in ABAP Cloud |
| `DEPRECATED` | API is deprecated, successor available |
| `NOT_RELEASED` | API is not released for ABAP Cloud - avoid in new development |
| `INTERNAL` | Internal SAP API, not for customer use |
| `MANUAL_VERIFICATION_REQUIRED` | ADT API not available, manual verification needed |

## Usage Examples

### Example 1: Check if class is cloud-ready

```typescript
{
  "object_name": "CL_ABAP_TYPEDESCR",
  "object_type": "CLAS",
  "release_contract": "C1"
}
```

**Expected Result**: RELEASED (this is a core ABAP class released for Cloud)

### Example 2: Check GUI class

```typescript
{
  "object_name": "CL_GUI_ALV_GRID",
  "object_type": "CLAS",
  "release_contract": "C1"
}
```

**Expected Result**: NOT_RELEASED (GUI classes not available in ABAP Cloud)

**Recommendation**: Use CL_SALV_TABLE instead

### Example 3: Check function module

```typescript
{
  "object_name": "POPUP_TO_CONFIRM",
  "object_type": "FUGR"
}
```

### Example 4: Check CDS view

```typescript
{
  "object_name": "I_SalesOrder",
  "object_type": "DDLS",
  "release_contract": "C1"
}
```

## Common API Patterns

### Released for ABAP Cloud ✅

- `CL_ABAP_*` - Core ABAP runtime classes
- `CL_RAP_*` - RAP framework classes
- `CL_SALV_*` - Modern ALV classes
- RAP Business Objects (CDS views with @AccessControl)
- Modern OData services

### NOT Released for ABAP Cloud ❌

- `CL_GUI_*` - GUI controls (use Fiori/UI5 instead)
- `CL_ALV_*` - Classic ALV (use CL_SALV_TABLE)
- `SUBMIT` statements (use background processing)
- RFC/BDC functionality (use APIs/OData)
- File system access (CL_GUI_FRONTEND_SERVICES)

## Recommended Alternatives

| Non-Released API | Cloud-Ready Alternative |
|------------------|------------------------|
| CL_GUI_ALV_GRID | CL_SALV_TABLE |
| CL_GUI_FRONTEND_SERVICES | OData services or CL_ABAP_BROWSER |
| SUBMIT | Background processing framework or RAP |
| CALL FUNCTION 'RFC_*' | HTTP/OData services |
| CL_BCS | CL_BCS_MAIL_MESSAGE |

## CI/CD Integration

### Pre-commit Hook

```bash
#!/bin/bash
# Check if modified classes use only released APIs

for class in $(git diff --name-only | grep "\.clas\.abap$"); do
  class_name=$(basename $class .clas.abap)
  result=$(call_mcp_tool GetAPIReleaseState "$class_name" "CLAS")

  if echo "$result" | grep -q "NOT_RELEASED"; then
    echo "❌ $class_name uses non-released APIs"
    exit 1
  fi
done
```

### GitHub Actions Workflow

```yaml
name: ABAP Cloud Compliance Check

on: [pull_request]

jobs:
  api-release-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check API Release State
        run: |
          # Check all modified ABAP classes
          for class in $(git diff --name-only origin/main...HEAD | grep "\.clas\."); do
            ./check-api-release.sh "$class"
          done
```

## System Requirements

### Full Functionality (ADT API Available)

- SAP_BASIS >= 756 (S/4HANA 2021 or later)
- ADT API endpoint: `/sap/bc/adt/api/releasestates/contracts`
- User authorization: S_DEVELOP

### Fallback Mode (Manual Verification)

- Works on all systems
- Provides guidance and verification methods
- Lists common patterns and recommended alternatives

## Limitations

1. **ADT API Availability**: Not all systems have the release state API available
2. **Real-time Data**: API state can change with support packages/upgrades
3. **Custom Code**: Cannot determine release state for customer Z/Y objects
4. **Transitive Dependencies**: Only checks direct API, not nested dependencies

## Best Practices

1. **Check Early**: Validate API usage during development, not at the end
2. **Automate**: Integrate into CI/CD pipelines for continuous compliance
3. **Document Exceptions**: If you must use non-released APIs, document why
4. **Plan Migration**: Create backlog items for replacing non-released APIs
5. **Educate Team**: Share common patterns and alternatives with developers

## Troubleshooting

### Issue: API always returns MANUAL_VERIFICATION_REQUIRED

**Cause**: ADT release state API not available on this system version

**Solution**:
1. Verify SAP_BASIS version (must be >= 756)
2. Check if system is S/4HANA 2021 or later
3. Use manual verification methods provided in response
4. Consider upgrading to newer SAP version for full support

### Issue: False positives for custom Z/Y objects

**Cause**: Tool cannot determine release state for customer objects

**Solution**: Custom objects inherit release state from APIs they use. Use GetObjectUsages to analyze dependencies.

## Related Tools

- **CheckSyntax**: Syntax validation
- **RunATCCheck**: Comprehensive quality checks including API usage
- **GetObjectUsages**: Analyze what APIs an object uses

## Documentation Links

- [Released APIs for ABAP Cloud](https://help.sap.com/docs/btp/sap-business-technology-platform/released-apis)
- [ABAP Cloud Readiness](https://help.sap.com/docs/btp/sap-abap-development-user-guide/abap-cloud-readiness)
- [SAP Note 3007771: APIs deprecated in S/4HANA](https://launchpad.support.sap.com/#/notes/3007771)

## Changelog

### Version 1.1.0 (2026-02-27)
- Initial implementation of GetAPIReleaseState tool
- Supports fallback guidance when ADT API not available
- Provides recommended alternatives for common non-released APIs
- Includes verification methods for manual checks

---

**GitHub Issue**: [#38 - Add API Release State Check for ABAP Cloud Compliance](https://github.tools.sap/D020426/mcp-abap-adt/issues/38)
