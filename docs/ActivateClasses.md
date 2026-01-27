# ActivateClasses Handler

## Overview
The ActivateClasses handler provides functionality to activate ABAP classes after creation or modification. This is an essential operation in ABAP development as classes must be activated before they can be used.

## API Endpoint
- **Method**: POST
- **Endpoint**: `/sap/bc/adt/activation?method=activate&preauditRequested={boolean}`
- **Content-Type**: `application/xml; charset=utf-8`
- **Accept**: `application/xml`

## Handler Details

### Input Parameters
The handler accepts either a single class or multiple classes for activation:

#### Single Class Activation
```json
{
  "class_name": "ZCL_DEMO_CALCULATOR",
  "preaudit_requested": true
}
```

#### Multiple Classes Activation
```json
{
  "class_names": ["ZCL_DEMO_CALCULATOR", "ZCL_ANOTHER_CLASS"],
  "preaudit_requested": true
}
```

#### Parameters
- **class_name** (string, optional): Single ABAP class name to activate
- **class_names** (array of strings, optional): Array of ABAP class names to activate
- **preaudit_requested** (boolean, optional): Whether to request pre-audit (default: true)

*Note: Either `class_name` or `class_names` must be provided*

### XML Request Format
The handler generates XML payload in the following format:
```xml
<?xml version="1.0" encoding="UTF-8"?><adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:uri="/sap/bc/adt/oo/classes/zcl_demo_calculator" adtcore:name="ZCL_DEMO_CALCULATOR"/>
</adtcore:objectReferences>
```

### Response Format
The handler returns a comprehensive response including:

```json
{
  "activation": {
    "status": "success|error|warning",
    "activatedClasses": [
      {
        "className": "ZCL_DEMO_CALCULATOR",
        "uri": "/sap/bc/adt/oo/classes/zcl_demo_calculator",
        "status": "success",
        "message": "Class ZCL_DEMO_CALCULATOR activated successfully"
      }
    ],
    "summary": {
      "totalClasses": 1,
      "successCount": 1,
      "errorCount": 0,
      "warningCount": 0
    },
    "timestamp": "2026-01-27T08:22:00.000Z"
  },
  "request": {
    "endpoint": "https://sap-host/sap/bc/adt/activation?method=activate&preauditRequested=true",
    "classNames": ["ZCL_DEMO_CALCULATOR"],
    "preauditRequested": true,
    "method": "POST"
  },
  "rawResponse": "..."
}
```

## Features

### 1. Flexible Input Handling
- Supports both single class and batch activation
- Automatic normalization of class names to uppercase
- Proper validation of class names

### 2. XML Generation
- Proper XML escaping for class names
- Correct URI generation for class references
- ADT-compliant XML structure

### 3. Response Parsing
- Intelligent parsing of activation results
- Status determination (success/error/warning)
- Detailed per-class activation status

### 4. Error Handling
- Comprehensive validation of input parameters
- Proper handling of authorization errors (403)
- Clear error messages for missing classes (404)
- Graceful fallback when parsing fails

### 5. Integration
- Full integration with existing MCP server architecture
- Consistent error handling and response formatting
- Proper authentication and CSRF token handling

## Usage Examples

### Single Class Activation
```typescript
const result = await handleActivateClasses({
  class_name: "ZCL_DEMO_CALCULATOR",
  preaudit_requested: true
});
```

### Multiple Classes Activation
```typescript
const result = await handleActivateClasses({
  class_names: ["ZCL_DEMO_CALCULATOR", "ZCL_ANOTHER_CLASS"],
  preaudit_requested: false
});
```

## Common Use Cases

1. **After Class Creation**: Activate newly created classes to make them available for use
2. **After Code Changes**: Activate modified classes to apply changes
3. **Batch Processing**: Activate multiple related classes in a single operation
4. **CI/CD Integration**: Automated activation of classes in deployment pipelines

## Error Scenarios

### Authorization Error (403)
- Insufficient S_DEVELOP authorization
- Returns clear error message about missing permissions

### Class Not Found (404)
- One or more classes don't exist in the system
- Returns error indicating missing classes

### Validation Errors
- Empty class names
- Invalid class name format
- Class names exceeding 30 characters

## Dependencies
- Uses existing `makeAdtRequest` utility for ADT communication
- Integrates with authentication and CSRF token management
- Follows established error handling patterns

## Implementation Files
- **Handler**: `src/handlers/handleActivateClasses.ts`
- **Integration**: `src/index.ts` (tool registration and routing)
- **Documentation**: `docs/ActivateClasses.md`