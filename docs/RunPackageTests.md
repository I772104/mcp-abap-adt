# RunPackageTests Tool Documentation

## Overview

The `RunPackageTests` tool executes unit tests for all test-enabled objects within an ABAP package and returns aggregated test results. It leverages the ADT (ABAP Development Tools) ABAP Unit test framework to run tests across an entire package hierarchy.

## Endpoint

```
POST /sap/bc/adt/abapunit/runs
```

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `package_name` | string | Yes | - | Name of the ABAP package to test |

## Response Structure

The tool returns comprehensive test results in JSON format:

```json
{
  "testTarget": "PACKAGE_NAME",
  "system": "ER1",
  "client": "100",
  "executedBy": "USERNAME",
  "overallStatus": "success",
  "summary": {
    "totalTests": 45,
    "passed": 42,
    "failed": 3,
    "errors": 0,
    "skipped": 0,
    "totalAsserts": 156,
    "executionTime": 12.5,
    "successRate": 93.33
  },
  "testSuites": [
    {
      "name": "CL_SOME_CLASS",
      "package": "PACKAGE_NAME",
      "totalTests": 5,
      "passed": 5,
      "failed": 0,
      "errors": 0,
      "skipped": 0,
      "totalAsserts": 15,
      "executionTime": 1.2,
      "timestamp": "2024-02-11T10:21:40Z",
      "testCases": [
        {
          "name": "test_method_1",
          "className": "CL_SOME_CLASS",
          "status": "passed",
          "executionTime": 0.3,
          "assertCount": 3
        }
      ]
    }
  ],
  "timestamp": "2024-02-11T10:21:40Z"
}
```

## Features

### Automatic Package-Level Testing
- Tests all classes with unit tests in the package
- Includes sub-packages by default (ADT native behavior)
- Aggregates results across all test classes

### Comprehensive Results
- Overall status (success/failed/error)
- Summary statistics (total, passed, failed, errors, skipped)
- Success rate percentage
- Total execution time
- Individual test suite details
- Detailed test case information

### No Activation Required
Unlike `RunClassTests`, this tool does not support auto-activation since:
- Packages cannot be activated (only their contents)
- Testing multiple classes with activation would be complex
- Users should activate classes manually before running package tests

## Usage Examples

### Example 1: Basic Package Testing

Test all objects in a package:

```typescript
const result = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "RunPackageTests",
  arguments: {
    package_name: "Z_MY_PACKAGE"
  }
});
```

**Response:**
```json
{
  "testTarget": "Z_MY_PACKAGE",
  "system": "ER1",
  "client": "100",
  "executedBy": "DEVELOPER",
  "overallStatus": "success",
  "summary": {
    "totalTests": 25,
    "passed": 25,
    "failed": 0,
    "errors": 0,
    "skipped": 0,
    "totalAsserts": 87,
    "executionTime": 5.3,
    "successRate": 100.0
  },
  "testSuites": [...],
  "timestamp": "2024-02-11T10:21:40Z"
}
```

### Example 2: Testing After Package Changes

After making changes to multiple classes in a package:

```typescript
// 1. Make changes to classes
// 2. Activate all changed classes
await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "ActivateClasses",
  arguments: {
    class_names: ["ZCL_CLASS1", "ZCL_CLASS2", "ZCL_CLASS3"]
  }
});

// 3. Run package tests
const testResults = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "RunPackageTests",
  arguments: {
    package_name: "Z_MY_PACKAGE"
  }
});
```

### Example 3: CI/CD Integration

Use in continuous integration pipelines:

```typescript
async function validatePackage(packageName: string): Promise<boolean> {
  const result = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "RunPackageTests",
    arguments: { package_name: packageName }
  });
  
  const testResults = JSON.parse(result.content[0].text);
  
  if (testResults.overallStatus !== 'success') {
    console.error(`Tests failed for package ${packageName}`);
    console.error(`Success rate: ${testResults.summary.successRate}%`);
    console.error(`Failed: ${testResults.summary.failed}`);
    console.error(`Errors: ${testResults.summary.errors}`);
    return false;
  }
  
  console.log(`All tests passed for ${packageName}`);
  return true;
}
```

## Response Fields

### Root Level

| Field | Type | Description |
|-------|------|-------------|
| `testTarget` | string | Name of the package tested |
| `system` | string | SAP system ID |
| `client` | string | SAP client number |
| `executedBy` | string | User who executed the tests |
| `overallStatus` | string | Overall test status: 'success', 'failed', or 'error' |
| `summary` | object | Aggregated test statistics |
| `testSuites` | array | Individual test suite results |
| `timestamp` | string | ISO 8601 timestamp of test execution |

### Summary Object

| Field | Type | Description |
|-------|------|-------------|
| `totalTests` | number | Total number of test methods |
| `passed` | number | Number of passed tests |
| `failed` | number | Number of failed tests |
| `errors` | number | Number of tests with errors |
| `skipped` | number | Number of skipped tests |
| `totalAsserts` | number | Total number of assertions |
| `executionTime` | number | Total execution time in seconds |
| `successRate` | number | Percentage of passed tests (0-100) |

### Test Suite Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Test suite name (usually class name) |
| `package` | string | Package containing the test suite |
| `totalTests` | number | Number of tests in this suite |
| `passed` | number | Number of passed tests |
| `failed` | number | Number of failed tests |
| `errors` | number | Number of tests with errors |
| `skipped` | number | Number of skipped tests |
| `totalAsserts` | number | Number of assertions in this suite |
| `executionTime` | number | Execution time in seconds |
| `timestamp` | string | ISO 8601 timestamp |
| `testCases` | array | Individual test case results |

### Test Case Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Test method name |
| `className` | string | Class containing the test |
| `status` | string | Test status: 'passed', 'failed', 'error', or 'skipped' |
| `executionTime` | number | Execution time in seconds |
| `assertCount` | number | Number of assertions |
| `failureMessage` | string | Failure message (if failed) |
| `errorMessage` | string | Error message (if error) |

## Error Handling

The tool may return errors in the following cases:

1. **Missing Package Name**
   ```json
   {
     "isError": true,
     "content": [{
       "type": "text",
       "text": "Error: Package name is required"
     }]
   }
   ```

2. **Package Not Found**
   ```json
   {
     "isError": true,
     "content": [{
       "type": "text",
       "text": "Error: HTTP 404: Package not found"
     }]
   }
   ```

3. **No Tests Found**
   - If no test-enabled classes exist in the package, the tool will return success with 0 tests
   - This is not considered an error

4. **Test Execution Timeout**
   ```json
   {
     "isError": true,
     "content": [{
       "type": "text",
       "text": "Error: Test run did not complete within the timeout period"
     }]
   }
   ```

## Use Cases

### 1. Package Validation
Validate that all tests in a package pass before releasing changes.

### 2. Continuous Integration
Integrate into CI/CD pipelines to automatically test packages on commit.

### 3. Regression Testing
Run comprehensive tests after making changes to ensure no regressions.

### 4. Quality Gates
Use as a quality gate to prevent deployment of packages with failing tests.

### 5. Test Coverage Analysis
Identify packages with low test coverage or failing tests.

### 6. Development Workflow
Run package tests during development to catch issues early.

## Best Practices

1. **Activate Before Testing**: Always activate modified classes before running package tests
   ```typescript
   // Activate first
   await ActivateClasses({ class_names: [...] });
   // Then test
   await RunPackageTests({ package_name: "..." });
   ```

2. **Monitor Execution Time**: Large packages may take several minutes to test
   - Consider breaking large packages into smaller ones
   - Run tests in parallel for multiple packages

3. **Handle Failures Gracefully**: Check `overallStatus` and `summary` fields
   ```typescript
   if (result.overallStatus !== 'success') {
     // Handle failures
     console.log(`Failed: ${result.summary.failed}`);
     console.log(`Errors: ${result.summary.errors}`);
   }
   ```

4. **Use in Development**: Run package tests frequently during development
   - After making changes
   - Before committing code
   - As part of code review process

5. **Combine with Other Tools**: Use alongside other package tools
   ```typescript
   // Get package info
   const pkgInfo = await GetPackage({ package_name: "..." });
   
   // Get package contents
   const contents = await GetPackageContents({ package_name: "..." });
   
   // Run tests
   const tests = await RunPackageTests({ package_name: "..." });
   ```

## Performance Considerations

- **Execution Time**: Depends on number of test classes and test complexity
  - Small packages (< 10 classes): 1-5 seconds
  - Medium packages (10-50 classes): 5-30 seconds
  - Large packages (> 50 classes): 30+ seconds

- **Timeout**: Default timeout is 5 minutes (300 seconds)
  - Adjust if testing very large packages
  - Consider breaking up large packages

- **Sub-packages**: ADT automatically includes sub-packages
  - This can significantly increase execution time
  - No way to disable this behavior (ADT limitation)

## Comparison with RunClassTests

| Feature | RunClassTests | RunPackageTests |
|---------|---------------|-----------------|
| Scope | Single class | Entire package |
| Auto-activation | ✅ Supported | ❌ Not supported |
| Sub-packages | N/A | ✅ Included automatically |
| Execution time | Fast (< 1s typically) | Slower (depends on package size) |
| Use case | Individual class testing | Package-level validation |
| CI/CD | Class-level checks | Package-level gates |

## Related Tools

- **RunClassTests**: Run tests for a single class
- **GetClassCoverage**: Get test coverage for a class
- **GetPackage**: Get package metadata
- **GetPackageContents**: List objects in a package
- **ActivateClasses**: Activate classes before testing

## Technical Notes

- Uses ADT REST API endpoint `/sap/bc/adt/abapunit/runs`
- Leverages ADT's native package testing capability
- Results are in JUnit XML format, parsed to JSON
- Polling mechanism waits for test completion (max 5 minutes)
- Sub-packages are automatically included by ADT
- No activation support (packages cannot be activated)
- Shared implementation with RunClassTests via `test-runner-utils.ts`

## Code Reuse

This tool shares core functionality with `RunClassTests`:
- Both use the same ADT endpoint
- Both use the same polling mechanism
- Both parse JUnit XML results
- Both use shared utilities in `test-runner-utils.ts`

The only difference is the XML payload structure:
- **Class**: Uses `flatObjectSet` with class name
- **Package**: Uses `multiPropertySet` with package property