/**
 * Unit Tests for handleListSystems
 *
 * Tests the ListSystems tool handler which displays all configured SAP systems.
 */

import { handleListSystems } from '../../../../src/handlers/handleListSystems';
import * as SystemRegistryModule from '../../../../src/infrastructure/system/SystemRegistry';

// Mock SystemRegistry
jest.mock('../../../../src/infrastructure/system/SystemRegistry');

describe('handleListSystems', () => {
    let mockGetInstance: jest.Mock;
    let mockRegistry: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock registry with all necessary methods
        mockRegistry = {
            listSystems: jest.fn(),
            getDefaultSystemId: jest.fn(),
            getActiveSystemId: jest.fn(),
        };

        // Mock getInstance to return our mock registry
        mockGetInstance = jest.fn().mockReturnValue(mockRegistry);
        (SystemRegistryModule.SystemRegistry as any).getInstance = mockGetInstance;
    });

    test('should display message when no systems configured', async () => {
        mockRegistry.listSystems.mockReturnValue([]);

        const result = await handleListSystems();

        expect(result.content[0].text).toContain('No systems configured');
        expect(result.content[0].text).toContain('single-system mode');
    });

    test('should display all configured systems', async () => {
        mockRegistry.listSystems.mockReturnValue([
            {
                id: 'DEV',
                name: 'Development System',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'basic', username: 'testuser', password: 'testpass' },
            },
            {
                id: 'QAS',
                name: 'Quality System',
                url: 'https://qas.example.com:443',
                client: '200',
                auth: { type: 'sso', cookiePath: './tmp/qas_cookies.json' },
            },
        ]);
        mockRegistry.getDefaultSystemId.mockReturnValue('DEV');
        mockRegistry.getActiveSystemId.mockReturnValue('DEV');

        const result = await handleListSystems();

        expect(result.content[0].text).toContain('System: DEV');
        expect(result.content[0].text).toContain('[DEFAULT]');
        expect(result.content[0].text).toContain('Development System');
        expect(result.content[0].text).toContain('https://dev.example.com:443');
        expect(result.content[0].text).toContain('Client: 100');
        expect(result.content[0].text).toContain('Basic Authentication');
        expect(result.content[0].text).toContain('Username: testuser');

        expect(result.content[0].text).toContain('System: QAS');
        expect(result.content[0].text).toContain('Quality System');
        expect(result.content[0].text).toContain('SSO (Cookie-based)');
        expect(result.content[0].text).toContain('./tmp/qas_cookies.json');

        expect(result.content[0].text).toContain('Total systems: 2');
    });

    test('should show ACTIVE marker when different from default', async () => {
        mockRegistry.listSystems.mockReturnValue([
            {
                id: 'DEV',
                name: 'Development',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'basic', username: 'test', password: 'test' },
            },
            {
                id: 'QAS',
                name: 'Quality',
                url: 'https://qas.example.com:443',
                client: '200',
                auth: { type: 'basic', username: 'test', password: 'test' },
            },
        ]);
        mockRegistry.getDefaultSystemId.mockReturnValue('DEV');
        mockRegistry.getActiveSystemId.mockReturnValue('QAS'); // Different from default

        const result = await handleListSystems();

        expect(result.content[0].text).toContain('System: DEV [DEFAULT]');
        expect(result.content[0].text).toContain('System: QAS [ACTIVE]');
    });

    test('should provide usage instructions', async () => {
        mockRegistry.listSystems.mockReturnValue([
            {
                id: 'DEV',
                name: 'Development',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'basic', username: 'test', password: 'test' },
            },
        ]);
        mockRegistry.getDefaultSystemId.mockReturnValue('DEV');
        mockRegistry.getActiveSystemId.mockReturnValue('DEV');

        const result = await handleListSystems();

        expect(result.content[0].text).toContain('SetDefaultSystem');
        expect(result.content[0].text).toContain('system" parameter');
    });

    test('should handle errors gracefully', async () => {
        mockRegistry.listSystems.mockImplementation(() => {
            throw new Error('Registry error');
        });

        const result = await handleListSystems();

        expect('isError' in result && result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error');
    });
});
