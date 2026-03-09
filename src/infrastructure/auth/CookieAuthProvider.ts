import { AuthProvider } from './AuthProvider';
import * as fs from 'fs';
import * as path from 'path';

interface CookieData {
    name: string;
    value: string;
    domain?: string;
    path?: string;
}

interface CookieFile {
    cookies: CookieData[];
    timestamp?: number;
    domain?: string;
}

/**
 * SSO Cookie Authentication provider
 * Reads cookies from sap_cookies.json file created by sap-auth-mcp-main tool
 */
export class CookieAuthProvider implements AuthProvider {
    private cookies: string | null = null;

    constructor(
        private systemUrl: string,
        private client: string,
        private cookiePath: string
    ) {
        this.loadCookies();
    }

    private loadCookies(): void {
        try {
            if (fs.existsSync(this.cookiePath)) {
                const cookieData = fs.readFileSync(this.cookiePath, 'utf-8');
                const parsed = JSON.parse(cookieData);

                // Handle both formats:
                // 1. Direct array: [{ name, value }, ...]
                // 2. Wrapped format: { cookies: [{ name, value }, ...] }
                let cookieArray: CookieData[];
                if (Array.isArray(parsed)) {
                    cookieArray = parsed;
                } else if (parsed.cookies && Array.isArray(parsed.cookies)) {
                    cookieArray = parsed.cookies;
                } else {
                    throw new Error('Invalid cookie file format');
                }

                // Convert cookie array to Cookie header format
                this.cookies = cookieArray.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');

                console.error(`[Auth] Loaded ${cookieArray.length} SSO cookies from ${this.cookiePath}`);
            }
        } catch (error) {
            console.error(
                `[Auth] Failed to load SSO cookies from ${this.cookiePath}:`,
                error instanceof Error ? error.message : String(error)
            );
            this.cookies = null;
        }
    }

    async getAuthHeaders(): Promise<Record<string, string>> {
        if (!this.cookies) {
            throw new Error('SSO_COOKIE_NOT_FOUND');
        }

        return {
            Cookie: this.cookies,
            'X-SAP-Client': this.client,
        };
    }

    getSystemUrl(): string {
        return this.systemUrl;
    }

    getClient(): string {
        return this.client;
    }

    getCookiePath(): string {
        return this.cookiePath;
    }

    isAvailable(): boolean {
        return !!this.cookies;
    }

    getName(): string {
        return 'SSO (cookie file)';
    }

    /**
     * Reload cookies from file (useful after re-authentication)
     */
    reloadCookies(): void {
        this.loadCookies();
    }
}
