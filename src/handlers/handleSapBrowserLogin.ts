import { return_error } from '../lib/utils';
import { SystemRegistry } from '../infrastructure/system';
import { AuthProviderRegistry } from '../infrastructure/auth/AuthProviderRegistry';
import { BrowserSsoAuthProvider } from '../infrastructure/auth/BrowserSsoAuthProvider';

/**
 * Handler for SapBrowserLogin tool
 * Forces browser-based SSO authentication for a system
 */
export async function handleSapBrowserLogin(args: Record<string, unknown>) {
    try {
        const systemId = args.systemId as string | undefined;

        // Resolve system config
        const registry = SystemRegistry.getInstance();
        const system = registry.resolveSystem(systemId);

        // Get or create auth provider
        const authRegistry = AuthProviderRegistry.getInstance();
        const provider = authRegistry.getProvider(system);

        // Check if provider is BrowserSsoAuthProvider
        if (!(provider instanceof BrowserSsoAuthProvider)) {
            return {
                content: [
                    {
                        type: 'text',
                        text:
                            '❌ Browser SSO Login Not Available\n\n' +
                            `System "${system.id}" is configured to use ${provider.getName()}.\n` +
                            'Browser SSO authentication is only available for SSO-configured systems.\n\n' +
                            'Current configuration:\n' +
                            `  System: ${system.name}\n` +
                            `  Auth Method: ${provider.getName()}\n\n` +
                            'To use browser SSO, configure the system with auth.type: "sso" in .sap-systems.json.',
                    },
                ],
            };
        }

        // Check if Chrome is available
        if (!provider.isAvailable()) {
            return {
                content: [
                    {
                        type: 'text',
                        text:
                            '❌ Chrome/Chromium Not Found\n\n' +
                            'Browser SSO requires Chrome or Chromium to be installed.\n\n' +
                            'Please install Chrome:\n' +
                            '  - macOS: brew install --cask google-chrome\n' +
                            '  - Linux: apt install google-chrome-stable\n' +
                            '  - Windows: Download from https://www.google.com/chrome\n\n' +
                            'Alternative: Use Basic Authentication by adding credentials to .sap-systems.json.',
                    },
                ],
            };
        }

        // Perform browser authentication
        console.error(`[SapBrowserLogin] Initiating browser SSO for system "${system.id}"...`);

        // Clear CSRF token and session cookies from registry
        authRegistry.setCsrfToken(system.id, '');
        authRegistry.setCookies(system.id, '');

        // Trigger browser auth via refreshAuth
        await provider.refreshAuth();

        // Return success
        const output =
            '✅ Browser SSO Authentication Successful\n\n' +
            `System: ${system.name} (${system.id})\n` +
            `URL: ${system.url}\n` +
            `Client: ${system.client}\n` +
            `Auth Method: ${provider.getName()}\n` +
            `Cookie Cache: ${(provider as any).cookieStore.getPath()}\n\n` +
            'Authentication cookies have been saved and will be valid for 12 hours.\n' +
            'The browser window has been closed.';

        return {
            content: [
                {
                    type: 'text',
                    text: output,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
