/**
 * Handler for SapBrowserLogin tool — triggers browser-based SSO authentication
 */

import { SystemRegistry } from '../infrastructure/system';
import { AuthProviderRegistry } from '../infrastructure/auth/AuthProviderRegistry';
import { BrowserSsoAuthProvider } from '../infrastructure/auth/BrowserSsoAuthProvider';
import { return_error } from '../lib/utils';

interface SapBrowserLoginArgs {
    systemId?: string;
}

export async function handleSapBrowserLogin(args: SapBrowserLoginArgs) {
    try {
        const registry = SystemRegistry.getInstance();
        const authRegistry = AuthProviderRegistry.getInstance();

        const system = registry.resolveSystem(args.systemId);
        const provider = authRegistry.getProvider(system);

        if (!(provider instanceof BrowserSsoAuthProvider)) {
            return {
                content: [
                    {
                        type: 'text',
                        text:
                            `System "${system.id}" uses ${provider.getName()}, not Browser SSO.\n` +
                            'Browser login is only available for systems configured with SSO authentication.\n' +
                            'To use Basic Auth, set username and password in .sap-systems.json or .env.',
                    },
                ],
                isError: true,
            };
        }

        console.error(`[SapBrowserLogin] Launching browser for system "${system.id}"...`);
        await provider.refreshAuth();

        // Clear stale CSRF/cookies in registry after re-auth
        authRegistry.setCsrfToken(system.id, '');
        authRegistry.setCookies(system.id, '');

        return {
            content: [
                {
                    type: 'text',
                    text:
                        `Successfully authenticated with system "${system.id}" (${system.name}).\n` +
                        `Auth method: ${provider.getName()}\n` +
                        'Cookies cached and ready for use. No server restart needed.',
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
