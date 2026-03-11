/**
 * Handler for SetDefaultSystem tool - changes the active system at runtime
 */

import { SystemRegistry } from '../infrastructure/system';
import { return_error } from '../lib/utils';

export async function handleSetDefaultSystem(args: { system_id: string }) {
    try {
        const { system_id } = args;

        if (!system_id || typeof system_id !== 'string') {
            throw new Error('system_id parameter is required and must be a string');
        }

        // Validate format (alphanumeric, underscore, max 32 chars)
        if (!/^[A-Z0-9_]{1,32}$/i.test(system_id)) {
            throw new Error(
                'system_id must be alphanumeric (A-Z, 0-9, _) and max 32 characters. ' + `Received: "${system_id}"`
            );
        }

        const registry = SystemRegistry.getInstance();

        // Validate system exists
        if (!registry.hasSystem(system_id)) {
            const availableSystems = registry.listSystems().map((s) => s.id);
            throw new Error(
                `System "${system_id}" not found.\n\nAvailable systems: ${availableSystems.join(', ')}\n\nTo configure new systems, edit .sap-systems.json and restart the MCP server.`
            );
        }

        const previousSystem = registry.getActiveSystemId();
        registry.setActiveSystem(system_id);

        // Audit log for system switches
        console.log(
            JSON.stringify({
                event: 'system_switch',
                timestamp: new Date().toISOString(),
                from: previousSystem,
                to: system_id,
                user: process.env.USER || process.env.USERNAME || 'unknown',
            })
        );

        const system = registry.getSystem(system_id);

        return {
            content: [
                {
                    type: 'text',
                    text:
                        `Active system changed successfully!\n\n` +
                        `Previous: ${previousSystem}\n` +
                        `Current: ${system_id}\n\n` +
                        `System Details:\n` +
                        `  Name: ${system.name}\n` +
                        `  URL: ${system.url}\n` +
                        `  Client: ${system.client}\n` +
                        `  Auth: ${system.auth.type === 'basic' ? 'Basic Authentication' : 'SSO (Cookie-based)'}\n\n` +
                        `All subsequent operations will use this system unless explicitly overridden with the "system" parameter.\n\n` +
                        `Note: This change is temporary and only applies to the current session. ` +
                        `To permanently change the default system, edit the "default" field in .sap-systems.json.`,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
