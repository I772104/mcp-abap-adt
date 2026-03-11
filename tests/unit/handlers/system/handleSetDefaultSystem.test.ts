/**
 * Unit Tests for handleSetDefaultSystem
 *
 * Tests the SetDefaultSystem tool handler which changes the active system.
 */

import { handleSetDefaultSystem } from '../../../../src/handlers/handleSetDefaultSystem';
import * as SystemRegistryModule from '../../../../src/infrastructure/system/SystemRegistry';

// Mock SystemRegistry
jest.mock('../../../../src/infrastructure/system/SystemRegistry');

describe('handleSetDefaultSystem', () => {
    let mockGetInstance: jest.Mock;
    let mockRegistry: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock registry with all necessary methods
        mockRegistry = {
            hasSystem: jest.fn(),
            listSystems: jest.fn(),
            getActiveSystemId: jest.fn(),
            getSystem: jest.fn(),
            setActiveSystem: jest.fn(),
        };

        // Mock getInstance to return our mock registry
        mockGetInstance = jest.fn().mockReturnValue(mockRegistry);
        (SystemRegistryModule.SystemRegistry as any).getInstance = mockGetInstance;
    });

    test('should reject missing system_id', async () => {
        const result = await handleSetDefaultSystem({} as any);

        expect('isError' in result && result.isError).toBe(true);
        expect(result.content[0].text).toContain('system_id parameter is required');
    });

    test('should reject invalid system_id format', async () => {
        const result = await handleSetDefaultSystem({ system_id: 'invalid-system!' });

        expect('isError' in result && result.isError).toBe(true);
        expect(result.content[0].text).toContain('must be alphanumeric');
    });

    test('should reject system_id that is too long', async () => {
        const result = await handleSetDefaultSystem({ system_id: 'A'.repeat(33) });

        expect('isError' in result && result.isError).toBe(true);
        expect(result.content[0].text).toContain('max 32 characters');
    });

    test('should reject non-existent system', async () => {
        mockRegistry.hasSystem.mockReturnValue(false);
        mockRegistry.listSystems.mockReturnValue([
            {
                id: 'DEV',
                name: 'Development',
                url: 'https://dev.example.com:443',
                client: '100',
                auth: { type: 'basic', username: 'test', password: 'test' },
            },
        ]);

        const result = await handleSetDefaultSystem({ system_id: 'INVALID' });

        expect('isError' in result && result.isError).toBe(true);
        expect(result.content[0].text).toContain('System "INVALID" not found');
        expect(result.content[0].text).toContain('Available systems: DEV');
    });

    test('should switch to valid system', async () => {
        mockRegistry.hasSystem.mockReturnValue(true);
        mockRegistry.getActiveSystemId.mockReturnValue('DEV');
        mockRegistry.getSystem.mockReturnValue({
            id: 'QAS',
            name: 'Quality System',
            url: 'https://qas.example.com:443',
            client: '200',
            auth: { type: 'basic', username: 'test', password: 'test' },
        });

        const result = await handleSetDefaultSystem({ system_id: 'QAS' });

        expect(mockRegistry.setActiveSystem).toHaveBeenCalledWith('QAS');
        expect(result.content[0].text).toContain('Active system changed successfully');
        expect(result.content[0].text).toContain('Previous: DEV');
        expect(result.content[0].text).toContain('Current: QAS');
        expect(result.content[0].text).toContain('Quality System');
        expect(result.content[0].text).toContain('https://qas.example.com:443');
    });

    test('should indicate SSO authentication in output', async () => {
        mockRegistry.hasSystem.mockReturnValue(true);
        mockRegistry.getActiveSystemId.mockReturnValue('DEV');
        mockRegistry.getSystem.mockReturnValue({
            id: 'QAS',
            name: 'Quality System',
            url: 'https://qas.example.com:443',
            client: '200',
            auth: { type: 'sso', cookiePath: './tmp/cookies.json' },
        });

        const result = await handleSetDefaultSystem({ system_id: 'QAS' });

        expect(result.content[0].text).toContain('SSO (Cookie-based)');
    });

    test('should provide guidance about temporary nature', async () => {
        mockRegistry.hasSystem.mockReturnValue(true);
        mockRegistry.getActiveSystemId.mockReturnValue('DEV');
        mockRegistry.getSystem.mockReturnValue({
            id: 'QAS',
            name: 'Quality',
            url: 'https://qas.example.com:443',
            client: '200',
            auth: { type: 'basic', username: 'test', password: 'test' },
        });

        const result = await handleSetDefaultSystem({ system_id: 'QAS' });

        expect(result.content[0].text).toContain('temporary');
        expect(result.content[0].text).toContain('current session');
        expect(result.content[0].text).toContain('.sap-systems.json');
    });

    test('should handle errors gracefully', async () => {
        mockRegistry.hasSystem.mockReturnValue(true);
        mockRegistry.setActiveSystem.mockImplementation(() => {
            throw new Error('Registry error');
        });

        const result = await handleSetDefaultSystem({ system_id: 'QAS' });

        expect('isError' in result && result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error');
    });
});
