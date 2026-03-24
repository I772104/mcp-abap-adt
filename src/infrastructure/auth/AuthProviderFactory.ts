import { AuthProvider } from './AuthProvider';
import { BasicAuthProvider } from './BasicAuthProvider';
import { CookieAuthProvider } from './CookieAuthProvider';
import { BrowserSsoAuthProvider } from './BrowserSsoAuthProvider';
import { SystemConfig } from '../system/types';
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

    // Browser SSO fallback
    const domain = new URL(systemUrl).hostname;
    const ssoProvider = new BrowserSsoAuthProvider(systemUrl, client, domain);
    if (ssoProvider.isAvailable()) {
        console.error('[Auth] Using Browser SSO Authentication');
        return ssoProvider;
    }

    // No authentication available
    throw new Error(
        '🔒 No Authentication Method Available\n\n' +
            'Neither credentials, SSO cookies, nor Chrome/Chromium are available.\n' +
            'Options:\n' +
            '  - Install Chrome/Chromium for browser-based SSO\n' +
            '  - Set SAP_USERNAME and SAP_PASSWORD in .env for Basic Auth\n' +
            '  - Use sap-auth-mcp-main to create cookie files\n\n' +
            'Cookie locations checked:\n' +
            cookieLocations.map((p) => `  - ${p}`).join('\n')
    );
}

/**
 * Create auth provider from SystemConfig
 * Used by AuthProviderRegistry for multi-system support
 */
export function createAuthProviderFromConfig(config: SystemConfig): AuthProvider {
    if (config.auth.type === 'basic') {
        if (!config.auth.username || !config.auth.password) {
            throw new Error(`System "${config.id}": Basic auth configured but username or password is missing`);
        }
        console.error(`[Auth] System "${config.id}": Using Basic Authentication`);
        return new BasicAuthProvider(config.auth.username, config.auth.password, config.url, config.client);
    }

    // SSO cookie authentication
    const cookieLocations: string[] = [];

    // If cookiePath is explicitly configured, use only that
    if (config.auth.cookiePath) {
        cookieLocations.push(config.auth.cookiePath);
    } else {
        // Default locations
        cookieLocations.push(
            path.join(process.cwd(), 'tmp', 'sap_cookies.json'),
            path.join(process.env.HOME || process.env.USERPROFILE || '', '.sap', 'cookies', 'sap_cookies.json')
        );
    }

    for (const cookiePath of cookieLocations.filter(Boolean)) {
        if (fs.existsSync(cookiePath)) {
            console.error(`[Auth] System "${config.id}": Using SSO Authentication (cookies from ${cookiePath})`);
            const provider = new CookieAuthProvider(config.url, config.client, cookiePath);
            if (provider.isAvailable()) {
                return provider;
            }
        }
    }

    // Browser SSO fallback
    const domain = new URL(config.url).hostname;
    const ssoProvider = new BrowserSsoAuthProvider(config.url, config.client, domain);
    if (ssoProvider.isAvailable()) {
        console.error(`[Auth] System "${config.id}": Using Browser SSO Authentication`);
        return ssoProvider;
    }

    // No authentication available
    throw new Error(
        `🔒 No Authentication Method Available for System "${config.id}"\n\n` +
            `System: ${config.name} (${config.id})\n` +
            `URL: ${config.url}\n` +
            `Client: ${config.client}\n\n` +
            'Options:\n' +
            '  - Install Chrome/Chromium for browser-based SSO\n' +
            `  - Update .sap-systems.json with credentials for "${config.id}"\n` +
            '  - Use sap-auth-mcp-main to create cookie files\n' +
            '  - Then restart MCP server: /mcp\n\n' +
            'Cookie locations checked:\n' +
            cookieLocations.map((p) => `  - ${p}`).join('\n')
    );
}
