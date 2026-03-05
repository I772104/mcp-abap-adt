/**
 * Unit Tests for handleCheckSyntax
 * 
 * Tests the CheckSyntax tool handler which validates ABAP source code
 * syntax without creating or modifying objects.
 */

import { handleCheckSyntax } from '../../../../src/handlers/handleCheckSyntax';
import * as utils from '../../../../src/lib/utils';
import * as handleGetClassModule from '../../../../src/handlers/handleGetClass';
import * as handleCreateClassModule from '../../../../src/handlers/handleCreateClass';
import * as handleDeleteLocalClassModule from '../../../../src/handlers/handleDeleteLocalClass';

// Mock the utility functions
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

jest.mock('../../../../src/handlers/handleGetClass', () => ({
  handleGetClass: jest.fn(),
}));

jest.mock('../../../../src/handlers/handleCreateClass', () => ({
  handleCreateClass: jest.fn(),
}));

jest.mock('../../../../src/handlers/handleDeleteLocalClass', () => ({
  handleDeleteLocalClass: jest.fn(),
}));

describe('handleCheckSyntax', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;
  let mockHandleGetClass: jest.MockedFunction<typeof handleGetClassModule.handleGetClass>;
  let mockHandleCreateClass: jest.MockedFunction<typeof handleCreateClassModule.handleCreateClass>;
  let mockHandleDeleteLocalClass: jest.MockedFunction<typeof handleDeleteLocalClassModule.handleDeleteLocalClass>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Get references to mocked functions
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockHandleGetClass = handleGetClassModule.handleGetClass as jest.MockedFunction<typeof handleGetClassModule.handleGetClass>;
    mockHandleCreateClass = handleCreateClassModule.handleCreateClass as jest.MockedFunction<typeof handleCreateClassModule.handleCreateClass>;
    mockHandleDeleteLocalClass = handleDeleteLocalClassModule.handleDeleteLocalClass as jest.MockedFunction<typeof handleDeleteLocalClassModule.handleDeleteLocalClass>;

    // Setup default mock implementations
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    test('should reject when neither source_code nor object_name provided', async () => {
      const result = await handleCheckSyntax({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either source_code, object_name, or file_path');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty source_code', async () => {
      const result = await handleCheckSyntax({ source_code: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty object_name', async () => {
      const result = await handleCheckSyntax({ object_name: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid source_code', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
    });

    test('should accept valid object_name', async () => {
      mockHandleGetClass.mockResolvedValueOnce({
        isError: false,
        content: [{ type: 'text', text: 'CLASS zcl_test DEFINITION. ENDCLASS.' }]
      } as any);

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        object_name: 'ZCL_TEST',
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Source Code Syntax Check', () => {
    test('should successfully validate correct ABAP syntax', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.status).toBe('success');
      expect(response.syntaxCheck.summary.errorCount).toBe(0);
    });

    test('should detect syntax errors', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
<chkrun:checkMessage chkrun:type="E" chkrun:shortText="Syntax error"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.status).toBe('error');
      expect(response.syntaxCheck.summary.errorCount).toBeGreaterThan(0);
    });

    test('should detect warnings', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
<chkrun:checkMessage chkrun:type="W" chkrun:shortText="Unused variable"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.status).toBe('warning');
      expect(response.syntaxCheck.summary.warningCount).toBeGreaterThan(0);
    });

    test('should handle mixed errors and warnings', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
<chkrun:checkMessage chkrun:type="E" chkrun:shortText="Syntax error"/>
<chkrun:checkMessage chkrun:type="W" chkrun:shortText="Warning message"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.status).toBe('error'); // Errors take precedence
      expect(response.syntaxCheck.summary.errorCount).toBeGreaterThan(0);
      expect(response.syntaxCheck.summary.warningCount).toBeGreaterThan(0);
    });
  });

  describe('Object Name Syntax Check', () => {
    test('should fetch and validate existing class', async () => {
      mockHandleGetClass.mockResolvedValueOnce({
        isError: false,
        content: [{ type: 'text', text: 'CLASS zcl_test DEFINITION. ENDCLASS.' }]
      } as any);

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        object_name: 'ZCL_TEST',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.status).toBe('success');
    });

    test('should handle non-existent object', async () => {
      mockHandleGetClass.mockRejectedValueOnce(
        new Error('HTTP 404 Not Found')
      );

      const result = await handleCheckSyntax({
        object_name: 'ZCL_NONEXISTENT',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('404');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(new Error('Network error'));

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      // Network errors during syntax check are caught and reported in the response
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.status).toBe('error');
    });

    test('should handle ADT API errors gracefully', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"><chkrun:checkMessage chkrun:type="E" chkrun:shortText="ADT syntax check failed"/></chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.status).toBe('error');
    });
  });

  describe('Response Format', () => {
    test('should include request information', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.requestInfo).toBeDefined();
      expect(response.requestInfo.timestamp).toBeDefined();
    });

    test('should include syntax check results', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
<chkrun:checkMessage chkrun:type="E" chkrun:shortText="Syntax error"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck).toBeDefined();
      expect(response.syntaxCheck.errors).toBeDefined();
      expect(response.syntaxCheck.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Temp Class Scenarios', () => {
    test('should use temp class approach when class does not exist', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">Class does not exist</chkrun:checkObjectList>',
          headers: {},
        } as any) // Direct ADT fails with "does not exist"
        .mockResolvedValueOnce({ status: 200 } as any) // Create temp class
        .mockResolvedValueOnce({
          status: 200,
          data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
          headers: {},
        } as any) // Syntax check on temp class
        .mockResolvedValueOnce({ status: 200 } as any); // Delete temp class

      mockHandleCreateClass.mockResolvedValueOnce({
        isError: false,
        content: [{ type: 'text', text: 'Class created' }]
      } as any);

      mockHandleDeleteLocalClass.mockResolvedValueOnce({
        isError: false,
        content: [{ type: 'text', text: 'Class deleted' }]
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_new DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.requestInfo.tempClassUsed).toBe(true);
    });

    test('should skip temp class for test class code', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">Class does not exist</chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS ltcl_test DEFINITION FOR TESTING. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.requestInfo.isTestClass).toBe(true);
      expect(response.requestInfo.skippedTempCreation).toBe(true);
    });

    test('should handle temp class creation failure', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">notProcessed</chkrun:checkObjectList>',
        headers: {},
      } as any);

      mockHandleCreateClass.mockResolvedValueOnce({
        isError: true,
        content: [{ type: 'text', text: 'Failed to create class' }]
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_new DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.status).toBe('error');
    });

    test('should handle temp class deletion failure gracefully', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">does not exist</chkrun:checkObjectList>',
          headers: {},
        } as any)
        .mockResolvedValueOnce({ status: 200 } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
          headers: {},
        } as any);

      mockHandleCreateClass.mockResolvedValueOnce({
        isError: false,
        content: [{ type: 'text', text: 'Class created' }]
      } as any);

      mockHandleDeleteLocalClass.mockResolvedValueOnce({
        isError: true,
        content: [{ type: 'text', text: 'Failed to delete' }]
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_new DEFINITION. ENDCLASS.',
      });

      // Should succeed even if deletion fails
      expect(result.isError).toBe(false);
    });
  });

  describe('XML Parsing Edge Cases', () => {
    test('should handle alternative XML message format', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0"?><messages>
<message type="E">Syntax error</message>
</messages>`,
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.status).toBe('error');
    });

    test('should handle info messages', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
<chkrun:checkMessage chkrun:type="I" chkrun:shortText="Info message"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION. ENDCLASS.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.summary.infoCount).toBeGreaterThan(0);
    });

    test('should decode HTML entities in messages', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
<chkrun:checkMessage chkrun:type="E" chkrun:shortText="Error with &quot;quotes&quot; and &amp; ampersand"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: 'CLASS zcl_test DEFINITION.',
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.syntaxCheck.errors[0].message).toContain('"quotes"');
      expect(response.syntaxCheck.errors[0].message).toContain('&');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long source code', async () => {
      const longCode = 'CLASS zcl_test DEFINITION.\n' + 'METHODS test.\n'.repeat(100) + 'ENDCLASS.';

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: longCode,
      });

      expect(result.isError).toBe(false);
    });

    test('should handle special characters in source code', async () => {
      const codeWithSpecialChars = `CLASS zcl_test DEFINITION.
  PUBLIC SECTION.
    DATA lv_text TYPE string VALUE 'Test with "quotes" and <brackets>'.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: codeWithSpecialChars,
      });

      expect(result.isError).toBe(false);
    });

    test('should handle test class code', async () => {
      const testClassCode = `CLASS ltcl_test DEFINITION FOR TESTING.
  PRIVATE SECTION.
    METHODS test_method FOR TESTING.
ENDCLASS.`;

      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0"?><chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun"></chkrun:checkObjectList>',
        headers: {},
      } as any);

      const result = await handleCheckSyntax({
        source_code: testClassCode,
      });

      expect(result.isError).toBe(false);
    });
  });
});
