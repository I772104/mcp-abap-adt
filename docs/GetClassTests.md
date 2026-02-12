# GetClassTests Tool Documentation

## Overview

The `GetClassTests` tool retrieves the local test classes (unit tests) associated with an ABAP class from the SAP system via the ADT (ABAP Development Tools) API. It returns the complete source code of all test classes defined within the class's test include.

## Endpoint

```
GET /sap/bc/adt/oo/classes/{class_name}/includes/testclasses
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `class_name` | string | Yes | Name of the ABAP class whose test classes should be retrieved |

## Response Structure

The tool returns the complete ABAP test class source code as plain text, including:

- Local test class definitions
- Test method implementations
- Setup and teardown methods
- Test data declarations
- Helper methods for testing
- Test fixtures and mock objects

### Example Response

```abap
CLASS ltcl_test DEFINITION FINAL FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.

  PRIVATE SECTION.
    DATA: cut TYPE REF TO zcl_calculator.  "class under test

    METHODS:
      setup,
      teardown,
      test_addition FOR TESTING,
      test_subtraction FOR TESTING,
      test_division FOR TESTING,
      test_division_by_zero FOR TESTING.
ENDCLASS.

CLASS ltcl_test IMPLEMENTATION.

  METHOD setup.
    CREATE OBJECT cut.
  ENDMETHOD.

  METHOD teardown.
    CLEAR cut.
  ENDMETHOD.

  METHOD test_addition.
    DATA(result) = cut->add( iv_a = 5 iv_b = 3 ).
    cl_abap_unit_assert=>assert_equals(
      act = result
      exp = 8
      msg = 'Addition failed'
    ).
  ENDMETHOD.

  METHOD test_subtraction.
    DATA(result) = cut->subtract( iv_a = 10 iv_b = 4 ).
    cl_abap_unit_assert=>assert_equals(
      act = result
      exp = 6
      msg = 'Subtraction failed'
    ).
  ENDMETHOD.

  METHOD test_division.
    DATA(result) = cut->divide( iv_a = 20 iv_b = 4 ).
    cl_abap_unit_assert=>assert_equals(
      act = result
      exp = 5
      msg = 'Division failed'
    ).
  ENDMETHOD.

  METHOD test_division_by_zero.
    TRY.
        DATA(result) = cut->divide( iv_a = 10 iv_b = 0 ).
        cl_abap_unit_assert=>fail( msg = 'Expected exception not raised' ).
      CATCH cx_sy_zerodivide.
        "Expected exception - test passes
    ENDTRY.
  ENDMETHOD.

ENDCLASS.
```

## Usage Examples

### Example 1: Retrieve Test Classes for Analysis

```json
{
  "class_name": "ZCL_MY_CLASS"
}
```

### Example 2: Retrieve Tests Before Modification

```json
{
  "class_name": "ZCL_CALCULATOR"
}
```

### Example 3: Retrieve Tests for Documentation

```json
{
  "class_name": "ZCL_DATA_PROCESSOR"
}
```

## Response Format

### Success Response

The tool returns the raw ABAP test class source code as a text string:

```
CLASS ltcl_test DEFINITION...
[Complete test class source code]
...ENDCLASS.
```

### Error Response Examples

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
    "text": "Error: HTTP 404: No test classes found for this class"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: HTTP 403: Insufficient authorization to read test classes"
  }]
}
```

## Error Handling

The tool may return errors in the following cases:

1. **Missing Class Name**: If `class_name` parameter is not provided
2. **Class Not Found**: If the specified class doesn't exist in the system
3. **No Test Classes**: If the class exists but has no test classes defined
4. **Authorization Error**: If the user doesn't have permission to read the class (requires S_DEVELOP authorization with ACTVT=03)
5. **Network Issues**: Connection problems with the SAP system

## Test Class Structure

### Local Test Class Definition

```abap
CLASS ltcl_<name> DEFINITION FINAL FOR TESTING
  [DURATION SHORT|MEDIUM|LONG]
  [RISK LEVEL HARMLESS|DANGEROUS|CRITICAL].

  PRIVATE SECTION.
    DATA: cut TYPE REF TO <class_under_test>.
    
    METHODS:
      setup,                    " Called before each test
      teardown,                 " Called after each test
      class_setup,              " Called once before all tests
      class_teardown,           " Called once after all tests
      <test_method_1> FOR TESTING,
      <test_method_2> FOR TESTING RAISING <exception>.
ENDCLASS.
```

### Test Attributes

**Duration Categories:**
- `SHORT`: Tests complete in less than 1 second
- `MEDIUM`: Tests complete in 1-60 seconds
- `LONG`: Tests take more than 60 seconds

**Risk Levels:**
- `HARMLESS`: No side effects, safe to run anytime
- `DANGEROUS`: May modify system state
- `CRITICAL`: Significant system impact

### Common Test Patterns

**Setup and Teardown:**
```abap
METHOD setup.
  " Initialize test data and objects
  CREATE OBJECT cut.
ENDMETHOD.

METHOD teardown.
  " Clean up after test
  CLEAR cut.
ENDMETHOD.
```

**Assertion Examples:**
```abap
" Equality assertion
cl_abap_unit_assert=>assert_equals(
  act = actual_value
  exp = expected_value
  msg = 'Values should be equal'
).

" Boolean assertion
cl_abap_unit_assert=>assert_true(
  act = condition
  msg = 'Condition should be true'
).

" Exception testing
cl_abap_unit_assert=>assert_not_initial(
  act = object_reference
  msg = 'Object should be initialized'
).
```

## Use Cases

### 1. Test Review and Analysis
Review existing test coverage and test quality.

### 2. Test Refactoring
Retrieve tests before refactoring to ensure they're updated appropriately.

### 3. Learning and Training
Study test patterns and best practices from existing test classes.

### 4. Test Migration
Extract test classes for migration or backup purposes.

### 5. Documentation Generation
Generate test documentation from test class source code.

### 6. Test Template Creation
Use existing test classes as templates for new tests.

### 7. Quality Assurance
Verify test completeness and adherence to testing standards.

## Best Practices

1. **Review Before Modification**: Always retrieve and review test classes before making changes
2. **Backup Tests**: Keep backups of test classes before major refactoring
3. **Analyze Coverage**: Use with GetClassCoverage to understand what tests cover
4. **Check Test Quality**: Review test methods for completeness and clarity
5. **Combine with Main Class**: Use with GetClass to see both implementation and tests
6. **Version Control**: Store test classes in version control systems

## Integration Examples

### With GetClass Tool

```javascript
// 1. Get main class implementation
const mainClass = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClass",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// 2. Get test classes
const testClasses = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassTests",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// Now you have both implementation and tests for complete analysis
```

### With RunClassTests Tool

```javascript
// 1. Get test source code
const testSource = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassTests",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// 2. Run the tests
const testResults = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "RunClassTests",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// Analyze test source and results together
```

### With CreateClassTests Tool

```javascript
// 1. Get existing test classes as reference
const existingTests = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassTests",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// 2. Modify and create updated tests
const modifiedTests = existingTests.data + '\n\n' + newTestMethods;
const createResult = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "CreateClassTests",
  arguments: {
    parent_class_name: "ZCL_MY_CLASS",
    test_source_code: modifiedTests,
    backup_existing: true
  }
});
```

### With GetClassCoverage Tool

```javascript
// 1. Get test classes
const tests = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassTests",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// 2. Run coverage analysis
const coverage = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "GetClassCoverage",
  arguments: {
    class_name: "ZCL_MY_CLASS"
  }
});

// Analyze which test methods contribute to coverage
```

## Technical Implementation

### ADT Endpoint
- **GET** `/sap/bc/adt/oo/classes/{class_name}/includes/testclasses` - Retrieve test class source

### Request Headers
- `Accept: text/plain` - Request plain text response
- `x-csrf-token: fetch` - CSRF token for security

### Response Format
- Content-Type: `text/plain`
- Character encoding: UTF-8
- Line endings: System-dependent (typically CRLF on Windows, LF on Unix)

### Security Considerations
- **Authorization Required**: S_DEVELOP with ACTVT=03 (display)
- **Object-Level Security**: Additional authorization objects may apply based on package
- **CSRF Protection**: Automatic token management for secure requests

## Test Class Naming Conventions

### Standard Naming Patterns

**Local Test Classes:**
- `LTCL_TEST` - Generic test class
- `LTCL_<FEATURE>_TEST` - Feature-specific test class
- `LTCL_UNIT_TEST` - Unit test class
- `LTCL_INTEGRATION_TEST` - Integration test class

**Test Methods:**
- `test_<method_name>` - Test for specific method
- `test_<scenario>` - Test for specific scenario
- `test_<method>_<condition>` - Test for method under specific condition

### Example Naming

```abap
CLASS ltcl_calculator_test DEFINITION FINAL FOR TESTING.
  PRIVATE SECTION.
    METHODS:
      test_add_positive_numbers FOR TESTING,
      test_add_negative_numbers FOR TESTING,
      test_divide_by_zero FOR TESTING,
      test_multiply_large_numbers FOR TESTING.
ENDCLASS.
```

## Limitations

1. **Test Classes Only**: Returns only test classes, not the main class implementation
2. **No Metadata**: Returns source code only, not test execution history
3. **Active Version**: Returns the active version, not inactive changes
4. **Single Class**: Retrieves tests for one class at a time
5. **Text Format**: Returns plain text, requires parsing for structured analysis

## Performance Considerations

- **Response Size**: Large test classes may take longer to retrieve
- **Network Latency**: Response time depends on network connection to SAP system
- **System Load**: Performance may vary based on SAP system load
- **Caching**: Consider implementing client-side caching for frequently accessed test classes

## Troubleshooting

### No Test Classes Found
- Verify the class has test classes defined
- Check that test classes are in the testclasses include
- Ensure the class is activated

### Empty Response
- Class may exist but have no tests
- Test classes may be in a separate test class (not local)
- Check authorization to view test classes

### Incomplete Test Code
- Verify the class is fully activated
- Check for syntax errors in test classes
- Ensure all test methods are properly closed

## Related Tools

- **GetClass**: Retrieve main class implementation
- **RunClassTests**: Execute the test classes
- **GetClassCoverage**: Analyze test coverage
- **CreateClassTests**: Create or modify test classes
- **CheckSyntax**: Validate test class syntax
- **ActivateClasses**: Activate class with tests

## Version History

- **v1.0**: Initial implementation with basic test class retrieval
- **v1.1**: Enhanced error handling for missing test classes
- **v1.2**: Improved character encoding support

## Additional Notes

- Test classes are stored in a special include within the class
- The tool automatically URL-encodes the class name
- Timeout is set to 30 seconds for large test class retrievals
- The response includes all comments and documentation within the test code
- Test classes follow ABAP Unit framework conventions
- Local test classes are defined with `FOR TESTING` addition
- Test methods must be marked with `FOR TESTING` addition