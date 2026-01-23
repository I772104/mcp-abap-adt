# DeleteLocalClass Handler

## Overview
The `DeleteLocalClass` handler provides functionality to safely delete local ABAP classes from the SAP system. This handler implements a two-step deletion process with comprehensive validation to ensure only appropriate classes can be deleted.

## Purpose
- Delete local ABAP classes (Z/Y classes in local packages like $TMP, $LOCAL)
- Prevent accidental deletion of transport-managed or system classes
- Provide detailed feedback about deletion operations

## Security Features
- **Namespace Validation**: Only Z/Y classes (customer namespace) can be deleted
- **Package Validation**: Only classes in local packages ($TMP, $LOCAL, etc.) can be deleted
- **Deletion Check**: Verifies class is deletable before attempting deletion
- **Dependency Check**: Ensures class has no dependencies or locks

## API Details

### Tool Name
`DeleteLocalClass`

### Input Parameters
```typescript
{
  class_name: string;  // Required: Name of the ABAP class to delete (must start with Z or Y)
}
```

### Example Usage
```json
{
  "class_name": "Z_MY_TEST_CLASS"
}
```

## Implementation Process

### Step 1: Validation
1. **Parameter Validation**: Ensures class_name is provided
2. **Naming Convention**: Validates Z/Y prefix for customer namespace
3. **Character Validation**: Ensures valid ABAP naming pattern (A-Z, 0-9, underscore)
4. **Length Validation**: Ensures class name doesn't exceed 30 characters

### Step 2: Deletion Check
1. **API Call**: `POST /sap/bc/adt/deletion/check`
2. **Headers**: 
   - Content-Type: `application/vnd.sap.adt.deletion.check.request.v1+xml`
   - Accept: `application/vnd.sap.adt.deletion.check.response.v1+xml`
3. **Payload**: XML request with class URI
4. **Validation**: 
   - Verifies class exists
   - Confirms class is in local package
   - Ensures class is deletable (no locks/dependencies)

### Step 3: Deletion Execution
1. **API Call**: `POST /sap/bc/adt/deletion/delete`
2. **Headers**:
   - Content-Type: `application/vnd.sap.adt.deletion.request.v1+xml`
   - Accept: `application/vnd.sap.adt.deletion.response.v1+xml`
3. **Payload**: XML deletion request with class URI
4. **Confirmation**: Verifies deletion was successful

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Local class Z_MY_TEST_CLASS deleted successfully",
  "details": {
    "className": "Z_MY_TEST_CLASS",
    "package": "$TMP",
    "deletionConfirmed": true,
    "timestamp": "2026-01-23T14:24:31.355Z"
  }
}
```

### Error Responses

#### Invalid Class Name
```json
{
  "error": "Only Z and Y classes (customer namespace) can be deleted"
}
```

#### Non-Local Package
```json
{
  "error": "Class Z_MY_CLASS is in package 'ZPACKAGE' which is not a local package. Only classes in local packages ($TMP, $LOCAL, etc.) can be deleted."
}
```

#### Class Not Found
```json
{
  "error": "Class Z_MY_CLASS not found. Verify the class exists and the name is correct."
}
```

#### Class Not Deletable
```json
{
  "error": "Class Z_MY_CLASS cannot be deleted. It may be locked, have dependencies, or be in use."
}
```

#### Authorization Error
```json
{
  "error": "Insufficient authorization to delete classes. Check S_DEVELOP authorization with delete activity."
}
```

## Integration with CreateLocalClass

The DeleteLocalClass handler is integrated into the CreateLocalClass handler for improved error handling:

- **Fallback Cleanup**: When class creation fails (non-HTTP 412 errors), proper deletion is attempted
- **Safety First**: Uses the validated deletion process instead of simple HTTP DELETE
- **Error Recovery**: Handles cleanup failures gracefully without masking original errors

## Best Practices

### When to Use
- ✅ Cleaning up test classes in $TMP package
- ✅ Removing obsolete development classes
- ✅ Error recovery in automated scripts
- ✅ Development environment maintenance

### When NOT to Use
- ❌ Production classes in transport packages
- ❌ Standard SAP classes
- ❌ Classes with active dependencies
- ❌ Classes currently locked by other users

## Error Handling

The handler provides comprehensive error handling for common scenarios:

1. **Validation Errors**: Input parameter and naming convention issues
2. **Authorization Errors**: Insufficient permissions for deletion
3. **System Errors**: Class locked, dependencies exist, etc.
4. **Network Errors**: Connection issues with SAP system
5. **API Errors**: Malformed requests or unexpected responses

## Technical Implementation

### XML Request Format (Check)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<del:checkRequest xmlns:del="http://www.sap.com/adt/deletion" xmlns:adtcore="http://www.sap.com/adt/core">
  <del:object adtcore:uri="/sap/bc/adt/oo/classes/z_my_class"/>
</del:checkRequest>
```

### XML Request Format (Delete)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<del:deletionRequest xmlns:del="http://www.sap.com/adt/deletion" xmlns:adtcore="http://www.sap.com/adt/core">
  <del:object adtcore:uri="/sap/bc/adt/oo/classes/z_my_class">
    <del:transportNumber/>
  </del:object>
</del:deletionRequest>
```

## Safety Features

1. **Two-Step Process**: Check before delete prevents accidental deletions
2. **Local Package Only**: Cannot delete classes in transport-managed packages
3. **Customer Namespace**: Only Z/Y classes can be deleted
4. **Dependency Check**: Verifies no active references exist
5. **Authorization Check**: Requires proper S_DEVELOP permissions

This handler provides a safe, controlled way to delete local ABAP classes while preventing common mistakes and providing clear feedback to users.