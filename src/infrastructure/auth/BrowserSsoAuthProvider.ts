import * as chromeLauncher from 'chrome-launcher';
import { AuthProvider } from './AuthProvider';
import { CookieStore } from './CookieStore';

const AUTH_TIMEOUT_MS = 300_000; // 5 minutes

/**
 * Browser-based SSO authentication provider for SAP ADT.
 * - Launches system Chrome via chrome-launcher + CDP
 * - Persists cookies to $TMPDIR/mcp-abap-adt/<domain>.json
 * - Auto-refreshes on 401 via refreshAuth()
 *
 * Reference: mcp-wiki/src/auth.ts
 */
export class BrowserSsoAuthProvider implements AuthProvider {
    private cookies: string = '';
    private chrome: chromeLauncher.LaunchedChrome | null = null;
    private readonly cookieStore: CookieStore;
    private authInProgress: Promise<void> | null = null;

    constructor(
        private readonly systemUrl: string,
        private readonly client: string,
        private readonly domain: string
    ) {
        this.cookieStore = new CookieStore(domain);
    }

    async getAuthHeaders(): Promise<Record<string, string>> {
        // 1. Concurrency guard — checked FIRST to prevent parallel Chrome launches
        if (this.authInProgress) {
            console.error('[BrowserSSO] Auth already in progress, waiting...');
            await this.authInProgress;
            return this.buildHeaders();
        }

        // 2. In-memory cookies
        if (this.cookies) {
            return this.buildHeaders();
        }

        // 3. Disk cache (CookieStore)
        const stored = await this.cookieStore.load();
        if (stored) {
            this.cookies = stored.cookies;
            return this.buildHeaders();
        }

        // 4. Launch Chrome for interactive login
        this.authInProgress = this.authenticate().finally(() => {
            this.authInProgress = null;
        });
        await this.authInProgress;

        return this.buildHeaders();
    }

    getSystemUrl(): string {
        return this.systemUrl;
    }

    getClient(): string {
        return this.client;
    }

    isAvailable(): boolean {
        return true;
    }

    getName(): string {
        return 'Browser SSO';
    }

    /**
     * Force re-authentication. Clears caches and launches Chrome.
     * Does NOT touch AuthProviderRegistry — the caller handles that.
     */
    async refreshAuth(): Promise<void> {
        if (this.authInProgress) {
            console.error('[BrowserSSO] Auth already in progress, waiting...');
            return this.authInProgress;
        }

        console.error('[BrowserSSO] Refreshing authentication...');
        await this.cookieStore.clear();
        this.cookies = '';

        this.authInProgress = this.authenticate().finally(() => {
            this.authInProgress = null;
        });

        return this.authInProgress;
    }

    private async authenticate(): Promise<void> {
        // Use Fiori Launchpad for better user experience (vs XML error page at /sap/bc/adt)
        const entryUrl = `${this.systemUrl}/sap/bc/ui2/flp?sap-client=${this.client}`;
        console.error(`[BrowserSSO] Opening browser for login at ${entryUrl}`);

        try {
            this.chrome = await chromeLauncher.launch({
                startingUrl: entryUrl,
                chromeFlags: ['--window-size=1280,800', '--disable-popup-blocking', '--no-first-run'],
            });

            console.error(`[BrowserSSO] Chrome launched on port ${this.chrome.port}`);
            console.error('[BrowserSSO] Please log in to your SAP system...');

            await new Promise((r) => setTimeout(r, 1000));

            const cdpUrl = `http://127.0.0.1:${this.chrome.port}/json`;
            let targets: Array<{ webSocketDebuggerUrl: string; url: string; type: string }> | undefined;

            for (let i = 0; i < 5; i++) {
                try {
                    const res = await fetch(cdpUrl);
                    targets = (await res.json()) as Array<{ webSocketDebuggerUrl: string; url: string; type: string }>;
                    break;
                } catch {
                    console.error(`[BrowserSSO] CDP connection attempt ${i + 1}/5...`);
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }

            if (!targets) {
                throw new Error('Could not connect to Chrome DevTools');
            }

            const page = targets.find((t) => t.type === 'page');
            if (!page?.webSocketDebuggerUrl) {
                throw new Error('Could not find browser page');
            }

            console.error(`[BrowserSSO] Connected to page: ${page.url}`);

            const ws = new WebSocket(page.webSocketDebuggerUrl);
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 10000);
                ws.onopen = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                ws.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('WebSocket connection failed'));
                };
            });

            let msgId = 1;
            const send = (method: string, params = {}): Promise<any> => {
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 10000);
                    const id = msgId++;
                    const handler = (event: MessageEvent) => {
                        const data = JSON.parse(event.data);
                        if (data.id === id) {
                            clearTimeout(timeout);
                            ws.removeEventListener('message', handler);
                            data.error ? reject(new Error(data.error.message)) : resolve(data.result);
                        }
                    };
                    ws.addEventListener('message', handler);
                    ws.send(JSON.stringify({ id, method, params }));
                });
            };

            await send('Network.enable');
            await this.waitForLogin(send);
            console.error('[BrowserSSO] Login detected, capturing cookies...');

            await new Promise((r) => setTimeout(r, 2000));

            const { cookies } = await send('Network.getAllCookies');
            const cookieStr = cookies
                .filter((c: { domain: string }) => c.domain.includes(this.domain) || c.domain.includes('.sap'))
                .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
                .join('; ');

            this.cookies = cookieStr;
            await this.cookieStore.save(cookieStr, this.domain);

            console.error(`[BrowserSSO] Captured ${cookies.length} cookies`);
            ws.close();
            await this.chrome.kill();
            this.chrome = null;
        } catch (err) {
            await this.cleanup();
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('No Chrome') || message.includes('ENOENT') || message.includes('spawn')) {
                throw new Error(
                    'Chrome/Chromium is required for browser-based SSO but was not found.\n' +
                        'Options:\n' +
                        '  - Install Chrome or Chromium\n' +
                        '  - Use Basic Auth (set SAP_USERNAME and SAP_PASSWORD in .env)\n' +
                        '  - Use external sap-auth-mcp-main to create cookie files'
                );
            }
            throw new Error(`Browser SSO authentication failed: ${message}`);
        }
    }

    private async waitForLogin(send: (method: string, params?: object) => Promise<any>): Promise<void> {
        const start = Date.now();

        while (Date.now() - start < AUTH_TIMEOUT_MS) {
            try {
                const { result } = await send('Runtime.evaluate', {
                    expression: 'window.location.href',
                });

                const url = result.value as string;
                console.error(`[BrowserSSO] Current URL: ${url?.substring(0, 80)}...`);

                if (
                    url &&
                    url.includes(this.domain) &&
                    !url.includes('login') &&
                    !url.includes('logout') &&
                    !url.includes('accounts.sap.com') &&
                    !url.includes('auth_redirect') &&
                    (url.includes('/sap/bc/') ||
                        url.includes('/sap/public/') ||
                        url.endsWith(this.domain + '/') ||
                        url.endsWith(this.domain))
                ) {
                    return;
                }
            } catch (e) {
                console.error(`[BrowserSSO] Poll error: ${e}`);
            }

            await new Promise((r) => setTimeout(r, 2000));
        }

        throw new Error('Login timeout — 5 minutes exceeded. Please try again.');
    }

    private async cleanup(): Promise<void> {
        if (this.chrome) {
            try {
                await this.chrome.kill();
            } catch {
                /* best effort */
            }
            this.chrome = null;
        }
    }

    private buildHeaders(): Record<string, string> {
        if (!this.cookies) {
            throw new Error('No SSO cookies available. Browser authentication required.');
        }
        return {
            Cookie: this.cookies,
            'X-SAP-Client': this.client,
        };
    }
}
