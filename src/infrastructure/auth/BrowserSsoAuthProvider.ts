import { AuthProvider } from './AuthProvider';
import { CookieStore } from './CookieStore';
import axios from 'axios';

/**
 * Chrome DevTools Protocol Network.Cookie type
 */
interface CDPCookie {
    name: string;
    value: string;
    domain: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
    expires?: number;
}

/**
 * Browser-based SSO authentication provider
 * Launches Chrome/Chromium, waits for user to complete SSO flow, harvests cookies
 */
export class BrowserSsoAuthProvider implements AuthProvider {
    private cookieStore: CookieStore;
    private inMemoryCookies: string | null = null;
    private authInProgress: Promise<void> | null = null;

    constructor(
        private readonly systemUrl: string,
        private readonly client: string,
        private readonly domain: string
    ) {
        this.cookieStore = new CookieStore(domain);
    }

    /**
     * Check if Chrome/Chromium is available
     */
    isAvailable(): boolean {
        try {
            // Dynamic import to avoid loading chrome-launcher in test environments
            const chromeLauncher = require('chrome-launcher');
            const installations = chromeLauncher.Launcher.getInstallations();
            return installations.length > 0;
        } catch {
            return false;
        }
    }

    getName(): string {
        return 'Browser SSO';
    }

    getSystemUrl(): string {
        return this.systemUrl;
    }

    getClient(): string {
        return this.client;
    }

    /**
     * Get the path to the cookie cache file
     */
    getCookieCachePath(): string {
        return this.cookieStore.getPath();
    }

    /**
     * Get authentication headers
     * Priority: auth in progress > in-memory > disk cache > launch browser
     */
    async getAuthHeaders(): Promise<Record<string, string>> {
        // 1. If in-memory cookies exist, use them immediately
        if (this.inMemoryCookies) {
            return this.buildHeaders(this.inMemoryCookies);
        }

        // 2. Try loading from disk cache
        const cached = await this.cookieStore.load();
        if (cached) {
            this.inMemoryCookies = cached.cookies;
            return this.buildHeaders(this.inMemoryCookies);
        }

        // 3. If auth already in progress, wait for it
        if (this.authInProgress) {
            console.error('[BrowserSSO] Auth in progress, waiting...');
            await this.authInProgress;
            if (this.inMemoryCookies) {
                return this.buildHeaders(this.inMemoryCookies);
            }
        }

        // 4. Launch browser and get cookies
        await this.performBrowserAuth();
        if (!this.inMemoryCookies) {
            throw new Error('Failed to obtain cookies from browser authentication');
        }

        return this.buildHeaders(this.inMemoryCookies);
    }

    /**
     * Force re-authentication (clear cache and launch browser)
     */
    async refreshAuth(): Promise<void> {
        console.error('[BrowserSSO] Refreshing authentication...');

        // Clear disk cache
        await this.cookieStore.clear();

        // Clear in-memory cookies
        this.inMemoryCookies = null;

        // Note: CSRF token and registry cookies are cleared by the caller (utils.ts)
        // We don't clear them here to avoid circular dependency

        // Launch browser for fresh login
        await this.performBrowserAuth();
    }

    /**
     * Perform browser-based authentication flow
     */
    private async performBrowserAuth(): Promise<void> {
        // Set auth in progress to prevent concurrent launches
        if (this.authInProgress) {
            await this.authInProgress;
            return;
        }

        this.authInProgress = (async () => {
            // Dynamic import to avoid loading in test environments
            const chromeLauncher = require('chrome-launcher');
            let chrome: any | null = null;

            try {
                console.error('[BrowserSSO] Launching Chrome for SSO authentication...');
                console.error(`[BrowserSSO] Target: ${this.systemUrl}`);

                // Build user-friendly landing URL (Fiori launchpad or portal home)
                // Try Fiori launchpad first, fallback to portal home
                const loginUrl = `${this.systemUrl}/sap/bc/ui2/flp?sap-client=${this.client}`;

                // Launch Chrome with visible window
                chrome = await chromeLauncher.launch({
                    startingUrl: loginUrl,
                    chromeFlags: [
                        '--window-size=1280,800',
                        '--disable-popup-blocking',
                        '--no-first-run',
                        '--disable-blink-features=AutomationControlled',
                    ],
                });

                console.error(`[BrowserSSO] Chrome launched on port ${chrome.port}`);

                // Connect to Chrome DevTools Protocol
                const wsUrl = await this.getCdpWebSocketUrl(chrome.port);
                console.error(`[BrowserSSO] Connected to CDP: ${wsUrl}`);

                // Wait for user to complete login
                await this.waitForLogin(chrome.port, wsUrl);

                // Harvest cookies
                const cookies = await this.harvestCookies(wsUrl);
                this.inMemoryCookies = cookies;

                // Persist to disk
                await this.cookieStore.save(cookies);

                console.error('[BrowserSSO] Authentication completed successfully');
            } catch (error) {
                console.error('[BrowserSSO] Authentication failed:', error);
                throw error;
            } finally {
                // Cleanup Chrome
                if (chrome) {
                    try {
                        await chrome.kill();
                        console.error('[BrowserSSO] Chrome closed');
                    } catch (killError) {
                        console.error('[BrowserSSO] Failed to close Chrome:', killError);
                    }
                }
                this.authInProgress = null;
            }
        })();

        await this.authInProgress;
    }

    /**
     * Get Chrome DevTools Protocol WebSocket URL
     */
    private async getCdpWebSocketUrl(port: number): Promise<string> {
        const maxRetries = 5;
        const retryDelay = 1000; // 1 second

        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await axios.get(`http://127.0.0.1:${port}/json`, {
                    timeout: 5000,
                });

                if (response.data && response.data[0]?.webSocketDebuggerUrl) {
                    return response.data[0].webSocketDebuggerUrl;
                }
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw new Error(`Failed to connect to Chrome DevTools Protocol after ${maxRetries} attempts`);
                }
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
        }

        throw new Error('Failed to get Chrome DevTools Protocol WebSocket URL');
    }

    /**
     * Wait for user to complete login
     */
    private async waitForLogin(port: number, wsUrl: string): Promise<void> {
        const WebSocket = await import('ws').then((m) => m.default);
        const ws = new WebSocket(wsUrl);

        return new Promise((resolve, reject) => {
            const timeout = 5 * 60 * 1000; // 5 minutes
            const pollInterval = 2000; // 2 seconds
            let pollTimer: NodeJS.Timeout | null = null;
            let timeoutTimer: NodeJS.Timeout | null = null;
            let messageId = 1;

            const cleanup = () => {
                if (pollTimer) clearInterval(pollTimer);
                if (timeoutTimer) clearTimeout(timeoutTimer);
                ws.close();
            };

            ws.on('open', () => {
                console.error('[BrowserSSO] WebSocket connected, enabling Network domain...');

                // Enable Network domain for cookie access
                ws.send(
                    JSON.stringify({
                        id: messageId++,
                        method: 'Network.enable',
                    })
                );

                console.error('[BrowserSSO] Waiting for user to complete login...');
                console.error('[BrowserSSO] Please log in to the SAP system in the opened browser window.');

                // Poll for login completion
                pollTimer = setInterval(() => {
                    ws.send(
                        JSON.stringify({
                            id: messageId++,
                            method: 'Runtime.evaluate',
                            params: {
                                expression: 'window.location.href',
                            },
                        })
                    );
                }, pollInterval);

                // Set timeout
                timeoutTimer = setTimeout(() => {
                    cleanup();
                    reject(
                        new Error(
                            'Login timeout (5 minutes). Please ensure you complete the login process in the browser window.'
                        )
                    );
                }, timeout);
            });

            ws.on('message', (data: Buffer) => {
                try {
                    const message = JSON.parse(data.toString());

                    // Check if this is a Runtime.evaluate response
                    if (message.result?.result?.value) {
                        const currentUrl = message.result.result.value;

                        // Check if login is complete
                        if (this.isLoginComplete(currentUrl)) {
                            console.error(`[BrowserSSO] Login detected: ${currentUrl}`);
                            cleanup();
                            // Wait 2s for final redirects before harvesting cookies
                            setTimeout(() => resolve(), 2000);
                        }
                    }
                } catch (error) {
                    console.error('[BrowserSSO] Error processing WebSocket message:', error);
                }
            });

            ws.on('error', (error) => {
                cleanup();
                reject(new Error(`WebSocket error: ${error.message}`));
            });

            ws.on('close', () => {
                cleanup();
            });
        });
    }

    /**
     * Check if login is complete based on URL
     */
    private isLoginComplete(url: string): boolean {
        const urlLower = url.toLowerCase();

        // Must contain the SAP system domain
        if (!urlLower.includes(this.domain.toLowerCase())) {
            return false;
        }

        // Must NOT contain login/logout/auth redirect pages
        const excludePatterns = ['login', 'logout', 'accounts.sap.com', 'auth_redirect'];
        if (excludePatterns.some((pattern) => urlLower.includes(pattern))) {
            return false;
        }

        // Must contain SAP-specific patterns or be at domain root
        const sapPatterns = ['/sap/bc/', '/sap/public/'];
        const isDomainRoot = url.match(/^https?:\/\/[^/]+\/?$/);

        return sapPatterns.some((pattern) => urlLower.includes(pattern)) || !!isDomainRoot;
    }

    /**
     * Harvest cookies from Chrome via CDP
     */
    private async harvestCookies(wsUrl: string): Promise<string> {
        const WebSocket = await import('ws').then((m) => m.default);
        const ws = new WebSocket(wsUrl);

        return new Promise((resolve, reject) => {
            let messageId = 1;

            ws.on('open', () => {
                console.error('[BrowserSSO] Harvesting cookies...');
                ws.send(
                    JSON.stringify({
                        id: messageId++,
                        method: 'Network.getAllCookies',
                    })
                );
            });

            ws.on('message', (data: Buffer) => {
                try {
                    const message = JSON.parse(data.toString());

                    if (message.result?.cookies) {
                        const allCookies: CDPCookie[] = message.result.cookies;

                        // Filter cookies: keep those from SAP system domain or .sap domains
                        const sapCookies = allCookies.filter((cookie) => {
                            const cookieDomain = cookie.domain.toLowerCase();
                            const targetDomain = this.domain.toLowerCase();
                            return cookieDomain.includes(targetDomain) || cookieDomain.includes('.sap');
                        });

                        if (sapCookies.length === 0) {
                            ws.close();
                            reject(new Error('No SAP cookies found after login'));
                            return;
                        }

                        // Join as cookie string
                        const cookieString = sapCookies.map((c) => `${c.name}=${c.value}`).join('; ');

                        console.error(`[BrowserSSO] Harvested ${sapCookies.length} cookies`);
                        ws.close();
                        resolve(cookieString);
                    }
                } catch (error) {
                    ws.close();
                    reject(new Error(`Failed to parse CDP message: ${error}`));
                }
            });

            ws.on('error', (error) => {
                reject(new Error(`WebSocket error during cookie harvest: ${error.message}`));
            });
        });
    }

    /**
     * Build auth headers from cookies
     */
    private buildHeaders(cookies: string): Record<string, string> {
        return {
            Cookie: cookies,
            'X-SAP-Client': this.client,
        };
    }
}
