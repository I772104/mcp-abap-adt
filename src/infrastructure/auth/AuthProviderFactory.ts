import { AuthProvider } from './AuthProvider';
import { BasicAuthProvider } from './BasicAuthProvider';
import { CookieAuthProvider } from './CookieAuthProvider';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Factory function to create the appropriate auth provider
 * Priority: Basic Auth (credentials) > SSO Cookies
 *
 * This matches real-world SAP usage where:
 * - Basic auth is used when credentials are available (development, testing)
 * - SSO cookies are used when credentials are not available (production, corporate systems)
 */
export function createAuthProvider(
    systemUrl: string,
    client: string,
    username?: string,
    password?: string
): AuthProvider {
    // Try Basic Auth first if credentials are provided
    if (username && password) {
        console.error('[Auth] Using Basic Authentication (credentials)');
        return new BasicAuthProvider(username, password, systemUrl, client);
    }

    // Fall back to SSO cookies
    const cookieLocations = [
        // Location where sap-auth-mcp-main stores cookies by default
        path.join(process.cwd(), 'tmp', 'sap_cookies.json'),
        // Alternative location in user home directory
        path.join(process.env.HOME || process.env.USERPROFILE || '', '.sap', 'cookies', 'sap_cookies.json'),
        // Custom location from environment variable
        process.env.AUTH_COOKIE_PATH ? path.join(process.env.AUTH_COOKIE_PATH, 'sap_cookies.json') : '',
    ].filter(Boolean);

    for (const cookiePath of cookieLocations) {
        if (fs.existsSync(cookiePath)) {
            console.error(`[Auth] Using SSO Authentication (cookies from ${cookiePath})`);
            const provider = new CookieAuthProvider(systemUrl, client, cookiePath);
            if (provider.isAvailable()) {
                return provider;
            }
        }
    }

    // No authentication available
    throw new Error(
        '🔒 No Authentication Method Available\n\n' +
            'Neither basic auth credentials nor SSO cookies are configured.\n' +
            'Please authenticate using SSO:\n\n' +
            'SSO Authentication (Recommended):\n' +
            '  1. Use sap-auth-mcp-main MCP server\n' +
            '  2. Call sap_authenticate tool with:\n' +
            `     entry_url: ${systemUrl}/sap/bc/adt?sap-client=${client}\n` +
            '     store_path: tmp\n' +
            '  3. Restart MCP server: /mcp\n\n' +
            'Alternative - Basic Authentication (for dev/test):\n' +
            '  Set SAP_USERNAME and SAP_PASSWORD in .env file\n' +
            // '  Then restart MCP server: /mcp\n\n' +
            'Cookie locations checked:\n' +
            cookieLocations.map((p) => `  - ${p}`).join('\n')
    );
}
