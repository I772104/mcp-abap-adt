/**
 * Handler for ListSystems tool - lists all configured SAP systems
 */

import { SystemRegistry } from '../infrastructure/system';
import { return_error } from '../lib/utils';

export async function handleListSystems() {
    try {
        const registry = SystemRegistry.getInstance();
        const systems = registry.listSystems();

        if (systems.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No systems configured. Server is running in single-system mode using .env configuration.',
                    },
                ],
            };
        }

        const defaultSystemId = registry.getDefaultSystemId();
        const activeSystemId = registry.getActiveSystemId();

        // Build a formatted table of systems
        const lines: string[] = [];
        lines.push('Configured SAP Systems');
        lines.push('=====================\n');

        for (const system of systems) {
            const isDefault = system.id === defaultSystemId;
            const isActive = system.id === activeSystemId;

            const markers: string[] = [];
            if (isDefault) markers.push('DEFAULT');
            if (isActive && !isDefault) markers.push('ACTIVE');

            const markerStr = markers.length > 0 ? ` [${markers.join(', ')}]` : '';

            lines.push(`System: ${system.id}${markerStr}`);
            lines.push(`  Name: ${system.name}`);
            lines.push(`  URL: ${system.url}`);
            lines.push(`  Client: ${system.client}`);
            lines.push(`  Auth: ${system.auth.type === 'basic' ? 'Basic Authentication' : 'SSO (Cookie-based)'}`);

            if (system.auth.type === 'basic') {
                lines.push(`  Username: ${system.auth.username || 'Not configured'}`);
            } else if (system.auth.cookiePath) {
                lines.push(`  Cookie Path: ${system.auth.cookiePath}`);
            }

            lines.push('');
        }

        lines.push(`\nTotal systems: ${systems.length}`);
        lines.push(`Default system: ${defaultSystemId}`);
        if (activeSystemId !== defaultSystemId) {
            lines.push(`Active system: ${activeSystemId} (changed at runtime)`);
        }

        lines.push('\nTo switch to a different system, use SetDefaultSystem tool.');
        lines.push('To specify a system for a specific operation, use the "system" parameter on any tool.');

        return {
            content: [
                {
                    type: 'text',
                    text: lines.join('\n'),
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
