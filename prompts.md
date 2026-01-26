# ABAP Development Prompts

This file contains comprehensive prompts for various ABAP development tasks that can be used with the MCP ABAP ADT server tools.

## Quick Start Workflows

### Workflow 1: Create New Local Class

**Simple 3-Step Process:**
1. **Create Class** → Use `CreateClass` with your ABAP code
2. **Check Syntax** → Use `CheckSyntax` to validate the class
3. **Fix & Repeat** → Fix any syntax errors and re-check until clean

```
Step 1: CreateClass
- class_name: "ZCL_MY_NEW_CLASS"
- source_code: [Your ABAP class code]
- backup_existing: true (if replacing existing class)

Step 2: CheckSyntax  
- object_name: "ZCL_MY_NEW_CLASS"
- object_type: "CLAS"

Step 3: Fix syntax errors if any, then repeat Step 2 until 0 errors/warnings
```

### Workflow 2: Create Unit Tests for Existing Class

**Simple 3-Step Process:**
1. **Create Tests** → Use `CreateClassTests` with your test code
2. **Check Syntax** → Use `CheckSyntax` to validate the tests
3. **Run Tests** → Use `RunClassTests` to verify they work

```
Step 1: CreateClassTests
- parent_class_name: "ZCL_EXISTING_CLASS"
- test_source_code: [Your ABAP test code]
- backup_existing: true (recommended)

Step 2: CheckSyntax
- object_name: "ZCL_EXISTING_CLASS" 
- object_type: "CLAS"

Step 3: RunClassTests
- class_name: "ZCL_EXISTING_CLASS"
```

### Workflow 3: Replace Existing Class (with Backup)

**Simple 3-Step Process:**
1. **Replace Class** → Use `CreateClass` with backup enabled
2. **Check Syntax** → Use `CheckSyntax` to validate the updated class
3. **Test Compatibility** → Run existing tests to ensure they still work

```
Step 1: CreateClass
- class_name: "ZCL_EXISTING_CLASS"
- source_code: [Updated ABAP class code]
- backup_existing: true (IMPORTANT!)

Step 2: CheckSyntax
- object_name: "ZCL_EXISTING_CLASS"
- object_type: "CLAS"

Step 3: RunClassTests (if tests exist)
- class_name: "ZCL_EXISTING_CLASS"
```

## Important Notes

### Backup Functionality
- **CreateClass** now supports replacing existing classes with `backup_existing: true`
- **CreateClassTests** supports backing up existing test classes with `backup_existing: true`
- Always use backup when working with important classes
- Backup includes timestamp and original content for recovery

### Syntax Check Requirements
- **Always run CheckSyntax** after creating or modifying classes/tests
- Fix all syntax errors before proceeding to testing
- Method names must be ≤30 characters (ABAP limitation)
- SETUP methods should NOT have `FOR TESTING` attribute

## 1. Unit Testing & Coverage Analysis Prompts

### Prompt 1A: Analyze Test Coverage for ABAP Class

```
Analyze the unit test coverage for class [CLASS_NAME] and provide a detailed report.

**AUTOMATIC ANALYSIS:**
I will automatically:
1. Run GetClassCoverage to retrieve complete coverage data
2. Parse the coverage metrics at all levels (class, component, method)
3. Generate a comprehensive report with actionable insights

**REPORT WILL INCLUDE:**
- **Overall Summary**: Statement, branch, and procedure coverage percentages
- **Component Breakdown**: Coverage by class implementation and local classes
- **Method-Level Analysis**: Individual method coverage with detailed metrics
- **Gap Identification**: Untested methods and critical coverage gaps
- **Risk Assessment**: Priority levels for uncovered code
- **Recommendations**: Specific suggestions to improve coverage

**OPTIONAL PARAMETERS:**
- Target Coverage Level: [Default: 80%]
- Focus Areas: [ALL|CRITICAL_METHODS|PUBLIC_API|ERROR_HANDLING]
```
---

### Prompt 1B: Create Unit Tests for ABAP Class (Streamlined Approach)

```
Create effective unit tests for ABAP class [CLASS_NAME] to improve test coverage.

**STEP 1: ASSESS CURRENT STATE**
- Use GetClassCoverage to see current coverage baseline
- Use GetClassTests to check existing tests
- Use GetClass to understand the class structure
- Target: Achieve >70% statement coverage

**STEP 2: IDENTIFY LOW-HANGING FRUIT**
- Focus on methods with 0% coverage first (easy wins)
- Look for simple public methods that don't require complex setup
- Prioritize: Public API → Protected methods → Error handlers

**STEP 3: CREATE BASIC MOCKS & SETUP**
- Create simple mock classes for GUI objects (ALV, containers)
- Use OSQL test environment for database table mocking
- Keep mocking minimal - only what's absolutely needed

**STEP 4: WRITE TARGETED TESTS**
- Create test methods using given/when/then structure
- Start with happy path scenarios
- Add edge cases for uncovered branches
- Use descriptive test method names (t001_method_name)

**STEP 5: SYNTAX VALIDATION**
- Use CheckSyntax to validate test code before implementation
- Fix any syntax errors identified in the test methods
- Ensure clean compilation before proceeding

**STEP 6: MEASURE & ITERATE**
- Run tests with RunClassTests to verify they pass
- Check coverage improvement with GetClassCoverage
- Add more tests if needed to reach 70%+ coverage

**PROVEN APPROACH:**
- Small wins first - target 0% coverage methods
- Simple, focused test methods (one concept per test)
- Practical mocking (don't over-engineer)
- Realistic targets (70%+ is excellent)
- Dont't use names with more than 30 characters


## 2. Code Review & Analysis Prompt

### Prompt: Comprehensive ABAP Code Review

```
Please perform a comprehensive code review and analysis of the ABAP object: [OBJECT_NAME]

**ANALYSIS STEPS:**
1. Use GetClass/GetProgram/GetFunctionGroup to retrieve the source code
2. Use SearchObject to find related objects and dependencies
3. Use GetInterface for any implemented interfaces

**REVIEW CRITERIA:**
- **Code Quality**: Naming conventions, readability, maintainability
- **Performance**: Potential bottlenecks, database access patterns
- **Security**: Authority checks, input validation, SQL injection risks
- **Best Practices**: SOLID principles, design patterns usage
- **Error Handling**: Exception management, logging
- **Testing**: Test coverage analysis using GetClassTests/RunClassTests
- **Dependencies**: Coupling analysis, circular dependencies

**PROVIDE:**
- Detailed findings with severity levels (Critical/Major/Minor)
- Specific code examples with improvement suggestions
- Refactoring recommendations
- Performance optimization opportunities
- Security vulnerability assessments
```

## 3. Performance Optimization Prompt

### Prompt: ABAP Performance Analysis & Optimization

```
Analyze and optimize the performance of ABAP object: [OBJECT_NAME]

**ANALYSIS APPROACH:**
1. Retrieve source code using appropriate MCP tools
2. Identify performance-critical sections
3. Analyze database access patterns
4. Review loop constructs and data processing logic

**FOCUS AREAS:**
- **Database Operations**: SELECT statements, table joins, WHERE clauses
- **Internal Tables**: Operations, sorting, processing efficiency
- **Loop Optimization**: LOOP AT, DO/WHILE constructs
- **Memory Usage**: Large data volumes, object instantiation
- **ALV/UI Performance**: Screen processing, data transfer

**DELIVERABLES:**
- Performance hotspot identification
- Optimized code versions with CheckSyntax validation
- Before/after performance comparison estimates
- Best practice recommendations
- Monitoring and measurement suggestions
```

## 4. Documentation Generation Prompt

### Prompt: Technical Documentation Generation

```
Generate comprehensive technical documentation for ABAP object: [OBJECT_NAME]

**DOCUMENTATION SCOPE:**
1. Retrieve object source using MCP tools
2. Analyze object structure and dependencies
3. Create structured technical documentation

**INCLUDE:**
- **Overview**: Purpose, functionality, business context
- **Technical Specification**: Class/program structure, methods, parameters
- **Dependencies**: Related objects, interfaces, database tables
- **Usage Examples**: Code samples, integration patterns
- **Configuration**: Customizing settings, prerequisites
- **Error Handling**: Exception scenarios, troubleshooting
- **Testing**: Unit test documentation from GetClassTests
- **Change History**: Based on available information

**FORMAT:** Professional technical documentation with clear structure
```

## 5. Refactoring Assistance Prompt

### Prompt: ABAP Code Refactoring

```
Help me refactor the ABAP object: [OBJECT_NAME] to improve code quality and maintainability.

**REFACTORING ANALYSIS:**
1. Use MCP tools to retrieve current implementation
2. Analyze code structure and identify improvement opportunities
3. Check existing tests to understand current behavior

**REFACTORING GOALS:**
- **SOLID Principles**: Single Responsibility, Open/Closed, etc.
- **Design Patterns**: Apply appropriate patterns (Factory, Strategy, etc.)
- **Code Duplication**: Identify and eliminate redundant code
- **Method Extraction**: Break down large methods
- **Class Decomposition**: Split overly complex classes
- **Error Handling**: Improve exception management

**DELIVERABLES:**
- Refactored code with explanations
- Syntax validation using CheckSyntax for all refactored code
- Migration strategy from old to new implementation
- Updated unit tests for refactored code
- Impact analysis on dependent objects
```

## 6. Dependency Analysis Prompt

### Prompt: ABAP Object Dependency Analysis

```
Analyze the dependencies and relationships of ABAP object: [OBJECT_NAME]

**ANALYSIS STEPS:**
1. Use SearchObject to find related objects
2. Retrieve source code of main object and dependencies
3. Map relationships and dependencies

**ANALYZE:**
- **Direct Dependencies**: Classes, interfaces, tables used
- **Reverse Dependencies**: Objects that depend on this one
- **Circular Dependencies**: Potential design issues
- **Coupling Level**: Tight vs. loose coupling assessment
- **Impact Analysis**: Change impact on dependent objects

**PROVIDE:**
- Dependency diagram/map
- Risk assessment for changes
- Recommendations for dependency reduction
- Modularization suggestions
```

## Usage Instructions

1. **Choose the appropriate prompt** based on your development task
2. **Replace placeholders** like [CLASS_NAME] with actual object names
3. **Customize parameters** based on your specific requirements
4. **Execute systematically** following the step-by-step approach
5. **Iterate and refine** based on results and feedback

## 7. ABAP Syntax Validation Prompt

### Prompt: Validate ABAP Code Syntax

```
Validate the syntax of ABAP code before implementation or after modifications.

**SYNTAX CHECK PROCESS:**
1. Use CheckSyntax to validate ABAP source code
2. Review any syntax errors, warnings, or issues identified
3. Fix syntax problems before proceeding with implementation

**USAGE SCENARIOS:**
- **Before Implementation**: Validate new code before creating objects
- **After Modifications**: Check syntax after making changes to existing code
- **Code Review**: Ensure syntactic correctness during reviews
- **Refactoring**: Validate refactored code maintains proper syntax
- **Learning**: Check ABAP syntax when learning new language features

**SYNTAX CHECK COVERS:**
- Class definitions and implementations
- Method signatures and implementations
- Variable declarations and usage
- Statement syntax and structure
- ABAP keyword usage and spelling
- Proper statement termination (periods, commas)

**IMPORTANT NOTE:**
The CheckSyntax tool requires the target class to exist in the system. For completely new classes, create an empty class first, then use CheckSyntax to validate your proposed implementation before adding the actual code.

**EXAMPLE USAGE:**
Use CheckSyntax with source_code parameter containing your ABAP code and object_name parameter with the target class name.
```

## Best Practices for Using These Prompts

- Always start with thorough analysis using MCP tools
- **Use CheckSyntax for all code creation and modification tasks**
- Validate syntax before implementing changes in the system
- Run tests when applicable to verify functionality
- Document your findings and decisions
- Consider the broader impact on the system
- Follow SAP and ABAP development standards
- Test changes in development environment first

---

*These prompts are designed to work with the MCP ABAP ADT server tools. Adjust the specific tool calls and parameters based on your system configuration and requirements.*
