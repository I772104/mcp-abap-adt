# Class Development Workflow

## Mandatory Workflow Sequence

**ALWAYS follow this exact sequence** when creating or modifying ABAP classes:

### Standard Workflow (Recommended for Learning/Debugging)

```
1. CheckSyntax (class code)
   → Validates class source code syntax
   → Catches errors before creation
   → Validates naming conventions

2. CreateClass
   → class_name: "ZCL_MY_CLASS"
   → source_code: <validated_code>
   → auto_activate: false
   → package: "$TMP"

3. CheckSyntax (test code)
   → Validates test source code syntax
   → Ensures test code is correct

4. CreateClassTests
   → parent_class_name: "ZCL_MY_CLASS"
   → test_source_code: <validated_test_code>
   → auto_activate: false

5. RunClassTests
   → class_name: ZCL_MY_CLASS
   → All tests must pass before activation

6. ActivateClasses
   → class_name: ZCL_MY_CLASS
   → Only activate after tests pass
```

### Quick Workflow (Experienced Users)

```
1. Batch Validation
   → CheckSyntax (class) + CheckSyntax (tests)
   → Validate both upfront, fail fast

2. CreateClass
   → auto_activate: true (safe after validation)

3. CreateClassTests
   → No separate validation needed

4. RunClassTests
   → Verify on activated class
```

## Critical Rules

**ALWAYS**:
- ✅ Validate syntax before creation
- ✅ Run tests before activation
- ✅ Use auto_activate: false during development
- ✅ Check coverage with GetClassCoverage

**NEVER**:
- ❌ Skip CheckSyntax validation
- ❌ Activate without running tests
- ❌ Use auto_activate: true during development
- ❌ Ignore test failures

## Workflow Prompts

Use MCP prompts for guided workflows:

```
# Standard workflow
invoke_prompt: create-class-workflow
arguments: {
  class_name: "ZCL_MY_CLASS",
  description: "Class description"
}

# Quick workflow
invoke_prompt: quick-class-workflow
arguments: {
  class_name: "ZCL_MY_CLASS",
  description: "Class description"
}
```

## Refactoring Existing Classes

When modifying existing classes:

```
1. GetClass
   → access_mcp_resource: uri=abap://class/ZCL_EXISTING_CLASS

2. GetClassTests
   → use_mcp_tool: GetClassTests with class_name=ZCL_EXISTING_CLASS

3. CheckSyntax
   → Validate modified code

4. CreateClass
   → backup_existing: true
   → auto_activate: false

5. RunClassTests
   → Verify tests still pass

6. GetClassCoverage
   → Check coverage hasn't decreased

7. ActivateClasses
   → Only if all checks pass
```

## Workflow Prompt for Refactoring

```
invoke_prompt: refactor-class-workflow
arguments: {
  class_name: "ZCL_EXISTING_CLASS"
}
```

## Test Coverage Requirements

| Code Type | Minimum Coverage | Target Coverage |
|-----------|------------------|-----------------|
| RAP Behavior Implementation | 80% | 90% |
| Business Logic Classes | 70% | 85% |
| Utility/Helper Classes | 60% | 75% |

## Common Mistakes to Avoid

1. ❌ Creating class without CheckSyntax first
   → Leads to syntax errors in SAP system

2. ❌ Using auto_activate: true during development
   → Activates broken code

3. ❌ Activating without running tests
   → Breaks existing functionality

4. ❌ Ignoring test coverage
   → Poor code quality

5. ❌ Not using backup_existing when refactoring
   → Risk of losing code

## ABAP Cloud Compliance

All new classes must comply with ABAP Cloud restrictions:

**Allowed**:
```abap
" ✅ Released APIs and CDS views
SELECT * FROM I_BusinessPartner INTO TABLE @DATA(lt_bp).

" ✅ Released classes
DATA(lo_uuid) = cl_system_uuid=>create_uuid_x16_static( ).

" ✅ RAP business object access
MODIFY ENTITIES OF I_SalesOrderTP...
```

**Forbidden**:
```abap
" ❌ Direct database table access
SELECT * FROM vbak INTO TABLE @DATA(lt_vbak).

" ❌ Unreleased function modules
CALL FUNCTION 'CONVERSION_EXIT_ALPHA_INPUT'.

" ❌ Classic dynpro processing
CALL SCREEN 100.

" ❌ Direct COMMIT/ROLLBACK
COMMIT WORK.
```

See [../ABAP_Standards.md](../ABAP_Standards.md) for complete guidelines.

## Related Documentation

- [../ABAP_Standards.md](../ABAP_Standards.md) - Naming conventions and standards
- [../CheckSyntax.md](../CheckSyntax.md) - Syntax validation tool
- [../CreateClass.md](../CreateClass.md) - Class creation tool
- [../CreateClassTests.md](../CreateClassTests.md) - Test creation tool
- [../RunClassTests.md](../RunClassTests.md) - Test execution tool
- [../ActivateClasses.md](../ActivateClasses.md) - Activation tool
