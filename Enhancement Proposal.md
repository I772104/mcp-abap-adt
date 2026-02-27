# Enhancement Proposals for MCP ABAP ADT Server

> **Simple list of proposed enhancements**  
> Features marked with ✅ are already implemented

---

## RAP Development Tools

### CDS Views
- ✅ `GetCDSView` - Retrieve CDS view source code and metadata
- ✅ `GetCDSViewContents` - Query CDS view data with filtering and parameters
- `CreateCDSView` - Create new CDS view
- `UpdateCDSView` - Modify existing CDS view
- ✅ `GetCDSViewDependencies` - Analyze CDS view dependencies (deprecated, may be re-added)

### Behavior Definitions
- ✅ `GetBehaviorDefinition` - Retrieve RAP behavior definition
- `CreateBehaviorDefinition` - Create new behavior definition
- `UpdateBehaviorDefinition` - Modify existing behavior definition
- ✅ `GetBehaviorForRapBo` - Get interface behavior for RAP Business Objects

### Service Definitions & Bindings
- ✅ `GetServiceDefinition` - Retrieve service definition
- ✅ `GetServiceBinding` - Retrieve service binding details
- `CreateServiceDefinition` - Create new service definition
- `CreateServiceBinding` - Create new service binding
- `PublishServiceBinding` - Publish/activate service binding

### Metadata & Access Control
- ✅ `GetMetadataExtension` - Retrieve UI annotations
- ✅ `GetAccessControl` - Retrieve DCL definition
- `CreateMetadataExtension` - Create UI annotations
- `CreateAccessControl` - Create DCL definition

### RAP Discovery
- ✅ `SearchRapBo` - Search RAP Business Objects by description

---

## ABAP Cloud Compliance

- `GetAPIReleaseState` - Check if API is released for ABAP Cloud
- `CheckCloudReadiness` - Validate object for ABAP Cloud compliance
- `GetSimplificationItems` - Get S/4HANA simplification items for object
- `RunATCCheck` - Execute ATC checks with specific variant
- `GetATCFindings` - Retrieve ATC findings for object
- `GetATCExemptions` - Get ATC exemptions for object

---

## Code Analysis & Understanding

### Where-Used & Dependencies
- ✅ `GetObjectUsages` - Where-used for all object types (classes, interfaces, programs, etc.)
- `GetCallHierarchy` - Analyze caller/callee relationships
- `GetCrossReferences` - Get all references (tables, classes, FMs, etc.)
- `GetDataFlow` - Analyze data flow for variables

### Code Quality
- ✅ `CheckSyntax` - Validate ABAP syntax
- `GetCodeMetrics` - Lines of code, complexity, comment ratio
- `GetCodeComplexity` - Cyclomatic complexity analysis
- `CheckNamingConventions` - Validate against naming standards
- `CheckDocumentation` - Check documentation completeness

---

## Testing & Quality Assurance

### Unit Testing
- ✅ `GetClassTests` - Retrieve local test classes
- ✅ `RunClassTests` - Execute unit tests for class
- ✅ `RunPackageTests` - Execute tests for entire package
- ✅ `GetClassCoverage` - Get test coverage for class
- `GetPackageCoverage` - Get test coverage for package
- `GetMethodCoverage` - Get coverage for specific method

### Test Environment
- `GetTestEnvironment` - Get test doubles and mock configurations
- `CreateTestDouble` - Generate test double for interface
- `ManageTestData` - Create/delete/export test data

---

## Class Management

- ✅ `CreateClass` - Create new ABAP class
- ✅ `CreateClassTests` - Create/replace test classes
- ✅ `ActivateClasses` - Activate one or multiple classes
- ✅ `DeleteLocalClass` - Delete local class (Z/Y only)
- `UpdateClass` - Modify existing class
- `GetClassImplementation` - Get implementation class for behavior definition

---

## Performance Analysis

- `GetSQLExplainPlan` - Get SQL execution plan
- `AnalyzeCDSPerformance` - Analyze CDS view performance
- `GetRuntimeAnalysis` - Get runtime statistics for object
- `GetPerformanceMetrics` - Get performance metrics over time
- `GetMemoryAnalysis` - Analyze memory consumption

---

## Debugging & Error Analysis

- `GetRuntimeErrors` - Retrieve runtime errors (ST22 dumps)
- `GetApplicationLogs` - Access application logs (SLG1)
- `GetSystemLogs` - Access system logs
- `GetSQLTrace` - Analyze SQL trace results
- `SetBreakpoint` - Set debugging breakpoint (requires special mode)
- `GetVariableValue` - Inspect variable during debugging

---

## Security & Authorization

- `GetAuthorizationObjects` - Get authorization checks in code
- `AnalyzeAuthorization` - Check user authorizations for object
- `RunSecurityAudit` - Run security audit on object
- `GetRoleAssignments` - Get roles for authorization object

---

## Legacy UI Analysis (Migration Support)

### Dynpro
- `GetDynproDetails` - Get screen fields and flow logic
- `GetDynproFlowLogic` - Get PBO/PAI modules
- `AnalyzeDynproComplexity` - Assess migration complexity

### WebDynpro
- `GetWebDynproComponent` - Get component details
- `GetWebDynproViews` - Get views and controllers
- `GetWebDynproContext` - Get context nodes

### BSP
- `GetBSPApplication` - Get BSP application details
- `GetBSPPages` - Get BSP pages and controllers

---

## Integration & Interfaces

- `GetODataService` - Analyze OData service details
- ✅ `GetFunctionModule` - Get function module source
- `GetFunctionModuleDetails` - Get FM parameters and exceptions (enhanced)
- `GetBusinessEvents` - Get business event definitions
- `GetEnterpriseEvents` - Get enterprise event subscriptions

---

## Transport & Version Control

- ✅ `ListUserTransports` - List all transports for user (modifiable and released) via E070 table
- ✅ `GetTransportRequest` - Get transport details with task/request hierarchy
- ✅ `GetVersionHistory` - Retrieve version history (supports CLAS, PROG, INCL, FUGR, INTF, DDLS, BDEF, DCLS)
- ✅ `GetTransportVersions` - Analyze transport and find relevant versions
- ✅ `CompareObjectVersions` - Compare versions with unified/side-by-side/summary diffs
- `CreateTransportRequest` - Create new transport request
- `AddToTransport` - Add object to transport
- `ReleaseTransport` - Release transport request

---

## Data Dictionary

- ✅ `GetTable` - Get table structure
- ✅ `GetTableContents` - Query table data with filtering
- ✅ `GetStructure` - Get DDIC structure
- ✅ `GetTypeInfo` - Get type information
- `GetDomain` - Get domain definition
- `GetDataElement` - Get data element definition
- `GetTableType` - Get table type definition

---

## Package Management

- ✅ `GetPackage` - Get package details
- ✅ `GetPackageContents` - List objects in package
- `CreatePackage` - Create new package
- `GetPackageHierarchy` - Get package hierarchy
- `GetPackageInterfaces` - Get package interfaces

---

## Search & Discovery

- ✅ `SearchObject` - Search ABAP objects with wildcards
- `SearchByText` - Full-text search in source code
- `SearchByPattern` - Search by code pattern
- `FindUnusedObjects` - Find unused objects in package

---

## Implementation Priority

### Phase 1 (High Priority)
1. ABAP Cloud compliance checks (`GetAPIReleaseState`, `RunATCCheck`, `GetATCFindings`)
2. Performance analysis (`GetSQLExplainPlan`, `AnalyzeCDSPerformance`)
3. Full-text code search (`SearchByText`)

### Phase 2 (Medium Priority)
1. RAP CRUD operations (Create/Update CDS, BDEF, Services)
2. Code quality metrics (`GetCodeMetrics`, `GetCodeComplexity`)
3. Enhanced testing (`GetPackageCoverage`, `GetMethodCoverage`)

### Phase 3 (Low Priority)
1. Error analysis (`GetRuntimeErrors`, `GetApplicationLogs`)
2. Legacy UI analysis
3. Advanced debugging (limited by API)

---

## Notes

- Tools marked with ✅ are already implemented
- Priority is based on ABAP Cloud and RAP development needs
- Some tools may require special SAP system configuration
- Debugging tools may need special server mode
- All new tools should follow existing authentication and error handling patterns

---

*Last Updated: 2026-02-26*
*Version: 2.1*