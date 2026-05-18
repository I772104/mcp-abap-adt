import * as utils from '../../../src/lib/utils';
import { attemptObjectActivation } from '../../../src/lib/activation-utils';

describe('attemptObjectActivation', () => {
  let makeAdtSpy: jest.SpyInstance;

  beforeEach(() => {
    // jest.spyOn is used here (rather than jest.mock factory) because ts-jest/CJS module
    // bindings make resetAllMocks() strip mock implementations when using jest.mock.
    // spyOn + restoreAllMocks() is consistent with other tests in this repo.
    jest.spyOn(utils, 'getBaseUrl').mockResolvedValue('https://mock-sap.com:443');
    makeAdtSpy = jest.spyOn(utils, 'makeAdtRequest');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should return success when activation response has no errors', async () => {
    makeAdtSpy.mockResolvedValueOnce({
      data: '<activation activationExecuted="true"/>',
      status: 200,
      headers: {},
    } as any);

    const result = await attemptObjectActivation(
      'ZMY_VIEW',
      '/sap/bc/adt/ddic/ddl/sources/zmy_view',
    );

    expect(result.status).toBe('success');
    expect(result.message).toContain('ZMY_VIEW');
    expect(result.activatedClasses).toHaveLength(1);
    expect(result.activatedClasses![0].uri).toBe('/sap/bc/adt/ddic/ddl/sources/zmy_view');
    expect(result.activatedClasses![0].status).toBe('success');
    expect(makeAdtSpy).toHaveBeenCalledWith(
      expect.stringContaining('/sap/bc/adt/activation'),
      'POST',
      expect.any(Number),
      expect.stringContaining('/sap/bc/adt/ddic/ddl/sources/zmy_view'),
      undefined,
      expect.objectContaining({ 'Content-Type': expect.stringContaining('application/xml') }),
    );
  });

  test('should return error when activation response contains error messages', async () => {
    makeAdtSpy.mockResolvedValueOnce({
      data: '<activation activationExecuted="false"><msg type="E"><shortText><txt>Syntax error in view</txt></shortText></msg></activation>',
      status: 200,
      headers: {},
    } as any);

    const result = await attemptObjectActivation(
      'ZMY_VIEW',
      '/sap/bc/adt/ddic/ddl/sources/zmy_view',
    );

    expect(result.status).toBe('error');
  });

  test('should return error when makeAdtRequest throws', async () => {
    makeAdtSpy.mockRejectedValueOnce(new Error('Network failure'));

    const result = await attemptObjectActivation(
      'ZMY_VIEW',
      '/sap/bc/adt/ddic/ddl/sources/zmy_view',
    );

    expect(result.status).toBe('error');
    expect(result.details?.error_code).toBe('ACTIVATION_EXCEPTION');
  });

  test('should use preauditRequested=false when passed', async () => {
    makeAdtSpy.mockResolvedValueOnce({
      data: '<activation activationExecuted="true"/>',
      status: 200,
      headers: {},
    } as any);

    await attemptObjectActivation('ZMY_VIEW', '/sap/bc/adt/ddic/ddl/sources/zmy_view', false);

    expect(makeAdtSpy).toHaveBeenCalledWith(
      expect.stringContaining('preauditRequested=false'),
      expect.any(String),
      expect.any(Number),
      expect.any(String),
      undefined,
      expect.any(Object),
    );
  });
});
