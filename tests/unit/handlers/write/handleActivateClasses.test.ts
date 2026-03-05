/**
 * Unit Tests for handleActivateClasses
 * 
 * Tests the ActivateClasses tool handler which activates ABAP classes
 * in the SAP system via ADT protocol.
 */

import { handleActivateClasses } from '../../../../src/handlers/handleActivateClasses';
import * as utils from '../../../../src/lib/utils';

// Mock the utility functions
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));

describe('handleActivateClasses', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Get references to mocked functions
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;

    // Setup default mock implementations
    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  describe('Input Validation', () => {
    test('should reject when no class names are provided', async () => {
      const result = await handleActivateClasses({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('class_name or class_names');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty class_name string', async () => {
      const result = await handleActivateClasses({ class_name: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty class_names array', async () => {
      const result = await handleActivateClasses({ class_names: [] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('At least one class name');
    });

    test('should reject class_names array with empty strings', async () => {
      const result = await handleActivateClasses({ 
        class_names: ['CL_VALID', '', 'CL_ANOTHER'] 
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('empty');
    });

    test('should reject class names exceeding 30 characters', async () => {
      const result = await handleActivateClasses({ 
        class_name: 'CL_THIS_IS_A_VERY_LONG_CLASS_NAME_EXCEEDING_LIMIT' 
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('30 character');
    });

    test('should accept valid single class name', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo" chkrun:name="CL_DEMO"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(false);
    });

    test('should accept valid class names array', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo1" chkrun:name="CL_DEMO1"/>
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo2" chkrun:name="CL_DEMO2"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ 
        class_names: ['CL_DEMO1', 'CL_DEMO2'] 
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Preaudit Parameter', () => {
    test('should default preaudit_requested to true', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo" chkrun:name="CL_DEMO"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      await handleActivateClasses({ class_name: 'CL_DEMO' });

      // Check that the request includes preaudit parameter
      const requestCall = mockMakeAdtRequest.mock.calls[0];
      expect(requestCall[0]).toContain('preauditRequested=true');
    });

    test('should respect preaudit_requested=false', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo" chkrun:name="CL_DEMO"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      await handleActivateClasses({ 
        class_name: 'CL_DEMO',
        preaudit_requested: false 
      });

      // Check that the request includes preaudit parameter set to false
      const requestCall = mockMakeAdtRequest.mock.calls[0];
      expect(requestCall[0]).toContain('preauditRequested=false');
    });

    test('should respect preaudit_requested=true explicitly', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo" chkrun:name="CL_DEMO"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      await handleActivateClasses({ 
        class_name: 'CL_DEMO',
        preaudit_requested: true 
      });

      const requestCall = mockMakeAdtRequest.mock.calls[0];
      expect(requestCall[0]).toContain('preauditRequested=true');
    });
  });

  describe('Single Class Activation', () => {
    test('should successfully activate a single class', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo" chkrun:name="CL_DEMO"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.activation).toBeDefined();
      expect(response.activation.activatedClasses).toHaveLength(1);
      expect(response.activation.activatedClasses[0].className).toBe('CL_DEMO');
      expect(response.activation.summary.totalClasses).toBe(1);
    });

    test('should handle class name case insensitivity', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo" chkrun:name="CL_DEMO"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'cl_demo' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.activation.activatedClasses[0].className).toBe('CL_DEMO');
    });
  });

  describe('Multiple Class Activation', () => {
    test('should successfully activate multiple classes', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo1" chkrun:name="CL_DEMO1"/>
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo2" chkrun:name="CL_DEMO2"/>
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo3" chkrun:name="CL_DEMO3"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ 
        class_names: ['CL_DEMO1', 'CL_DEMO2', 'CL_DEMO3'] 
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.activation.activatedClasses).toHaveLength(3);
      expect(response.activation.summary.totalClasses).toBe(3);
      
      const classNames = response.activation.activatedClasses.map((c: any) => c.className);
      expect(classNames).toContain('CL_DEMO1');
      expect(classNames).toContain('CL_DEMO2');
      expect(classNames).toContain('CL_DEMO3');
    });

    test('should handle mixed case class names in array', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo1" chkrun:name="CL_DEMO1"/>
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo2" chkrun:name="CL_DEMO2"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ 
        class_names: ['cl_demo1', 'CL_DEMO2'] 
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.activation.activatedClasses).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockGetBaseUrl.mockRejectedValueOnce(new Error('Network error'));

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should handle authorization errors', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 403 Forbidden - Insufficient authorization')
      );

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('authorization');
    });

    test('should handle activation failures', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 500 Internal Server Error')
      );

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(true);
    });

    test('should handle non-existent classes gracefully', async () => {
      mockMakeAdtRequest.mockRejectedValueOnce(
        new Error('HTTP 404 Not Found')
      );

      const result = await handleActivateClasses({ class_name: 'CL_NONEXISTENT' });

      expect(result.isError).toBe(true);
    });
  });

  describe('Response Format', () => {
    test('should include request details in response', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo" chkrun:name="CL_DEMO"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ 
        class_name: 'CL_DEMO',
        preaudit_requested: false 
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.request).toBeDefined();
      expect(response.request.classNames).toEqual(['CL_DEMO']);
      expect(response.request.preauditRequested).toBe(false);
    });

    test('should include activation summary', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo1" chkrun:name="CL_DEMO1"/>
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo2" chkrun:name="CL_DEMO2"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ 
        class_names: ['CL_DEMO1', 'CL_DEMO2'] 
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.activation.summary).toBeDefined();
      expect(response.activation.summary.totalClasses).toBe(2);
      expect(response.activation.summary.successCount).toBe(2);
    });

    test('should include timestamp in response', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo" chkrun:name="CL_DEMO"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      const response = JSON.parse(result.content[0].text);
      expect(response.activation.timestamp).toBeDefined();
      expect(new Date(response.activation.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Activation Response Parsing', () => {
    test('should handle activation with errors', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <msg type="E">
    <shortText><txt>Syntax error in class</txt></shortText>
  </msg>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.activation.status).toBe('error');
      expect(response.activation.summary.errorCount).toBeGreaterThan(0);
    });

    test('should handle activation with warnings', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <msg type="W">
    <shortText><txt>Unused variable detected</txt></shortText>
  </msg>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.activation.status).toBe('warning');
      expect(response.activation.summary.warningCount).toBeGreaterThan(0);
    });

    test('should handle activation cancelled', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <status>Activation was cancelled</status>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.activation.status).toBe('error');
      expect(response.activation.activatedClasses[0].status).toBe('error');
    });

    test('should handle activation failed', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun" activationExecuted="false">
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.activation.status).toBe('error');
    });

    test('should handle XML parsing failure', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: 'Invalid XML response',
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      // When XML parsing fails but no errors are detected, it's treated as success
      expect(response.activation.status).toBe('success');
      expect(response.activation.summary.successCount).toBe(1);
    });

    test('should handle multiple errors in response', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <msg type="E">
    <shortText><txt>Error 1</txt></shortText>
  </msg>
  <msg type="E">
    <shortText><txt>Error 2</txt></shortText>
  </msg>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ 
        class_names: ['CL_DEMO1', 'CL_DEMO2'] 
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.activation.status).toBe('error');
      expect(response.activation.summary.errorCount).toBe(2);
    });

    test('should handle mixed errors and warnings', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <msg type="E">
    <shortText><txt>Syntax error</txt></shortText>
  </msg>
  <msg type="W">
    <shortText><txt>Warning message</txt></shortText>
  </msg>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      const result = await handleActivateClasses({ class_name: 'CL_DEMO' });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.activation.status).toBe('error'); // Errors take precedence
    });
  });

  describe('XML Payload Generation', () => {
    test('should generate correct XML for single class', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo" chkrun:name="CL_DEMO"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      await handleActivateClasses({ class_name: 'CL_DEMO' });

      const requestCall = mockMakeAdtRequest.mock.calls[0];
      const payload = requestCall[3]; // 4th parameter is the body
      
      expect(payload).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(payload).toContain('adtcore:uri="/sap/bc/adt/oo/classes/cl_demo"');
      expect(payload).toContain('adtcore:name="CL_DEMO"');
    });

    test('should generate correct XML for multiple classes', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        data: `<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun">
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo1" chkrun:name="CL_DEMO1"/>
  <chkrun:checkObject chkrun:uri="/sap/bc/adt/oo/classes/cl_demo2" chkrun:name="CL_DEMO2"/>
</chkrun:checkObjectList>`,
        headers: {},
      } as any);

      await handleActivateClasses({ class_names: ['CL_DEMO1', 'CL_DEMO2'] });

      const requestCall = mockMakeAdtRequest.mock.calls[0];
      const payload = requestCall[3];
      
      expect(payload).toContain('CL_DEMO1');
      expect(payload).toContain('CL_DEMO2');
      expect(payload).toContain('/sap/bc/adt/oo/classes/cl_demo1');
      expect(payload).toContain('/sap/bc/adt/oo/classes/cl_demo2');
    });
  });
});