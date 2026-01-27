# RunClassTests Tool

The `RunClassTests` tool executes unit tests for ABAP classes and returns comprehensive, structured test results in JSON format.

## Overview

This tool runs unit tests for a specified ABAP class and provides detailed test execution results, including individual test case outcomes, execution times, and summary statistics. It supports auto-activation to ensure classes are properly activated before test execution.

## Parameters

| Parameter             | Type    | Required  | Default | Description                                                                |
|-----------------------|---------|-----------|---------|----------------------------------------------------------------------------|
| `class_name`          | string  | Yes       |     -   | Name of the ABAP class to test                                             |
| `auto_activate`       | boolean | No        | `false` | Automatically activate the class before running tests                      |
| `preaudit_requested`  | boolean | No        | `true`  | Request pre-audit during activation (only used if `auto_activate` is true) |

## Response Format

The tool returns a comprehensive JSON structure with the following information:

### Root Level Properties

```json
{
  "className": "Z_MY_CLASS",
  "system": "ER1",
  "client": "001", 
  "executedBy": "USERNAME",
  "overallStatus": "success|failed|error",
  "summary": { /* Summary statistics */ },
  "testSuites": [ /* Array of test suites */ ],
  "timestamp": "2026-01-27T09:33:54Z",
  "activation": { /* Activation results if auto_activate was used */ }
}
```

### Summary Statistics

```json
"summary": {
  "totalTests": 5,
  "passed": 4,
  "failed": 1,
  "errors": 0,
  "skipped": 0,
  "totalAsserts": 12,
  "executionTime": 0.045,
  "successRate": 80.0
}
```

### Test Suites Array

Each test suite contains:

```json
{
  "name": "Test Suite Name",
  "package": "$TMP",
  "totalTests": 2,
  "passed": 2,
  "failed": 0,
  "errors": 0,
  "skipped": 0,
  "totalAsserts": 4,
  "executionTime": 0.012,
  "timestamp": "2026-01-27T09:33:54Z",
  "testCases": [ /* Array of individual test cases */ ]
}
```

### Individual Test Cases

```json
{
  "name": "test_method_name",
  "className": "$tmp.clas:z_my_class---ltcl_test",
  "status": "passed|failed|error|skipped",
  "executionTime": 0.001,
  "assertCount": 2,
  "errorMessage": "Error details (if status is 'error')",
  "failureMessage": "Failure details (if status is 'failed')"
}
```

### Activation Results (when auto_activate is true)

```json
"activation": {
  "status": "success|error",
  "message": "Activation result message",
  "activatedClasses": [
    {
      "className": "Z_MY_CLASS",
      "uri": "/sap/bc/adt/oo/classes/z_my_class",
      "status": "success",
      "message": "Class Z_MY_CLASS activated successfully"
    }
  ],
  "summary": {
    "totalClasses": 1,
    "successCount": 1,
    "errorCount": 0,
    "warningCount": 0
  },
  "timestamp": "2026-01-27T09:33:53.954Z"
}
```

## Usage Examples

### Basic Test Execution

```json
{
  "class_name": "Z_MY_TEST_CLASS"
}
```

### Test Execution with Auto-Activation

```json
{
  "class_name": "Z_MY_TEST_CLASS",
  "auto_activate": true,
  "preaudit_requested": true
}
```

## Response Interpretation

### Overall Status Values

- **`success`**: All tests passed without errors
- **`failed`**: One or more tests failed (assertions failed)
- **`error`**: One or more tests encountered runtime errors

### Individual Test Status Values

- **`passed`**: Test executed successfully with all assertions passing
- **`failed`**: Test executed but one or more assertions failed
- **`error`**: Test encountered a runtime error during execution
- **`skipped`**: Test was skipped (not executed)

### Success Rate Calculation

The success rate is calculated as: `(passed tests / total tests) * 100`

## Error Handling

- Invalid class names will result in an error response
- Classes that don't exist will cause test execution to fail
- Activation failures (when `auto_activate` is true) will be reported but won't prevent test execution from being attempted
- Network or system errors during test execution will be properly reported

## Auto-Activation Workflow

When `auto_activate` is set to `true`:

1. **Pre-Test Activation**: The class is automatically activated before test execution
2. **Activation Results**: Full activation details are included in the response
3. **Failure Handling**: If activation fails, a warning is logged but test execution proceeds
4. **Comprehensive Reporting**: Both activation and test results are provided in a unified response

## Benefits of the Enhanced Format

### Structured Data
- Easy to parse and process programmatically
- Clear separation of concerns (summary, suites, individual tests)
- Consistent data types and naming conventions

### Comprehensive Information
- Detailed execution times for performance analysis
- Individual test case results for debugging
- Success rates for quality metrics
- Auto-activation results when applicable

### Integration-Friendly
- JSON format for easy consumption by CI/CD pipelines
- Standardized status values for automated decision making
- Timestamps for audit trails and reporting

## Example Complete Response

```json
{
  "className": "Z_CALCULATOR",
  "system": "ER1",
  "client": "001",
  "executedBy": "DEVELOPER",
  "overallStatus": "success",
  "summary": {
    "totalTests": 3,
    "passed": 3,
    "failed": 0,
    "errors": 0,
    "skipped": 0,
    "totalAsserts": 6,
    "executionTime": 0.025,
    "successRate": 100
  },
  "testSuites": [
    {
      "name": "",
      "package": "$tmp",
      "totalTests": 3,
      "passed": 3,
      "failed": 0,
      "errors": 0,
      "skipped": 0,
      "totalAsserts": 6,
      "executionTime": 0.025,
      "timestamp": "2026-01-27T10:30:15Z",
      "testCases": [
        {
          "name": "test_addition",
          "className": "$tmp.clas:z_calculator---ltcl_test",
          "status": "passed",
          "executionTime": 0.008,
          "assertCount": 2
        },
        {
          "name": "test_subtraction", 
          "className": "$tmp.clas:z_calculator---ltcl_test",
          "status": "passed",
          "executionTime": 0.009,
          "assertCount": 2
        },
        {
          "name": "test_division",
          "className": "$tmp.clas:z_calculator---ltcl_test", 
          "status": "passed",
          "executionTime": 0.008,
          "assertCount": 2
        }
      ]
    }
  ],
  "timestamp": "2026-01-27T10:30:15Z",
  "activation": {
    "status": "success",
    "message": "Class Z_CALCULATOR activated successfully",
    "activatedClasses": [
      {
        "className": "Z_CALCULATOR",
        "uri": "/sap/bc/adt/oo/classes/z_calculator",
        "status": "success",
        "message": "Class Z_CALCULATOR activated successfully"
      }
    ],
    "summary": {
      "totalClasses": 1,
      "successCount": 1,
      "errorCount": 0,
      "warningCount": 0
    },
    "timestamp": "2026-01-27T10:30:14.875Z"
  }
}
```

## Integration with Development Workflows

### CI/CD Pipeline Integration
- Use `successRate` to determine pipeline success/failure
- Parse individual test results for detailed reporting
- Include activation status in deployment decisions

### IDE Integration
- Display formatted test results in development environments
- Show execution times for performance optimization
- Highlight failed tests for quick debugging

### Quality Gates
- Set minimum success rate thresholds
- Monitor execution time trends
- Track activation success rates

This enhanced format provides developers and automation systems with comprehensive, structured test results that support modern ABAP development workflows and quality assurance processes.