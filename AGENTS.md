# MCP ABAP ADT Server - AI Agent Guide

> **Universal guide for AI coding assistants working with the MCP ABAP ADT Server**

---

## Quick Start

### 1. Authentication Setup (First Time)

**SSO Authentication (Recommended)**:
```
IMPORTANT: Read .env file first to get SAP_URL and SAP_CLIENT values!

Tool: sap_authenticate
Parameters:
  entry_url: {SAP_URL}/sap/bc/adt?sap-client={SAP_CLIENT}
  store_path: {shared_cookie_location}

Example:
  entry_url: "https://your-sap-system.com:8000/sap/bc/adt?sap-client=001"
  store_path: "C:\\Users\\{username}\\.sap\\cookies"

✅ Cookies stored in shared location work across all projects
✅ No server restart needed after initial setup
```

**Troubleshooting Authentication**:
- CSRF 403 errors mean cookies expired or server needs restart
- Check cookie status: `sap_get_cookie_info`
- Re-authenticate to shared location when cookies expire
- Server must be restarted after .env changes

**Basic Auth Fallback**:
```
Only used if SSO cookies unavailable
Set in .env: SAP_USERNAME, SAP_PASSWORD
```

### 2. Server Capabilities

Access via MCP resources (cacheable, efficient):
```
# Agent-specific guide (auto-detects your agent type)
access_mcp_resource: uri=agent-guide://auto

# List all available resources
access_mcp_resource: uri=mcp://list-resources

# List all available tools
use_mcp_tool: list_tools
```

---

## Documentation Structure

All detailed guides are in topic-specific files. Read only what you need:

### Core Workflows
- **[docs/workflows/ClassDevelopment.md](docs/workflows/ClassDevelopment.md)** - Create, test, activate classes
- **[docs/workflows/PackageDiscovery.md](docs/workflows/PackageDiscovery.md)** - Find and explore packages
- **[docs/workflows/RAPAnalysis.md](docs/workflows/RAPAnalysis.md)** - Analyze RAP Business Objects
- **[docs/workflows/DataQuerying.md](docs/workflows/DataQuerying.md)** - Query tables and CDS views

### Technical Reference
- **[docs/Resources.md](docs/Resources.md)** - Complete resource catalog
- **[docs/RAP_Tools.md](docs/RAP_Tools.md)** - RAP development tools
- **[docs/ABAP_Standards.md](docs/ABAP_Standards.md)** - Naming conventions and best practices
- **[docs/CDS_View_Performance.md](docs/CDS_View_Performance.md)** - CDS optimization guidelines

### Agent-Specific Guides
- **[agents/CLAUDE.md](agents/CLAUDE.md)** - Claude Desktop optimizations
- **[agents/.clinerules](agents/.clinerules)** - Cline quick reference
- **[agents/.cursorrules](agents/.cursorrules)** - Cursor quick reference
- **[agents/.opencoderules](agents/.opencoderules)** - OpenCode quick reference

---

## Essential Principles

### 1. Resources Over Tools
Resources are cacheable and efficient. Always prefer resources when available:

```
❌ DON'T: use_mcp_tool GetPackage
✅ DO:     access_mcp_resource uri=abap://package/{name}

❌ DON'T: use_mcp_tool GetClass
✅ DO:     access_mcp_resource uri=abap://class/{name}

❌ DON'T: Multiple individual tool calls
✅ DO:     access_mcp_resource uri=rap-bo-analysis:///{name}
```

### 2. Mandatory Class Development Sequence
**ALWAYS follow this order** (see [docs/workflows/ClassDevelopment.md](docs/workflows/ClassDevelopment.md)):

1. CheckSyntax (class code)
2. CreateClass (auto_activate: false)
3. CheckSyntax (test code)
4. CreateClassTests (auto_activate: false)
5. RunClassTests (verify all pass)
6. ActivateClasses (only after tests pass)

**NEVER**:
- ❌ Skip CheckSyntax before creation
- ❌ Use auto_activate: true during development
- ❌ Activate without running tests first

### 3. ABAP Cloud Compliance
All code must follow ABAP Cloud (Tier 1) restrictions:
- ✅ Use released APIs and CDS views
- ✅ Use RAP for business object access
- ❌ No direct database table access
- ❌ No unreleased function modules
- ❌ No classic dynpro/screen processing

See [docs/ABAP_Standards.md](docs/ABAP_Standards.md) for complete guidelines.

---

## Common Operations

### Package Discovery
```
# Lightweight names only
access_mcp_resource: uri=abap://packages/top-level/names

# Filtered search
access_mcp_resource: uri=abap://packages/top-level?prefix=FIN&limit=20

# Detailed package info
access_mcp_resource: uri=abap://package/{package_name}
```

### RAP Business Object Analysis
```
# Complete BO structure in one call
access_mcp_resource: uri=rap-bo-analysis:///{rap_bo_name}

# Summary level (faster)
access_mcp_resource: uri=rap-bo-analysis:///{rap_bo_name}?depth=summary
```

### Query Data
```
# Table data
use_mcp_tool: GetTableContents
  table_name: MARA
  columns: [MATNR, MTART]
  where_conditions: {MTART: "FERT"}
  max_rows: 50

# CDS view data (use resource for simple queries)
access_mcp_resource: uri=cds-view-data:///{view_name}?columns=col1,col2&max_rows=10
```

### Create Class
```
# Use workflow prompts for guided creation
invoke_prompt: create-class-workflow
arguments: {
  class_name: "ZCL_MY_CLASS",
  description: "Description"
}
```

---

## Workflow Prompts

Use interactive prompts for step-by-step guidance:

1. **create-class-workflow** - Create and test classes
2. **quick-class-workflow** - Optimized class creation (experienced users)
3. **package-discovery-workflow** - Efficient package navigation
4. **rap-bo-analysis-workflow** - Analyze RAP Business Objects
5. **refactor-class-workflow** - Safe refactoring with backup
6. **table-analysis-workflow** - Analyze tables and data

```
invoke_prompt: {workflow_name}
arguments: {required_args}
```

---

## Critical Rules

1. **CheckSyntax First** - Always validate before creating objects
2. **Test Before Activation** - Never skip RunClassTests
3. **Use Resources** - Prefer resources over tools for reading
4. **Follow Workflows** - Use MCP prompts for complex tasks
5. **ABAP Cloud Only** - Use released APIs and RAP patterns

---

## Support

- **GitHub Issues**: Report issues and feature requests
- **Documentation**: Check `docs/` directory for detailed guides
- **MCP Resources**: Access dynamic guides via `agent-guide://auto`

---

*For detailed workflows, best practices, and complete tool documentation, see topic-specific files in `docs/` directory*
