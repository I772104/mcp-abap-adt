import { BrowserSsoAuthProvider } from '../../../../src/infrastructure/auth/BrowserSsoAuthProvider';
import { CookieStore } from '../../../../src/infrastructure/auth/CookieStore';

// Mock dependencies
jest.mock('../../../../src/infrastructure/auth/CookieStore');
jest.mock('chrome-launcher', () => ({
    launch: jest.fn(),
    Launcher: {
        getInstallations: jest.fn(),
    },
}));
jest.mock('ws');
jest.mock('axios');

describe('BrowserSsoAuthProvider', () => {
    let provider: BrowserSsoAuthProvider;
    let mockCookieStore: jest.Mocked<CookieStore>;
    const testSystemUrl = 'https://test.example.com:443';
    const testClient = '100';
    const testDomain = 'test.example.com';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock CookieStore
        mockCookieStore = {
            load: jest.fn(),
            save: jest.fn(),
            clear: jest.fn(),
            getPath: jest.fn().mockReturnValue('/tmp/test-cookies.json'),
        } as any;
        (CookieStore as jest.MockedClass<typeof CookieStore>).mockImplementation(() => mockCookieStore);

        provider = new BrowserSsoAuthProvider(testSystemUrl, testClient, testDomain);
    });

    describe('getName', () => {
        it('should return "Browser SSO"', () => {
            expect(provider.getName()).toBe('Browser SSO');
        });
    });

    describe('getSystemUrl', () => {
        it('should return the system URL', () => {
            expect(provider.getSystemUrl()).toBe(testSystemUrl);
        });
    });

    describe('getClient', () => {
        it('should return the client number', () => {
            expect(provider.getClient()).toBe(testClient);
        });
    });

    describe('getCookieCachePath', () => {
        it('should return the cookie cache file path', () => {
            expect(provider.getCookieCachePath()).toBe('/tmp/test-cookies.json');
            expect(mockCookieStore.getPath).toHaveBeenCalled();
        });
    });

    describe('isAvailable', () => {
        it('should return true when Chrome is installed', () => {
            const chromeLauncher = require('chrome-launcher');
            chromeLauncher.Launcher.getInstallations.mockReturnValue(['/path/to/chrome']);

            expect(provider.isAvailable()).toBe(true);
        });

        it('should return false when Chrome is not installed', () => {
            const chromeLauncher = require('chrome-launcher');
            chromeLauncher.Launcher.getInstallations.mockReturnValue([]);

            expect(provider.isAvailable()).toBe(false);
        });

        it('should return false when chrome-launcher throws error', () => {
            const chromeLauncher = require('chrome-launcher');
            chromeLauncher.Launcher.getInstallations.mockImplementation(() => {
                throw new Error('Module not found');
            });

            expect(provider.isAvailable()).toBe(false);
        });
    });

    describe('getAuthHeaders - caching priority', () => {
        it('should use cached cookies from disk when available and valid', async () => {
            const mockCookies = 'SAP_SESSIONID_ER1_001=12345; sap-usercontext=abcd';
            mockCookieStore.load.mockResolvedValue({
                cookies: mockCookies,
                timestamp: Date.now(),
                domain: testDomain,
            });

            const headers = await provider.getAuthHeaders();

            expect(mockCookieStore.load).toHaveBeenCalled();
            expect(headers).toEqual({
                Cookie: mockCookies,
                'X-SAP-Client': testClient,
            });
        });

        it('should return in-memory cookies without checking disk cache', async () => {
            const mockCookies = 'SAP_SESSIONID_ER1_001=cached; sap-usercontext=mem';

            // First call loads from disk
            mockCookieStore.load.mockResolvedValueOnce({
                cookies: mockCookies,
                timestamp: Date.now(),
                domain: testDomain,
            });
            await provider.getAuthHeaders();

            // Second call should use in-memory without calling load again
            mockCookieStore.load.mockClear();
            const headers = await provider.getAuthHeaders();

            expect(mockCookieStore.load).not.toHaveBeenCalled();
            expect(headers.Cookie).toBe(mockCookies);
        });

        it('should launch browser when no cached cookies exist', async () => {
            mockCookieStore.load.mockResolvedValue(null);

            // Set in-memory cookies BEFORE spying to avoid race condition
            const originalMethod = (provider as any).performBrowserAuth;
            (provider as any).performBrowserAuth = jest.fn().mockImplementation(async () => {
                (provider as any).inMemoryCookies = 'SAP_SESSIONID_ER1_001=new; sap-usercontext=browser';
                return Promise.resolve();
            });

            const headers = await provider.getAuthHeaders();

            expect(mockCookieStore.load).toHaveBeenCalled();
            expect((provider as any).performBrowserAuth).toHaveBeenCalled();
            expect(headers.Cookie).toContain('SAP_SESSIONID_ER1_001=new');

            // Restore
            (provider as any).performBrowserAuth = originalMethod;
        });

        it('should throw error if browser auth fails to obtain cookies', async () => {
            mockCookieStore.load.mockResolvedValue(null);

            // Mock performBrowserAuth to not set cookies
            const originalMethod = (provider as any).performBrowserAuth;
            (provider as any).performBrowserAuth = jest.fn().mockImplementation(async () => {
                // Don't set inMemoryCookies to simulate failure
                return Promise.resolve();
            });

            await expect(provider.getAuthHeaders()).rejects.toThrow(
                'Failed to obtain cookies from browser authentication'
            );

            // Restore
            (provider as any).performBrowserAuth = originalMethod;
        });

        it('should wait for auth in progress instead of launching multiple browsers', async () => {
            mockCookieStore.load.mockResolvedValue(null);

            let callCount = 0;
            const originalMethod = (provider as any).performBrowserAuth;

            // Mock implementation that simulates authInProgress behavior
            (provider as any).performBrowserAuth = async function (this: BrowserSsoAuthProvider) {
                callCount++;
                // Simulate the auth process setting authInProgress
                const authPromise = (async () => {
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    (this as any).inMemoryCookies = 'SAP_SESSIONID_ER1_001=concurrent';
                })();
                (this as any).authInProgress = authPromise;
                await authPromise;
                (this as any).authInProgress = null;
            };

            // Make two concurrent requests
            const [headers1, headers2] = await Promise.all([provider.getAuthHeaders(), provider.getAuthHeaders()]);

            // performBrowserAuth should only be called once due to authInProgress guard
            expect(callCount).toBe(1);
            expect(headers1.Cookie).toBe(headers2.Cookie);

            // Restore
            (provider as any).performBrowserAuth = originalMethod;
        });
    });

    describe('refreshAuth', () => {
        it('should clear cache and perform fresh browser authentication', async () => {
            mockCookieStore.clear.mockResolvedValue();

            // Mock performBrowserAuth
            const originalMethod = (provider as any).performBrowserAuth;
            (provider as any).performBrowserAuth = jest.fn().mockResolvedValue(undefined);

            // Set initial cookies
            (provider as any).inMemoryCookies = 'old-cookies';

            await provider.refreshAuth();

            expect(mockCookieStore.clear).toHaveBeenCalled();
            expect((provider as any).inMemoryCookies).toBeNull();
            expect((provider as any).performBrowserAuth).toHaveBeenCalled();

            // Restore
            (provider as any).performBrowserAuth = originalMethod;
        });
    });

    describe('isLoginComplete', () => {
        it('should detect login completion for SAP URLs', () => {
            const isLoginComplete = (provider as any).isLoginComplete.bind(provider);

            expect(isLoginComplete('https://test.example.com/sap/bc/ui2/flp')).toBe(true);
            expect(isLoginComplete('https://test.example.com/sap/bc/adt')).toBe(true);
            expect(isLoginComplete('https://test.example.com/sap/public/info')).toBe(true);
        });

        it('should detect login completion for domain root', () => {
            const isLoginComplete = (provider as any).isLoginComplete.bind(provider);

            expect(isLoginComplete('https://test.example.com/')).toBe(true);
            expect(isLoginComplete('https://test.example.com')).toBe(true);
        });

        it('should reject URLs with login/logout/auth patterns', () => {
            const isLoginComplete = (provider as any).isLoginComplete.bind(provider);

            expect(isLoginComplete('https://accounts.sap.com/saml2/idp/sso')).toBe(false);
            expect(isLoginComplete('https://test.example.com/login')).toBe(false);
            expect(isLoginComplete('https://test.example.com/logout')).toBe(false);
            expect(isLoginComplete('https://test.example.com/auth_redirect')).toBe(false);
        });

        it('should reject URLs from different domains', () => {
            const isLoginComplete = (provider as any).isLoginComplete.bind(provider);

            expect(isLoginComplete('https://other-domain.com/sap/bc/adt')).toBe(false);
            expect(isLoginComplete('https://accounts.google.com/')).toBe(false);
        });

        it('should be case-insensitive', () => {
            const isLoginComplete = (provider as any).isLoginComplete.bind(provider);

            expect(isLoginComplete('https://TEST.EXAMPLE.COM/SAP/BC/ADT')).toBe(true);
            expect(isLoginComplete('https://test.example.com/LOGIN')).toBe(false);
        });
    });

    describe('buildHeaders', () => {
        it('should build correct auth headers', () => {
            const cookies = 'SAP_SESSIONID_ER1_001=12345; sap-usercontext=abcd';
            const headers = (provider as any).buildHeaders(cookies);

            expect(headers).toEqual({
                Cookie: cookies,
                'X-SAP-Client': testClient,
            });
        });
    });
});
