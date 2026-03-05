/**
 * Unit Tests for handleGetClassCoverage
 * 
 * Tests the GetClassCoverage tool handler which runs unit tests with
 * coverage analysis and returns detailed coverage metrics.
 */

import { handleGetClassCoverage } from '../../../../src/handlers/handleGetClassCoverage';
import * as utils from '../../../../src/lib/utils';
import * as activationUtils from '../../../../src/lib/activation-utils';

// Mock the utility modules
jest.mock('../../../../src/lib/utils', () => ({
  ...jest.requireActual('../../../../src/lib/utils'),
  makeAdtRequest: jest.fn(),
  getBaseUrl: jest.fn(),
}));
jest.mock('../../../../src/lib/activation-utils');

describe('handleGetClassCoverage', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
  let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;
  let mockAttemptClassActivation: jest.MockedFunction<typeof activationUtils.attemptClassActivation>;

  const mockCoverageXml = `<?xml version="1.0"?>
<coverage type="statement" total="100" executed="85"/>
<coverage type="branch" total="50" executed="40"/>
<coverage type="procedure" total="10" executed="9"/>`;

  const mockTestResultsXml = `<?xml version="1.0"?>
<testResults>
  <testClass adtcore:name="LTC_TEST" durationCategory="SHORT" riskLevel="HARMLESS">
    <testMethod adtcore:name="TEST_METHOD" executionTime="0.5"/>
  </testClass>
  <measurement adtcore:uri="/sap/bc/adt/runtime/traces/coverage/measurements/ABC123"/>
</testResults>`;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.useFakeTimers();

    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
    mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
    mockAttemptClassActivation = activationUtils.attemptClassActivation as jest.MockedFunction<typeof activationUtils.attemptClassActivation>;

    mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Input Validation', () => {
    test('should reject missing class_name', async () => {
      const result = await handleGetClassCoverage({}) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Class name');
      expect(result.content[0].text).toContain('required');
    });

    test('should reject empty class_name', async () => {
      const result = await handleGetClassCoverage({ class_name: '' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });

    test('should accept valid class_name', async () => {
      // Mock successful coverage run
      mockMakeAdtRequest
        .mockResolvedValueOnce({ // POST run
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({ // GET status (finished)
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({ // GET results
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({ // POST coverage data
          status: 200,
          data: mockCoverageXml
        } as any);

      const result = await handleGetClassCoverage({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Coverage Run Workflow', () => {
    test('should initiate coverage run', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      await handleGetClassCoverage({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/sap/bc/adt/abapunit/runs'),
        'POST',
        expect.any(Number),
        expect.stringContaining('<?xml'),
        undefined,
        expect.objectContaining({
          'Content-Type': expect.stringContaining('abapunit')
        })
      );
    });

    test('should poll for completion', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      await handleGetClassCoverage({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('withLongPolling=true'),
        'GET',
        expect.any(Number),
        undefined,
        undefined,
        expect.any(Object)
      );
    });

    test('should retrieve test results', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      await handleGetClassCoverage({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/sap/bc/adt/abapunit/results/'),
        'GET',
        expect.any(Number),
        undefined,
        undefined,
        expect.any(Object)
      );
    });

    test('should attempt coverage data retrieval', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      await handleGetClassCoverage({ class_name: 'ZCL_TEST' });

      expect(mockMakeAdtRequest).toHaveBeenCalledWith(
        expect.stringContaining('/coverage/measurements/'),
        expect.any(String),
        expect.any(Number),
        expect.anything(),
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('Auto-Activation', () => {
    test('should not activate by default', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      await handleGetClassCoverage({ class_name: 'ZCL_TEST' });

      expect(mockAttemptClassActivation).not.toHaveBeenCalled();
    });

    test('should activate when auto_activate is true', async () => {
      mockAttemptClassActivation.mockResolvedValue({
        status: 'success',
        message: 'Activated',
        timestamp: new Date().toISOString()
      });

      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      await handleGetClassCoverage({ 
        class_name: 'ZCL_TEST',
        auto_activate: true
      });

      expect(mockAttemptClassActivation).toHaveBeenCalledWith('ZCL_TEST', true);
    });

    test('should continue with coverage even if activation fails', async () => {
      mockAttemptClassActivation.mockResolvedValue({
        status: 'error',
        message: 'Activation failed',
        timestamp: new Date().toISOString()
      });

      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      const result = await handleGetClassCoverage({ 
        class_name: 'ZCL_TEST',
        auto_activate: true
      });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing location header', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: ''
      } as any);

      const result = await handleGetClassCoverage({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Location header');
    });

    test('should handle invalid location header format', async () => {
      mockMakeAdtRequest.mockResolvedValueOnce({
        status: 200,
        headers: { location: '/invalid/path/without/runid' },
        data: ''
      } as any);

      const result = await handleGetClassCoverage({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Could not extract run ID');
    });

    test('should handle missing measurement ID in results', async () => {
      const invalidResultsXml = `<?xml version="1.0"?>
<testResults>
  <testClass adtcore:name="LTC_TEST">
    <testMethod adtcore:name="TEST_METHOD"/>
  </testClass>
</testResults>`;

      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: invalidResultsXml
        } as any);

      const result = await handleGetClassCoverage({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Could not extract measurement ID');
    });

    test('should handle network errors', async () => {
      mockMakeAdtRequest.mockRejectedValue(new Error('Network error'));

      const result = await handleGetClassCoverage({ class_name: 'ZCL_TEST' }) as any;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    test('should fallback to test results XML when coverage fails', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockRejectedValue(new Error('Coverage endpoint failed'));

      const result = await handleGetClassCoverage({ class_name: 'ZCL_TEST' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('testResults');
    });
  });

  describe('Response Format', () => {
    test('should return coverage data', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      const result = await handleGetClassCoverage({ class_name: 'ZCL_TEST' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should include coverage metrics', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      const result = await handleGetClassCoverage({ class_name: 'ZCL_TEST' });

      expect(result.content[0].text).toContain('coverage');
    });
  });

  describe('Class Name Variations', () => {
    test('should handle Z class names', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      const result = await handleGetClassCoverage({ class_name: 'ZCL_MY_CLASS' });

      expect(result.isError).toBeFalsy();
    });

    test('should handle Y class names', async () => {
      mockMakeAdtRequest
        .mockResolvedValueOnce({
          status: 200,
          headers: { location: '/sap/bc/adt/abapunit/runs/ABC123' },
          data: ''
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: '<status="FINISHED"/>'
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockTestResultsXml
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockCoverageXml
        } as any);

      const result = await handleGetClassCoverage({ class_name: 'YCL_MY_CLASS' });

      expect(result.isError).toBeFalsy();
    });
  });
});