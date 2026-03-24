import { handleSapBrowserLogin } from '../../../src/handlers/handleSapBrowserLogin';
import { SystemRegistry } from '../../../src/infrastructure/system/SystemRegistry';
import { AuthProviderRegistry } from '../../../src/infrastructure/auth/AuthProviderRegistry';
import { BrowserSsoAuthProvider } from '../../../src/infrastructure/auth/BrowserSsoAuthProvider';
import { BasicAuthProvider } from '../../../src/infrastructure/auth/BasicAuthProvider';

// Mock dependencies
jest.mock('../../../src/infrastructure/system/SystemRegistry');
jest.mock('../../../src/infrastructure/auth/AuthProviderRegistry');

describe('handleSapBrowserLogin', () => {
    let mockSystemRegistry: jest.Mocked<SystemRegistry>;
    let mockAuthRegistry: jest.Mocked<AuthProviderRegistry>;
    let mockBrowserProvider: jest.Mocked<BrowserSsoAuthProvider>;
    let mockBasicProvider: jest.Mocked<BasicAuthProvider>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock system registry
        mockSystemRegistry = {
            resolveSystem: jest.fn(),
        } as any;
        (SystemRegistry.getInstance as jest.Mock).mockReturnValue(mockSystemRegistry);

        // Mock auth registry
        mockAuthRegistry = {
            getProvider: jest.fn(),
            setCsrfToken: jest.fn(),
            setCookies: jest.fn(),
        } as any;
        (AuthProviderRegistry.getInstance as jest.Mock).mockReturnValue(mockAuthRegistry);

        // Mock browser SSO provider - must be actual instance for instanceof check
        mockBrowserProvider = Object.create(BrowserSsoAuthProvider.prototype);
        mockBrowserProvider.isAvailable = jest.fn();
        mockBrowserProvider.refreshAuth = jest.fn();
        mockBrowserProvider.getName = jest.fn().mockReturnValue('Browser SSO');
        mockBrowserProvider.getCookieCachePath = jest.fn().mockReturnValue('/tmp/test-cookies.json');

        // Mock basic auth provider - must be actual instance for instanceof check
        mockBasicProvider = Object.create(BasicAuthProvider.prototype);
        mockBasicProvider.getName = jest.fn().mockReturnValue('Basic Auth');
    });

    describe('successful authentication', () => {
        it('should successfully authenticate with browser SSO', async () => {
            const mockSystem = {
                id: 'DEV',
                name: 'Development System',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'sso' },
            };

            mockSystemRegistry.resolveSystem.mockReturnValue(mockSystem as any);
            mockAuthRegistry.getProvider.mockReturnValue(mockBrowserProvider);
            mockBrowserProvider.isAvailable.mockReturnValue(true);
            mockBrowserProvider.refreshAuth.mockResolvedValue();

            const result = await handleSapBrowserLogin({ systemId: 'DEV' });

            expect(mockSystemRegistry.resolveSystem).toHaveBeenCalledWith('DEV');
            expect(mockAuthRegistry.getProvider).toHaveBeenCalledWith(mockSystem);
            expect(mockAuthRegistry.setCsrfToken).toHaveBeenCalledWith('DEV', '');
            expect(mockAuthRegistry.setCookies).toHaveBeenCalledWith('DEV', '');
            expect(mockBrowserProvider.refreshAuth).toHaveBeenCalled();

            expect(result.content[0].type).toBe('text');
            expect(result.content[0].text).toContain('✅ Browser SSO Authentication Successful');
            expect(result.content[0].text).toContain('Development System (DEV)');
            expect(result.content[0].text).toContain('https://dev.example.com:443');
            expect(result.content[0].text).toContain('Cookie Cache: /tmp/test-cookies.json');
        });

        it('should authenticate default system when systemId not provided', async () => {
            const mockSystem = {
                id: 'DEFAULT',
                name: 'Default System',
                url: 'https://default.example.com:443',
                client: '001',
                auth: { type: 'sso' },
            };

            mockSystemRegistry.resolveSystem.mockReturnValue(mockSystem as any);
            mockAuthRegistry.getProvider.mockReturnValue(mockBrowserProvider);
            mockBrowserProvider.isAvailable.mockReturnValue(true);
            mockBrowserProvider.refreshAuth.mockResolvedValue();

            const result = await handleSapBrowserLogin({});

            expect(mockSystemRegistry.resolveSystem).toHaveBeenCalledWith(undefined);
            expect(result.content[0].text).toContain('✅ Browser SSO Authentication Successful');
            expect(result.content[0].text).toContain('Default System (DEFAULT)');
        });
    });

    describe('error handling', () => {
        it('should return error when system uses non-SSO auth method', async () => {
            const mockSystem = {
                id: 'DEV',
                name: 'Development System',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'basic', username: 'user', password: 'pass' },
            };

            mockSystemRegistry.resolveSystem.mockReturnValue(mockSystem as any);
            mockAuthRegistry.getProvider.mockReturnValue(mockBasicProvider);

            const result = await handleSapBrowserLogin({ systemId: 'DEV' });

            expect(mockAuthRegistry.setCsrfToken).not.toHaveBeenCalled();
            expect(mockAuthRegistry.setCookies).not.toHaveBeenCalled();
            expect(result.content[0].text).toContain('❌ Browser SSO Login Not Available');
            expect(result.content[0].text).toContain('Basic Auth');
        });

        it('should return error when Chrome is not available', async () => {
            const mockSystem = {
                id: 'DEV',
                name: 'Development System',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'sso' },
            };

            mockSystemRegistry.resolveSystem.mockReturnValue(mockSystem as any);
            mockAuthRegistry.getProvider.mockReturnValue(mockBrowserProvider);
            mockBrowserProvider.isAvailable.mockReturnValue(false);

            const result = await handleSapBrowserLogin({ systemId: 'DEV' });

            expect(mockBrowserProvider.refreshAuth).not.toHaveBeenCalled();
            expect(result.content[0].text).toContain('❌ Chrome/Chromium Not Found');
            expect(result.content[0].text).toContain('Browser SSO requires Chrome');
        });

        it('should handle authentication errors', async () => {
            const mockSystem = {
                id: 'DEV',
                name: 'Development System',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'sso' },
            };

            mockSystemRegistry.resolveSystem.mockReturnValue(mockSystem as any);
            mockAuthRegistry.getProvider.mockReturnValue(mockBrowserProvider);
            mockBrowserProvider.isAvailable.mockReturnValue(true);
            mockBrowserProvider.refreshAuth.mockRejectedValue(new Error('Chrome launch failed'));

            const result = await handleSapBrowserLogin({ systemId: 'DEV' });

            expect(result.content[0].text).toContain('Chrome launch failed');
        });

        it('should handle system resolution errors', async () => {
            mockSystemRegistry.resolveSystem.mockImplementation(() => {
                throw new Error('System "INVALID" not found');
            });

            const result = await handleSapBrowserLogin({ systemId: 'INVALID' });

            expect(result.content[0].text).toContain('System "INVALID" not found');
        });

        it('should handle auth registry errors', async () => {
            const mockSystem = {
                id: 'DEV',
                name: 'Development System',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'sso' },
            };

            mockSystemRegistry.resolveSystem.mockReturnValue(mockSystem as any);
            mockAuthRegistry.getProvider.mockImplementation(() => {
                throw new Error('Provider initialization failed');
            });

            const result = await handleSapBrowserLogin({ systemId: 'DEV' });

            expect(result.content[0].text).toContain('Provider initialization failed');
        });
    });
});
