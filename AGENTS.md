# AGENTS.md - MCP ABAP ADT Server Guide for AI Assistants

> **Universal Guide for AI Agents**  
> This document provides guidance for AI coding assistants (Cline, Claude Desktop, OpenCode, Cursor, etc.) working with the MCP ABAP ADT Server.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [MCP Server Capabilities](#mcp-server-capabilities)
3. [Resource Catalog](#resource-catalog)
4. [Tool Catalog](#tool-catalog)
5. [Workflow Patterns](#workflow-patterns)
6. [Best Practices](#best-practices)
7. [Agent-Specific Notes](#agent-specific-notes)

---

## Quick Start

### 1. Discover Server Capabilities

```
# List all available resources
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: mcp://list-resources

# List all available tools
use_mcp_tool:
  server_name: mcp-abap-adt-1
  tool_name: list_tools
```

### 2. Get Your Agent-Specific Guide

```
# Automatically detects your agent type and returns optimized guide
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: agent-guide://auto

# Or specify your agent explicitly
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: agent-guide://cline
```

### 3. Access Common Resources

```
# Get lightweight package names (~5K tokens)
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: abap://packages/top-level/names

# Analyze a RAP Business Object
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: rap-bo-analysis:///I_SalesOrder
```

---

## MCP Server Capabilities

### Overview

The MCP ABAP ADT Server provides access to SAP ABAP systems through the ABAP Development Tools (ADT) protocol. It enables:

- **Reading ABAP objects**: Classes, programs, CDS views, tables, etc.
- **Creating/modifying code**: Classes, unit tests (local development only)
- **Running tests**: Unit tests with coverage analysis
- **Analyzing structures**: Packages, RAP Business Objects, dependencies
- **Querying data**: Table contents with filtering and pagination

### Connection Details

- **Server Name**: `mcp-abap-adt-1`
- **SAP System**: Configured via environment variables
- **Development Package**: `$TMP` (local objects)

---

## Resource Catalog

### 🌟 ALWAYS Prefer Resources Over Tools!

Resources are **cacheable** and more **token-efficient** than tools. Use resources whenever available.

### Agent-Specific Guides

| Resource URI | Description | Token Usage |
|--------------|-------------|-------------|
| `agent-guide://auto` | Auto-detects agent, returns optimized guide | ~15K |
| `agent-guide://universal` | Universal guide for all agents | ~12K |
| `agent-guide://cline` | Cline-specific optimizations | ~15K |
| `agent-guide://claude` | Claude Desktop-specific guide | ~15K |
| `agent-guide://cursor` | Cursor-specific optimizations | ~15K |
| `agent-guide://opencode` | OpenCode-specific guide | ~15K |

### Package Resources

| Resource URI | Description | Token Usage |
|--------------|-------------|-------------|
| `abap://packages/top-level` | Complete list of top-level packages | ~35K |
| `abap://packages/top-level/names` | **Lightweight** package names only | ~5K ⭐ |
| `abap://package/{package_name}` | Detailed package information | ~2-5K |
| `abap://packages/top-level?prefix=FIN&limit=20` | Filtered package query | ~500-2K |

**Example**:
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: abap://packages/top-level/names
```

### RAP Business Object Resources

| Resource URI | Description | Token Usage |
|--------------|-------------|-------------|
| `rap-bo-analysis:///{rap_bo_name}` | Complete RAP BO analysis | ~20-50K |
| `rap-bo-analysis:///I_SalesOrder` | Pre-analyzed Sales Order BO | ~30K |
| `rap-bo-analysis:///I_PurchaseOrder` | Pre-analyzed Purchase Order BO | ~30K |

**Query Parameters**:
- `?depth=summary` - Summary level (faster, fewer tokens)
- `?include_services=false` - Skip service analysis
- `?include_implementation=false` - Skip implementation details

**Example**:
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: rap-bo-analysis:///I_InspectionLot?depth=summary
```

### ABAP Object Resources

| Resource URI | Description | Replaces Tool |
|--------------|-------------|---------------|
| `abap://cds/{view_name}` | CDS view source and metadata | GetCDSView |
| `abap://class/{class_name}` | ABAP class source code | GetClass |
| `abap://table/{table_name}` | Database table structure | GetTable |

**Example**:
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: abap://class/CL_ABAP_TYPEDESCR
```

---

## Tool Catalog

### Core ABAP Object Retrieval

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `GetProgram` | Retrieve ABAP program source | `program_name` |
| `GetClass` | Retrieve ABAP class source | `class_name` |
| `GetInterface` | Retrieve interface source | `interface_name` |
| `GetFunction` | Retrieve function module | `function_name`, `function_group` |
| `GetFunctionGroup` | Retrieve function group | `function_group` |
| `GetInclude` | Retrieve include program | `include_name` |

### Data Structure Analysis

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `GetTable` | Retrieve table structure | `table_name` |
| `GetTableContents` | Query table data | `table_name`, `max_rows`, `where_conditions` |
| `GetStructure` | Retrieve DDIC structure | `structure_name` |
| `GetTypeInfo` | Retrieve type information | `type_name` |

### Package & Search

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `GetPackage` | Retrieve package details | `package_name` |
| `GetPackageContents` | List package objects | `package_name`, `include_subpackages` |
| `SearchObject` | Search ABAP objects | `query` (supports wildcards like `Z*`) |

### RAP Development

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `GetCDSView` | Retrieve CDS view | `view_name` |
| `GetBehaviorDefinition` | Retrieve behavior definition | `cds_view_name` |
| `GetServiceDefinition` | Retrieve service definition | `service_name` |
| `GetServiceBinding` | Retrieve service binding | `binding_name` |
| `GetMetadataExtension` | Retrieve UI annotations | `extension_name` |
| `GetAccessControl` | Retrieve DCL definition | `dcl_name` |
| `GetBehaviorForRapBo` | Get RAP BO behavior | `rap_bo_name` |
| `SearchRapBo` | Search RAP BOs by description | `search_term` |

### Testing & Quality

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `GetClassTests` | Retrieve unit test code | `class_name` |
| `RunClassTests` | Execute unit tests | `class_name`, `auto_activate` |
| `RunPackageTests` | Execute package tests | `package_name` |
| `GetClassCoverage` | Get test coverage | `class_name` |
| `GetClassUsages` | Find class usages | `class_name` |
| `CheckSyntax` | Validate ABAP syntax | `source_code` or `object_name` |

### Class Creation & Management

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `CreateClass` | Create ABAP class | `class_name`, `source_code`, `auto_activate` |
| `CreateClassTests` | Create/update test classes | `parent_class_name`, `test_source_code` |
| `ActivateClasses` | Activate classes | `class_name` or `class_names` |
| `DeleteLocalClass` | Delete local class | `class_name` (Z/Y only) |

---

## Workflow Patterns

### Pattern 1: Token-Efficient Package Discovery

**Goal**: Find relevant packages without consuming excessive tokens.

**Steps**:
```
1. Get package names (lightweight)
   → access_mcp_resource: uri=abap://packages/top-level/names
   → Returns: ~5K tokens

2. Filter to relevant packages
   → access_mcp_resource: uri=abap://packages/top-level?prefix=FIN&fields=name,description
   → Returns: ~500 tokens

3. Get detailed package info (only for target package)
   → access_mcp_resource: uri=abap://package/FINANCIAL_BASIS
   → Returns: ~2K tokens

4. Explore package contents
   → use_mcp_tool: GetPackageContents with package_name=FINANCIAL_BASIS
```

**Token Savings**: 90%+ compared to calling GetPackage for each package.

---

### Pattern 2: Create and Test ABAP Class

**Goal**: Create a new ABAP class with unit tests following best practices.

**Mandatory Steps** (ALWAYS follow this sequence):

```
1. CheckSyntax - Validate class source code
   → use_mcp_tool: CheckSyntax with source_code=<class_code>
   → Catches syntax errors before creation

2. CreateClass - Create the class
   → use_mcp_tool: CreateClass
     - class_name: "ZCL_MY_CLASS"
     - source_code: <validated_code>
     - auto_activate: false
     - package: "$TMP"

3. CheckSyntax - Validate test source code
   → use_mcp_tool: CheckSyntax with source_code=<test_code>
   → Ensures test code is syntactically correct

4. CreateClassTests - Add unit tests
   → use_mcp_tool: CreateClassTests
     - parent_class_name: "ZCL_MY_CLASS"
     - test_source_code: <validated_test_code>
     - auto_activate: false

5. RunClassTests - Execute tests
   → use_mcp_tool: RunClassTests with class_name=ZCL_MY_CLASS
   → All tests must pass before activation

6. ActivateClasses - Activate only after tests pass
   → use_mcp_tool: ActivateClasses with class_name=ZCL_MY_CLASS
```

**Critical Rules**:
- ❌ NEVER skip CheckSyntax before creation
- ❌ NEVER activate without running tests first
- ❌ NEVER use `auto_activate: true` during development
- ✅ ALWAYS validate both class and test code
- ✅ ALWAYS run tests before activation
- ⚠️ OPTIONAL for demonstrations create classes with real ERP context (no calculator)

---

### Pattern 3: Analyze RAP Business Object

**Goal**: Understand a RAP Business Object structure and implementation.

**Steps**:
```
1. Complete BO analysis (use resource, not tools!)
   → access_mcp_resource: uri=rap-bo-analysis:///I_SalesOrder
   → Returns: Complete structure in one call (~30K tokens)

2. Analyze specific components (if needed)
   → use_mcp_tool: GetCDSView with view_name=I_SalesOrder
   → use_mcp_tool: GetBehaviorDefinition with cds_view_name=R_SalesOrderTP

3. Check service exposure
   → use_mcp_tool: GetServiceDefinition with service_name=...
   → use_mcp_tool: GetServiceBinding with binding_name=...
```

**Why use resource first?**
- ✅ Single call gets entire BO structure
- ✅ Cacheable by MCP client
- ✅ More token-efficient than multiple tool calls
- ✅ Provides comprehensive overview

---

### Pattern 4: Query Table Data

**Goal**: Retrieve and analyze data from ABAP tables.

**Steps**:
```
1. Understand table structure
   → access_mcp_resource: uri=abap://table/MARA
   → Returns: Fields, keys, data elements

2. Query data with filtering
   → use_mcp_tool: GetTableContents
     - table_name: "MARA"
     - columns: ["MATNR", "MTART", "MATKL"]
     - where_conditions: {"MTART": "FERT"}
     - max_rows: 50
     - include_column_metadata: true

3. Batch queries (if multiple tables)
   → use_mcp_tool: GetTableContents
     - queries: [
         {table_name: "MARA", max_rows: 20},
         {table_name: "MAKT", max_rows: 20}
       ]
```

**Note**: ADT Data Preview API only supports equality (=) operator in WHERE conditions.

---

### Pattern 5: Refactor Existing Class

**Goal**: Safely modify an existing class while maintaining test coverage.

**Steps**:
```
1. Get current class source
   → access_mcp_resource: uri=abap://class/ZCL_EXISTING_CLASS

2. Get existing unit tests
   → use_mcp_tool: GetClassTests with class_name=ZCL_EXISTING_CLASS

3. Validate modified source
   → use_mcp_tool: CheckSyntax with source_code=<modified_code>

4. Update class (with backup)
   → use_mcp_tool: CreateClass
     - class_name: "ZCL_EXISTING_CLASS"
     - source_code: <modified_code>
     - backup_existing: true
     - auto_activate: false

5. Verify tests still pass
   → use_mcp_tool: RunClassTests with class_name=ZCL_EXISTING_CLASS

6. Check test coverage
   → use_mcp_tool: GetClassCoverage with class_name=ZCL_EXISTING_CLASS

7. Activate if all checks pass
   → use_mcp_tool: ActivateClasses with class_name=ZCL_EXISTING_CLASS
```

---

## Best Practices

### 1. Resource Usage

**⭐ ALWAYS prefer resources over tools when available!**

```
❌ DON'T: use_mcp_tool GetPackage with package_name="APPL"
✅ DO: access_mcp_resource uri="abap://package/APPL"

❌ DON'T: use_mcp_tool GetClass with class_name="CL_ABAP_TYPEDESCR"
✅ DO: access_mcp_resource uri="abap://class/CL_ABAP_TYPEDESCR"

❌ DON'T: Multiple GetBehaviorDefinition, GetCDSView calls
✅ DO: access_mcp_resource uri="rap-bo-analysis:///I_SalesOrder"
```

**Why?**
- Resources are cacheable (reduces token usage)
- Resources provide comprehensive data in one call
- Resources are more efficient for the MCP protocol

---

### 2. Token Efficiency

**Package Discovery**:
```
# Lightest: Names only (~5K tokens)
abap://packages/top-level/names

# Light: Filtered query (~500-2K tokens)
abap://packages/top-level?prefix=FIN&fields=name,description&limit=20

# Heavy: Full list (~35K tokens) - use sparingly
abap://packages/top-level
```

**RAP BO Analysis**:
```
# Summary level (faster, fewer tokens)
rap-bo-analysis:///I_SalesOrder?depth=summary

# Detailed (default)
rap-bo-analysis:///I_SalesOrder

# Comprehensive (most tokens)
rap-bo-analysis:///I_SalesOrder?depth=comprehensive
```

---

### 3. Class Development

**ALWAYS follow this sequence**:
1. ✅ CheckSyntax (class code)
2. ✅ CreateClass (auto_activate: false)
3. ✅ CheckSyntax (test code)
4. ✅ CreateClassTests (auto_activate: false)
5. ✅ RunClassTests (verify all pass)
6. ✅ ActivateClasses (only after tests pass)

**Common Mistakes**:
- ❌ Creating class without CheckSyntax first
- ❌ Using auto_activate: true during development
- ❌ Activating without running tests
- ❌ Ignoring test coverage

---

### 4. ABAP Cloud Compliance

**All new development must comply with ABAP Cloud (Tier 1) restrictions.**

**Allowed**:
```abap
" ✅ Released APIs and CDS views
SELECT * FROM I_BusinessPartner INTO TABLE @DATA(lt_bp).

" ✅ Released classes
DATA(lo_uuid) = cl_system_uuid=>create_uuid_x16_static( ).

" ✅ RAP business object access
MODIFY ENTITIES OF I_SalesOrderTP...
```

**Forbidden**:
```abap
" ❌ Direct database table access (use CDS views)
SELECT * FROM vbak INTO TABLE @DATA(lt_vbak).

" ❌ Unreleased function modules
CALL FUNCTION 'CONVERSION_EXIT_ALPHA_INPUT'.

" ❌ Classic dynpro processing
CALL SCREEN 100.

" ❌ Direct COMMIT/ROLLBACK (use RAP save sequence)
COMMIT WORK.
```

---

### 5. RAP Development

**Key Principles**:
- Always use `strict ( 2 );` in behavior definitions
- Use `CORRESPONDING #( )` for all entity operations
- Implement proper authorization (global + instance)
- Add validations with `on save` timing
- Use determinations for calculated fields
- Declare side effects for UI refresh

**Example Behavior Definition**:
```cds
managed implementation in class zbp_r_salesordertp unique;
strict ( 2 );
with draft;

define behavior for R_SalesOrderTP alias SalesOrder
persistent table zsalesorder
draft table zsalesorder_d
etag master LocalLastChangedAt
lock master total etag LastChangedAt
authorization master ( global, instance )
{
  create;
  update;
  delete;

  field ( readonly ) SalesOrder, CreationDate;
  field ( mandatory ) SalesOrderType, SoldToParty;

  validation ValidateSoldToParty on save { create; field SoldToParty; }
  determination CalculateNetAmount on modify { field Quantity, Price; }

  side effects { field Quantity affects field NetAmount; }
}
```

---

### 6. Testing Requirements

| Code Type | Minimum Coverage | Target Coverage |
|-----------|------------------|-----------------|
| RAP Behavior Implementation | 80% | 90% |
| Business Logic Classes | 70% | 85% |
| Utility/Helper Classes | 60% | 75% |

**Always**:
- Write unit tests for all new classes
- Use test doubles for external dependencies
- Test both positive and negative scenarios
- Check coverage with GetClassCoverage

---

### 7. Performance Optimization

**CDS Views**:
```cds
" ❌ Avoid: Scalar subqueries
( select sum( netwr ) from vbap where vbeln = vbak.vbeln ) as TotalAmount

" ✅ Better: Use associations
association [0..*] to vbap as _Item on $projection.SalesDocument = _Item.vbeln
```

**ABAP SQL**:
```abap
" ❌ Avoid: SELECT in loops
LOOP AT lt_materials INTO DATA(ls_material).
  SELECT SINGLE maktx FROM makt INTO ls_material-description...
ENDLOOP.

" ✅ Better: FOR ALL ENTRIES
SELECT matnr, maktx FROM makt
  FOR ALL ENTRIES IN @lt_materials
  WHERE matnr = @lt_materials-matnr...
```

---

## Agent-Specific Notes

### Cline

**Optimizations**:
- Cline has excellent MCP resource caching
- Use task_progress parameter to track workflow steps
- Leverage Cline's tool use formatting with XML tags

**Recommended Workflow**:
1. Start with `agent-guide://cline` resource
2. Use resources for discovery (packages, RAP BOs)
3. Follow mandatory class creation workflow
4. Update task_progress after each step

**Example**:
```xml
<access_mcp_resource>
<server_name>mcp-abap-adt-1</server_name>
<uri>agent-guide://cline</uri>
<task_progress>
- [ ] Analyze requirements
- [ ] Create class with tests
- [ ] Verify and activate
</task_progress>
</access_mcp_resource>
```

---

### Claude Desktop

**Optimizations**:
- Claude Desktop supports full MCP protocol
- Excellent at understanding complex RAP structures
- Strong at generating comprehensive test cases

**Recommended Workflow**:
1. Access `agent-guide://claude` for Claude-specific tips
2. Use RAP BO analysis resources for complex structures
3. Leverage Claude's context window for large codebases
4. Request comprehensive test coverage

**Best Practices**:
- Use resources to minimize token usage
- Cache package lists for session
- Request explanations of complex ABAP patterns

---

### Cursor

**Optimizations**:
- Cursor has strong code completion capabilities
- Excellent at refactoring existing code
- Good at understanding project structure

**Recommended Workflow**:
1. Get `agent-guide://cursor` for Cursor-specific patterns
2. Use resources for code discovery
3. Leverage Cursor's multi-file editing for RAP development
4. Use GetClassUsages to understand dependencies

**Best Practices**:
- Start with package discovery resources
- Use resources for reading, tools for writing
- Follow strict class creation workflow
- Verify changes with RunClassTests

---

### OpenCode

**Optimizations**:
- OpenCode supports standard MCP protocol
- Good at following structured workflows
- Effective at test-driven development

**Recommended Workflow**:
1. Access `agent-guide://opencode` for OpenCode-specific guidance
2. Use resources for efficient discovery
3. Follow mandatory testing workflows
4. Leverage batch operations where possible

**Best Practices**:
- Use lightweight resources (package names, summary analysis)
- Follow step-by-step workflows strictly
- Always validate syntax before creation
- Run tests before activation

---

## MCP Workflow Prompts

### Available Workflow Prompts

The server provides **5 interactive workflow prompts** that guide you through common tasks:

1. **create-class-workflow** - Create and test ABAP classes
   - Arguments: `class_name` (required), `description` (optional)
   - Provides step-by-step guidance with mandatory validation steps

2. **package-discovery-workflow** - Token-efficient package navigation
   - Arguments: `search_term` (optional)
   - Guides through efficient package discovery

3. **rap-bo-analysis-workflow** - Analyze RAP Business Objects
   - Arguments: `rap_bo_name` (required), `depth` (optional)
   - Complete BO structure analysis workflow

4. **refactor-class-workflow** - Safe class refactoring with backup
   - Arguments: `class_name` (required)
   - Ensures safe refactoring with backup and testing

5. **table-analysis-workflow** - Analyze database tables
   - Arguments: `table_name` (required), `max_rows` (optional)
   - Guides through table structure and data analysis

### How to Use Prompts

Invoke prompts through your MCP client to receive step-by-step guidance:

```
# Example: Create a class
invoke_prompt: create-class-workflow
arguments: {class_name: "ZCL_CALCULATOR", description: "Calculator class"}

# Example: Analyze a package
invoke_prompt: package-discovery-workflow
arguments: {search_term: "FIN"}

# Example: Analyze RAP BO
invoke_prompt: rap-bo-analysis-workflow
arguments: {rap_bo_name: "I_SalesOrder", depth: "summary"}
```

**Benefits:**
- ✅ Step-by-step guidance
- ✅ Mandatory validation steps included
- ✅ Best practices enforced
- ✅ Common mistakes highlighted
- ✅ Success criteria defined

---

## Workflow Optimizations

### Overview

The MCP ABAP ADT Server provides **two workflow approaches** for class creation:

1. **Standard Workflow** (`create-class-workflow`) - Safe, thorough, recommended for beginners
2. **Quick Workflow** (`quick-class-workflow`) - Optimized, 40% faster, for experienced users

### Workflow Comparison

| Aspect | Standard Workflow | Quick Workflow | Improvement |
|--------|------------------|----------------|-------------|
| **Steps** | 6 steps | 4 steps | -33% |
| **Time** | 3-5 minutes | 2-3 minutes | -40% |
| **API Calls** | 6 calls | 4 calls | -33% |
| **Validation** | Sequential | Batch upfront | Faster |
| **Activation** | Manual step | Auto on success | Automated |
| **Best For** | Learning, debugging | Production, iteration | - |

### Standard Workflow (create-class-workflow)

**When to Use**:
- ✅ You're new to ABAP or the MCP server
- ✅ You want step-by-step guidance
- ✅ You need to debug issues between steps
- ✅ You prefer explicit control over activation

**Steps**:
```
1. CheckSyntax (class code)          ⏱️ ~15 sec
2. CreateClass (auto_activate: false) ⏱️ ~10 sec
3. CheckSyntax (test code)            ⏱️ ~15 sec
4. CreateClassTests                   ⏱️ ~10 sec
5. RunClassTests                      ⏱️ ~20 sec
6. ActivateClasses                    ⏱️ ~10 sec
---------------------------------------------------
Total: 6 steps, ~80 seconds, 6 API calls
```

**Example**:
```
invoke_prompt: create-class-workflow
arguments: {
  class_name: "ZCL_MATERIAL_VALIDATOR",
  description: "Material Master Data Validator"
}
```

### Quick Workflow (quick-class-workflow)

**When to Use**:
- ✅ You're experienced with ABAP development
- ✅ You have both class and test code ready
- ✅ You want faster iteration cycles
- ✅ You trust your validation process

**Steps**:
```
1. Batch Validation (class + tests)  ⏱️ ~15 sec
2. CreateClass (auto_activate: true)  ⏱️ ~10 sec
3. CreateClassTests                   ⏱️ ~10 sec
4. RunClassTests                      ⏱️ ~20 sec
---------------------------------------------------
Total: 4 steps, ~55 seconds, 4 API calls
```

**Key Optimizations**: 
- Batch validation upfront catches all errors early
- `auto_activate: true` in CreateClass (safe since syntax validated)
- No redundant validation - tests already checked in Step 1

**Example**:
```
invoke_prompt: quick-class-workflow
arguments: {
  class_name: "ZCL_MATERIAL_VALIDATOR",
  description: "Material Master Data Validator"
}
```

### Optimization Techniques

#### 1. Batch Validation
**Standard Approach**:
```
CheckSyntax (class) → wait → CheckSyntax (tests) → wait
```

**Optimized Approach**:
```
CheckSyntax (class) + CheckSyntax (tests) → validate both upfront
```

**Benefits**:
- Catch all syntax errors before creating anything
- Reduce back-and-forth iterations
- Fail fast if either has issues

#### 2. Auto-Activation on Success
**Standard Approach**:
```
RunClassTests → wait → verify results → ActivateClasses
```

**Optimized Approach**:
```
RunClassTests (auto_activate: true) → activates if tests pass
```

**Benefits**:
- Single API call instead of two
- Automatic activation on success
- Still safe - only activates if ALL tests pass

**How it works**:
```typescript
// CreateClass with auto_activate: true (after validation)
{
  class_name: "ZCL_MY_CLASS",
  source_code: "<validated code>",
  auto_activate: true  // ← Safe because syntax already validated
}
```

**Why this is safe**:
- Syntax validated in Step 1 (batch validation)
- Code is guaranteed to be syntactically correct
- Auto-activation happens immediately after creation
- Tests validated upfront, no need to check again

**Result**: Class is created and activated in one step, tests run on activated class.

#### 3. Workflow Selection Strategy

```
┌─────────────────────────────────────┐
│ Are you new to ABAP/MCP?            │
│ Do you need step-by-step guidance?  │
│ Do you want explicit control?       │
└─────────────────────────────────────┘
         │ YES                │ NO
         ↓                    ↓
┌──────────────────┐  ┌──────────────────┐
│ Standard Workflow│  │  Quick Workflow  │
│ (6 steps)        │  │  (4 steps)       │
│ 3-5 minutes      │  │  2-3 minutes     │
└──────────────────┘  └──────────────────┘
```

### Performance Metrics

Based on real-world usage:

| Metric | Standard | Quick | Savings |
|--------|----------|-------|---------|
| **Total Time** | 3-5 min | 2-3 min | 40% |
| **API Calls** | 6 | 4 | 33% |
| **User Interactions** | 6 | 4 | 33% |
| **Syntax Validations** | 2 sequential | 2 batch | Faster |
| **Activation** | Manual | Auto | Automated |

### Best Practices for Optimized Workflows

1. **Prepare Code Upfront**
   - Have both class and test code ready before starting
   - Validate locally if possible
   - Use IDE syntax checking first

2. **Use Batch Validation**
   - Validate class and test code together
   - Fix all syntax errors before creation
   - Reduces iteration cycles

3. **Trust Auto-Activation**
   - `auto_activate: true` is safe when tests pass
   - Activation only happens on success
   - Errors are caught and reported

4. **Choose the Right Workflow**
   - Standard for learning and debugging
   - Quick for production and iteration
   - Switch between them as needed

5. **Monitor Results**
   - Check test results carefully
   - Verify coverage with GetClassCoverage
   - Review activation status

### Migration Guide

**Switching from Standard to Quick**:

```
Standard Workflow:
1. CheckSyntax (class)
2. CreateClass (auto_activate: false)
3. CheckSyntax (tests)
4. CreateClassTests
5. RunClassTests
6. ActivateClasses

↓ Optimize to ↓

Quick Workflow:
1. CheckSyntax (class) + CheckSyntax (tests)  ← Batch upfront
2. CreateClass (auto_activate: true)          ← Auto-activate (safe!)
3. CreateClassTests (no validation needed)    ← Already validated
4. RunClassTests                              ← Run on activated class
```

**What Changes**:
- ✅ Validate both upfront (batch)
- ✅ Use auto_activate: true in CreateClass (safe after validation)
- ✅ Skip redundant test validation
- ✅ Skip manual ActivateClasses step

**What Stays the Same**:
- ✅ Syntax validation is still mandatory
- ✅ Tests must pass for completion
- ✅ Same safety guarantees
- ✅ Same error handling

### Troubleshooting Optimized Workflows

**Issue**: Auto-activation fails
```
Solution:
1. Review test results in response
2. Check activation error messages
3. Fix issues in class or tests
4. Re-run from batch validation
5. Or switch to standard workflow for debugging
```

**Issue**: Batch validation shows errors
```
Solution:
1. Fix syntax errors in class code
2. Fix syntax errors in test code
3. Re-run batch validation
4. Only proceed when both pass
```

**Issue**: Tests pass but activation fails
```
Solution:
1. Check activation warnings/errors
2. Review class dependencies
3. Verify package permissions
4. Use standard workflow for detailed debugging
```

### Additional Workflow Prompts

The server also provides optimized workflows for other tasks:

1. **package-discovery-workflow** - 90%+ token savings
2. **rap-bo-analysis-workflow** - Single-call BO analysis
3. **refactor-class-workflow** - Safe refactoring with backup
4. **table-analysis-workflow** - Efficient table exploration

All workflows follow the same optimization principles:
- Batch operations where possible
- Resource usage over tools
- Minimal API calls
- Maximum efficiency

---

## Critical Best Practices

### 1. Syntax Validation First
- **ALWAYS** use CheckSyntax before CreateClass or CreateClassTests
- Catches errors early and prevents broken objects
- Validates both class code and test code separately

### 2. Test Before Activation
- **NEVER** activate without running tests first
- Use `auto_activate: false` during development
- Only activate after RunClassTests confirms all tests pass

### 3. Coverage Checking
- Use GetClassCoverage to ensure adequate test coverage
- Target: >70% statement coverage minimum
- Check coverage before final activation

### 4. Backup Important Classes
- Use `backup_existing: true` when updating existing classes
- Backup includes timestamp and original content
- Essential for safe refactoring

### 5. Wildcard Search
- SearchObject supports `*` wildcards
- Examples: `ZCL_*` (all Z classes), `*INVOICE*` (contains invoice)
- Use for discovery and exploration

### 6. Batch Queries
- GetTableContents supports multiple table queries
- More efficient than individual queries
- Use `queries` parameter for batch operations

---

## Common Mistakes to Avoid

1. ❌ Creating class without CheckSyntax first
   ✅ Always validate syntax before creation

2. ❌ Using auto_activate: true during development
   ✅ Use auto_activate: false, activate after testing

3. ❌ Activating without running tests
   ✅ Run tests first, activate only if they pass

4. ❌ Updating classes without backup
   ✅ Use backup_existing: true for safety

5. ❌ Ignoring test coverage
   ✅ Check coverage with GetClassCoverage

6. ❌ Creating tests without syntax validation
   ✅ Use CheckSyntax for test code too

---

## RAP Business Object Guidelines

### RAP BO Component Relationships
```
CDS View (Data Model)
    ↓
Behavior Definition (Business Logic)
    ↓
Service Definition (Exposure)
    ↓
Service Binding (Protocol - OData V2/V4)
    ↓
Metadata Extension (UI Annotations)
    ↓
Access Control (Authorization)
```

### RAP BO Naming Conventions
- **ZI_***: Interface views (data model layer)
- **ZC_***: Consumption views (projection layer)
- **ZR_***: Restricted views (authorization layer)
- **_M**: Managed scenario suffix
- **_U**: Unmanaged scenario suffix

### Search Patterns for RAP BOs
- Use `SearchRapBo` for RAP-specific search
- Common patterns:
  - `*_M` - Managed RAP BOs
  - `ZI_*` - Interface views
  - `ZC_*` - Consumption views
  - `*TRAVEL*`, `*BOOKING*` - Business domain

---

## Quick Reference

### Most Common Operations

**Package Discovery**:
```
access_mcp_resource: uri=abap://packages/top-level/names
```

**RAP BO Analysis**:
```
access_mcp_resource: uri=rap-bo-analysis:///I_SalesOrder?depth=summary
```

**Create Class**:
```
1. CheckSyntax → 2. CreateClass → 3. CheckSyntax → 
4. CreateClassTests → 5. RunClassTests → 6. ActivateClasses
```

**Query Table**:
```
use_mcp_tool: GetTableContents
  table_name: MARA
  columns: [MATNR, MTART]
  where_conditions: {MTART: "FERT"}
  max_rows: 50
```

### Tool Usage Guidelines

**When Creating Classes:**
```
ALWAYS follow this sequence:
1. CheckSyntax (validate class code)
2. CreateClass (auto_activate: false)
3. CheckSyntax (validate test code)
4. CreateClassTests (auto_activate: false)
5. RunClassTests (verify all pass)
6. ActivateClasses (only after tests pass)
```

**When Refactoring:**
```
ALWAYS follow this sequence:
1. GetClass (get current code)
2. GetClassTests (get existing tests)
3. CheckSyntax (validate changes)
4. CreateClass (with backup_existing: true)
5. RunClassTests (verify tests still pass)
6. GetClassCoverage (check coverage)
7. ActivateClasses (if all checks pass)
```

**When Analyzing:**
```
Start with broad view, then drill down:
1. SearchObject or GetPackageContents (discover)
2. GetClass/GetTable/GetFunction (details)
3. GetClassUsages (dependencies)
4. RunClassTests or GetClassCoverage (quality)
```

---

## Additional Resources

- **Full Documentation**: See `docs/` directory for detailed guides
- **Resources Guide**: `docs/Resources.md`
- **RAP Tools**: `docs/RAP_Tools.md`
- **Example Workflows**: `Example_AGENTS.md`

---

## Support

For issues or feature requests:
- GitHub Issues: [Report here](https://github.tools.sap/D020426/mcp-abap-adt/issues)
- Documentation: Check `docs/` directory
- Examples: See `Example_AGENTS.md`

---

*Last Updated: 2026-02-16*  
*MCP ABAP ADT Server Version: 1.0.0*  
*Supported Agents: Cline, Claude Desktop, Cursor, OpenCode*