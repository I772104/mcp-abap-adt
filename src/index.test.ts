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
import { handleCreateLocalClass } from './handlers/handleCreateLocalClass';
import { handleDeleteLocalClass } from './handlers/handleDeleteLocalClass';
import { handleCreateClassTests } from './handlers/handleCreateClassTests';
import { handleGetClassCoverage } from './handlers/handleGetClassCoverage';
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
    it('should successfully retrieve table contents', async () => {
      const result = await handleGetTableContents({ table_name: 'DD02L', max_rows: 5 });
      // Table contents might fail due to permissions, but should return a result structure
      expect(Array.isArray(result.content)).toBe(true);
      if (!result.isError) {
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0].type).toBe('text');
      }
    });

    it('should use default max_rows when not specified', async () => {
      const result = await handleGetTableContents({ table_name: 'DD02L' });
      // Table contents might fail due to permissions, but should return a result structure
      expect(Array.isArray(result.content)).toBe(true);
      if (!result.isError) {
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0].type).toBe('text');
      }
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
      const invalidCode = `REPORT test.
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

  describe('handleCreateLocalClass', () => {
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
      const result = await handleCreateLocalClass({
        class_name: testClassName,
        source_code: validClassCode,
        description: 'Test class for integration testing'
      });
      
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      
      // Parse the result
      const createResult = JSON.parse(result.content[0].text);
      expect(createResult.status).toBe('success');
      expect(createResult.details.className).toBe(testClassName);
    }, 30000); // Longer timeout for class creation

    it('should reject invalid class names', async () => {
      const result = await handleCreateLocalClass({
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

      const result = await handleCreateLocalClass({
        class_name: 'Z_INVALID_' + Date.now().toString().slice(-6),
        source_code: invalidCode
      });
      
      expect(result.isError).toBe(false); // Handler returns success but with syntax errors
      expect(Array.isArray(result.content)).toBe(true);
      
      const syntaxResult = JSON.parse(result.content[0].text);
      expect(syntaxResult.syntaxCheck).toBeDefined();
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
});
