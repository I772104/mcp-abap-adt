# CreateClass Tool

The CreateClass tool enables developers to create new ABAP classes or replace existing ones directly in the local development package ($TMP) without requiring transport assignments. This tool is designed for rapid prototyping, testing, and local development scenarios.

## Features

- **Local Development Focus**: Creates or replaces classes exclusively in local packages ($TMP, $LOCAL)
- **Replace Functionality**: Automatically replaces existing classes with new source code
- **Backup Support**: Optional backup of existing class content before replacement
- **Pre-Syntax Validation**: Validates ABAP syntax before attempting to create the class
- **Z/Y Naming Enforcement**: Ensures proper naming conventions for customer/partner objects
- **Comprehensive Error Handling**: Provides detailed feedback for various failure scenarios
- **Integrated Workflow**: Combines metadata creation and source code upload in a single operation

## Usage

### Basic Class Creation

```json
{
  "class_name": "ZCL_MY_EXAMPLE",
  "source_code": "CLASS zcl_my_example DEFINITION PUBLIC FINAL CREATE PUBLIC.\n  PUBLIC SECTION.\n    METHODS: hello_world.\nENDCLASS.\n\nCLASS zcl_my_example IMPLEMENTATION.\n  METHOD hello_world.\n    WRITE: 'Hello World from local class!'.\n  ENDMETHOD.\nENDCLASS."
}
```

### Class with Custom Description

```json
{
  "class_name": "ZCL_DEMO_UTILITY",
  "source_code": "CLASS zcl_demo_utility DEFINITION PUBLIC FINAL CREATE PUBLIC.\n  PUBLIC SECTION.\n    CLASS-METHODS: calculate_vat IMPORTING value TYPE i RETURNING VALUE(result) TYPE i.\nENDCLASS.\n\nCLASS zcl_demo_utility IMPLEMENTATION.\n  METHOD calculate_vat.\n    result = value * 119 / 100.\n  ENDMETHOD.\nENDCLASS.",
  "description": "Demo utility class for VAT calculations",
  "package": "$TMP"
}
```

### Replacing Existing Class with Backup

```json
{
  "class_name": "ZCL_MY_EXAMPLE",
  "source_code": "CLASS zcl_my_example DEFINITION PUBLIC FINAL CREATE PUBLIC.\n  PUBLIC SECTION.\n    METHODS: hello_world_v2.\nENDCLASS.\n\nCLASS zcl_my_example IMPLEMENTATION.\n  METHOD hello_world_v2.\n    WRITE: 'Hello World Version 2!'.\n  ENDMETHOD.\nENDCLASS.",
  "backup_existing": true,
  "description": "Updated version of my example class"
}
```

### Replacing Existing Class without Backup

```json
{
  "class_name": "ZCL_DEMO_UTILITY",
  "source_code": "CLASS zcl_demo_utility DEFINITION PUBLIC FINAL CREATE PUBLIC.\n  PUBLIC SECTION.\n    CLASS-METHODS: calculate_vat_v2 IMPORTING value TYPE p DECIMALS 2 RETURNING VALUE(result) TYPE p DECIMALS 2.\nENDCLASS.\n\nCLASS zcl_demo_utility IMPLEMENTATION.\n  METHOD calculate_vat_v2.\n    result = value * '1.19'.\n  ENDMETHOD.\nENDCLASS.",
  "description": "Updated VAT calculation with decimal precision"
}
```

### Complex Class Example

```json
{
  "class_name": "ZCL_DATA_PROCESSOR",
  "source_code": "CLASS zcl_data_processor DEFINITION PUBLIC CREATE PUBLIC.\n  PUBLIC SECTION.\n    TYPES: BEGIN OF ty_data,\n             id TYPE i,\n             name TYPE string,\n             value TYPE p DECIMALS 2,\n           END OF ty_data.\n    TYPES: tt_data TYPE TABLE OF ty_data.\n    METHODS: process_data IMPORTING data TYPE tt_data RETURNING VALUE(result) TYPE string.\n  PRIVATE SECTION.\n    METHODS: validate_data IMPORTING data TYPE tt_data RETURNING VALUE(valid) TYPE abap_bool.\nENDCLASS.\n\nCLASS zcl_data_processor IMPLEMENTATION.\n  METHOD process_data.\n    IF validate_data( data ).\n      result = |Processing { lines( data ) } records|.\n    ELSE.\n      result = 'Invalid data provided'.\n    ENDIF.\n  ENDMETHOD.\n  \n  METHOD validate_data.\n    valid = xsmark.\n    LOOP AT data INTO DATA(record).\n      IF record-id <= 0 OR record-name IS INITIAL.\n        valid = space.\n        EXIT.\n      ENDIF.\n    ENDLOOP.\n  ENDMETHOD.\nENDCLASS.",
  "description": "Advanced data processor with validation logic"
}
```

## Parameters

| Parameter         | Type    | Required | Description                                                                |
|-------------------|---------|----------|----------------------------------------------------------------------------|
| `class_name`      | string  | Yes      | Name of the ABAP class (must start with Z or Y, max 30 characters)         |
| `source_code`     | string  | Yes      | Complete ABAP class source code including definition and implementation    |
| `description`     | string  | No       | Class description (defaults to "Local class {class_name}")                 |
| `package`         | string  | No       | Package name (defaults to $TMP, must be local package)                     |
| `backup_existing` | boolean | No       | Create backup of existing class content before replacing (default: false)  |

## Naming Conventions

### Class Name Requirements
- **Must start with Z or Y** (customer/partner namespace)
- **Maximum 30 characters** (ABAP object name limit)
- **Valid characters**: A-Z, 0-9, underscore (_)
- **Case insensitive**: Automatically converted to uppercase

### Valid Examples
- `ZCL_MY_UTILITY`
- `YCL_TEST_CLASS`
- `Z_DEMO_123`
- `Y_HELPER_FUNCTIONS`

### Invalid Examples
- `CL_MY_CLASS` ❌ (doesn't start with Z/Y)
- `ZCL_MY_CLASS_WITH_VERY_LONG_NAME_EXCEEDING_LIMIT` ❌ (too long)
- `ZCL-MY-CLASS` ❌ (contains hyphens)

## Package Restrictions

The tool enforces local package usage to prevent transport complications:

### Allowed Packages
- **$TMP** (default) - Temporary local objects
- **$LOCAL** - Local objects

### Security Features
- Prevents creation in transportable packages
- No transport request assignment required
- Objects remain local to the development system

## Workflow Process

1. **Input Validation**
   - Verify class name follows Z/Y convention
   - Check package is local ($TMP/$LOCAL or $-prefixed)
   - Validate required parameters are present

2. **Syntax Pre-Check**
   - Uses integrated CheckSyntax handler
   - Validates ABAP syntax before creation
   - Aborts process if syntax errors found
   - Allows warnings but stops on errors

3. **Class Metadata Creation**
   - Creates class metadata via ADT REST API
   - Sets package reference to local package
   - Establishes class properties and visibility

4. **Source Code Upload**
   - Uploads complete custom source code via PUT request
   - Uses ETag-based approach for reliable uploads
   - Automatic fallback for upload conflicts

5. **Success Confirmation**
   - Returns detailed success information
   - Includes syntax check results
   - Provides object location URLs
   - Timestamps the operation

## Response Format

### Success Response - New Class Creation
```json
{
  "status": "success",
  "message": "Local class ZCL_EXAMPLE created successfully",
  "details": {
    "className": "ZCL_EXAMPLE",
    "package": "$TMP",
    "description": "Local class ZCL_EXAMPLE",
    "action": "create",
    "backup": {
      "created": false,
      "message": "No backup requested"
    },
    "location": {
      "metadataUrl": "https://sap-system/sap/bc/adt/oo/classes/ZCL_EXAMPLE",
      "sourceUrl": "https://sap-system/sap/bc/adt/oo/classes/ZCL_EXAMPLE/source/main"
    }
  },
  "timestamp": "2024-01-21T10:30:00.000Z"
}
```

### Success Response - Class Replacement with Backup
```json
{
  "status": "success",
  "message": "Local class ZCL_EXAMPLE replaced successfully",
  "details": {
    "className": "ZCL_EXAMPLE",
    "package": "$TMP",
    "description": "Updated version of my example class",
    "action": "replace",
    "backup": {
      "created": true,
      "timestamp": "2024-01-21T10:30:00.000Z",
      "message": "Previous class content backed up"
    },
    "location": {
      "metadataUrl": "https://sap-system/sap/bc/adt/oo/classes/ZCL_EXAMPLE",
      "sourceUrl": "https://sap-system/sap/bc/adt/oo/classes/ZCL_EXAMPLE/source/main"
    }
  },
  "timestamp": "2024-01-21T10:30:00.000Z"
}
```

### Success Response - Class Replacement without Backup
```json
{
  "status": "success",
  "message": "Local class ZCL_EXAMPLE replaced successfully",
  "details": {
    "className": "ZCL_EXAMPLE",
    "package": "$TMP", 
    "description": "Updated example class",
    "action": "replace",
    "backup": {
      "created": false,
      "message": "No backup requested"
    },
    "location": {
      "metadataUrl": "https://sap-system/sap/bc/adt/oo/classes/ZCL_EXAMPLE",
      "sourceUrl": "https://sap-system/sap/bc/adt/oo/classes/ZCL_EXAMPLE/source/main"
    }
  },
  "timestamp": "2024-01-21T10:30:00.000Z"
}
```

### Success Response - Backup Failed but Class Replaced
```json
{
  "status": "success",
  "message": "Local class ZCL_EXAMPLE replaced successfully",
  "details": {
    "className": "ZCL_EXAMPLE",
    "package": "$TMP",
    "description": "Updated example class",
    "action": "replace",
    "backup": {
      "created": false,
      "message": "Backup was requested but could not be created"
    },
    "location": {
      "metadataUrl": "https://sap-system/sap/bc/adt/oo/classes/ZCL_EXAMPLE",
      "sourceUrl": "https://sap-system/sap/bc/adt/oo/classes/ZCL_EXAMPLE/source/main"
    }
  },
  "timestamp": "2024-01-21T10:30:00.000Z"
}
```

### Error Response Examples

**Syntax Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Syntax errors found: Line 3: Statement 'METHOS' is not defined; Line 5: The statement does not begin with an ABAP word"
  }]
}
```

**Naming Convention Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text", 
    "text": "Error: Class name must start with Z or Y for local development"
  }]
}
```

**Authorization Error**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Insufficient authorization to create/modify classes. Check S_DEVELOP authorization."
  }]
}
```

## Error Handling

### Common Error Scenarios

1. **Syntax Errors**
   - Pre-validation prevents creation of syntactically incorrect classes
   - Detailed line-by-line error reporting
   - Includes both errors and warnings in response

2. **Authorization Issues**
   - Requires S_DEVELOP authorization with ACTVT=01 (create)
   - Clear error message for authorization failures
   - Suggests checking user permissions

3. **Object Conflicts**
   - Detects existing classes with same name
   - Provides guidance for resolution
   - Prevents accidental overwrites

4. **Network/Connection Issues**
   - Handles SAP system connectivity problems
   - CSRF token management failures
   - Timeout handling for long operations

### Best Practices for Error Resolution

1. **Always validate syntax** using CheckSyntax before CreateClass
2. **Use unique class names** with meaningful prefixes
3. **Check system connectivity** before attempting creation
4. **Verify user authorizations** for development activities
5. **Monitor system resources** during peak usage periods

## Integration Examples

### With CheckSyntax Tool
```javascript
// 1. First validate syntax
const syntaxResult = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "CheckSyntax", 
  arguments: {
    source_code: abapCode,
    object_name: "ZCL_TEST",
    object_type: "CLAS"
  }
});

// 2. If syntax is valid, create the class
if (syntaxResult.syntaxCheck.status !== 'error') {
  const createResult = await use_mcp_tool({
    server_name: "mcp-abap-adt-1",
    tool_name: "CreateClass",
    arguments: {
      class_name: "ZCL_TEST",
      source_code: abapCode,
      description: "Test class created via MCP"
    }
  });
}
```

### With GetClass for Template
```javascript
// 1. Get existing class as template
const templateClass = await use_mcp_tool({
  server_name: "mcp-abap-adt-1", 
  tool_name: "GetClass",
  arguments: { class_name: "ZCL_TEMPLATE" }
});

// 2. Modify template and create new class
const modifiedCode = templateClass.data.replace(/ZCL_TEMPLATE/g, 'ZCL_NEW_CLASS');
const newClass = await use_mcp_tool({
  server_name: "mcp-abap-adt-1",
  tool_name: "CreateClass", 
  arguments: {
    class_name: "ZCL_NEW_CLASS",
    source_code: modifiedCode,
    description: "Class based on template"
  }
});
```

## Technical Implementation

### ADT Endpoints Used
- **POST** `/sap/bc/adt/oo/classes` - Create class metadata
- **PUT** `/sap/bc/adt/oo/classes/{class_name}/source/main` - Upload source code
- **POST** `/sap/bc/adt/checkruns` - Syntax validation (via CheckSyntax)

### XML Payload Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes" 
                 xmlns:adtcore="http://www.sap.com/adt/core" 
                 adtcore:type="CLAS/OC" 
                 adtcore:description="Class description" 
                 adtcore:language="EN" 
                 class:final="false" 
                 class:visibility="public">
  <adtcore:packageRef adtcore:name="$TMP"/>
  <class:include adtcore:name="CLASS_NAME" class:includeType="testclasses"/>
</class:abapClass>
```

### Security Considerations
- **Local Package Enforcement**: Hardcoded to prevent transport creation
- **CSRF Protection**: Automatic token management for state-changing operations
- **Input Sanitization**: XML encoding for descriptions and content
- **Authorization Delegation**: Relies on SAP system authorization checks

## Limitations

1. **Local Objects Only**: Cannot create transportable objects
2. **Single Class Creation**: Does not support bulk operations
3. **No Include Management**: Handles main source only
4. **Package Restrictions**: Limited to $TMP and $LOCAL packages
5. **No Version Control**: Objects are not under transport management

## Use Cases

### Development Scenarios
- **Rapid Prototyping**: Quick class creation for testing concepts
- **Local Testing**: Create test classes without transport overhead
- **Training/Learning**: Safe environment for ABAP learning
- **Utility Development**: Helper classes for local development tasks

### Integration Scenarios  
- **CI/CD Pipelines**: Automated testing class generation
- **Code Generation**: Template-based class creation
- **Migration Support**: Temporary classes during system upgrades
- **Development Tooling**: IDE integration for local development

## Version History

- **v1.0**: Initial implementation with basic class creation
- **v1.1**: Added comprehensive validation and error handling
- **v1.2**: Integrated syntax checking and enhanced security

## Related Tools

- **CheckSyntax**: Syntax validation (used internally)
- **GetClass**: Retrieve existing class source code
- **GetClassTests**: Access unit test classes
- **RunClassTests**: Execute unit tests for created classes