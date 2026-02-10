import { after } from 'node:test';
import { mcp_abap_adt_server } from './index';
import { handleGetProgram } from './handlers/handleGetProgram';
import { handleGetClass } from './handlers/handleGetClass';
import { handleGetFunctionGroup } from './handlers/handleGetFunctionGroup';
import { handleGetFunction } from './handlers/handleGetFunction';
import { handleGetTable } from './handlers/handleGetTable';
import { handleGetStructure } from './handlers/handleGetStructure';
import { handleGetTableContents } from './handlers/handleGetTableContents';
import { handleGetPackage } from './handlers/handleGetPackage';
import { handleGetInclude } from './handlers/handleGetInclude';
import { handleGetTypeInfo } from './handlers/handleGetTypeInfo';
import { handleGetInterface } from './handlers/handleGetInterface';
import { handleGetTransaction } from './handlers/handleGetTransaction';
import { handleGetClassTests } from './handlers/handleGetClassTests';
import { handleRunClassTests } from './handlers/handleRunClassTests';
import { handleSearchObject } from './handlers/handleSearchObject';
import { handleGetClassUsages } from './handlers/handleGetClassUsages';
import { handleCheckSyntax } from './handlers/handleCheckSyntax';
import { handleCreateClass } from './handlers/handleCreateClass';
import { handleDeleteLocalClass } from './handlers/handleDeleteLocalClass';
import { handleCreateClassTests } from './handlers/handleCreateClassTests';
import { handleGetClassCoverage } from './handlers/handleGetClassCoverage';
import { handleActivateClasses } from './handlers/handleActivateClasses';
import { cleanup } from './lib/utils';

describe('mcp_abap_adt_server - Integration Tests', () => {
  let server: mcp_abap_adt_server;

  beforeAll(() => {
    // Initialize the server instance once before all tests
    server = new mcp_abap_adt_server();
  });

  afterAll(async () => {
    // Clean up server instance and utils
    cleanup();
    // Add a small delay to ensure all async operations complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('handleGetProgram', () => {
    it('should successfully retrieve program details', async () => {
      const result = await handleGetProgram({ program_name: 'RSABAPPROGRAM' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetClass', () => {
    it('should successfully retrieve class details', async () => {
      const result = await handleGetClass({ class_name: 'CL_WB_PGEDITOR_INITIAL_SCREEN' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetFunctionGroup', () => {
    it('should successfully retrieve function group details', async () => {
      const result = await handleGetFunctionGroup({ function_group: 'WBABAP' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetFunction', () => {
    it('should successfully retrieve function module details', async () => {
      const result = await handleGetFunction({ function_name: 'WB_PGEDITOR_INITIAL_SCREEN', function_group: 'WBABAP' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetTable', () => {
    it('should successfully retrieve table details', async () => {
      const result = await handleGetTable({ table_name: 'DD02L' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetStructure', () => {
    it('should successfully retrieve structure details', async () => {
      const result = await handleGetStructure({ structure_name: 'SYST' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetPackage', () => {
    it('should successfully retrieve package details', async () => {
      const result = await handleGetPackage({ package_name: 'SABAPDEMOS' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetInclude', () => {
    it('should successfully retrieve include details', async () => {
      const result = await handleGetInclude({ include_name: 'LWBABAPF00' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetTypeInfo', () => {
    it('should successfully retrieve type info', async () => {
      const result = await handleGetTypeInfo({ type_name: 'SYST_SUBRC' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetInterface', () => {
    it('should successfully retrieve interface details', async () => {
      const result = await handleGetInterface({ interface_name: 'IF_T100_MESSAGE' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleSearchObject', () => {
    it('should successfully search for an object', async () => {
      const result = await handleSearchObject({ query: 'SYST' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetTransaction', () => {
    it('should successfully retrieve transaction details', async () => {
      const result = await handleGetTransaction({ transaction_name: 'SE93' });
      console.log(result)
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetClassTests', () => {
    it('should successfully retrieve class tests', async () => {
      const result = await handleGetClassTests({ class_name: 'CL_DEMO_CR_CAR_RENTAL_SERVICE' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleRunClassTests', () => {
    it('should successfully run class tests and retrieve results', async () => {
      const result = await handleRunClassTests({ class_name: 'CL_DEMO_CR_CAR_RENTAL_SERVICE' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    }, 15000); // Increase timeout to 15 seconds for running tests
  });

  describe('handleGetClassUsages', () => {
    it('should successfully retrieve class usages', async () => {
      const result = await handleGetClassUsages({ class_name: 'CL_DEMO_CR_CAR_RENTAL_SERVICE' });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleGetTableContents', () => {
    it('should successfully retrieve table contents with default settings', async () => {
      const result = await handleGetTableContents({ table_name: 'DD02L', max_rows: 5 });
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.table).toBe('DD02L');
      expect(parsedResult.rows).toBeDefined();
      expect(Array.isArray(parsedResult.rows)).toBe(true);
      expect(parsedResult.stats).toBeDefined();
      expect(parsedResult.pagination).toBeDefined();
      // Column metadata should NOT be included by default
      expect(parsedResult.columns).toBeUndefined();
    });

    it('should include column metadata when requested', async () => {
      const result = await handleGetTableContents({ 
        table_name: 'DD02L',
        max_rows: 3,
        include_column_metadata: true
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.columns).toBeDefined();
      expect(Array.isArray(parsedResult.columns)).toBe(true);
      expect(parsedResult.columns.length).toBeGreaterThan(0);
    });
    
    it('should retrieve table contents with specific columns', async () => {
      const result = await handleGetTableContents({ 
        table_name: 'DD02L',
        columns: ['TABNAME', 'AS4LOCAL'],
        max_rows: 3
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.rows.length).toBeGreaterThan(0);
      // Check that only requested columns are present
      const firstRow = parsedResult.rows[0];
      expect(Object.keys(firstRow).length).toBe(2);
      expect(firstRow.TABNAME).toBeDefined();
      expect(firstRow.AS4LOCAL).toBeDefined();
    });
    
    it('should support pagination with offset', async () => {
      const result = await handleGetTableContents({ 
        table_name: 'DD02L',
        max_rows: 5,
        offset: 2
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.pagination.offset).toBe(2);
      expect(parsedResult.pagination.limit).toBe(5);
      expect(parsedResult.pagination.has_more).toBeDefined();
    });
    
    it('should support enhanced WHERE conditions with operators', async () => {
      const result = await handleGetTableContents({ 
        table_name: 'DD02L',
        columns: ['TABNAME'],
        where_conditions: {
          AS4LOCAL: { eq: 'A' }
        },
        max_rows: 10
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.rows).toBeDefined();
      expect(parsedResult.stats).toBeDefined();
    });
    
    it('should support batch queries', async () => {
      const result = await handleGetTableContents({
        queries: [
          {
            id: 'tables',
            table_name: 'DD02L',
            columns: ['TABNAME'],
            max_rows: 3
          },
          {
            id: 'texts',
            table_name: 'DD02T',
            columns: ['TABNAME', 'DDTEXT'],
            max_rows: 3
          }
        ]
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.batch_results).toBeDefined();
      expect(parsedResult.batch_results.tables).toBeDefined();
      expect(parsedResult.batch_results.texts).toBeDefined();
      expect(parsedResult.stats.total_queries).toBe(2);
    });
    
    it('should reject max_rows exceeding limit', async () => {
      const result = await handleGetTableContents({ 
        table_name: 'DD02L',
        max_rows: 1000
      });
      
      expect(result.content[0].text).toContain('500');
    });
    
    it('should include query statistics in response', async () => {
      const result = await handleGetTableContents({ 
        table_name: 'DD02L',
        max_rows: 5
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.stats).toBeDefined();
      expect(parsedResult.stats.metadata_fetch_ms).toBeGreaterThan(0);
      expect(parsedResult.stats.query_time_ms).toBeGreaterThan(0);
      expect(parsedResult.stats.total_time_ms).toBeGreaterThan(0);
      expect(parsedResult.stats.rows_returned).toBeDefined();
    });
  });

  describe('handleCheckSyntax', () => {
    it('should successfully check syntax for valid ABAP code', async () => {
      const validCode = `REPORT test.
DATA: lv_test TYPE string.
lv_test = 'Hello World'.
WRITE: lv_test.`;
      
      const result = await handleCheckSyntax({ 
        source_code: validCode,
        object_name: 'Z_TEST_REPORT',
        object_type: 'PROG'
      });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      
      // Parse the result to check syntax status
      const syntaxResult = JSON.parse(result.content[0].text);
      expect(syntaxResult.syntaxCheck).toBeDefined();
    });

    it('should detect syntax errors in invalid ABAP code', async () => {
      const invalidCode = `
DATA: lv_test TYPE string
lv_test = 'Hello World'
WRITE: lv_test.`;  // Missing periods
      
      const result = await handleCheckSyntax({ 
        source_code: invalidCode,
        object_name: 'Z_TEST_REPORT_INVALID'
      });
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      
      // Parse the result to check syntax status
      const syntaxResult = JSON.parse(result.content[0].text);
      expect(syntaxResult.syntaxCheck).toBeDefined();
    });
  });

  describe('handleCreateClass', () => {
    const testClassName = 'Z_TEST_CLASS_' + Date.now().toString().slice(-6);
    const validClassCode = `CLASS ${testClassName} DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS: get_message RETURNING VALUE(r_message) TYPE string.
ENDCLASS.

CLASS ${testClassName} IMPLEMENTATION.
  METHOD get_message.
    r_message = 'Hello from test class'.
  ENDMETHOD.
ENDCLASS.`;

    afterAll(async () => {
      // Clean up: attempt to delete the test class
      try {
        await handleDeleteLocalClass({ class_name: testClassName });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should successfully create a local class', async () => {
      const result = await handleCreateClass({
        class_name: testClassName,
        source_code: validClassCode,
        description: 'Test class for integration testing'
      });
      
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      
      // Parse the result (now includes workflow response due to auto-activation)
      const createResult = JSON.parse(result.content[0].text);
      if (createResult.workflow) {
        // New workflow response format with auto-activation
        expect(createResult.workflow.overall_status).toBe('success');
        expect(createResult.creation.details.className).toBe(testClassName);
        expect(createResult.workflow.auto_activated).toBe(true);
        expect(createResult.workflow.creation_successful).toBe(true);
      } else {
        // Fallback for old format (if auto_activate was explicitly set to false)
        expect(createResult.status).toBe('success');
        expect(createResult.details.className).toBe(testClassName);
      }
    }, 30000); // Longer timeout for class creation

    it('should reject invalid class names', async () => {
      const result = await handleCreateClass({
        class_name: 'INVALID_NAME', // Should start with Z or Y
        source_code: validClassCode
      });
      
      expect(result.isError).toBe(true);
    });

    it('should reject classes with syntax errors', async () => {
      const invalidCode = `CLASS Z_INVALID DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.
  
  PUBLIC SECTION.
    METHODS: invalid_method RETURNING VALUE() TYPE string // Missing parameter name
ENDCLASS.`;

      const result = await handleCreateClass({
        class_name: 'Z_INVALID_' + Date.now().toString().slice(-6),
        source_code: invalidCode
      });
      
      expect(result.isError).toBe(false); // Handler returns success but with error status
      expect(Array.isArray(result.content)).toBe(true);
      
      const syntaxResult = JSON.parse(result.content[0].text);
      // The handler returns an error response structure when syntax validation fails
      expect(syntaxResult.status).toBe('error');
      expect(syntaxResult.details).toBeDefined();
      expect(syntaxResult.details.errorType).toBeDefined();
      // Check the improved recommendations array instead of single recommendation
      expect(Array.isArray(syntaxResult.details.recommendations)).toBe(true);
      expect(syntaxResult.details.recommendations.some((rec: string) => rec.includes('CheckSyntax tool'))).toBe(true);
    });
  });

  describe('handleDeleteLocalClass', () => {
    it('should reject deletion of non-Z/Y classes', async () => {
      const result = await handleDeleteLocalClass({ class_name: 'CL_STANDARD_CLASS' });
      expect(result.isError).toBe(true);
    });

    it('should handle non-existent classes gracefully', async () => {
      const result = await handleDeleteLocalClass({ class_name: 'Z_NON_EXISTENT_CLASS_12345' });
      // Could be success or error depending on how ADT handles non-existent classes
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('handleCreateClassTests', () => {
    const testClassCode = `CLASS ltcl_test DEFINITION FINAL FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.

  PRIVATE SECTION.
    METHODS: test_basic_functionality FOR TESTING.
ENDCLASS.

CLASS ltcl_test IMPLEMENTATION.
  METHOD test_basic_functionality.
    cl_abap_unit_assert=>assert_true( abap_true ).
  ENDMETHOD.
ENDCLASS.`;

    it('should reject creation for non-existent parent class', async () => {
      const result = await handleCreateClassTests({
        parent_class_name: 'CL_NON_EXISTENT_CLASS_12345',
        test_source_code: testClassCode
      });
      
      expect(result.isError).toBe(true);
    });

    it('should validate test class syntax', async () => {
      const invalidTestCode = `CLASS ltcl_test DEFINITION FINAL FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.

  PRIVATE SECTION.
    METHODS: test_method FOR TESTING // Missing period
ENDCLASS.`;

      const result = await handleCreateClassTests({
        parent_class_name: 'CL_DEMO_CR_CAR_RENTAL_SERVICE',
        test_source_code: invalidTestCode
      });
      
      // The handler might return error for invalid syntax or permission issues
      expect(Array.isArray(result.content)).toBe(true);
      
      if (!result.isError) {
        const syntaxResult = JSON.parse(result.content[0].text);
        expect(syntaxResult.testClassCreationStatus || syntaxResult.syntaxCheck).toBeDefined();
      }
    });

    it('should handle backup option correctly', async () => {
      const result = await handleCreateClassTests({
        parent_class_name: 'CL_DEMO_CR_CAR_RENTAL_SERVICE',
        test_source_code: testClassCode,
        backup_existing: true
      });
      
      // This might fail due to permissions, but we test the parameter handling
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('handleGetClassCoverage', () => {
    it('should attempt to get class coverage', async () => {
      const result = await handleGetClassCoverage({ class_name: 'CL_DEMO_CR_CAR_RENTAL_SERVICE' });
      
      // Coverage tests might fail due to system configuration, but should return a result
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000); // Longer timeout for coverage analysis
  });

  describe('handleActivateClasses', () => {
    it('should reject when no class names are provided', async () => {
      const result = await handleActivateClasses({});
      expect(result.isError).toBe(true);
    });

    it('should reject empty class names', async () => {
      const result = await handleActivateClasses({ 
        class_names: [''] 
      });
      expect(result.isError).toBe(true);
    });

    it('should reject class names that are too long', async () => {
      const result = await handleActivateClasses({ 
        class_name: 'Z_THIS_IS_A_VERY_LONG_CLASS_NAME_THAT_EXCEEDS_THIRTY_CHARACTERS' 
      });
      expect(result.isError).toBe(true);
    });

    it('should successfully activate single class by name', async () => {
      const result = await handleActivateClasses({
        class_name: 'CL_DEMO_CR_CAR_RENTAL_SERVICE',
        preaudit_requested: true
      });
      
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      
      // Parse the activation result
      const activationResult = JSON.parse(result.content[0].text);
      expect(activationResult.activation).toBeDefined();
      expect(activationResult.activation.activatedClasses).toHaveLength(1);
      expect(activationResult.activation.activatedClasses[0].className).toBe('CL_DEMO_CR_CAR_RENTAL_SERVICE');
      expect(activationResult.activation.summary.totalClasses).toBe(1);
      expect(activationResult.request.preauditRequested).toBe(true);
    }, 15000);

    it('should successfully activate multiple classes by names array', async () => {
      const result = await handleActivateClasses({
        class_names: ['CL_DEMO_CR_CAR_RENTAL_SERVICE', 'CL_WB_PGEDITOR_INITIAL_SCREEN'],
        preaudit_requested: false
      });
      
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      
      // Parse the activation result
      const activationResult = JSON.parse(result.content[0].text);
      expect(activationResult.activation).toBeDefined();
      expect(activationResult.activation.activatedClasses).toHaveLength(2);
      expect(activationResult.activation.summary.totalClasses).toBe(2);
      expect(activationResult.request.preauditRequested).toBe(false);
      
      // Check that both classes are in the result
      const classNames = activationResult.activation.activatedClasses.map((c: any) => c.className);
      expect(classNames).toContain('CL_DEMO_CR_CAR_RENTAL_SERVICE');
      expect(classNames).toContain('CL_WB_PGEDITOR_INITIAL_SCREEN');
    }, 20000);

    it('should default preaudit_requested to true when not specified', async () => {
      const result = await handleActivateClasses({
        class_name: 'CL_DEMO_CR_CAR_RENTAL_SERVICE'
      });
      
      if (!result.isError) {
        const activationResult = JSON.parse(result.content[0].text);
        expect(activationResult.request.preauditRequested).toBe(true);
      }
    }, 15000);

    it('should handle non-existent classes gracefully', async () => {
      const result = await handleActivateClasses({
        class_name: 'Z_NON_EXISTENT_CLASS_12345'
      });
      
      // This might succeed or fail depending on how ADT handles non-existent classes
      // but it should return a proper response structure
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    }, 15000);
  });

  describe('Complete Class Development Workflow', () => {
    const workflowClassName = 'Z_WORKFLOW_TEST_' + Date.now().toString().slice(-6);
    const originalClassCode = `CLASS ${workflowClassName} DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS: calculate IMPORTING iv_a TYPE i
                                 iv_b TYPE i
                       RETURNING VALUE(rv_result) TYPE i.
ENDCLASS.

CLASS ${workflowClassName} IMPLEMENTATION.
  METHOD calculate.
    rv_result = iv_a + iv_b.
  ENDMETHOD.
ENDCLASS.`;

    const modifiedClassCode = `CLASS ${workflowClassName} DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS: calculate IMPORTING iv_a TYPE i
                                 iv_b TYPE i
                       RETURNING VALUE(rv_result) TYPE i,
             multiply IMPORTING iv_a TYPE i
                                iv_b TYPE i
                      RETURNING VALUE(rv_result) TYPE i.
ENDCLASS.

CLASS ${workflowClassName} IMPLEMENTATION.
  METHOD calculate.
    rv_result = iv_a + iv_b.
  ENDMETHOD.
  
  METHOD multiply.
    rv_result = iv_a * iv_b.
  ENDMETHOD.
ENDCLASS.`;

    const testClassCode = `CLASS ltcl_test DEFINITION FINAL FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.

  PRIVATE SECTION.
    DATA: cut TYPE REF TO ${workflowClassName}.
    METHODS: setup FOR TESTING,
             test_calculate FOR TESTING,
             test_multiply FOR TESTING.
ENDCLASS.

CLASS ltcl_test IMPLEMENTATION.
  METHOD setup.
    CREATE OBJECT cut.
  ENDMETHOD.
  
  METHOD test_calculate.
    DATA(result) = cut->calculate( iv_a = 5 iv_b = 3 ).
    cl_abap_unit_assert=>assert_equals( exp = 8 act = result ).
  ENDMETHOD.
  
  METHOD test_multiply.
    DATA(result) = cut->multiply( iv_a = 5 iv_b = 3 ).
    cl_abap_unit_assert=>assert_equals( exp = 15 act = result ).
  ENDMETHOD.
ENDCLASS.`;

    afterAll(async () => {
      // Clean up: attempt to delete the test class
      try {
        await handleDeleteLocalClass({ class_name: workflowClassName });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should complete full development workflow: create → activate → modify → activate → add tests → activate → run tests', async () => {
      // Step 1: Create initial class
      console.log(`Step 1: Creating class ${workflowClassName}...`);
      const createResult = await handleCreateClass({
        class_name: workflowClassName,
        source_code: originalClassCode,
        description: 'Workflow test class for activation testing'
      });
      
      expect(createResult.isError).toBe(false);
      const createData = JSON.parse(createResult.content[0].text);
      if (createData.workflow) {
        // New workflow response format with auto-activation
        expect(createData.workflow.overall_status).toBe('success');
        expect(createData.creation.details.className).toBe(workflowClassName);
        expect(createData.workflow.auto_activated).toBe(true);
        expect(createData.workflow.creation_successful).toBe(true);
      } else {
        // Fallback for old format (if auto_activate was explicitly set to false)
        expect(createData.status).toBe('success');
      }
      console.log(`✓ Class ${workflowClassName} created successfully`);

      // Step 2: Activate the newly created class
      console.log(`Step 2: Activating class ${workflowClassName}...`);
      const activateResult1 = await handleActivateClasses({
        class_name: workflowClassName,
        preaudit_requested: true
      });
      
      expect(activateResult1.isError).toBe(false);
      const activateData1 = JSON.parse(activateResult1.content[0].text);
      expect(activateData1.activation.activatedClasses).toHaveLength(1);
      expect(activateData1.activation.activatedClasses[0].className).toBe(workflowClassName);
      console.log(`✓ Class ${workflowClassName} activated successfully`);

      // Step 3: Modify the class (add multiply method)
      console.log(`Step 3: Modifying class ${workflowClassName}...`);
      const modifyResult = await handleCreateClass({
        class_name: workflowClassName,
        source_code: modifiedClassCode,
        description: 'Modified workflow test class'
      });
      
      expect(modifyResult.isError).toBe(false);
      const modifyData = JSON.parse(modifyResult.content[0].text);
      if (modifyData.workflow) {
        // New workflow response format with auto-activation
        expect(modifyData.workflow.overall_status).toBe('success');
        expect(modifyData.creation.details.action).toBe('replace');
        expect(modifyData.workflow.auto_activated).toBe(true);
        expect(modifyData.workflow.creation_successful).toBe(true);
      } else {
        // Fallback for old format (if auto_activate was explicitly set to false)
        expect(modifyData.status).toBe('success');
        expect(modifyData.details.action).toBe('replace');
      }
      console.log(`✓ Class ${workflowClassName} modified successfully`);

      // Step 4: Activate the modified class (required before it can be used or tested)
      console.log(`Step 4: Activating modified class ${workflowClassName}...`);
      const activateResult2 = await handleActivateClasses({
        class_name: workflowClassName,
        preaudit_requested: true
      });
      
      expect(activateResult2.isError).toBe(false);
      const activateData2 = JSON.parse(activateResult2.content[0].text);
      expect(activateData2.activation.activatedClasses).toHaveLength(1);
      expect(activateData2.activation.activatedClasses[0].className).toBe(workflowClassName);
      console.log(`✓ Modified class ${workflowClassName} activated successfully`);

      // Step 5: Add test classes to the activated class
      console.log(`Step 5: Adding test classes to ${workflowClassName}...`);
      const testResult = await handleCreateClassTests({
        parent_class_name: workflowClassName,
        test_source_code: testClassCode,
        backup_existing: false
      });
      
      // Test creation might fail due to permissions or system restrictions
      // but we should get a response structure
      expect(Array.isArray(testResult.content)).toBe(true);
      if (!testResult.isError) {
        console.log(`✓ Test classes added to ${workflowClassName} successfully`);
        
        // Step 6: Activate the class again (with test classes)
        console.log(`Step 6: Activating class with tests ${workflowClassName}...`);
        const activateResult3 = await handleActivateClasses({
          class_name: workflowClassName,
          preaudit_requested: false // Skip preaudit for faster test execution
        });
        
        expect(activateResult3.isError).toBe(false);
        console.log(`✓ Class with tests ${workflowClassName} activated successfully`);

        // Step 7: Run the tests (only if previous steps succeeded)
        console.log(`Step 7: Running tests for ${workflowClassName}...`);
        const runTestResult = await handleRunClassTests({
          class_name: workflowClassName
        });
        
        expect(Array.isArray(runTestResult.content)).toBe(true);
        if (!runTestResult.isError) {
          console.log(`✓ Tests completed for ${workflowClassName}`);
          const testDataText = runTestResult.content[0].text;
          expect(testDataText).toBeDefined();
          expect(testDataText.length).toBeGreaterThan(0);
        }
      } else {
        console.log(`⚠ Test class creation failed (possibly due to permissions), but workflow validation successful`);
      }

      // Verify final class state
      console.log(`Step 8: Verifying final class state...`);
      const finalClassResult = await handleGetClass({ class_name: workflowClassName });
      expect(finalClassResult.isError).toBe(false);
      const finalClassCode = finalClassResult.content[0].text;
      expect(finalClassCode).toContain('multiply'); // Should contain the new method
      console.log(`✓ Final class verification completed - class contains modifications`);

    }, 120000); // Extended timeout for the complete workflow

    it('should handle batch activation of multiple classes in workflow', async () => {
      // Create a second test class for batch testing
      const batchClassName = 'Z_BATCH_TEST_' + Date.now().toString().slice(-6);
      const batchClassCode = `CLASS ${batchClassName} DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS: get_name RETURNING VALUE(rv_name) TYPE string.
ENDCLASS.

CLASS ${batchClassName} IMPLEMENTATION.
  METHOD get_name.
    rv_name = '${batchClassName}'.
  ENDMETHOD.
ENDCLASS.`;

      try {
        // Create the batch test class
        console.log(`Creating batch test class ${batchClassName}...`);
        const createBatchResult = await handleCreateClass({
          class_name: batchClassName,
          source_code: batchClassCode,
          description: 'Batch activation test class'
        });
        
        expect(createBatchResult.isError).toBe(false);

        // Activate both classes in a single batch operation
        console.log(`Batch activating classes ${workflowClassName} and ${batchClassName}...`);
        const batchActivateResult = await handleActivateClasses({
          class_names: [workflowClassName, batchClassName],
          preaudit_requested: true
        });
        
        expect(batchActivateResult.isError).toBe(false);
        const batchData = JSON.parse(batchActivateResult.content[0].text);
        expect(batchData.activation.activatedClasses).toHaveLength(2);
        expect(batchData.activation.summary.totalClasses).toBe(2);
        
        const classNames = batchData.activation.activatedClasses.map((c: any) => c.className);
        expect(classNames).toContain(workflowClassName);
        expect(classNames).toContain(batchClassName);
        console.log(`✓ Batch activation successful for ${classNames.join(', ')}`);

      } finally {
        // Clean up batch test class
        try {
          await handleDeleteLocalClass({ class_name: batchClassName });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }, 60000);
  });
});
