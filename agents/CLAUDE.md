# Claude Code Guide for MCP ABAP ADT Server

> **📚 This is a lightweight quick reference. Complete documentation in [AGENTS.md](../AGENTS.md)**

---

## Quick Start

### 1. Get Complete Guide
```
Read: ../AGENTS.md
→ Authentication setup, workflows, resources, best practices
```

### 2. Access Dynamic Claude-Specific Guide
```
access_mcp_resource: uri=agent-guide://claude
→ Auto-generated, cacheable, Claude-optimized guidance
```

---

## Authentication (First Time)

**SSO Setup**:
1. Read `.env` to get `SAP_URL` and `SAP_CLIENT`
2. Authenticate to shared location:
   ```
   Tool: sap_authenticate
   entry_url: {SAP_URL}/sap/bc/adt?sap-client={SAP_CLIENT}
   store_path: C:\Users\{username}\.sap\cookies
   ```
3. Update `.env`: `AUTH_COOKIE_DIR=C:\Users\{username}\.sap\cookies`
4. Restart MCP server

**When Cookies Expire**:
- CSRF 403 error → Re-authenticate to shared location
- Check status: `sap_get_cookie_info`
- Restart server after re-authentication

---

## Core Workflows

Read detailed workflows when needed:

- **[docs/workflows/ClassDevelopment.md](../docs/workflows/ClassDevelopment.md)** - Create/test/activate classes
- **[docs/workflows/PackageDiscovery.md](../docs/workflows/PackageDiscovery.md)** - Find packages efficiently
- **[docs/workflows/RAPAnalysis.md](../docs/workflows/RAPAnalysis.md)** - Analyze RAP Business Objects
- **[docs/workflows/DataQuerying.md](../docs/workflows/DataQuerying.md)** - Query tables and CDS views

---

## Claude-Specific Strengths

### Large Context Window
- Load multiple resources at once
- Analyze complete RAP BO structures
- Process comprehensive documentation

### Complex Understanding
- Excel at RAP architecture analysis
- Use `rap-bo-analysis:///` resources
- Request detailed explanations

### Test Generation
- Generate comprehensive test suites
- Include positive and negative scenarios
- Create test doubles for dependencies

---

## Essential Patterns

### Always Prefer Resources
```
✅ access_mcp_resource: uri=abap://class/{name}
❌ use_mcp_tool: GetClass
```

### Class Development Sequence
```
1. CheckSyntax (class)
2. CreateClass (auto_activate: false)
3. CheckSyntax (tests)
4. CreateClassTests
5. RunClassTests
6. ActivateClasses
```

### Use Workflow Prompts
```
invoke_prompt: create-class-workflow
invoke_prompt: rap-bo-analysis-workflow
invoke_prompt: package-discovery-workflow
```

---

## Critical Rules

1. **CheckSyntax First** - Before creating any object
2. **Test Before Activation** - Never skip RunClassTests
3. **Use Resources** - Cacheable, efficient
4. **Follow Workflows** - Use MCP prompts for guidance
5. **ABAP Cloud Only** - Released APIs and RAP patterns

---

## Quick Reference

### Package Discovery
```
access_mcp_resource: uri=abap://packages/top-level/names
```

### RAP BO Analysis
```
access_mcp_resource: uri=rap-bo-analysis:///{bo_name}
```

### Query Data
```
# Table
use_mcp_tool: GetTableContents with table_name, columns, where_conditions

# CDS View (cacheable)
access_mcp_resource: uri=cds-view-data:///{view}?columns=col1,col2&max_rows=10
```

### Create Class
```
invoke_prompt: create-class-workflow
arguments: {class_name: "ZCL_MY_CLASS", description: "..."}
```

---

## Documentation Structure

```
AGENTS.md (root)
├── Quick Start & Authentication
├── Documentation Structure (routes to detailed docs)
├── Essential Principles
└── Common Operations

docs/workflows/
├── ClassDevelopment.md      Detailed class creation workflow
├── PackageDiscovery.md      Package navigation patterns
├── RAPAnalysis.md           RAP BO analysis methods
└── DataQuerying.md          Table/CDS querying

docs/
├── Resources.md             Complete resource catalog
├── RAP_Tools.md             RAP development tools
├── ABAP_Standards.md        Naming and conventions
└── CDS_View_Performance.md  Performance guidelines

agents/
└── CLAUDE.md (this file)    Claude-specific quick reference
```

---

**For complete documentation, workflows, and best practices → Read [../AGENTS.md](../AGENTS.md)**
