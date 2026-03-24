import { handleSapBrowserLogin } from '../../../src/handlers/handleSapBrowserLogin';
import { SystemRegistry } from '../../../src/infrastructure/system';
import { AuthProviderRegistry } from '../../../src/infrastructure/auth/AuthProviderRegistry';
import { BrowserSsoAuthProvider } from '../../../src/infrastructure/auth/BrowserSsoAuthProvider';

jest.mock('../../../src/infrastructure/system');
jest.mock('../../../src/infrastructure/auth/AuthProviderRegistry');
jest.mock('../../../src/infrastructure/auth/BrowserSsoAuthProvider');

describe('handleSapBrowserLogin', () => {
    let mockRegistry: jest.Mocked<SystemRegistry>;
    let mockAuthRegistry: jest.Mocked<AuthProviderRegistry>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRegistry = {
            resolveSystem: jest.fn().mockReturnValue({
                id: 'DEV', name: 'Development', url: 'https://dev.sap.com', client: '100',
                auth: { type: 'sso' },
            }),
        } as any;

        mockAuthRegistry = {
            getProvider: jest.fn(),
            setCsrfToken: jest.fn(),
            setCookies: jest.fn(),
        } as any;

        (SystemRegistry.getInstance as jest.Mock).mockReturnValue(mockRegistry);
        (AuthProviderRegistry.getInstance as jest.Mock).mockReturnValue(mockAuthRegistry);
    });

    test('returns error when provider is not BrowserSsoAuthProvider', async () => {
        const basicProvider = {
            getName: jest.fn().mockReturnValue('Basic Auth (credentials)'),
            getSystemUrl: jest.fn().mockReturnValue('https://dev.sap.com'),
            getClient: jest.fn().mockReturnValue('100'),
            isAvailable: jest.fn().mockReturnValue(true),
            getAuthHeaders: jest.fn(),
        } as any;
        mockAuthRegistry.getProvider.mockReturnValue(basicProvider);

        const result = await handleSapBrowserLogin({});

        expect(result.content[0].text).toContain('not Browser SSO');
        expect(result.isError).toBe(true);
    });

    test('calls refreshAuth on BrowserSsoAuthProvider', async () => {
        const mockRefresh = jest.fn().mockResolvedValue(undefined);
        const mockSsoProvider = {
            refreshAuth: mockRefresh,
            getName: jest.fn().mockReturnValue('Browser SSO'),
            getSystemUrl: jest.fn().mockReturnValue('https://dev.sap.com'),
        };
        mockAuthRegistry.getProvider.mockReturnValue(mockSsoProvider as any);

        // Make instanceof check work with the mocked class
        Object.setPrototypeOf(mockSsoProvider, BrowserSsoAuthProvider.prototype);

        const result = await handleSapBrowserLogin({});

        expect(mockRefresh).toHaveBeenCalled();
        expect(result.content[0].text).toContain('authenticated');
    });
});
