import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Stored cookie data with timestamp
 */
export interface StoredCookies {
    cookies: string;
    timestamp: number;
    domain: string;
}

/**
 * Persistent cookie storage with TTL-based expiration.
 * Stores cookies in $TMPDIR/mcp-abap-adt/<sanitized-domain>.json with 12-hour TTL.
 */
export class CookieStore {
    private readonly filePath: string;
    private readonly ttlMs: number = 12 * 60 * 60 * 1000; // 12 hours

    /**
     * Create a cookie store for a specific domain
     * @param domain SAP system domain (e.g., "ldcser1.wdf.sap.corp")
     */
    constructor(private readonly domain: string) {
        const tmpDir = os.tmpdir();
        const storageDir = path.join(tmpDir, 'mcp-abap-adt');
        const sanitizedDomain = this.sanitizeDomain(domain);
        this.filePath = path.join(storageDir, `${sanitizedDomain}.json`);
    }

    /**
     * Sanitize domain for use in filename
     * Replace non-alphanumeric characters (except dots and hyphens) with underscores
     */
    private sanitizeDomain(domain: string): string {
        return domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    }

    /**
     * Save cookies to disk with timestamp
     */
    async save(cookies: string): Promise<void> {
        const data: StoredCookies = {
            cookies,
            timestamp: Date.now(),
            domain: this.domain,
        };

        // Ensure storage directory exists
        const dir = path.dirname(this.filePath);
        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.error(`[CookieStore] Saved cookies for ${this.domain} to ${this.filePath}`);
    }

    /**
     * Load cookies from disk, checking TTL
     * Returns null if file doesn't exist or cookies are expired
     */
    async load(): Promise<StoredCookies | null> {
        try {
            const content = await fs.readFile(this.filePath, 'utf-8');
            const data: StoredCookies = JSON.parse(content);

            // Check TTL
            const age = Date.now() - data.timestamp;
            if (age > this.ttlMs) {
                console.error(`[CookieStore] Cookies expired for ${this.domain} (age: ${Math.round(age / 60000)}min)`);
                return null;
            }

            console.error(`[CookieStore] Loaded valid cookies for ${this.domain} (age: ${Math.round(age / 60000)}min)`);
            return data;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                console.error(`[CookieStore] No cached cookies found for ${this.domain}`);
                return null;
            }
            console.error(`[CookieStore] Failed to load cookies for ${this.domain}:`, error);
            return null;
        }
    }

    /**
     * Clear stored cookies (delete file)
     */
    async clear(): Promise<void> {
        try {
            await fs.unlink(this.filePath);
            console.error(`[CookieStore] Cleared cookies for ${this.domain}`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error(`[CookieStore] Failed to clear cookies for ${this.domain}:`, error);
            }
        }
    }

    /**
     * Get the file path for this cookie store
     */
    getPath(): string {
        return this.filePath;
    }
}
