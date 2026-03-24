import { createAuthProvider, createAuthProviderFromConfig } from '../../../../src/infrastructure/auth/AuthProviderFactory';
import { BasicAuthProvider } from '../../../../src/infrastructure/auth/BasicAuthProvider';
import { BrowserSsoAuthProvider } from '../../../../src/infrastructure/auth/BrowserSsoAuthProvider';
import { SystemConfig } from '../../../../src/infrastructure/system/types';
import * as fs from 'fs';

// Mock fs.existsSync for cookie file checks
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(false),
}));

// Mock chrome-launcher (ESM module that Jest can't parse)
jest.mock('chrome-launcher', () => ({
    launch: jest.fn(),
}));

// Mock BrowserSsoAuthProvider to avoid real Chrome dependency
jest.mock('../../../../src/infrastructure/auth/BrowserSsoAuthProvider');

describe('AuthProviderFactory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (BrowserSsoAuthProvider as jest.MockedClass<typeof BrowserSsoAuthProvider>).mockImplementation(
            (url, client, domain) => ({
                getAuthHeaders: jest.fn(),
                getSystemUrl: jest.fn().mockReturnValue(url),
                getClient: jest.fn().mockReturnValue(client),
                isAvailable: jest.fn().mockReturnValue(true),
                getName: jest.fn().mockReturnValue('Browser SSO'),
                refreshAuth: jest.fn(),
            } as any)
        );
    });

    describe('createAuthProvider()', () => {
        test('returns BasicAuthProvider when credentials are provided', () => {
            const provider = createAuthProvider('https://sap.example.com', '100', 'user', 'pass');
            expect(provider).toBeInstanceOf(BasicAuthProvider);
        });

        test('returns BrowserSsoAuthProvider as fallback when no credentials and no cookie file', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const provider = createAuthProvider('https://sap.example.com', '100');
            expect(BrowserSsoAuthProvider).toHaveBeenCalledWith(
                'https://sap.example.com', '100', 'sap.example.com'
            );
            expect(provider.getName()).toBe('Browser SSO');
        });
    });

    describe('createAuthProviderFromConfig()', () => {
        test('returns BasicAuthProvider for basic auth config', () => {
            const config: SystemConfig = {
                id: 'DEV', name: 'Dev', url: 'https://dev.sap.com', client: '100',
                auth: { type: 'basic', username: 'user', password: 'pass' },
            };

            const provider = createAuthProviderFromConfig(config);
            expect(provider).toBeInstanceOf(BasicAuthProvider);
        });

        test('returns BrowserSsoAuthProvider for SSO config when no cookie file exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const config: SystemConfig = {
                id: 'PRD', name: 'Production', url: 'https://prd.sap.com', client: '200',
                auth: { type: 'sso' },
            };

            const provider = createAuthProviderFromConfig(config);
            expect(BrowserSsoAuthProvider).toHaveBeenCalledWith(
                'https://prd.sap.com', '200', 'prd.sap.com'
            );
            expect(provider.getName()).toBe('Browser SSO');
        });
    });
});
