import { return_response, return_error } from '../lib/utils';
import { getConfig } from '../index';
import { getAuthProviderInstance } from '../lib/utils';
import { SystemRegistry } from '../infrastructure/system';
import { AuthProviderRegistry } from '../infrastructure/auth/AuthProviderRegistry';

/**
 * Get current SAP system connection information
 * Returns system URL, client, authentication method, and connection status
 * Supports both single-system and multi-system modes
 */
export async function handleGetSystemInfo(_args: Record<string, unknown>) {
    try {
        // Check if multi-system mode is enabled
        const registry = SystemRegistry.getInstance();
        const isMultiSystem = registry.listSystems().length > 0;

        if (isMultiSystem) {
            return handleMultiSystemInfo(registry);
        } else {
            return handleSingleSystemInfo();
        }
    } catch (error) {
        return return_error(error);
    }
}

/**
 * Handle system info for multi-system mode
 */
function handleMultiSystemInfo(registry: SystemRegistry) {
    const authRegistry = AuthProviderRegistry.getInstance();
    const activeSystem = registry.getActiveSystem();
    const defaultSystemId = registry.getDefaultSystemId();
    const totalSystems = registry.listSystems().length;
    const provider = authRegistry.getProvider(activeSystem);

    const output = `
╔══════════════════════════════════════════════════════════════╗
║         SAP System Connection Information                    ║
║              (Multi-System Mode)                             ║
╚══════════════════════════════════════════════════════════════╝

📊 Multi-System Configuration:
   Total Systems:     ${totalSystems}
   Default System:    ${defaultSystemId}
   Active System:     ${activeSystem.id}${activeSystem.id !== defaultSystemId ? ' (runtime override)' : ''}

🎯 Current Active System: ${activeSystem.id}
   Name:              ${activeSystem.name}
   URL:               ${activeSystem.url}
   Client:            ${activeSystem.client}
   Auth Method:       ${provider.getName()}
   Authenticated:     ${provider.isAvailable() ? 'Yes ✓' : 'No ✗'}

═══════════════════════════════════════════════════════════════

${getAuthMethodDetails(provider.getName())}

💡 Multi-System Commands:
   • ListSystems - View all configured systems
   • SetDefaultSystem - Change the active system
   • Use "system" parameter on any tool to target a specific system

📄 Configuration: .sap-systems.json
`.trim();

    return return_response({
        data: output,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
    });
}

/**
 * Handle system info for single-system mode (legacy)
 */
function handleSingleSystemInfo() {
    // Get configuration
    const config = getConfig();
    const provider = getAuthProviderInstance();

    // Build system information response
    const systemInfo = {
        systemUrl: provider.getSystemUrl(),
        client: provider.getClient(),
        authenticationMethod: provider.getName(),
        isAuthenticated: provider.isAvailable(),
        fullUrl: config.url,
    };

    // Format output as readable text
    const output = `
╔══════════════════════════════════════════════════════════════╗
║         SAP System Connection Information                    ║
╚══════════════════════════════════════════════════════════════╝

🌐 System URL:        ${systemInfo.systemUrl}
🏢 Client:            ${systemInfo.client}
🔐 Auth Method:       ${systemInfo.authenticationMethod}
✓ Authenticated:      ${systemInfo.isAuthenticated ? 'Yes' : 'No'}
🔗 Full ADT URL:      ${systemInfo.fullUrl}

═══════════════════════════════════════════════════════════════

${getAuthMethodDetails(systemInfo.authenticationMethod)}

💡 Multi-System Support:
   To work with multiple SAP systems, create a .sap-systems.json file
   and restart the MCP server. See documentation for configuration format.
`.trim();

    return return_response({
        data: output,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
    });
}

function getAuthMethodDetails(authMethod: string): string {
    if (authMethod.includes('Basic Auth')) {
        return `📋 Authentication Details:
   Using Basic Authentication with credentials from .env file
   - Username and password are being used for authentication
   - This is suitable for development and testing environments`;
    } else if (authMethod.includes('SSO') || authMethod.includes('Cookie')) {
        return `📋 Authentication Details:
   Using Single Sign-On (SSO) with session cookies
   - Cookies loaded from sap_cookies.json file
   - This is the recommended method for production systems
   - Cookies may expire and require re-authentication`;
    } else {
        return `📋 Authentication Details:
   Authentication method: ${authMethod}`;
    }
}
