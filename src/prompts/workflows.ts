import { Prompt } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP Prompts for common ABAP development workflows
 * These provide interactive, step-by-step guidance for AI agents
 */

/**
 * List all available workflow prompts
 */
export function listWorkflowPrompts(): Prompt[] {
  return [
    {
      name: "create-class-workflow",
      description: "Step-by-step workflow for creating and testing ABAP classes with mandatory validation steps",
      arguments: [
        {
          name: "class_name",
          description: "Name of the ABAP class to create (must start with Z or Y)",
          required: true,
        },
        {
          name: "description",
          description: "Brief description of the class purpose",
          required: false,
        },
      ],
    },
    {
      name: "quick-class-workflow",
      description: "Optimized workflow for experienced users - 40% faster with batch validation and auto-activation",
      arguments: [
        {
          name: "class_name",
          description: "Name of the ABAP class to create (must start with Z or Y)",
          required: true,
        },
        {
          name: "description",
          description: "Brief description of the class purpose",
          required: false,
        },
      ],
    },
    {
      name: "package-discovery-workflow",
      description: "Token-efficient workflow for discovering and exploring ABAP packages",
      arguments: [
        {
          name: "search_term",
          description: "Optional search term or prefix to filter packages (e.g., 'FIN' for financial packages)",
          required: false,
        },
      ],
    },
    {
      name: "rap-bo-analysis-workflow",
      description: "Comprehensive workflow for analyzing RAP Business Objects",
      arguments: [
        {
          name: "rap_bo_name",
          description: "Name of the RAP Business Object to analyze (e.g., I_SalesOrder)",
          required: true,
        },
        {
          name: "depth",
          description: "Analysis depth: summary, detailed, or comprehensive",
          required: false,
        },
      ],
    },
    {
      name: "refactor-class-workflow",
      description: "Safe workflow for refactoring existing ABAP classes with backup and testing",
      arguments: [
        {
          name: "class_name",
          description: "Name of the existing ABAP class to refactor",
          required: true,
        },
      ],
    },
    {
      name: "table-analysis-workflow",
      description: "Workflow for analyzing database tables and querying data",
      arguments: [
        {
          name: "table_name",
          description: "Name of the database table to analyze",
          required: true,
        },
        {
          name: "max_rows",
          description: "Maximum number of rows to retrieve (default: 50)",
          required: false,
        },
      ],
    },
  ];
}

/**
 * Get prompt content for a specific workflow
 */
export function getWorkflowPrompt(
  promptName: string,
  args: Record<string, string>
): string {
  switch (promptName) {
    case "create-class-workflow":
      return getCreateClassWorkflow(args);
    case "quick-class-workflow":
      return getQuickClassWorkflow(args);
    case "package-discovery-workflow":
      return getPackageDiscoveryWorkflow(args);
    case "rap-bo-analysis-workflow":
      return getRapBoAnalysisWorkflow(args);
    case "refactor-class-workflow":
      return getRefactorClassWorkflow(args);
    case "table-analysis-workflow":
      return getTableAnalysisWorkflow(args);
    default:
      throw new Error(`Unknown workflow prompt: ${promptName}`);
  }
}

/**
 * Create Class Workflow (Standard - Safe and Thorough)
 */
function getCreateClassWorkflow(args: Record<string, string>): string {
  const className = args.class_name || "ZCL_EXAMPLE";
  const description = args.description || "Example class";

  return `# Create and Test ABAP Class Workflow (Standard)

## Task: Create class ${className}
**Description**: ${description}
**Estimated Time**: 2-3 minutes
**Workflow Type**: Standard (safe, thorough, recommended for all users)

💡 **Tip**: For batch operations, consider using \`quick-class-workflow\` (saves 1 step)

## Prerequisites: Review ABAP Standards

**⭐ ALWAYS Access Standards Before Coding:**
\`\`\`
# Complete ABAP standards (recommended for first-time users)
Resource: abap://standards/complete

# Or specific sections for quick reference
Resource: abap://standards/naming      # Class, method, parameter naming
Resource: abap://standards/formatting  # Code formatting rules
\`\`\`

**Key Standards to Check:**
- ✅ Class naming: CL_<module>_<name> (e.g., CL_FIN_CALCULATOR)
- ✅ Method naming: SET_*, GET_*, IS_*, CHECK_*
- ✅ Parameter prefixes: IV_*, EV_*, CV_*, RV_*
- ✅ Code formatting: UPPERCASE keywords, proper indentation
- ✅ ABAP Cloud compliance: Use released APIs only

## Mandatory Steps (ALWAYS follow this exact sequence)

### Step 1/6: Validate Class Source Code ⏱️ ~15 seconds
\`\`\`
Tool: CheckSyntax
Purpose: Validate class source code BEFORE creation
Action: Check the class definition and implementation for syntax errors
\`\`\`

**Critical**: Do NOT proceed to Step 2 if syntax errors are found. Fix them first.

### Step 2/6: Create the Class ⏱️ ~10 seconds
\`\`\`
Tool: CreateClass
Parameters:
  - class_name: "${className}"
  - source_code: <validated class code from Step 1>
  - auto_activate: false
  - package: "$TMP"
  - description: "${description}"
\`\`\`

**Important**: Use auto_activate: false to allow test addition before activation.

### Step 3/6: Validate Existing Class ⏱️ ~5 seconds
\`\`\`
Tool: CheckSyntax
Parameters:
  - object_name: "${className}"
  - object_type: "CLAS"
Purpose: Validate the created class exists and is syntactically correct
\`\`\`

**Optimization**: Uses object_name instead of re-providing source code
**Critical**: Ensures class was created successfully before adding tests

### Step 4/6: Validate Test Source Code ⏱️ ~15 seconds
\`\`\`
Tool: CheckSyntax
Parameters:
  - source_code: <test class implementation>
Purpose: Validate test code syntax before creation
\`\`\`

**Critical**: Do NOT proceed to Step 5 if syntax errors are found. Fix them first.

### Step 5/6: Create Unit Tests with Auto-Activation ⏱️ ~15 seconds
\`\`\`
Tool: CreateClassTests
Parameters:
  - parent_class_name: "${className}"
  - test_source_code: <validated test code from Step 4>
  - auto_activate: true
\`\`\`

**Test Requirements**:
- Include setup method (if needed)
- Test positive scenarios
- Test negative scenarios (error cases)
- Test edge cases

**Important**: Setting auto_activate: true will activate BOTH the test class AND the parent class.
This eliminates the need for a separate activation step.

### Step 6/6: Run Unit Tests ⏱️ ~20 seconds
\`\`\`
Tool: RunClassTests
Parameters:
  - class_name: "${className}"
\`\`\`

**Critical**: ALL tests must pass. If any test fails:
1. Analyze the failure message
2. Fix the issue in class or test code
3. Re-validate with CheckSyntax (Step 1 or 4)
4. Update the class/tests (Step 2 or 5)
5. Re-run tests

**Note**: Class was already activated in Step 5, so tests run on the active version.

## Success Criteria
- ✅ Class syntax is valid (Step 1)
- ✅ Class created successfully (Step 2)
- ✅ Class validation passed (Step 3)
- ✅ Test syntax is valid (Step 4)
- ✅ Class and tests activated (Step 5)
- ✅ All unit tests pass (Step 6)

## Common Mistakes to Avoid
- ❌ Skipping CheckSyntax validation
- ❌ Proceeding with syntax errors
- ❌ Ignoring test failures
- ❌ Forgetting to fix issues before re-running

## Workflow Optimizations
- ✅ Auto-activation in Step 5 eliminates separate activation step
- ✅ Uses object_name in Step 3 to avoid re-sending source code
- ✅ Validates syntax before any creation operations
- ✅ Clear error handling guidance for test failures

## Troubleshooting

### If Step 5 activation fails:
- Class was already activated in a previous run
- This is not an error - proceed to Step 6
- The CreateClassTests tool handles activation internally

### If tests fail in Step 6:
- Review test failure messages carefully
- Common issues: incorrect test data, wrong expected values
- Fix and restart from Step 4 (validate test code)

## Next Steps After Completion
1. Verify class functionality with sample usage
2. Check test coverage with GetClassCoverage
3. Document the class purpose and usage
4. Consider adding more edge case tests if coverage < 90%
`;
}

/**
 * Quick Class Workflow (Optimized - 40% Faster)
 */
function getQuickClassWorkflow(args: Record<string, string>): string {
  const className = args.class_name || "ZCL_EXAMPLE";
  const description = args.description || "Example class";

  return `# Quick Class Creation Workflow (Optimized)

## Task: Create class ${className}
**Description**: ${description}
**Estimated Time**: 1-2 minutes (50% faster than standard)
**Workflow Type**: Optimized (for experienced users)

⚡ **Optimization**: Batch validation upfront, then auto-activate everything

## Prerequisites: Review ABAP Standards

**⭐ Quick Standards Check (for experienced users):**
\`\`\`
# Naming conventions (quick reference)
Resource: abap://standards/naming

# Or complete standards if needed
Resource: abap://standards/complete
\`\`\`

**Quick Checklist:**
- ✅ Class naming: CL_<module>_<name>
- ✅ Method naming: SET_*, GET_*, IS_*, CHECK_*
- ✅ Parameter prefixes: IV_*, EV_*, CV_*, RV_*
- ✅ ABAP Cloud compliance

## Streamlined Steps

### Step 1/4: Batch Syntax Validation (Parallel) ⏱️ ~15 seconds
\`\`\`
Tool: CheckSyntax (for class code) - Call 1
Tool: CheckSyntax (for test code) - Call 2
Purpose: Validate BOTH class and test code upfront in parallel
\`\`\`

**Optimization**: Run both syntax checks in parallel using a single message with multiple tool calls
**Critical**: Both must pass before proceeding

**Best Practice**: Prepare both class and test code before starting

### Step 2/4: Create and Activate Class ⏱️ ~10 seconds
\`\`\`
Tool: CreateClass
Parameters:
  - class_name: "${className}"
  - source_code: <validated class code>
  - auto_activate: true
  - package: "$TMP"
  - description: "${description}"
\`\`\`

**Optimization**: Auto-activate since syntax already validated
**Safe**: We know code is valid from Step 1

### Step 3/4: Create and Activate Unit Tests ⏱️ ~15 seconds
\`\`\`
Tool: CreateClassTests
Parameters:
  - parent_class_name: "${className}"
  - test_source_code: <validated test code>
  - auto_activate: true
\`\`\`

**Optimization**: Auto-activate tests immediately - no need for separate activation
**Note**: Test syntax already validated in Step 1
**Important**: This activates both the test class AND re-activates the parent class if needed

### Step 4/4: Run Tests ⏱️ ~20 seconds
\`\`\`
Tool: RunClassTests
Parameters:
  - class_name: "${className}"
\`\`\`

**Result**: Tests run on fully-activated class
**Critical**: ALL tests must pass (100% success rate)

**If tests fail**:
1. Analyze failure messages
2. Fix issues in class or test code
3. Re-validate with Step 1
4. Re-run from Step 2

## Success Criteria
- ✅ Both class and test syntax validated upfront (Step 1)
- ✅ Class created and activated (Step 2)
- ✅ Tests created and activated (Step 3)
- ✅ All unit tests pass 100% (Step 4)

## Time Comparison

| Workflow | Steps | Time | API Calls | Activations |
|----------|-------|------|-----------|-------------|
| Standard | 6 steps | 2-3 min | 6 calls | 1 (auto) |
| Quick | 4 steps | 1-2 min | 4 calls | 2 (auto) |
| **Savings** | **-33%** | **-50%** | **-33%** | Auto |

## When to Use Quick Workflow

✅ **Use Quick Workflow When**:
- You're experienced with ABAP development
- You have both class and test code ready upfront
- You want fastest iteration cycles
- You trust your validation process
- You prefer batch operations

❌ **Use Standard Workflow When**:
- You're new to ABAP or the MCP server
- You want to write class first, then tests separately
- You need to debug issues between steps
- You prefer more granular control
- You're learning the workflow

## Key Differences from Standard Workflow

| Aspect | Standard | Quick |
|--------|----------|-------|
| Validation | Sequential | Parallel (both at once) |
| Class activation | Step 5 (with tests) | Step 2 (immediately) |
| Test activation | Step 5 (auto) | Step 3 (auto) |
| Verification | Validates created class | Trusts Step 1 validation |
| Best for | Learning, debugging | Speed, efficiency |

## Safety Features

Even with optimizations, safety is maintained:
- ✅ Syntax validation is still mandatory
- ✅ Parallel validation catches errors early
- ✅ Auto-activation only happens on success
- ✅ Tests must pass 100% to complete workflow
- ✅ Errors are caught and reported clearly

## Troubleshooting

**If Step 1 syntax validation fails**:
1. Fix syntax errors in the failing code (class or test)
2. Re-run Step 1 for both files
3. Proceed only when BOTH pass

**If Step 2 or 3 activation fails**:
1. Check for existing class conflicts
2. Verify syntax is still valid
3. Review activation warnings/errors
4. Re-run from Step 1 if major changes needed

**If Step 4 tests fail**:
1. Analyze specific test failure messages
2. Fix the issue in class logic or test expectations
3. Re-validate syntax (Step 1)
4. Re-create class/tests (Steps 2-3)
5. Re-run tests (Step 4)

## Next Steps After Completion
1. Verify class functionality with sample usage
2. Check test coverage with GetClassCoverage (optional)
3. Document the class if coverage >80%
4. Consider refactoring if coverage <70%
`;
}

/**
 * Package Discovery Workflow
 */
function getPackageDiscoveryWorkflow(args: Record<string, string>): string {
  const searchTerm = args.search_term || "";
  const hasSearch = searchTerm.length > 0;

  return `# Token-Efficient Package Discovery Workflow

${hasSearch ? `## Search Term: ${searchTerm}` : "## General Package Discovery"}

## Recommended Approach (90%+ token savings)

### Step 1: Get Package Names (Lightweight - ~5K tokens)
\`\`\`
Resource: abap://packages/top-level/names
Purpose: Get simple array of all package names
Use when: You need to know what packages exist
\`\`\`

**Result**: Array of ~757 package names

${
  hasSearch
    ? `
### Step 2: Filter to Relevant Packages (~500 tokens)
\`\`\`
Resource: abap://packages/top-level?prefix=${searchTerm}&fields=name,description
Purpose: Find packages matching "${searchTerm}"
Returns: Filtered list with descriptions
\`\`\`

**Result**: Only packages starting with "${searchTerm}"`
    : `
### Step 2: Browse Packages with Descriptions (~2K tokens)
\`\`\`
Resource: abap://packages/top-level?fields=name,description&limit=50
Purpose: Browse first 50 packages with descriptions
Use when: You need context about packages
\`\`\`

**Result**: First 50 packages with descriptions`
}

### Step 3: Get Detailed Package Info (when needed)
\`\`\`
Resource: abap://package/{package_name}
Purpose: Get comprehensive package information
Use when: You've identified the target package
\`\`\`

**Returns**:
- Package metadata
- Hierarchy (super/sub-packages)
- Transport details
- Application component
- Package interfaces

### Step 4: Explore Package Contents
\`\`\`
Tool: GetPackageContents
Parameters:
  - package_name: <selected package>
  - include_subpackages: true
\`\`\`

**Returns**: List of all objects in the package (classes, tables, functions, etc.)

## Token Usage Comparison

| Approach | Token Usage | Efficiency |
|----------|-------------|------------|
| ❌ GetPackage for each | ~757 calls | Very inefficient |
| ✅ Resource + filter | ~7K tokens | 90%+ savings |

## Alternative Approaches

### Find Large Packages
\`\`\`
Resource: abap://packages/top-level?minObjects=1000&fields=name,objectCount
Purpose: Find packages with 1000+ objects
\`\`\`

### Pagination
\`\`\`
Resource: abap://packages/top-level?offset=100&limit=50
Purpose: Get packages 100-150
\`\`\`

## Best Practices
1. **Cache the package list** - Use once per session
2. **Filter locally** - After getting names, filter in memory
3. **Use query parameters** - Reduce tokens with targeted queries
4. **Get details last** - Only fetch full package info when needed
`;
}

/**
 * RAP BO Analysis Workflow
 */
function getRapBoAnalysisWorkflow(args: Record<string, string>): string {
  const rapBoName = args.rap_bo_name || "I_SalesOrder";
  const depth = args.depth || "detailed";

  return `# RAP Business Object Analysis Workflow

## Target: ${rapBoName}
**Analysis Depth**: ${depth}

## Recommended Approach (Single Call - Most Efficient)

### Step 1: Complete BO Analysis (Use Resource!)
\`\`\`
Resource: rap-bo-analysis:///${rapBoName}${depth !== "detailed" ? `?depth=${depth}` : ""}
Purpose: Get complete RAP BO structure in one call
Token Usage: ~20-50K tokens (but cacheable!)
\`\`\`

**Why use resource first?**
- ✅ Single call gets entire BO structure
- ✅ Cacheable by MCP client
- ✅ More token-efficient than multiple tool calls
- ✅ Provides comprehensive overview

**Returns**:
- Behavior definitions (interface + implementation)
- CDS views (root, projections, dependencies)
- Service exposure (definitions, bindings)
- Access control (DCL)
- Implementation classes
- Recommendations

### Step 2: Analyze Specific Components (if needed)

#### Behavior Definition
\`\`\`
Tool: GetBehaviorDefinition
Parameters:
  - cds_view_name: <root entity from Step 1>
\`\`\`

#### CDS Views
\`\`\`
Tool: GetCDSView
Parameters:
  - view_name: ${rapBoName}
\`\`\`

#### Service Exposure
\`\`\`
Tool: GetServiceDefinition
Parameters:
  - service_name: <from Step 1 analysis>

Tool: GetServiceBinding
Parameters:
  - binding_name: <from Step 1 analysis>
\`\`\`

## Understanding RAP BO Structure

### Component Hierarchy
\`\`\`
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
\`\`\`

### Key Concepts

**Root Entity**: ${rapBoName}
- Top-level business object
- Defines main entity structure

**Child Entities**:
- Composition children (1:n relationships)
- Example: Order → Items

**Associations**:
- Referenced entities
- Example: Order → Customer

## Analysis Checklist

- [ ] Understand root entity structure
- [ ] Identify child entities (compositions)
- [ ] Review associations to other entities
- [ ] Check behavior operations (create, update, delete)
- [ ] Verify validations and determinations
- [ ] Review service exposure (OData V2/V4)
- [ ] Check authorization (DCL)
- [ ] Identify implementation classes

## Common Patterns

### Managed RAP BO
- Suffix: *_M
- Framework handles persistence
- Use: Standard CRUD operations

### Unmanaged RAP BO
- Suffix: *_U
- Custom persistence logic
- Use: Complex business logic

### Naming Conventions
- **ZI_***: Interface views (data model)
- **ZC_***: Consumption views (projection)
- **ZR_***: Restricted views (authorization)

## Next Steps After Analysis

1. Review behavior implementation classes
2. Check test coverage
3. Verify service bindings
4. Test authorization rules
5. Review UI annotations
`;
}

/**
 * Refactor Class Workflow
 */
function getRefactorClassWorkflow(args: Record<string, string>): string {
  const className = args.class_name || "ZCL_EXAMPLE";

  return `# Safe Class Refactoring Workflow

## Target: ${className}

## Prerequisites: Review ABAP Standards

**⭐ Check Standards for Refactoring:**
\`\`\`
# Naming conventions (if renaming methods/parameters)
Resource: abap://standards/naming

# Code formatting (ensure consistency)
Resource: abap://standards/formatting

# ABAP Cloud compliance (if modernizing)
Resource: abap://standards/complete
\`\`\`

**Refactoring Checklist:**
- ✅ Maintain naming conventions
- ✅ Preserve ABAP Cloud compliance
- ✅ Follow formatting standards
- ✅ Update documentation

## Mandatory Steps (ALWAYS follow this sequence)

### Step 1: Get Current Class Source
\`\`\`
Resource: abap://class/${className}
Purpose: Retrieve current class implementation
\`\`\`

**Review**: Understand current structure before making changes

### Step 2: Get Existing Unit Tests
\`\`\`
Tool: GetClassTests
Parameters:
  - class_name: "${className}"
\`\`\`

**Review**: Understand test coverage and test scenarios

### Step 3: Analyze Dependencies
\`\`\`
Tool: GetClassUsages
Parameters:
  - class_name: "${className}"
\`\`\`

**Critical**: Understand where the class is used before refactoring

### Step 4: Validate Modified Source
\`\`\`
Tool: CheckSyntax
Parameters:
  - source_code: <modified class code>
\`\`\`

**Critical**: Do NOT proceed if syntax errors are found

### Step 5: Update Class (with Backup)
\`\`\`
Tool: CreateClass
Parameters:
  - class_name: "${className}"
  - source_code: <validated modified code>
  - backup_existing: true
  - auto_activate: false
\`\`\`

**Important**: backup_existing: true creates a timestamped backup

### Step 6: Verify Tests Still Pass
\`\`\`
Tool: RunClassTests
Parameters:
  - class_name: "${className}"
\`\`\`

**Critical**: ALL tests must pass. If tests fail:
1. Review the failures
2. Fix the issues
3. Re-run from Step 4

### Step 7: Check Test Coverage
\`\`\`
Tool: GetClassCoverage
Parameters:
  - class_name: "${className}"
\`\`\`

**Target Coverage**:
- Business Logic: >70%
- RAP Behavior: >80%

### Step 8: Activate Class
\`\`\`
Tool: ActivateClasses
Parameters:
  - class_name: "${className}"
\`\`\`

**Final Step**: Only activate after all checks pass

## Safety Checklist

- [ ] Current source code reviewed
- [ ] Existing tests reviewed
- [ ] Dependencies analyzed
- [ ] Modified code syntax validated
- [ ] Backup created
- [ ] All tests pass
- [ ] Coverage is adequate
- [ ] Class activated successfully

## Rollback Procedure

If issues are found after activation:
1. Locate backup (created in Step 5)
2. Restore from backup
3. Re-run tests
4. Re-activate

## Common Refactoring Scenarios

### Rename Method
- Update method signature
- Update all calls to method
- Update tests
- Verify with GetClassUsages

### Extract Method
- Create new method
- Move code to new method
- Update tests
- Verify coverage

### Change Method Signature
- Update method parameters
- Update all callers (check GetClassUsages)
- Update tests
- Verify no breaking changes

## Best Practices

1. **Small Changes**: Make incremental changes
2. **Test First**: Ensure tests exist before refactoring
3. **Backup Always**: Always use backup_existing: true
4. **Verify Coverage**: Check coverage doesn't decrease
5. **Document Changes**: Update class documentation
`;
}

/**
 * Table Analysis Workflow
 */
function getTableAnalysisWorkflow(args: Record<string, string>): string {
  const tableName = args.table_name || "MARA";
  const maxRows = args.max_rows || "50";

  return `# Database Table Analysis Workflow

## Target: ${tableName}

## Recommended Approach

### Step 1: Get Table Structure
\`\`\`
Resource: abap://table/${tableName}
Purpose: Understand table structure and fields
\`\`\`

**Returns**:
- Field definitions
- Data elements
- Domains
- Key fields
- Technical settings
- Indexes

**Review**:
- Primary key fields
- Foreign key relationships
- Field types and lengths
- Check tables

### Step 2: Query Table Data
\`\`\`
Tool: GetTableContents
Parameters:
  - table_name: "${tableName}"
  - max_rows: ${maxRows}
  - include_column_metadata: true
\`\`\`

**Basic Query**: Get first ${maxRows} rows with metadata

### Step 3: Filtered Query (if needed)
\`\`\`
Tool: GetTableContents
Parameters:
  - table_name: "${tableName}"
  - columns: ["FIELD1", "FIELD2", "FIELD3"]
  - where_conditions: {"FIELD1": "VALUE"}
  - max_rows: ${maxRows}
\`\`\`

**Note**: ADT Data Preview API only supports equality (=) operator

### Step 4: Batch Queries (multiple tables)
\`\`\`
Tool: GetTableContents
Parameters:
  - queries: [
      {table_name: "${tableName}", max_rows: 20},
      {table_name: "RELATED_TABLE", max_rows: 20}
    ]
\`\`\`

## Common Analysis Patterns

### Master Data Analysis
\`\`\`
Example: MARA (Material Master)
1. Get structure: abap://table/MARA
2. Query data: GetTableContents with filters
3. Analyze related tables: MAKT (descriptions), MARC (plant data)
\`\`\`

### Transactional Data Analysis
\`\`\`
Example: VBAK (Sales Orders)
1. Get structure: abap://table/VBAK
2. Query recent orders: where_conditions with date filter
3. Analyze items: VBAP table
\`\`\`

### Configuration Table Analysis
\`\`\`
Example: T001 (Company Codes)
1. Get structure: abap://table/T001
2. Query all entries: max_rows=1000
3. Review configuration values
\`\`\`

## Query Optimization Tips

### Select Specific Columns
\`\`\`
columns: ["MATNR", "MTART", "MATKL"]
→ Reduces data transfer
→ Faster query execution
\`\`\`

### Use WHERE Conditions
\`\`\`
where_conditions: {"MTART": "FERT"}
→ Filters at database level
→ Returns only relevant data
\`\`\`

### Limit Rows
\`\`\`
max_rows: 50
→ Prevents large data transfers
→ Faster response times
\`\`\`

## Understanding Table Relationships

### Check Foreign Keys
- Review foreign key fields in structure
- Identify related tables
- Understand data dependencies

### Analyze Indexes
- Review secondary indexes
- Understand query performance
- Identify optimal query fields

## Data Quality Checks

- [ ] Check for null values
- [ ] Verify data types
- [ ] Review value ranges
- [ ] Check referential integrity
- [ ] Analyze data distribution

## Next Steps After Analysis

1. Document table purpose
2. Identify related tables
3. Review data quality
4. Plan data access strategy
5. Consider CDS view creation
`;
}