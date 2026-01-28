# Auto-Activation Feature

The Auto-Activation feature enables automatic activation of ABAP classes immediately after creation or modification, streamlining the development workflow by eliminating manual activation steps.

## Overview

Auto-activation is available for:
- **CreateClass**: Automatically activate newly created classes
- **CreateClassTests**: Automatically activate parent class after adding test classes

## Benefits

- **Streamlined Workflow**: Eliminates manual activation steps
- **Error Reduction**: Prevents forgotten activation that causes test failures  
- **Developer Experience**: Faster iteration cycles during development
- **Comprehensive Reporting**: Full visibility into both creation and activation results

## Usage

### CreateClass with Auto-Activation

```json
{
  "class_name": "Z_MY_CLASS",
  "source_code": "CLASS Z_MY_CLASS DEFINITION...",
  "description": "My test class",
  "auto_activate": true,
  "preaudit_requested": true
}
```

### CreateClassTests with Auto-Activation

```json
{
  "parent_class_name": "Z_MY_CLASS", 
  "test_source_code": "CLASS ltcl_test DEFINITION FOR TESTING...",
  "auto_activate": true,
  "preaudit_requested": false
}
```

## Parameters

### `auto_activate` (boolean, optional)
- **Default**: `true`
- **Description**: Whether to automatically activate after creation/modification
- **When enabled**: Triggers activation using the existing ActivateClasses handler

### `preaudit_requested` (boolean, optional)
- **Default**: `true`
- **Description**: Whether to request pre-audit during activation
- **Only used when**: `auto_activate` is `true`

## Response Formats

### Success Response (Both Creation & Activation Successful)

```json
{
  "creation": {
    "status": "success",
    "message": "Local class Z_MY_CLASS created successfully",
    "details": {
      "className": "Z_MY_CLASS",
      "package": "$TMP",
      "description": "My test class",
      "action": "create",
      "backup": { "created": false, "message": "No backup requested" },
      "location": {
        "metadataUrl": "...",
        "sourceUrl": "..."
      }
    },
    "timestamp": "2026-01-27T09:15:30.123Z"
  },
  "activation": {
    "status": "success",
    "message": "Class Z_MY_CLASS activated successfully",
    "activatedClasses": [...],
    "summary": {
      "totalClasses": 1,
      "successCount": 1, 
      "errorCount": 0,
      "warningCount": 0
    },
    "timestamp": "2026-01-27T09:15:32.456Z"
  },
  "workflow": {
    "auto_activated": true,
    "overall_status": "success",
    "creation_successful": true,
    "activation_successful": true
  }
}
```

### Partial Success Response (Creation Successful, Activation Failed)

```json
{
  "creation": {
    "status": "success",
    "message": "Local class Z_MY_CLASS created successfully",
    "details": { /* creation details */ },
    "timestamp": "2026-01-27T09:15:30.123Z"
  },
  "activation": {
    "status": "error",
    "error_message": "Activation failed for class Z_MY_CLASS", 
    "details": {
      "error_code": "ACTIVATION_FAILED",
      "raw_response": "<?xml...error details...>",
      "suggested_action": "Check class syntax and dependencies, then manually activate using ActivateClasses tool"
    },
    "timestamp": "2026-01-27T09:15:32.789Z"
  },
  "workflow": {
    "auto_activated": true,
    "overall_status": "partial_success",
    "creation_successful": true,
    "activation_successful": false,
    "next_steps": [
      "Class created successfully but activation failed",
      "Use ActivateClasses tool to manually activate",
      "Check class syntax and dependencies, then manually activate using ActivateClasses tool"
    ]
  }
}
```

### Complete Failure Response (Creation Failed)

```json
{
  "creation": {
    "status": "error",
    "message": "Class creation failed due to syntax errors",
    "details": { /* error details */ }
  },
  "activation": {
    "status": "skipped",
    "message": "Activation skipped because creation failed"
  },
  "workflow": {
    "auto_activated": false,
    "overall_status": "error", 
    "creation_successful": false,
    "activation_successful": false
  }
}
```

## Error Handling

### Never-Fail Principle
Auto-activation is designed to **never fail silently**. All responses include comprehensive information about both creation and activation attempts, regardless of success or failure.

### Error Categories

#### 1. Syntax Errors
```json
{
  "error_code": "ACTIVATION_FAILED",
  "suggested_action": "Check class syntax and dependencies, then manually activate using ActivateClasses tool"
}
```

#### 2. Permission Errors
```json
{
  "error_code": "ACTIVATION_FAILED", 
  "suggested_action": "Check system connectivity and permissions, then try manual activation"
}
```

#### 3. System Errors
```json
{
  "error_code": "ACTIVATION_EXCEPTION",
  "suggested_action": "Check system connectivity and permissions, then try manual activation"
}
```

#### 4. Dependency Issues
```json
{
  "error_code": "ACTIVATION_ERRORS",
  "suggested_action": "Review activation errors and fix issues before proceeding"
}
```

### Recovery Strategies

1. **Syntax Issues**: Use `CheckSyntax` tool to validate code before retry
2. **Permission Issues**: Verify S_DEVELOP authorization 
3. **System Issues**: Check ADT connectivity and system availability
4. **Dependency Issues**: Ensure all dependencies are available and activated

## Backward Compatibility

### Default Behavior
- `auto_activate` now defaults to `true` to streamline development workflows
- Existing workflows that explicitly set `auto_activate: false` continue to work unchanged
- Standard response format maintained when auto-activation is disabled
- **Breaking Change**: Classes and test classes are now auto-activated by default

### Migration Path
```javascript
// Previous behavior (manual activation required)
await createClass(params);
await activateClasses({ class_name: params.class_name });

// New default behavior (automatic activation)
await createClass(params); // Auto-activates by default

// To disable auto-activation (restore old behavior)
await createClass({ 
  ...params, 
  auto_activate: false 
});
```

## Best Practices

### When to Use Auto-Activation
- ✅ Development and testing environments
- ✅ Local package ($TMP) development
- ✅ Rapid prototyping workflows
- ✅ Automated CI/CD pipelines

### When to Avoid Auto-Activation
- ❌ Production environments with strict change control
- ❌ Transport-relevant packages (unless explicitly approved)
- ❌ Complex dependency scenarios requiring manual coordination
- ❌ When detailed activation analysis is required

### Performance Considerations
- Auto-activation adds ~1-3 seconds to operation time
- Batch operations are optimized for multiple classes
- Network latency affects activation duration
- Consider timeout implications for large classes

## Integration Examples

### Basic Class Creation with Auto-Activation
```typescript
const result = await useAdtTool('CreateClass', {
  class_name: 'Z_CALCULATOR',
  source_code: classCode,
  description: 'Simple calculator class',
  auto_activate: true
});

if (result.workflow?.overall_status === 'success') {
  console.log('Class created and activated successfully');
} else if (result.workflow?.overall_status === 'partial_success') {
  console.log('Class created but activation failed');
  console.log('Next steps:', result.workflow.next_steps);
}
```

### Test Creation with Auto-Activation
```typescript
const result = await useAdtTool('CreateClassTests', {
  parent_class_name: 'Z_CALCULATOR',
  test_source_code: testCode,
  auto_activate: true,
  preaudit_requested: false
});

if (result.workflow?.activation_successful) {
  // Run tests immediately
  await useAdtTool('RunClassTests', {
    class_name: 'Z_CALCULATOR'
  });
}
```

### CI/CD Pipeline Integration
```typescript
async function deployClass(className: string, sourceCode: string) {
  try {
    const createResult = await useAdtTool('CreateClass', {
      class_name: className,
      source_code: sourceCode,
      auto_activate: true,
      preaudit_requested: true
    });
    
    if (createResult.workflow?.overall_status === 'success') {
      return { success: true, message: 'Deployment successful' };
    } else {
      return { 
        success: false, 
        message: 'Deployment failed',
        details: createResult.workflow?.next_steps || []
      };
    }
  } catch (error) {
    return { success: false, message: `Deployment error: ${error.message}` };
  }
}
```

## Troubleshooting

### Common Issues

#### Issue: Auto-activation always fails
**Symptoms**: `activation_successful: false` in all responses
**Solutions**:
1. Check S_DEVELOP authorization
2. Verify ADT connectivity
3. Test manual activation first
4. Check system logs for detailed errors

#### Issue: Partial success but no clear error
**Symptoms**: `overall_status: "partial_success"` with vague error messages
**Solutions**:
1. Check `raw_response` in activation details
2. Use `CheckSyntax` tool on the source code
3. Verify class dependencies are activated
4. Review suggested_action for specific guidance

#### Issue: Performance degradation
**Symptoms**: Slow response times with auto-activation
**Solutions**:
1. Monitor network latency to ADT system
2. Consider disabling preaudit for faster activation
3. Use batch operations for multiple classes
4. Implement timeouts and retry logic

### Debug Information

Auto-activation provides extensive debug information:
- **Timestamps**: Track operation duration
- **Raw Responses**: Full ADT system responses 
- **Error Codes**: Categorized error types
- **Suggested Actions**: Specific remediation steps

## Implementation Details

### Architecture
Auto-activation is implemented through:
1. **Activation Utils**: Shared utility functions (`src/lib/activation-utils.ts`)
2. **Handler Enhancement**: Modified CreateClass and CreateClassTests handlers
3. **Response Transformation**: Unified workflow response format
4. **Error Handling**: Comprehensive error capture and reporting

### Dependencies
- Existing `ActivateClasses` handler
- ADT system connectivity
- Proper authentication and authorization

### Testing
Comprehensive test coverage includes:
- Success scenarios (creation + activation)
- Partial success scenarios (creation success, activation failure)  
- Error scenarios (creation failure)
- Backward compatibility
- Response format validation
- Edge cases and error conditions