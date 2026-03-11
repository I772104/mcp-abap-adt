/**
 * Unit Tests for SystemRegistry
 *
 * Tests the multi-system configuration registry including:
 * - Loading from .sap-systems.json
 * - Loading from .env (backward compatibility)
 * - Environment variable interpolation
 * - System switching and resolution
 */

import { SystemRegistry } from '../../../../src/infrastructure/system/SystemRegistry';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

describe('SystemRegistry', () => {
    let mockFs: jest.Mocked<typeof fs>;
    let originalNodeEnv: string | undefined;

    beforeEach(() => {
        // Save and modify NODE_ENV to avoid test mode detection
        originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'unit-test'; // Use different value to avoid test mode

        // Reset singleton instance before each test
        SystemRegistry.getInstance().reset();
        jest.clearAllMocks();

        mockFs = fs as jest.Mocked<typeof fs>;

        // Reset environment variables
        delete process.env.SAP_URL;
        delete process.env.SAP_CLIENT;
        delete process.env.SAP_USERNAME;
        delete process.env.SAP_PASSWORD;
        delete process.env.SAP_COOKIE_PATH;
    });

    afterEach(() => {
        // Restore original NODE_ENV
        if (originalNodeEnv !== undefined) {
            process.env.NODE_ENV = originalNodeEnv;
        } else {
            delete process.env.NODE_ENV;
        }
    });

    describe('Multi-System Mode (.sap-systems.json)', () => {
        test('should load systems from .sap-systems.json', () => {
            const configContent = JSON.stringify({
                version: '1.0',
                default: 'DEV',
                systems: {
                    DEV: {
                        name: 'Development',
                        url: 'https://dev.example.com:443',
                        client: '100',
                        auth: {
                            type: 'basic',
                            username: 'testuser',
                            password: 'testpass',
                        },
                    },
                    QAS: {
                        name: 'Quality',
                        url: 'https://qas.example.com:443',
                        client: '200',
                        auth: {
                            type: 'sso',
                            cookiePath: './tmp/qas_cookies.json',
                        },
                    },
                },
            });

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(configContent);

            const registry = SystemRegistry.getInstance();
            registry.initialize();

            expect(registry.listSystems()).toHaveLength(2);
            expect(registry.getDefaultSystemId()).toBe('DEV');
            expect(registry.getActiveSystemId()).toBe('DEV');
            expect(registry.isMultiSystemMode()).toBe(true);
        });

        test('should interpolate environment variables', () => {
            process.env.SAP_USERNAME = 'myuser';
            process.env.SAP_PASSWORD = 'mypass';

            const configContent = JSON.stringify({
                version: '1.0',
                default: 'DEV',
                systems: {
                    DEV: {
                        name: 'Development',
                        url: 'https://dev.example.com:443',
                        client: '100',
                        auth: {
                            type: 'basic',
                            username: '${SAP_USERNAME}',
                            password: '${SAP_PASSWORD}',
                        },
                    },
                },
            });

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(configContent);

            const registry = SystemRegistry.getInstance();
            registry.initialize();

            const system = registry.getSystem('DEV');
            expect(system.auth.type).toBe('basic');
            expect(system.auth.username).toBe('myuser');
            expect(system.auth.password).toBe('mypass');
        });

        test('should throw error if environment variable not set', () => {
            const configContent = JSON.stringify({
                version: '1.0',
                default: 'DEV',
                systems: {
                    DEV: {
                        name: 'Development',
                        url: 'https://dev.example.com:443',
                        client: '100',
                        auth: {
                            type: 'basic',
                            username: '${MISSING_VAR}',
                            password: 'testpass',
                        },
                    },
                },
            });

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(configContent);

            const registry = SystemRegistry.getInstance();
            expect(() => registry.initialize()).toThrow('Environment variable MISSING_VAR');
        });

        test('should throw error for invalid environment variable name', () => {
            const configContent = JSON.stringify({
                version: '1.0',
                default: 'DEV',
                systems: {
                    DEV: {
                        name: 'Development',
                        url: 'https://dev.example.com:443',
                        client: '100',
                        auth: {
                            type: 'basic',
                            username: '${../../../etc/passwd}',
                            password: 'testpass',
                        },
                    },
                },
            });

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(configContent);

            const registry = SystemRegistry.getInstance();
            expect(() => registry.initialize()).toThrow('Invalid environment variable name');
        });

        test('should throw error if too many systems configured', () => {
            const systems: any = {};
            for (let i = 1; i <= 51; i++) {
                systems[`SYS${i}`] = {
                    name: `System ${i}`,
                    url: 'https://example.com:443',
                    client: '100',
                    auth: { type: 'basic', username: 'test', password: 'test' },
                };
            }

            const configContent = JSON.stringify({
                version: '1.0',
                default: 'SYS1',
                systems,
            });

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(configContent);

            const registry = SystemRegistry.getInstance();
            expect(() => registry.initialize()).toThrow('Too many systems configured');
        });

        test('should throw error if default system not found', () => {
            const configContent = JSON.stringify({
                version: '1.0',
                default: 'INVALID',
                systems: {
                    DEV: {
                        name: 'Development',
                        url: 'https://dev.example.com:443',
                        client: '100',
                        auth: {
                            type: 'basic',
                            username: 'test',
                            password: 'test',
                        },
                    },
                },
            });

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(configContent);

            const registry = SystemRegistry.getInstance();
            expect(() => registry.initialize()).toThrow('Default system "INVALID" not found');
        });

        test('should throw error for unsupported version', () => {
            const configContent = JSON.stringify({
                version: '2.0',
                default: 'DEV',
                systems: {
                    DEV: {
                        name: 'Development',
                        url: 'https://dev.example.com:443',
                        client: '100',
                        auth: {
                            type: 'basic',
                            username: 'test',
                            password: 'test',
                        },
                    },
                },
            });

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(configContent);

            const registry = SystemRegistry.getInstance();
            expect(() => registry.initialize()).toThrow('Unsupported config version: 2.0');
        });
    });

    describe('Single-System Mode (.env backward compatibility)', () => {
        test('should load system from environment variables', () => {
            process.env.SAP_URL = 'https://sap.example.com:443';
            process.env.SAP_CLIENT = '100';
            process.env.SAP_USERNAME = 'testuser';
            process.env.SAP_PASSWORD = 'testpass';

            mockFs.existsSync.mockReturnValue(false);

            const registry = SystemRegistry.getInstance();
            registry.initialize();

            expect(registry.listSystems()).toHaveLength(1);
            expect(registry.getDefaultSystemId()).toBe('default');
            expect(registry.isMultiSystemMode()).toBe(false);

            const system = registry.getSystem('default');
            expect(system.url).toBe('https://sap.example.com:443');
            expect(system.client).toBe('100');
            expect(system.auth.type).toBe('basic');
            expect(system.auth.username).toBe('testuser');
        });

        test('should use SSO auth if SAP_COOKIE_PATH is set', () => {
            process.env.SAP_URL = 'https://sap.example.com:443';
            process.env.SAP_CLIENT = '100';
            process.env.SAP_COOKIE_PATH = './tmp/cookies.json';

            mockFs.existsSync.mockReturnValue(false);

            const registry = SystemRegistry.getInstance();
            registry.initialize();

            const system = registry.getSystem('default');
            expect(system.auth.type).toBe('sso');
            expect(system.auth.cookiePath).toBe('./tmp/cookies.json');
        });

        test('should throw error if SAP_URL not set', () => {
            process.env.SAP_CLIENT = '100';
            mockFs.existsSync.mockReturnValue(false);

            const registry = SystemRegistry.getInstance();
            expect(() => registry.initialize()).toThrow('SAP_URL and SAP_CLIENT must be set');
        });

        test('should throw error if SAP_CLIENT not set', () => {
            process.env.SAP_URL = 'https://sap.example.com:443';
            mockFs.existsSync.mockReturnValue(false);

            const registry = SystemRegistry.getInstance();
            expect(() => registry.initialize()).toThrow('SAP_URL and SAP_CLIENT must be set');
        });
    });

    describe('System Management', () => {
        beforeEach(() => {
            const configContent = JSON.stringify({
                version: '1.0',
                default: 'DEV',
                systems: {
                    DEV: {
                        name: 'Development',
                        url: 'https://dev.example.com:443',
                        client: '100',
                        auth: { type: 'basic', username: 'test', password: 'test' },
                    },
                    QAS: {
                        name: 'Quality',
                        url: 'https://qas.example.com:443',
                        client: '200',
                        auth: { type: 'basic', username: 'test', password: 'test' },
                    },
                },
            });

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(configContent);
        });

        test('should get system by ID', () => {
            const registry = SystemRegistry.getInstance();
            registry.initialize();

            const system = registry.getSystem('DEV');
            expect(system.id).toBe('DEV');
            expect(system.name).toBe('Development');
            expect(system.url).toBe('https://dev.example.com:443');
        });

        test('should throw error for non-existent system', () => {
            const registry = SystemRegistry.getInstance();
            registry.initialize();

            expect(() => registry.getSystem('INVALID')).toThrow('System "INVALID" not found');
        });

        test('should check if system exists', () => {
            const registry = SystemRegistry.getInstance();
            registry.initialize();

            expect(registry.hasSystem('DEV')).toBe(true);
            expect(registry.hasSystem('QAS')).toBe(true);
            expect(registry.hasSystem('INVALID')).toBe(false);
        });

        test('should set active system', () => {
            const registry = SystemRegistry.getInstance();
            registry.initialize();

            expect(registry.getActiveSystemId()).toBe('DEV');

            registry.setActiveSystem('QAS');
            expect(registry.getActiveSystemId()).toBe('QAS');
        });

        test('should throw error when setting non-existent active system', () => {
            const registry = SystemRegistry.getInstance();
            registry.initialize();

            expect(() => registry.setActiveSystem('INVALID')).toThrow('Cannot set active system: "INVALID" not found');
        });

        test('should resolve system from parameter', () => {
            const registry = SystemRegistry.getInstance();
            registry.initialize();

            const system1 = registry.resolveSystem('QAS');
            expect(system1.id).toBe('QAS');

            const system2 = registry.resolveSystem();
            expect(system2.id).toBe('DEV');
        });

        test('should get default system', () => {
            const registry = SystemRegistry.getInstance();
            registry.initialize();

            const system = registry.getDefaultSystem();
            expect(system.id).toBe('DEV');
        });

        test('should get active system', () => {
            const registry = SystemRegistry.getInstance();
            registry.initialize();

            registry.setActiveSystem('QAS');
            const system = registry.getActiveSystem();
            expect(system.id).toBe('QAS');
        });

        test('should list all systems', () => {
            const registry = SystemRegistry.getInstance();
            registry.initialize();

            const systems = registry.listSystems();
            expect(systems).toHaveLength(2);
            expect(systems.map((s) => s.id)).toContain('DEV');
            expect(systems.map((s) => s.id)).toContain('QAS');
        });
    });

    describe('Test Mode', () => {
        test('should initialize with mock system in test mode', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';

            mockFs.existsSync.mockReturnValue(false);

            const registry = SystemRegistry.getInstance();
            registry.initialize();

            expect(registry.listSystems()).toHaveLength(1);
            expect(registry.getDefaultSystemId()).toBe('test');

            const system = registry.getSystem('test');
            expect(system.name).toBe('Test System');
            expect(system.auth.type).toBe('basic');

            process.env.NODE_ENV = originalEnv;
        });
    });
});
