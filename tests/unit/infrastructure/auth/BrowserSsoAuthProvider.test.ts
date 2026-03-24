import { BrowserSsoAuthProvider } from '../../../../src/infrastructure/auth/BrowserSsoAuthProvider';
import { CookieStore } from '../../../../src/infrastructure/auth/CookieStore';

// Mock chrome-launcher
jest.mock('chrome-launcher', () => ({
    launch: jest.fn(),
}));

// Mock CookieStore
jest.mock('../../../../src/infrastructure/auth/CookieStore');

describe('BrowserSsoAuthProvider', () => {
    let provider: BrowserSsoAuthProvider;
    let mockCookieStore: jest.Mocked<CookieStore>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCookieStore = {
            save: jest.fn().mockResolvedValue(undefined),
            load: jest.fn().mockResolvedValue(null),
            clear: jest.fn().mockResolvedValue(undefined),
            getPath: jest.fn().mockReturnValue('/tmp/mcp-abap-adt/test.json'),
        } as any;

        (CookieStore as jest.MockedClass<typeof CookieStore>).mockImplementation(() => mockCookieStore);

        provider = new BrowserSsoAuthProvider('https://sap.example.com:443', '100', 'sap.example.com');
    });

    describe('interface methods', () => {
        test('getSystemUrl() returns system URL', () => {
            expect(provider.getSystemUrl()).toBe('https://sap.example.com:443');
        });

        test('getClient() returns client number', () => {
            expect(provider.getClient()).toBe('100');
        });

        test('getName() returns "Browser SSO"', () => {
            expect(provider.getName()).toBe('Browser SSO');
        });

        test('isAvailable() returns true', () => {
            expect(provider.isAvailable()).toBe(true);
        });
    });

    describe('getAuthHeaders()', () => {
        test('returns cached cookies from CookieStore when available', async () => {
            mockCookieStore.load.mockResolvedValue({
                cookies: 'SAP_SESSIONID=abc123; MYSAPSSO2=xyz',
                timestamp: Date.now(),
                domain: 'sap.example.com',
            });

            const headers = await provider.getAuthHeaders();

            expect(headers).toEqual({
                Cookie: 'SAP_SESSIONID=abc123; MYSAPSSO2=xyz',
                'X-SAP-Client': '100',
            });
            expect(mockCookieStore.load).toHaveBeenCalled();
        });

        test('returns in-memory cookies without hitting CookieStore on subsequent calls', async () => {
            mockCookieStore.load.mockResolvedValue({
                cookies: 'SAP_SESSIONID=abc123',
                timestamp: Date.now(),
                domain: 'sap.example.com',
            });

            await provider.getAuthHeaders();
            expect(mockCookieStore.load).toHaveBeenCalledTimes(1);

            const headers = await provider.getAuthHeaders();
            expect(mockCookieStore.load).toHaveBeenCalledTimes(1);
            expect(headers.Cookie).toBe('SAP_SESSIONID=abc123');
        });
    });

    describe('refreshAuth()', () => {
        test('clears in-memory cookies and CookieStore', async () => {
            mockCookieStore.load.mockResolvedValue({
                cookies: 'SAP_SESSIONID=abc123',
                timestamp: Date.now(),
                domain: 'sap.example.com',
            });
            await provider.getAuthHeaders();

            const chromeLauncher = require('chrome-launcher');
            chromeLauncher.launch.mockRejectedValue(new Error('No Chrome'));

            try {
                await provider.refreshAuth();
            } catch {
                // Expected — Chrome not available in test
            }

            expect(mockCookieStore.clear).toHaveBeenCalled();
        });
    });
});
