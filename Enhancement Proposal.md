# MCP Enhancement Proposal for ABAP Development

> **Purpose**: Analysis of current MCP capabilities and proposed enhancements to fully support the tasks outlined in AGENTS.md  
> **Scope**: SAP Standard Development for S/4HANA Cloud with legacy codebase modernization

---

## Table of Contents

1. [Current MCP Capabilities](#1-current-mcp-capabilities)
2. [Gap Analysis by AGENTS.md Section](#2-gap-analysis-by-agentsmd-section)
3. [Proposed MCP Enhancements](#3-proposed-mcp-enhancements)
4. [Non-MCP Capabilities Required](#4-non-mcp-capabilities-required)
5. [Implementation Priority](#5-implementation-priority)
6. [Technical Specifications](#6-technical-specifications)

---

## 1. Current MCP Capabilities

### 1.1 Available ABAP MCP Tools

| Tool | Category | Description |
|------|----------|-------------|
| `GetProgram` | Read | Retrieve ABAP program source code |
| `GetClass` | Read | Retrieve ABAP class source code |
| `GetFunctionGroup` | Read | Retrieve Function Group source |
| `GetFunction` | Read | Retrieve Function Module source |
| `GetStructure` | Read | Retrieve ABAP Structure definition |
| `GetTable` | Read | Retrieve database table structure |
| `GetTableContents` | Read | Retrieve table data (with max rows) |
| `GetPackage` | Read | Retrieve package details and contents |
| `GetTypeInfo` | Read | Retrieve ABAP type information |
| `GetInclude` | Read | Retrieve Include source code |
| `GetInterface` | Read | Retrieve interface source code |
| `GetTransaction` | Read | Retrieve transaction details |
| `SearchObject` | Search | Quick search for ABAP objects (wildcard) |
| `GetClassUsages` | Analysis | Where-used list for classes |
| `GetClassTests` | Testing | Retrieve local test classes |
| `RunClassTests` | Testing | Execute unit tests with results |
| `GetClassCoverage` | Testing | Run tests with coverage analysis |
| `CheckSyntax` | Validation | Check ABAP source code syntax |
| `CreateClass` | Write | Create new ABAP class (local package) |
| `DeleteLocalClass` | Write | Delete local ABAP class |
| `CreateClassTests` | Write | Create/replace test classes |
| `ActivateClasses` | Write | Activate ABAP classes |

### 1.2 Current Capability Summary

```
┌─────────────────────────────────────────────────────────────────┐
│              CURRENT MCP CAPABILITY MATRIX                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Fully Supported:                                            │
│     • ABAP class/program/function module reading                │
│     • Basic object search                                       │
│     • Unit test execution and coverage                          │
│     • Syntax checking                                           │
│     • Class creation (local package only)                       │
│     • Class where-used analysis                                 │
│                                                                 │
│  ⚠️ Partially Supported:                                        │
│     • Table/Structure reading (no CDS views)                    │
│     • Object search (no advanced filtering)                     │
│                                                                 │
│  ❌ Not Supported:                                               │
│     • CDS view operations                                       │
│     • Behavior definition operations                            │
│     • Service definition/binding operations                     │
│     • Transport management                                      │
│     • ATC/Cloud readiness checks                                │
│     • Debugging/Tracing                                         │
│     • Authorization analysis                                    │
│     • Performance analysis                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Gap Analysis by AGENTS.md Section

### 2.1 Section 2: ABAP Cloud Development Model

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| Check released API status | ❌ None | Need `GetAPIReleaseState` |
| Verify C1 contract compliance | ❌ None | Need `CheckCloudReadiness` |
| S/4HANA simplification check | ❌ None | Need `GetSimplificationItems` |
| Identify released CDS views | ❌ None | Need CDS view tools |

**Required New Tools:**
```
GetAPIReleaseState(object_name, object_type)
  → Returns: release_state, contract_type (C0/C1/C2), deprecation_info

CheckCloudReadiness(object_name, object_type)
  → Returns: compliance_status, violations[], recommendations[]

GetSimplificationItems(object_name)
  → Returns: simplification_items[], replacement_objects[], notes[]
```

### 2.2 Section 3: Code Analysis & Understanding

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| Where-used list | ✅ `GetClassUsages` | Only for classes, need all objects |
| Call hierarchy | ❌ None | Need `GetCallHierarchy` |
| Data flow analysis | ❌ None | Need `GetDataFlow` |
| CDS dependency analysis | ❌ None | Need CDS tools |
| Cross-reference analysis | ❌ None | Need `GetCrossReferences` |

**Required New Tools:**
```
GetWhereUsed(object_name, object_type, include_indirect)
  → Returns: usages[] with object_type, object_name, usage_type, line_number

GetCallHierarchy(class_name, method_name, direction: 'callers'|'callees', depth)
  → Returns: call_tree[] with caller/callee, parameters, call_count

GetDataFlow(class_name, method_name, variable_name)
  → Returns: assignments[], reads[], modifications[] with line_numbers

GetCrossReferences(object_name, object_type, reference_types[])
  → Returns: references[] grouped by type (tables, classes, FMs, etc.)
```

### 2.3 Section 4: RAP Development Patterns

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| Read CDS views | ❌ None | **Critical gap** |
| Read Behavior Definitions | ❌ None | **Critical gap** |
| Read Service Definitions | ❌ None | **Critical gap** |
| Create CDS views | ❌ None | **Critical gap** |
| Create Behavior Definitions | ❌ None | **Critical gap** |
| Modify existing RAP artifacts | ❌ None | **Critical gap** |
| Read Metadata Extensions | ❌ None | Need `GetMetadataExtension` |
| Read Access Controls (DCL) | ❌ None | Need `GetAccessControl` |

**Required New Tools (HIGH PRIORITY):**
```
// CDS View Operations
GetCDSView(view_name)
  → Returns: source_code, annotations, associations[], parameters[]

CreateCDSView(view_name, source_code, package, auto_activate)
  → Returns: success, activation_errors[], warnings[]

UpdateCDSView(view_name, source_code, auto_activate)
  → Returns: success, activation_errors[], warnings[]

GetCDSViewDependencies(view_name)
  → Returns: base_views[], associations[], used_by_views[]

// Behavior Definition Operations
GetBehaviorDefinition(cds_view_name)
  → Returns: source_code, implementation_class, operations[], validations[], determinations[]

CreateBehaviorDefinition(cds_view_name, source_code, auto_activate)
  → Returns: success, activation_errors[]

UpdateBehaviorDefinition(cds_view_name, source_code, auto_activate)
  → Returns: success, activation_errors[]

// Service Operations
GetServiceDefinition(service_name)
  → Returns: source_code, exposed_entities[]

GetServiceBinding(binding_name)
  → Returns: service_definition, binding_type (OData_V2/V4), url

CreateServiceDefinition(service_name, source_code, package)
  → Returns: success, errors[]

CreateServiceBinding(binding_name, service_definition, binding_type, package)
  → Returns: success, service_url, errors[]

// Metadata Extension
GetMetadataExtension(extension_name)
  → Returns: source_code, annotated_view

CreateMetadataExtension(extension_name, source_code, package)
  → Returns: success, errors[]

// Access Control (DCL)
GetAccessControl(dcl_name)
  → Returns: source_code, protected_view, authorization_checks[]

CreateAccessControl(dcl_name, source_code, package)
  → Returns: success, errors[]
```

### 2.4 Section 5: UI Development & Migration

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| Read UI annotations | ❌ None | Part of CDS tools |
| Analyze dynpro screens | ❌ None | Need `GetDynproDetails` |
| Read WebDynpro components | ❌ None | Need `GetWebDynproComponent` |
| BSP application analysis | ❌ None | Need `GetBSPApplication` |

**Required New Tools:**
```
GetDynproDetails(program_name, screen_number)
  → Returns: fields[], flow_logic (PBO/PAI), modules[], layout_info

GetWebDynproComponent(component_name)
  → Returns: views[], controllers[], context_nodes[], actions[]

GetBSPApplication(application_name)
  → Returns: pages[], controllers[], event_handlers[]

AnalyzeUIComponents(object_name, object_type)
  → Returns: ui_type, complexity_score, migration_recommendations[]
```

### 2.5 Section 6: Integration Patterns

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| Analyze OData services | ❌ None | Need service tools |
| RFC/BAPI interface details | ⚠️ `GetFunction` | Need parameter details |
| Event definitions | ❌ None | Need `GetBusinessEvents` |
| Enterprise event analysis | ❌ None | Need event tools |

**Required New Tools:**
```
GetODataService(service_name)
  → Returns: entities[], actions[], functions[], annotations

GetFunctionModuleDetails(function_name, function_group)
  → Returns: importing[], exporting[], changing[], tables[], exceptions[], source_code

GetBusinessEvents(namespace)
  → Returns: events[] with parameters, consumers[], producers[]

GetEnterpriseEvents(channel_name)
  → Returns: event_definitions[], subscriptions[]
```

### 2.6 Section 7: Testing Strategies

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| Run unit tests | ✅ `RunClassTests` | Supported |
| Get test coverage | ✅ `GetClassCoverage` | Supported |
| Test doubles setup | ❌ None | Need test environment tools |
| Integration test execution | ❌ None | Need `RunIntegrationTests` |
| Test data management | ❌ None | Need `ManageTestData` |

**Required New Tools:**
```
GetTestEnvironment(class_name)
  → Returns: test_doubles[], sql_doubles[], mock_configurations[]

CreateTestDouble(interface_name, mock_behavior)
  → Returns: double_class_code, registration_code

RunIntegrationTests(package_name, test_configuration)
  → Returns: results[], coverage_report

ManageTestData(operation: 'create'|'delete'|'export', table_name, data)
  → Returns: success, affected_records
```

### 2.7 Section 8: Bug Fixing & Debugging

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| Access dumps (ST22) | ❌ None | Need `GetRuntimeErrors` |
| Application logs (SLG1) | ❌ None | Need `GetApplicationLogs` |
| SQL trace analysis | ❌ None | Need `GetSQLTrace` |
| Breakpoint management | ❌ None | Need debugging tools |
| Variable inspection | ❌ None | Need debugging tools |

**Required New Tools:**
```
GetRuntimeErrors(time_range, user, program_filter)
  → Returns: dumps[] with error_type, stack_trace, variables, timestamp

GetApplicationLogs(object, subobject, time_range, message_types)
  → Returns: log_entries[] with message, severity, timestamp, details

GetSQLTrace(trace_id)
  → Returns: statements[] with sql, execution_time, rows_affected, explain_plan

// Debugging capabilities (may require special server mode)
SetBreakpoint(object_name, line_number, condition)
  → Returns: breakpoint_id, success

GetVariableValue(session_id, variable_name, scope)
  → Returns: value, type, structure_content
```

### 2.8 Section 9: Performance Optimization

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| SQL execution plan | ❌ None | Need `GetSQLExplainPlan` |
| Runtime analysis | ❌ None | Need `GetRuntimeAnalysis` |
| Memory consumption | ❌ None | Need `GetMemoryAnalysis` |
| CDS view performance | ❌ None | Need `AnalyzeCDSPerformance` |

**Required New Tools:**
```
GetSQLExplainPlan(sql_statement)
  → Returns: execution_plan, cost_estimate, index_usage, recommendations[]

GetRuntimeAnalysis(object_name, method_name)
  → Returns: call_statistics[], hotspots[], memory_allocation

AnalyzeCDSPerformance(view_name)
  → Returns: execution_time, data_volume, join_analysis, optimization_hints[]

GetPerformanceMetrics(object_name, time_range)
  → Returns: avg_response_time, call_count, resource_consumption
```

### 2.9 Section 10: Security Considerations

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| Authorization object analysis | ❌ None | Need `GetAuthorizationObjects` |
| DCL analysis | ❌ None | Part of CDS tools |
| Security audit | ❌ None | Need `RunSecurityAudit` |
| Role analysis | ❌ None | Need `GetRoleAssignments` |

**Required New Tools:**
```
GetAuthorizationObjects(class_name)
  → Returns: auth_checks[] with object, fields, activities, location

AnalyzeAuthorization(object_name, user)
  → Returns: required_authorizations[], user_authorizations[], gaps[]

RunSecurityAudit(object_name, object_type)
  → Returns: findings[] with severity, description, recommendation

GetRoleAssignments(authorization_object)
  → Returns: roles[] with users[], permissions[]
```

### 2.10 Section 11: Coding Conventions & Standards

| Requirement | Current Support | Gap |
|-------------|-----------------|-----|
| ATC checks | ❌ None | Need `RunATCCheck` |
| Code metrics | ❌ None | Need `GetCodeMetrics` |
| Naming convention check | ❌ None | Need `CheckNamingConventions` |
| Documentation completeness | ❌ None | Need `CheckDocumentation` |

**Required New Tools:**
```
RunATCCheck(object_name, object_type, check_variant)
  → Returns: findings[] with priority, message, line, check_id

GetCodeMetrics(object_name)
  → Returns: lines_of_code, cyclomatic_complexity, comment_ratio, method_count

CheckNamingConventions(object_name, convention_profile)
  → Returns: violations[] with element, expected_pattern, actual_name

CheckDocumentation(object_name)
  → Returns: coverage_percentage, missing_docs[] with element_type, element_name
```

---

## 3. Proposed MCP Enhancements

### 3.1 Priority 1: Critical RAP Support (Must Have)

These tools are essential for any RAP development as outlined in AGENTS.md:

```
┌─────────────────────────────────────────────────────────────────┐
│                 PRIORITY 1: RAP FOUNDATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CDS View Operations:                                           │
│  ├── GetCDSView(view_name)                                      │
│  ├── CreateCDSView(view_name, source_code, package)             │
│  ├── UpdateCDSView(view_name, source_code)                      │
│  ├── GetCDSViewDependencies(view_name)                          │
│  └── ActivateCDSView(view_name)                                 │
│                                                                 │
│  Behavior Definition Operations:                                │
│  ├── GetBehaviorDefinition(cds_view_name)                       │
│  ├── CreateBehaviorDefinition(cds_view_name, source_code)       │
│  ├── UpdateBehaviorDefinition(cds_view_name, source_code)       │
│  └── GetBehaviorImplementation(cds_view_name)                   │
│                                                                 │
│  Service Operations:                                            │
│  ├── GetServiceDefinition(service_name)                         │
│  ├── CreateServiceDefinition(service_name, source_code)         │
│  ├── GetServiceBinding(binding_name)                            │
│  └── CreateServiceBinding(binding_name, service_def, type)      │
│                                                                 │
│  Supporting RAP Artifacts:                                      │
│  ├── GetMetadataExtension(extension_name)                       │
│  ├── CreateMetadataExtension(extension_name, source_code)       │
│  ├── GetAccessControl(dcl_name)                                 │
│  └── CreateAccessControl(dcl_name, source_code)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Priority 2: Cloud Compliance (Should Have)

Essential for S/4HANA Cloud development:

```
┌─────────────────────────────────────────────────────────────────┐
│              PRIORITY 2: CLOUD COMPLIANCE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  API Release State:                                             │
│  ├── GetAPIReleaseState(object_name, object_type)               │
│  ├── CheckCloudReadiness(object_name, object_type)              │
│  └── GetSimplificationItems(object_name)                        │
│                                                                 │
│  ATC Integration:                                               │
│  ├── RunATCCheck(object_name, check_variant)                    │
│  ├── GetATCFindings(object_name)                                │
│  └── GetATCExemptions(object_name)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Priority 3: Code Analysis (Should Have)

For understanding and maintaining legacy code:

```
┌─────────────────────────────────────────────────────────────────┐
│              PRIORITY 3: CODE ANALYSIS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Enhanced Where-Used:                                           │
│  ├── GetWhereUsed(object_name, object_type, include_indirect)   │
│  ├── GetCallHierarchy(class, method, direction, depth)          │
│  └── GetCrossReferences(object_name, reference_types[])         │
│                                                                 │
│  Data Flow:                                                     │
│  ├── GetDataFlow(class, method, variable)                       │
│  └── GetVariableUsages(class, method, variable)                 │
│                                                                 │
│  Code Metrics:                                                  │
│  ├── GetCodeMetrics(object_name)                                │
│  ├── GetCodeComplexity(object_name)                             │
│  └── CheckNamingConventions(object_name, profile)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Priority 4: Testing Enhancement (Should Have)

Extend current testing capabilities:

```
┌─────────────────────────────────────────────────────────────────┐
│              PRIORITY 4: TESTING ENHANCEMENT                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Test Management:                                               │
│  ├── RunPackageTests(package_name, recursive)                   │
│  ├── GetTestEnvironment(class_name)                             │
│  └── ManageTestData(operation, table, data)                     │
│                                                                 │
│  Coverage Analysis:                                             │
│  ├── GetPackageCoverage(package_name)                           │
│  └── GetMethodCoverage(class_name, method_name)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Priority 5: Debugging & Performance (Nice to Have)

Advanced analysis capabilities:

```
┌─────────────────────────────────────────────────────────────────┐
│         PRIORITY 5: DEBUGGING & PERFORMANCE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Error Analysis:                                                │
│  ├── GetRuntimeErrors(time_range, filters)                      │
│  ├── GetApplicationLogs(object, subobject, time_range)          │
│  └── GetSystemLogs(time_range, filters)                         │
│                                                                 │
│  Performance Analysis:                                          │
│  ├── GetSQLExplainPlan(sql_statement)                           │
│  ├── AnalyzeCDSPerformance(view_name)                           │
│  └── GetRuntimeAnalysis(object_name, method_name)               │
│                                                                 │
│  Security Analysis:                                             │
│  ├── GetAuthorizationObjects(class_name)                        │
│  ├── AnalyzeAuthorization(object_name, user)                    │
│  └── RunSecurityAudit(object_name)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.6 Priority 6: Legacy UI Analysis (Nice to Have)

For migration scenarios:

```
┌─────────────────────────────────────────────────────────────────┐
│              PRIORITY 6: LEGACY UI ANALYSIS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Dynpro Analysis:                                               │
│  ├── GetDynproDetails(program, screen_number)                   │
│  ├── GetDynproFlowLogic(program, screen_number)                 │
│  └── AnalyzeDynproComplexity(program)                           │
│                                                                 │
│  WebDynpro Analysis:                                            │
│  ├── GetWebDynproComponent(component_name)                      │
│  ├── GetWebDynproViews(component_name)                          │
│  └── GetWebDynproContext(component_name)                        │
│                                                                 │
│  BSP Analysis:                                                  │
│  ├── GetBSPApplication(application_name)                        │
│  └── GetBSPPages(application_name)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Non-MCP Capabilities Required

Some capabilities may be better addressed outside the MCP framework:

### 4.1 IDE Integration (ADT/VS Code)

| Capability | Rationale |
|------------|-----------|
| Real-time syntax highlighting | Performance-sensitive, IDE-native |
| Auto-completion | Requires low-latency, IDE-native |
| Refactoring tools | Complex multi-file operations |
| Live debugging | Session management complexity |

### 4.2 External Tool Integration

| Tool | Purpose | Integration Method |
|------|---------|-------------------|
| Git/gCTS | Version control | Native Git + gCTS API |
| CI/CD Pipeline | Build automation | Jenkins/Azure DevOps plugins |
| Documentation | Generate docs | Markdown + external tools |
| Code Review | PR workflows | GitHub/GitLab integration |

### 4.3 Knowledge Base / RAG

For AI assistant effectiveness, consider:

| Capability | Description |
|------------|-------------|
| Clean ABAP guidelines | Embedded knowledge for code generation |
| RAP best practices | Pattern library for behavior implementations |
| CDS annotation reference | Complete annotation documentation |
| S/4HANA API catalog | Released API database for compliance |
| Error message database | Common errors and solutions |

---

## 5. Implementation Priority

### 5.1 Recommended Implementation Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                 IMPLEMENTATION ROADMAP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1 (Weeks 1-4): RAP Foundation                            │
│  ├── CDS View CRUD operations                                   │
│  ├── Behavior Definition CRUD operations                        │
│  ├── Service Definition/Binding operations                      │
│  └── Metadata Extension and DCL operations                      │
│                                                                 │
│  PHASE 2 (Weeks 5-8): Cloud Compliance                          │
│  ├── API Release State checking                                 │
│  ├── Cloud Readiness validation                                 │
│  ├── ATC check integration                                      │
│  └── Simplification item lookup                                 │
│                                                                 │
│  PHASE 3 (Weeks 9-12): Code Analysis                            │
│  ├── Enhanced where-used for all object types                   │
│  ├── Call hierarchy analysis                                    │
│  ├── Cross-reference analysis                                   │
│  └── Code metrics and complexity                                │
│                                                                 │
│  PHASE 4 (Weeks 13-16): Testing & Performance                   │
│  ├── Package-level test execution                               │
│  ├── Test data management                                       │
│  ├── SQL explain plans                                          │
│  └── CDS performance analysis                                   │
│                                                                 │
│  PHASE 5 (Weeks 17-20): Advanced Features                       │
│  ├── Runtime error analysis                                     │
│  ├── Application log access                                     │
│  ├── Authorization analysis                                     │
│  └── Legacy UI analysis tools                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Quick Wins (Immediate Value)

These can be implemented quickly with high impact:

| Tool | Effort | Impact | Dependencies |
|------|--------|--------|--------------|
| `GetCDSView` | Low | High | Existing ADT APIs |
| `GetBehaviorDefinition` | Low | High | Existing ADT APIs |
| `GetServiceDefinition` | Low | High | Existing ADT APIs |
| `GetAPIReleaseState` | Medium | High | API_RELEASE_STATE CDS |
| `RunATCCheck` | Medium | High | ATC Framework APIs |

### 5.3 Strategic Investments (Longer Term)

| Tool | Effort | Impact | Rationale |
|------|--------|--------|-----------|
| Create/Update CDS/BDEF | High | Critical | Enables full RAP development |
| Performance analysis suite | High | Medium | Complex implementation |
| Debugging integration | Very High | Medium | Session management |
| Legacy UI analysis | Medium | Low | Niche use case |

---

## 6. Technical Specifications

### 6.1 API Endpoints for Priority 1 Tools

#### GetCDSView

```json
{
  "name": "GetCDSView",
  "parameters": {
    "view_name": {
      "type": "string",
      "required": true,
      "description": "Name of the CDS view entity"
    },
    "include_annotations": {
      "type": "boolean",
      "default": true,
      "description": "Include CDS annotations in response"
    }
  },
  "returns": {
    "source_code": "string",
    "annotations": "object[]",
    "associations": "object[]",
    "parameters": "object[]",
    "base_entity": "string",
    "view_type": "string (BASIC|COMPOSITE|CONSUMPTION|EXTENSION)"
  }
}
```

#### GetBehaviorDefinition

```json
{
  "name": "GetBehaviorDefinition",
  "parameters": {
    "cds_view_name": {
      "type": "string",
      "required": true,
      "description": "Name of the root CDS view entity"
    }
  },
  "returns": {
    "source_code": "string",
    "implementation_type": "string (managed|unmanaged)",
    "implementation_class": "string",
    "strict_mode": "number",
    "draft_enabled": "boolean",
    "operations": {
      "create": "boolean",
      "update": "boolean",
      "delete": "boolean"
    },
    "actions": "object[]",
    "determinations": "object[]",
    "validations": "object[]",
    "authorization": "object"
  }
}
```

#### CreateCDSView

```json
{
  "name": "CreateCDSView",
  "parameters": {
    "view_name": {
      "type": "string",
      "required": true,
      "description": "Name of the CDS view to create"
    },
    "source_code": {
      "type": "string",
      "required": true,
      "description": "Complete CDS view source code"
    },
    "package": {
      "type": "string",
      "default": "$TMP",
      "description": "Target package (must be local for non-transport)"
    },
    "auto_activate": {
      "type": "boolean",
      "default": false,
      "description": "Automatically activate after creation"
    }
  },
  "returns": {
    "success": "boolean",
    "view_name": "string",
    "activation_status": "string",
    "errors": "object[]",
    "warnings": "object[]"
  }
}
```

#### CheckCloudReadiness

```json
{
  "name": "CheckCloudReadiness",
  "parameters": {
    "object_name": {
      "type": "string",
      "required": true,
      "description": "Name of the ABAP object to check"
    },
    "object_type": {
      "type": "string",
      "required": false,
      "description": "Object type (auto-detected if not provided)"
    },
    "include_dependencies": {
      "type": "boolean",
      "default": true,
      "description": "Check dependencies for cloud readiness"
    }
  },
  "returns": {
    "compliant": "boolean",
    "tier": "string (TIER1|TIER2|TIER3)",
    "violations": [
      {
        "type": "string",
        "message": "string",
        "line": "number",
        "object_used": "string",
        "replacement": "string"
      }
    ],
    "dependencies_checked": "number",
    "non_compliant_dependencies": "object[]"
  }
}
```

### 6.2 Implementation Notes

#### ADT REST API Endpoints

Most tools can leverage existing ADT REST APIs:

| Tool Category | ADT Endpoint Pattern |
|---------------|---------------------|
| CDS Views | `/sap/bc/adt/ddic/ddlx/sources/{name}` |
| Behavior Def | `/sap/bc/adt/bo/behaviors/{name}` |
| Services | `/sap/bc/adt/businessservices/{name}` |
| ATC | `/sap/bc/adt/atc/runs` |
| Where-Used | `/sap/bc/adt/repository/informationsystem/usages` |

#### Authentication & Authorization

- Use existing ABAP MCP server authentication mechanism
- Require `S_DEVELOP` authorization for write operations
- Require `S_ADT_RES` for ADT resource access

#### Error Handling

All new tools should follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "CDS_NOT_FOUND",
    "message": "CDS view 'I_UNKNOWN' does not exist",
    "details": {
      "searched_name": "I_UNKNOWN",
      "similar_objects": ["I_SALESORDER", "I_SALESORDERITEM"]
    }
  }
}
```

---

## 7. Summary

### 7.1 Gap Summary by AGENTS.md Section

| Section | Current Coverage | After Enhancement |
|---------|------------------|-------------------|
| 2. Cloud Development Model | 0% | 100% |
| 3. Code Analysis | 30% | 90% |
| 4. RAP Development | 5% | 95% |
| 5. UI Migration | 0% | 70% |
| 6. Integration | 20% | 85% |
| 7. Testing | 60% | 90% |
| 8. Debugging | 10% | 70% |
| 9. Performance | 0% | 75% |
| 10. Security | 0% | 80% |
| 11. Coding Standards | 20% | 90% |

### 7.2 Minimum Viable Enhancement

To support basic RAP development as outlined in AGENTS.md, the **minimum required tools** are:

1. **`GetCDSView`** - Read CDS view source
2. **`GetBehaviorDefinition`** - Read behavior definition
3. **`GetServiceDefinition`** - Read service definition
4. **`CreateCDSView`** - Create new CDS views
5. **`CreateBehaviorDefinition`** - Create behavior definitions
6. **`GetAPIReleaseState`** - Check API release status
7. **`RunATCCheck`** - Run ATC checks for compliance

### 7.3 Full Feature Set

For comprehensive support of all AGENTS.md tasks: **42 new MCP tools** across 6 priority levels.

---

## Appendix A: Tool Inventory

### Current Tools (22)

| # | Tool Name | Category |
|---|-----------|----------|
| 1 | GetProgram | Read |
| 2 | GetClass | Read |
| 3 | GetFunctionGroup | Read |
| 4 | GetFunction | Read |
| 5 | GetStructure | Read |
| 6 | GetTable | Read |
| 7 | GetTableContents | Read |
| 8 | GetPackage | Read |
| 9 | GetTypeInfo | Read |
| 10 | GetInclude | Read |
| 11 | GetInterface | Read |
| 12 | GetTransaction | Read |
| 13 | SearchObject | Search |
| 14 | GetClassUsages | Analysis |
| 15 | GetClassTests | Testing |
| 16 | RunClassTests | Testing |
| 17 | GetClassCoverage | Testing |
| 18 | CheckSyntax | Validation |
| 19 | CreateClass | Write |
| 20 | DeleteLocalClass | Write |
| 21 | CreateClassTests | Write |
| 22 | ActivateClasses | Write |

### Proposed New Tools (42)

| # | Tool Name | Priority | Category |
|---|-----------|----------|----------|
| 1 | GetCDSView | P1 | RAP |
| 2 | CreateCDSView | P1 | RAP |
| 3 | UpdateCDSView | P1 | RAP |
| 4 | GetCDSViewDependencies | P1 | RAP |
| 5 | ActivateCDSView | P1 | RAP |
| 6 | GetBehaviorDefinition | P1 | RAP |
| 7 | CreateBehaviorDefinition | P1 | RAP |
| 8 | UpdateBehaviorDefinition | P1 | RAP |
| 9 | GetBehaviorImplementation | P1 | RAP |
| 10 | GetServiceDefinition | P1 | RAP |
| 11 | CreateServiceDefinition | P1 | RAP |
| 12 | GetServiceBinding | P1 | RAP |
| 13 | CreateServiceBinding | P1 | RAP |
| 14 | GetMetadataExtension | P1 | RAP |
| 15 | CreateMetadataExtension | P1 | RAP |
| 16 | GetAccessControl | P1 | RAP |
| 17 | CreateAccessControl | P1 | RAP |
| 18 | GetAPIReleaseState | P2 | Compliance |
| 19 | CheckCloudReadiness | P2 | Compliance |
| 20 | GetSimplificationItems | P2 | Compliance |
| 21 | RunATCCheck | P2 | Compliance |
| 22 | GetATCFindings | P2 | Compliance |
| 23 | GetWhereUsed | P3 | Analysis |
| 24 | GetCallHierarchy | P3 | Analysis |
| 25 | GetCrossReferences | P3 | Analysis |
| 26 | GetDataFlow | P3 | Analysis |
| 27 | GetCodeMetrics | P3 | Analysis |
| 28 | CheckNamingConventions | P3 | Analysis |
| 29 | RunPackageTests | P4 | Testing |
| 30 | GetTestEnvironment | P4 | Testing |
| 31 | ManageTestData | P4 | Testing |
| 32 | GetPackageCoverage | P4 | Testing |
| 33 | GetRuntimeErrors | P5 | Debugging |
| 34 | GetApplicationLogs | P5 | Debugging |
| 35 | GetSQLExplainPlan | P5 | Performance |
| 36 | AnalyzeCDSPerformance | P5 | Performance |
| 37 | GetAuthorizationObjects | P5 | Security |
| 38 | RunSecurityAudit | P5 | Security |
| 39 | GetDynproDetails | P6 | Legacy UI |
| 40 | GetWebDynproComponent | P6 | Legacy UI |
| 41 | GetBSPApplication | P6 | Legacy UI |
| 42 | AnalyzeUIComponents | P6 | Legacy UI |

---

*Document Version: 1.0*  
*Created: 2025*  
*Based on: AGENTS.md requirements analysis*
