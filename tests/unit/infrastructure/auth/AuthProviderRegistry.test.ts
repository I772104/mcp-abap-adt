/**
 * Unit Tests for AuthProviderRegistry
 *
 * Tests the per-system authentication provider registry including:
 * - Provider caching per system
 * - CSRF token management per system
 * - Cookie management per system
 * - Registry isolation
 */

import { AuthProviderRegistry } from '../../../../src/infrastructure/auth/AuthProviderRegistry';
import { SystemConfig } from '../../../../src/infrastructure/system/types';
import * as AuthProviderFactory from '../../../../src/infrastructure/auth/AuthProviderFactory';
import { AuthProvider } from '../../../../src/infrastructure/auth/AuthProvider';

// Mock chrome-launcher (ESM module that Jest can't parse)
jest.mock('chrome-launcher', () => ({
    launch: jest.fn(),
}));

// Mock the AuthProviderFactory
jest.mock('../../../../src/infrastructure/auth/AuthProviderFactory');

describe('AuthProviderRegistry', () => {
    let mockCreateAuthProviderFromConfig: jest.MockedFunction<
        typeof AuthProviderFactory.createAuthProviderFromConfig
    >;
    let mockAuthProvider: jest.Mocked<AuthProvider>;

    beforeEach(() => {
        // Reset singleton instance before each test
        AuthProviderRegistry.getInstance().reset();
        jest.clearAllMocks();

        mockCreateAuthProviderFromConfig =
            AuthProviderFactory.createAuthProviderFromConfig as jest.MockedFunction<
                typeof AuthProviderFactory.createAuthProviderFromConfig
            >;

        // Create mock auth provider
        mockAuthProvider = {
            getAuthHeaders: jest.fn().mockResolvedValue({ Authorization: 'Bearer token' }),
            getName: jest.fn().mockReturnValue('Mock Auth'),
            getSystemUrl: jest.fn().mockReturnValue('https://mock.example.com'),
            getClient: jest.fn().mockReturnValue('100'),
            isAvailable: jest.fn().mockReturnValue(true),
        } as any;

        mockCreateAuthProviderFromConfig.mockReturnValue(mockAuthProvider);
    });

    describe('Provider Management', () => {
        test('should create and cache auth provider for system', () => {
            const registry = AuthProviderRegistry.getInstance();
            const systemConfig: SystemConfig = {
                id: 'DEV',
                name: 'Development',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: {
                    type: 'basic',
                    username: 'test',
                    password: 'test',
                },
            };

            const provider1 = registry.getProvider(systemConfig);
            expect(mockCreateAuthProviderFromConfig).toHaveBeenCalledWith(systemConfig);
            expect(provider1).toBe(mockAuthProvider);

            // Second call should return cached provider
            const provider2 = registry.getProvider(systemConfig);
            expect(mockCreateAuthProviderFromConfig).toHaveBeenCalledTimes(1); // Still only called once
            expect(provider2).toBe(mockAuthProvider);
        });

        test('should create separate providers for different systems', () => {
            const registry = AuthProviderRegistry.getInstance();

            const systemDev: SystemConfig = {
                id: 'DEV',
                name: 'Development',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'basic', username: 'test', password: 'test' },
            };

            const systemQas: SystemConfig = {
                id: 'QAS',
                name: 'Quality',
                url: 'https://qas.example.com:443',
                client: '200',
                auth: { type: 'basic', username: 'test', password: 'test' },
            };

            const provider1 = registry.getProvider(systemDev);
            const provider2 = registry.getProvider(systemQas);

            expect(mockCreateAuthProviderFromConfig).toHaveBeenCalledTimes(2);
            expect(mockCreateAuthProviderFromConfig).toHaveBeenCalledWith(systemDev);
            expect(mockCreateAuthProviderFromConfig).toHaveBeenCalledWith(systemQas);
        });
    });

    describe('CSRF Token Management', () => {
        test('should store and retrieve CSRF token per system', () => {
            const registry = AuthProviderRegistry.getInstance();

            registry.setCsrfToken('DEV', 'dev-token-123');
            registry.setCsrfToken('QAS', 'qas-token-456');

            expect(registry.getCsrfToken('DEV')).toBe('dev-token-123');
            expect(registry.getCsrfToken('QAS')).toBe('qas-token-456');
        });

        test('should return null for non-existent CSRF token', () => {
            const registry = AuthProviderRegistry.getInstance();

            expect(registry.getCsrfToken('NONEXISTENT')).toBeNull();
        });

        test('should update CSRF token for system', () => {
            const registry = AuthProviderRegistry.getInstance();

            registry.setCsrfToken('DEV', 'old-token');
            expect(registry.getCsrfToken('DEV')).toBe('old-token');

            registry.setCsrfToken('DEV', 'new-token');
            expect(registry.getCsrfToken('DEV')).toBe('new-token');
        });
    });

    describe('Cookie Management', () => {
        test('should store and retrieve cookies per system', () => {
            const registry = AuthProviderRegistry.getInstance();

            registry.setCookies('DEV', 'SESSION=dev123; PATH=/');
            registry.setCookies('QAS', 'SESSION=qas456; PATH=/');

            expect(registry.getCookies('DEV')).toBe('SESSION=dev123; PATH=/');
            expect(registry.getCookies('QAS')).toBe('SESSION=qas456; PATH=/');
        });

        test('should return null for non-existent cookies', () => {
            const registry = AuthProviderRegistry.getInstance();

            expect(registry.getCookies('NONEXISTENT')).toBeNull();
        });

        test('should update cookies for system', () => {
            const registry = AuthProviderRegistry.getInstance();

            registry.setCookies('DEV', 'SESSION=old');
            expect(registry.getCookies('DEV')).toBe('SESSION=old');

            registry.setCookies('DEV', 'SESSION=new');
            expect(registry.getCookies('DEV')).toBe('SESSION=new');
        });
    });

    describe('System Cleanup', () => {
        test('should clear all data for specific system', () => {
            const registry = AuthProviderRegistry.getInstance();

            const systemConfig: SystemConfig = {
                id: 'DEV',
                name: 'Development',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'basic', username: 'test', password: 'test' },
            };

            registry.getProvider(systemConfig);
            registry.setCsrfToken('DEV', 'token');
            registry.setCookies('DEV', 'cookies');

            registry.clearSystem('DEV');

            expect(registry.getCsrfToken('DEV')).toBeNull();
            expect(registry.getCookies('DEV')).toBeNull();

            // Provider should be recreated on next call
            registry.getProvider(systemConfig);
            expect(mockCreateAuthProviderFromConfig).toHaveBeenCalledTimes(2);
        });

        test('should clear all systems', () => {
            const registry = AuthProviderRegistry.getInstance();

            registry.setCsrfToken('DEV', 'dev-token');
            registry.setCsrfToken('QAS', 'qas-token');
            registry.setCookies('DEV', 'dev-cookies');
            registry.setCookies('QAS', 'qas-cookies');

            registry.clearAll();

            expect(registry.getCsrfToken('DEV')).toBeNull();
            expect(registry.getCsrfToken('QAS')).toBeNull();
            expect(registry.getCookies('DEV')).toBeNull();
            expect(registry.getCookies('QAS')).toBeNull();
        });
    });

    describe('Isolation', () => {
        test('should maintain isolation between systems', () => {
            const registry = AuthProviderRegistry.getInstance();

            const devSystem: SystemConfig = {
                id: 'DEV',
                name: 'Development',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'basic', username: 'test', password: 'test' },
            };

            const qasSystem: SystemConfig = {
                id: 'QAS',
                name: 'Quality',
                url: 'https://qas.example.com:443',
                client: '200',
                auth: { type: 'basic', username: 'test', password: 'test' },
            };

            // Set up DEV system
            registry.getProvider(devSystem);
            registry.setCsrfToken('DEV', 'dev-token');
            registry.setCookies('DEV', 'dev-cookies');

            // Set up QAS system
            registry.getProvider(qasSystem);
            registry.setCsrfToken('QAS', 'qas-token');
            registry.setCookies('QAS', 'qas-cookies');

            // Clear DEV system
            registry.clearSystem('DEV');

            // QAS system should be unaffected
            expect(registry.getCsrfToken('QAS')).toBe('qas-token');
            expect(registry.getCookies('QAS')).toBe('qas-cookies');

            // DEV system should be cleared
            expect(registry.getCsrfToken('DEV')).toBeNull();
            expect(registry.getCookies('DEV')).toBeNull();
        });
    });
});
