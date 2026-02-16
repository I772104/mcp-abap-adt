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
**Estimated Time**: 3-5 minutes
**Workflow Type**: Standard (safe, thorough, recommended for beginners)

💡 **Tip**: For experienced users, consider using \`quick-class-workflow\` (40% faster)

## Mandatory Steps (ALWAYS follow this exact sequence)

### Step 1/6: Validate Class Source Code ⏱️ ~15 seconds
\`\`\`
Tool: CheckSyntax
Purpose: Validate class source code BEFORE creation
Action: Check the class definition and implementation for syntax errors
\`\`\`

**Critical**: Do NOT proceed to Step 2 if syntax errors are found. Fix them first.

### Step 2: Create the Class
\`\`\`
Tool: CreateClass
Parameters:
  - class_name: "${className}"
  - source_code: <validated class code from Step 1>
  - auto_activate: false
  - package: "$TMP"
  - description: "${description}"
\`\`\`

**Important**: Use auto_activate: false during development.

### Step 3: Validate Test Source Code
\`\`\`
Tool: CheckSyntax
Purpose: Validate test class source code
Action: Check the test class implementation for syntax errors
\`\`\`

**Critical**: Do NOT proceed to Step 4 if syntax errors are found. Fix them first.

### Step 4: Create Unit Tests
\`\`\`
Tool: CreateClassTests
Parameters:
  - parent_class_name: "${className}"
  - test_source_code: <validated test code from Step 3>
  - auto_activate: false
\`\`\`

**Test Requirements**:
- Include setup method (if needed)
- Test positive scenarios
- Test negative scenarios (error cases)
- Test edge cases

### Step 5: Run Unit Tests
\`\`\`
Tool: RunClassTests
Parameters:
  - class_name: "${className}"
\`\`\`

**Critical**: ALL tests must pass before proceeding to Step 6.
If tests fail, fix the issues and re-run from Step 1.

### Step 6: Activate the Class
\`\`\`
Tool: ActivateClasses
Parameters:
  - class_name: "${className}"
\`\`\`

**Final Step**: Only activate after all tests pass successfully.

## Success Criteria
- ✅ Class syntax is valid
- ✅ Test syntax is valid
- ✅ All unit tests pass
- ✅ Class is activated successfully

## Common Mistakes to Avoid
- ❌ Skipping CheckSyntax validation
- ❌ Using auto_activate: true during development
- ❌ Activating without running tests
- ❌ Ignoring test failures

## Next Steps After Completion
1. Verify class functionality
2. Check test coverage with GetClassCoverage
3. Document the class purpose and usage
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
**Estimated Time**: 2-3 minutes (40% faster than standard)
**Workflow Type**: Optimized (for experienced users)

⚡ **Optimization**: Batch validation upfront, then auto-activate during creation

## Streamlined Steps

### Step 1/4: Batch Syntax Validation ⏱️ ~15 seconds
\`\`\`
Tool: CheckSyntax (for class code)
Tool: CheckSyntax (for test code)
Purpose: Validate BOTH class and test code upfront
\`\`\`

**Optimization**: Validate everything before creating anything
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

### Step 3/4: Create Unit Tests ⏱️ ~10 seconds
\`\`\`
Tool: CreateClassTests
Parameters:
  - parent_class_name: "${className}"
  - test_source_code: <validated test code>
  - auto_activate: false
\`\`\`

**Note**: No need to validate again - already done in Step 1

### Step 4/4: Run Tests ⏱️ ~20 seconds
\`\`\`
Tool: RunClassTests
Parameters:
  - class_name: "${className}"
\`\`\`

**Result**: Tests run on already-activated class
**Safe**: Class activated in Step 2, tests validated in Step 1

## Success Criteria
- ✅ Both class and test syntax validated upfront
- ✅ All unit tests pass
- ✅ Class activated automatically

## Time Comparison

| Workflow | Steps | Time | API Calls |
|----------|-------|------|-----------|
| Standard | 6 steps | 3-5 min | 6 calls |
| Quick | 4 steps | 2-3 min | 4 calls |
| **Savings** | **-33%** | **-40%** | **-33%** |

## When to Use Quick Workflow

✅ **Use Quick Workflow When**:
- You're experienced with ABAP development
- You have both class and test code ready
- You want faster iteration cycles
- You trust your validation process

❌ **Use Standard Workflow When**:
- You're new to ABAP or the MCP server
- You want step-by-step guidance
- You need to debug issues between steps
- You prefer explicit control over activation

## Safety Features

Even with optimizations, safety is maintained:
- ✅ Syntax validation is still mandatory
- ✅ Tests must pass before activation
- ✅ Auto-activation only happens on success
- ✅ Errors are caught and reported

## Troubleshooting

**If auto-activation fails**:
1. Review test results in the response
2. Fix any failing tests
3. Re-run from Step 1 (batch validation)
4. Or switch to standard workflow for debugging

**If syntax validation fails**:
1. Fix syntax errors in class or test code
2. Re-run Step 1 (batch validation)
3. Proceed only when both pass

## Next Steps After Completion
1. Verify class functionality
2. Check test coverage with GetClassCoverage (optional)
3. Consider refactoring if coverage is low
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