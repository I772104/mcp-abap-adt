import { return_response, return_error } from '../lib/utils';
import { getConfig } from '../index';
import { getAuthProviderInstance } from '../lib/utils';

/**
 * Get current SAP system connection information
 * Returns system URL, client, authentication method, and connection status
 */
export async function handleGetSystemInfo(_args: Record<string, unknown>) {
    try {
        // Get configuration
        const config = getConfig();
        const provider = getAuthProviderInstance();

        // Build system information response
        const systemInfo = {
            systemUrl: provider.getSystemUrl(),
            client: provider.getClient(),
            authenticationMethod: provider.getName(),
            isAuthenticated: provider.isAvailable(),
            fullUrl: config.url
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
`.trim();

        return return_response({
            data: output,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any
        });
    } catch (error) {
        return return_error(error);
    }
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
