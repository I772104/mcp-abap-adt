# Technical Notes: ADT API Path Patterns

## Overview
Different ABAP object types use different ADT (ABAP Development Tools) API path patterns for accessing source code and versions. Understanding these patterns is crucial for tool developers and troubleshooting.

## Path Pattern Reference

### Current Source Access

| Object Type | Current Source Path |
|-------------|-------------------|
| **Classes (CLAS)** | `/sap/bc/adt/oo/classes/{name}/source/main` |
| **Programs (PROG)** | `/sap/bc/adt/programs/programs/{name}/source/main` |
| **Function Groups (FUGR)** | `/sap/bc/adt/functions/groups/{name}/source/main` |
| **Interfaces (INTF)** | `/sap/bc/adt/oo/interfaces/{name}/source/main` |
| **Behavior Definitions (BDEF)** | `/sap/bc/adt/bo/behaviordefinitions/{name}/source/main` |
| **CDS Views (DDLS)** | `/sap/bc/adt/ddic/ddl/sources/{name}/source/main` |
| **Access Controls (DCLS)** | `/sap/bc/adt/acm/dcl/sources/{name}/source/main` |

### Version History Access

| Object Type | Version History Path |
|-------------|---------------------|
| **Classes (CLAS)** | `/sap/bc/adt/oo/classes/{name}/includes/main/versions` |
| **Programs (PROG)** | `/sap/bc/adt/programs/programs/{name}/source/main/versions` |
| **Includes (INCL)** | `/sap/bc/adt/programs/includes/{name}/source/main/versions` |
| **Function Groups (FUGR)** | `/sap/bc/adt/functions/groups/{name}/includes/main/versions` |
| **Interfaces (INTF)** | `/sap/bc/adt/oo/interfaces/{name}/includes/main/versions` |
| **Behavior Definitions (BDEF)** | `/sap/bc/adt/bo/behaviordefinitions/{name}/source/main/versions` |
| **CDS Views (DDLS)** | `/sap/bc/adt/ddic/ddl/sources/{name}/versions` |
| **Access Controls (DCLS)** | `/sap/bc/adt/acm/dcl/sources/{name}/versions` |

### Specific Version Content Access

| Object Type | Version Content Path |
|-------------|---------------------|
| **Classes (CLAS)** | `/sap/bc/adt/oo/classes/{name}/includes/main/versions/{timestamp}/{version}/content` |
| **Programs (PROG)** | `/sap/bc/adt/programs/programs/{name}/source/main/versions/{timestamp}/{version}/content` |
| **Includes (INCL)** | `/sap/bc/adt/programs/includes/{name}/source/main/versions/{timestamp}/{version}/content` |
| **Function Groups (FUGR)** | `/sap/bc/adt/functions/groups/{name}/includes/main/versions/{timestamp}/{version}/content` |
| **Interfaces (INTF)** | `/sap/bc/adt/oo/interfaces/{name}/includes/main/versions/{timestamp}/{version}/content` |
| **Behavior Definitions (BDEF)** | `/sap/bc/adt/bo/behaviordefinitions/{name}/source/main/versions/{timestamp}/{version}/content` |
| **CDS Views (DDLS)** | `/sap/bc/adt/ddic/ddl/sources/{name}/versions/{timestamp}/{version}/content` |
| **Access Controls (DCLS)** | `/sap/bc/adt/acm/dcl/sources/{name}/versions/{timestamp}/{version}/content` |

## Key Observations

### Three Distinct Patterns

1. **`/includes/main` Pattern** (CLAS, FUGR, INTF)
   - Used for OO objects with include programs
   - Version path: `{base}/includes/main/versions`
   - Content path: `{base}/includes/main/versions/{ts}/{ver}/content`

2. **`/source/main` Pattern** (PROG, INCL, BDEF)
   - Used for executable programs, includes, and behavior definitions
   - Version path: `{base}/source/main/versions`
   - Content path: `{base}/source/main/versions/{ts}/{ver}/content`
   - ⚠️ **Common Mistake**: Using `/includes/main` for PROG/INCL/BDEF results in HTTP 404

3. **Direct `/versions` Pattern** (DDLS, DCLS)
   - No intermediate `/includes/main` or `/source/main` segment
   - Version path: `{base}/versions`
   - Content path: `{base}/versions/{ts}/{ver}/content`

### Why PROG, INCL, and BDEF Use /source/main

Programs, Includes, and Behavior Definitions use `/source/main` instead of `/includes/main` because:
- **PROG**: Executable programs are standalone source files, not include-based
- **INCL**: Include programs are also standalone source files
- **BDEF**: Behavior definitions are metadata definitions, not traditional includes
- The ADT API reflects these structural differences in the URL pattern

## Implementation Guidelines

### For Tool Developers

When implementing version comparison or retrieval:

```typescript
function getVersionPath(objectType: string, objectPath: string): string {
    if (objectType === 'DDLS' || objectType === 'DCLS') {
        return `${objectPath}/versions`;
    } else if (objectType === 'BDEF' || objectType === 'PROG') {
        return `${objectPath}/source/main/versions`;
    } else {
        // CLAS, FUGR, INTF
        return `${objectPath}/includes/main/versions`;
    }
}

function getVersionContentPath(objectType: string, objectPath: string,
                                timestamp: string, version: string): string {
    if (objectType === 'DDLS' || objectType === 'DCLS') {
        return `${objectPath}/versions/${timestamp}/${version}/content`;
    } else if (objectType === 'BDEF' || objectType === 'PROG') {
        return `${objectPath}/source/main/versions/${timestamp}/${version}/content`;
    } else {
        return `${objectPath}/includes/main/versions/${timestamp}/${version}/content`;
    }
}
```

### Troubleshooting

**Problem**: HTTP 404 when accessing BDEF versions

**Solution**: Check if you're using `/includes/main` instead of `/source/main`

```bash
# ❌ Wrong - will return 404
GET /sap/bc/adt/bo/behaviordefinitions/R_PRODUCTIONORDERTP/includes/main/versions/20260204165512/00162/content

# ✅ Correct
GET /sap/bc/adt/bo/behaviordefinitions/R_PRODUCTIONORDERTP/source/main/versions/20260204165512/00162/content
```

## Version Format

All version identifiers follow the format: `{timestamp}/{version}`

- Timestamp: `YYYYMMDDHHMMSS` (e.g., `20260204165512`)
- Version: 5-digit number (e.g., `00162`, `00000`)
- Full format: `20260204165512/00162`

Special versions:
- `00000` - Current/active version (may have earlier timestamp but contains latest code)
- `00001+` - Historical transported versions

## Related Documentation

- [CompareObjectVersions.md](CompareObjectVersions.md) - Version comparison tool
- [GetVersionHistory.md](GetVersionHistory.md) - Version history retrieval
- [GetTransportVersions.md](GetTransportVersions.md) - Transport-specific version analysis

## Changelog

### 2026-02-26: PROG and BDEF Path Pattern Fix
- Fixed GetVersionHistory to use correct `/source/main/versions` path for PROG
- Fixed CompareObjectVersions to use correct `/source/main/versions` path for BDEF
- Updated documentation: PROG and BDEF both use `/source/main`, not `/includes/main`
- Previous implementation incorrectly used `/includes/main/versions` for both object types

---

**Maintained by**: SAP Internal Development Team
**Last Updated**: 2026-02-26
