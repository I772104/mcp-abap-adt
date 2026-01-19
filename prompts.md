# ABAP Development Prompts

This file contains comprehensive prompts for various ABAP development tasks that can be used with the MCP ABAP ADT server tools.

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

### Prompt 1B: Create Comprehensive Unit Tests for ABAP Class

```
I need you to create comprehensive unit tests for an ABAP class. Please follow this systematic approach:

**STEP 1: ANALYZE THE CLASS & EXISTING COVERAGE**
- Use the GetClass tool to retrieve the complete source code of the class: [CLASS_NAME]
- Use the GetClassTests tool to check if there are existing test classes and analyze them
- **Use GetClassCoverage tool to analyze current test coverage and identify gaps**
- If the class implements interfaces, use GetInterface tool to understand the contract
- For any referenced structures/tables, use GetStructure or GetTable tools to understand data dependencies

**STEP 2: COVERAGE GAP ANALYSIS**
- Review the coverage report to identify:
  * Untested methods (0% coverage)
  * Partially covered methods with uncovered branches
  * Critical business logic with insufficient coverage
  * Error handling paths that need testing
- Prioritize test creation based on:
  * **Critical**: Public API methods, business logic, data persistence
  * **High**: Authorization checks, validation logic, error handlers
  * **Medium**: Helper methods, private utilities
  * **Low**: Simple getters/setters, constants

**STEP 3: ANALYZE DEPENDENCIES**
- Identify all external dependencies (other classes, function modules, database tables)
- Determine which dependencies need to be mocked vs. can be tested directly
- Look for any configuration dependencies or customizing tables

**STEP 4: CREATE TEST STRATEGY**
- Generate test classes following ABAP Unit testing best practices
- Create test methods targeting coverage gaps with focus on:
  * **Happy Path Tests**: Normal operation scenarios
  * **Edge Case Tests**: Boundary conditions, empty inputs, maximum values
  * **Error Handling Tests**: Invalid inputs, exception scenarios
  * **Branch Coverage**: All conditional paths (IF/CASE statements)
  * **Integration Tests**: End-to-end workflows where applicable

**STEP 5: IMPLEMENT MOCKING STRATEGY**
- Create test doubles/mocks for external dependencies
- Use dependency injection patterns where possible
- Mock database operations appropriately
- Consider using ABAP Unit's built-in mocking frameworks

**STEP 6: TEST DATA MANAGEMENT**
- Create meaningful test data that covers various scenarios
- Use factory methods for complex test data creation
- Ensure test data is isolated and doesn't affect other tests

**STEP 7: ASSERTIONS AND VALIDATION**
- Use appropriate assertion methods (CL_ABAP_UNIT_ASSERT)
- Include descriptive error messages in assertions
- Test both expected results and side effects
- Validate state changes where applicable

**STEP 8: PERFORMANCE CONSIDERATIONS**
- Include performance tests for critical methods
- Test with large data volumes where relevant
- Consider memory consumption for data-intensive operations

**STEP 9: VALIDATION & COVERAGE VERIFICATION**
- Use RunClassTests tool to execute the created tests
- Analyze test results and fix any failing tests
- **Use GetClassCoverage tool to verify improved coverage**
- Compare before/after coverage metrics
- Identify any remaining gaps and create additional tests
- Ensure all tests pass and provide meaningful feedback

**STEP 10: ITERATIVE IMPROVEMENT**
- Repeat coverage analysis after adding new tests
- Continue until target coverage level is achieved (aim for >80%)
- Document any intentionally untested code with justification

**ADDITIONAL REQUIREMENTS:**
- Follow ABAP naming conventions for test classes and methods
- Include comprehensive documentation for complex test scenarios
- Organize tests logically with clear setup/teardown methods
- Consider using test fixtures for complex initialization
- Include integration tests that verify the class works with real dependencies (when safe)

**CUSTOMIZATION PARAMETERS:**
- Test Coverage Target: [80%|90%|95%] - Default: 80%
- Coverage Type Priority: [STATEMENT|BRANCH|PROCEDURE|ALL] - Default: ALL
- Mock Strategy: [MINIMAL|MODERATE|EXTENSIVE]
- Include Performance Tests: [YES|NO]
- Include Integration Tests: [YES|NO]
- Specific Testing Framework: [STANDARD|CUSTOM_FRAMEWORK]

Please provide the complete test class implementation with detailed explanations of the testing approach and rationale for each test case.
```

---

### Prompt 1C: Improve Test Coverage for Existing Tests

```
Improve the unit test coverage for class [CLASS_NAME] which already has some tests.

**STEP 1: BASELINE ASSESSMENT**
- Use GetClassCoverage to establish current coverage baseline
- Use GetClassTests to review existing test implementation
- Identify specific coverage gaps (methods, branches, statements)

**STEP 2: GAP PRIORITIZATION**
- Analyze the coverage report and categorize gaps:
  * **Critical Gaps**: Core business logic with 0% coverage
  * **High Priority**: Partially tested methods with uncovered branches
  * **Medium Priority**: Helper methods and utilities
  * **Low Priority**: Trivial code paths

**STEP 3: TARGETED TEST CREATION**
- Create new test methods specifically targeting the identified gaps
- Focus on:
  * Methods with 0% coverage first
  * Uncovered branches in partially tested methods
  * Error handling paths
  * Edge cases and boundary conditions

**STEP 4: VERIFICATION**
- Run tests using RunClassTests
- Verify coverage improvement using GetClassCoverage
- Compare before/after metrics
- Iterate until target coverage is achieved

**DELIVERABLES:**
- Coverage improvement report (before vs. after)
- New test methods added
- Coverage gap justification for any remaining untested code
```

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
- Optimized code versions
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

## Best Practices for Using These Prompts

- Always start with thorough analysis using MCP tools
- Validate results by running tests when applicable
- Document your findings and decisions
- Consider the broader impact on the system
- Follow SAP and ABAP development standards
- Test changes in development environment first

---

*These prompts are designed to work with the MCP ABAP ADT server tools. Adjust the specific tool calls and parameters based on your system configuration and requirements.*
