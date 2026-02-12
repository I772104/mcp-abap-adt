# GetClassCoverage Tool Documentation

## Overview

The `GetClassCoverage` tool runs unit tests for an ABAP class and retrieves comprehensive test coverage information. It executes all test methods within the class and provides detailed coverage metrics including line, statement, branch, and procedure coverage percentages.

## Features

- **Automated Test Execution**: Runs all unit tests for the specified class
- **Coverage Analysis**: Provides detailed coverage metrics across multiple dimensions
- **Auto-Activation Support**: Optionally activates the class before running coverage analysis
- **Long Polling**: Uses efficient long-polling mechanism for test execution monitoring
- **Multiple Coverage Metrics**: Reports line, statement, branch, and procedure coverage
- **Test Method Details**: Includes execution time and status for individual test methods
- **Fallback Strategies**: Multiple approaches to retrieve coverage data for maximum compatibility

## Endpoint

```
POST /sap/bc/adt/abapunit/runs
GET /sap/bc/adt/runtime/traces/coverage/measurements/{measurement_id}
```

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `class_name` | string | Yes | - | Name of the ABAP class to analyze |
| `auto_activate` | boolean | No | `false` | Automatically activate the class before running coverage analysis |
| `preaudit_requested` | boolean | No | `true` | Request pre-audit during activation (only used if `auto_activate` is true) |

## Response Structure

The tool returns comprehensive coverage data in XML format with the following structure:

### Coverage Summary

```xml
<?xml version="1.0" encoding="UTF-8"?>
<coverageResult>
    <class name="ZCL_CALCULATOR" description="Calculator Class" timestamp="2026-01-27T10:30:15Z">
        <summary>
            <overallCoverage percentage="85.5"/>
            <lineCoverage percentage="87.2" covered="174" total="200"/>
            <statementCoverage percentage="89.4" covered="161" total="180"/>
            <branchCoverage percentage="78.3" covered="47" total="60"/>
            <procedureCoverage percentage="100.0" covered="10" total="10"/>
        </summary>
        <testExecution>
            <testClass name="LTCL_TEST" executionTime="0.045"/>
            <totalMethods>5</totalMethods>
            <passedMethods>5</passedMethods>
            <riskLevel>HARMLESS</riskLevel>
            <durationCategory>SHORT</durationCategory>
        </testExecution>
        <methods>
            <method name="test_addition" executionTime="0.008" status="PASSED"/>
            <method name="test_subtraction" executionTime="0.009" status="PASSED"/>
            <method name="test_multiplication" executionTime="0.010" status="PASSED"/>
            <method name="test_division" executionTime="0.009" status="PASSED"/>
            <method name="test_edge_cases" executionTime="0.009" status="PASSED"/>
        </methods>
        <measurementId>A1B2C3D4E5F6</measurementId>
    </class>
</coverageResult>
```

## Coverage Metrics Explained

### Overall Coverage
Weighted average of all coverage types:
- Line Coverage: 30% weight
- Statement Coverage: 30% weight
- Branch Coverage: 20% weight
- Procedure Coverage: 20% weight

### Line Coverage
Percentage of executable lines that were executed during tests.

### Statement Coverage
Percentage of ABAP statements that were executed during tests.

### Branch Coverage
Percentage of conditional branches (IF, CASE, LOOP) that were executed during tests.

### Procedure Coverage
Percentage of methods/procedures that were called during tests.

## Usage Examples

### Example 1: Basic Coverage Analysis

```json
{
  "class_name": "ZCL_MY_CLASS"
}
```

### Example 2: Coverage with Auto-Activation

```json
{
  "class_name": "ZCL_MY_CLASS",
  "auto_activate": true,
  "preaudit_requested": true
}
```

### Example 3: Coverage Without Pre-Audit

```json
{
  "class_name": "ZCL_MY_CLASS",
  "auto_activate": true,
  "preaudit_requested": false
}
```

## Response Interpretation

### Coverage Percentage Guidelines

| Coverage % | Quality Level | Recommendation |
|------------|---------------|----------------|
| 90-100% | Excellent | Maintain current test quality |
| 80-89% | Good | Consider adding edge case tests |
| 70-79% | Acceptable | Improve test coverage for critical paths |
| 60-69% | Fair | Significant testing gaps exist |
| Below 60% | Poor | Comprehensive testing required |

### Test Execution Status

- **PASSED**: Test method executed successfully
- **FAILED**: Test method failed (assertion failure)
- **ERROR**: Test method encountered runtime error
- **SKIPPED**: Test method was not executed

### Risk Levels

- **HARMLESS**: Low-risk tests, safe to run frequently
- **DANGEROUS**: Medium-risk tests, may affect system state
- **CRITICAL**: High-risk tests, significant system impact

### Duration Categories

- **SHORT**: Quick tests (< 1 second)
- **MEDIUM**: Moderate tests (1-60 seconds)
- **LONG**: Extended tests (> 60 seconds)

## Error Handling

### Common Error Scenarios

**Missing Class Name**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Class name is required"
  }]
}
```

**Class Not Found**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 404: Class not found"
  }]
}
```

**No Test Classes**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: No test classes found for the specified class"
  }]
}
```

**Timeout Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Coverage run did not complete within 300 seconds"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to run tests"
  }]
}
```

## Technical Implementation

### Workflow Process

1. **Optional Auto-Activation**
   - If `auto_activate` is true, activate the class first
   - Continue with coverage analysis even if activation fails

2. **Test Run Initiation**
   - Generate unique connection and request IDs
   - Submit coverage test run request to ADT
   - Receive run ID from Location header

3. **Long Polling for Completion**
   - Poll test run status with long polling enabled
   - Maximum 150 attempts (5 minutes total)
   - 2-second intervals between polls

4. **Results Retrieval**
   - Fetch test results XML
   - Extract measurement ID from results

5. **Coverage Data Retrieval**
   - Attempt multiple strategies to get detailed coverage:
     - Strategy 1: Statements endpoint (POST)
     - Strategy 2: Measurements endpoint (POST)
     - Strategy 3: Direct access (GET)
   - Fallback to test results XML if all strategies fail

6. **Response Generation**
   - Parse coverage metrics from SAP response
   - Generate simplified XML format
   - Include test execution details

### ADT Endpoints Used

- **POST** `/sap/bc/adt/abapunit/runs` - Initiate test run with coverage
- **GET** `/sap/bc/adt/abapunit/runs/{run_id}?withLongPolling=true` - Poll for completion
- **GET** `/sap/bc/adt/abapunit/results/{run_id}` - Retrieve test results
- **POST** `/sap/bc/adt/runtime/traces/coverage/measurements/{measurement_id}/statements` - Get statement coverage
- **POST** `/sap/bc/adt/runtime/traces/coverage/measurements/{measurement_id}` - Get measurement data
- **GET** `/sap/bc/adt/runtime/traces/coverage/measurements/{measurement_id}` - Direct coverage access

### Configuration Constants

```typescript
POLLING_CONFIG = {
    INTERVAL: 2000,      // 2 seconds between polls
    MAX_ATTEMPTS: 150,   // 5 minutes maximum
    TIMEOUT: 30000       // 30 seconds per request
}
```

### XML Payload Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<aunit:run xmlns:aunit="http://www.sap.com/adt/api/aunit" 
           title="{class_name}" 
           context="ADT4Eclipse ABAP Unit Test Runner">
  <aunit:options>
    <aunit:measurements type="coverage"/>
    <aunit:scope ownTests="true" foreignTests="true" addForeignTestsAsPreview="false"/>
    <aunit:riskLevel harmless="true" dangerous="true" critical="true"/>
    <aunit:duration short="true" medium="true" long="true"/>
  </aunit:options>
  <osl:objectSet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                 xmlns:osl="http://www.sap.com/api/osl" 
                 xsi:type="osl:flatObjectSet">
    <osl:object name="{class_name}" type="CLAS"/>
  </osl:objectSet>
</aunit:run>
```

## Use Cases

### 1. Quality Assurance
Monitor test coverage to ensure code quality standards are met.

### 2. CI/CD Integration
Integrate coverage checks into continuous integration pipelines.

### 3. Code Review
Provide coverage metrics during code review processes.

### 4. Refactoring Support
Ensure refactored code maintains or improves test coverage.

### 5. Technical Debt Analysis
Identify areas with low coverage that need additional testing.

### 6. Compliance Reporting
Generate coverage reports for audit and compliance requirements.

### 7. Development Metrics
Track coverage trends over time for development teams.

## Best Practices

1. **Set Coverage Targets**: Establish minimum coverage thresholds (e.g., 80%)
2. **Focus on Critical Code**: Prioritize coverage for business-critical logic
3. **Use Auto-Activation**: Enable `auto_activate` to ensure latest code is tested
4. **Regular Monitoring**: Run coverage analysis regularly, not just before releases
5. **Combine with Tests**: Use with RunClassTests for comprehensive test analysis
6. **Review Low Coverage**: Investigate methods with low coverage percentages
7. **Balance Coverage Types**: Don't focus solely on line coverage; consider branch coverage too

## Integration Examples

### With RunClassTests Tool

```javascript
// 1. Run tests to see results
const testResults = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "RunClassTests",
  arguments: {
    class_name: "ZCL_MY_CLASS",
    auto_activate: true
  }
});

// 2. Get coverage analysis
const coverage = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassCoverage",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// Now you have both test results and coverage metrics
```

### With CreateClassTests Tool

```javascript
// 1. Create new test classes
const newTests = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "CreateClassTests",
  arguments: {
    parent_class_name: "ZCL_MY_CLASS",
    test_source_code: testCode,
    auto_activate: true
  }
});

// 2. Verify coverage improved
const coverage = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassCoverage",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});
```

### CI/CD Pipeline Integration

```javascript
// Coverage gate in CI/CD pipeline
const coverage = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassCoverage",
  arguments: {
    class_name: "ZCL_MY_CLASS",
    auto_activate: true
  }
});

// Parse coverage percentage
const coverageMatch = coverage.data.match(/overallCoverage percentage="([^"]+)"/);
const coveragePercent = parseFloat(coverageMatch[1]);

// Enforce minimum coverage threshold
if (coveragePercent < 80) {
  throw new Error(`Coverage ${coveragePercent}% is below minimum threshold of 80%`);
}
```

## Performance Considerations

- **Execution Time**: Coverage analysis takes longer than simple test execution
- **System Load**: Running coverage can impact system performance
- **Timeout Settings**: Long-running tests may require timeout adjustments
- **Polling Overhead**: Long polling reduces network overhead compared to short polling
- **Concurrent Runs**: Multiple simultaneous coverage runs may affect performance

## Limitations

1. **Test Classes Required**: Class must have test classes defined
2. **Active Version Only**: Analyzes the active version of the class
3. **Single Class**: Analyzes one class at a time (use RunPackageTests for packages)
4. **Coverage Scope**: Only measures coverage from unit tests, not integration tests
5. **Measurement Persistence**: Coverage measurements are temporary and not stored long-term

## Troubleshooting

### Coverage Run Timeout
- Increase `MAX_ATTEMPTS` if tests take longer than 5 minutes
- Check for long-running test methods
- Consider splitting large test classes

### No Coverage Data
- Verify test classes exist and are properly defined
- Check that tests actually execute code in the main class
- Ensure class is activated before running coverage

### Low Coverage Percentages
- Review test class completeness
- Add tests for uncovered branches and edge cases
- Check for unreachable code in the main class

### Authorization Issues
- Verify S_DEVELOP authorization with ACTVT=03 (display)
- Check authorization for test execution
- Ensure access to coverage measurement endpoints

## Related Tools

- **RunClassTests**: Execute tests without coverage analysis
- **GetClassTests**: Retrieve test class source code
- **CreateClassTests**: Create or modify test classes
- **RunPackageTests**: Run tests for all classes in a package
- **ActivateClasses**: Activate classes before coverage analysis
- **CheckSyntax**: Validate syntax before running tests

## Version History

- **v1.0**: Initial implementation with basic coverage retrieval
- **v1.1**: Added long polling for improved efficiency
- **v1.2**: Implemented multiple fallback strategies for coverage data
- **v1.3**: Added auto-activation support
- **v1.4**: Enhanced coverage metrics extraction and reporting

## Additional Notes

- Coverage analysis requires active test classes in the class
- The tool uses ADT's native coverage measurement infrastructure
- Coverage percentages are calculated by the SAP system
- Measurement IDs are temporary and expire after a period of inactivity
- The tool automatically handles CSRF token management
- Connection and request IDs are generated for proper ADT session tracking