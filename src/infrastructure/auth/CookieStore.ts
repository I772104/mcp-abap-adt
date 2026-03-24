import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

export interface StoredCookies {
    cookies: string;
    timestamp: number;
    domain: string;
}

const COOKIE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Persistent cookie storage using system temp directory.
 * Location: $TMPDIR/mcp-abap-adt/<sanitized-domain>.json
 *
 * Intentionally incompatible with CookieAuthProvider's sap_cookies.json format.
 * CookieStore stores a pre-joined cookie string; CookieAuthProvider reads arrays of {name, value}.
 * The two classes operate on different files in different locations and never interact.
 */
export class CookieStore {
    private readonly filePath: string;

    constructor(domain: string) {
        const dir = join(tmpdir(), 'mcp-abap-adt');
        const safeDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
        this.filePath = join(dir, `${safeDomain}.json`);
    }

    async save(cookies: string, domain: string): Promise<void> {
        const data: StoredCookies = {
            cookies,
            timestamp: Date.now(),
            domain,
        };

        const dir = dirname(this.filePath);
        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
        console.error(`[CookieStore] Saved cookies to ${this.filePath}`);
    }

    async load(): Promise<StoredCookies | null> {
        try {
            const content = await fs.readFile(this.filePath, 'utf-8');
            const data: StoredCookies = JSON.parse(content);

            const age = Date.now() - data.timestamp;
            const ageHours = Math.round((age / (60 * 60 * 1000)) * 10) / 10;

            if (age > COOKIE_TTL_MS) {
                console.error(`[CookieStore] Cookies expired (${ageHours}h old)`);
                return null;
            }

            console.error(`[CookieStore] Loaded cookies (${ageHours}h old)`);
            return data;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                console.error('[CookieStore] No stored cookies found');
            }
            return null;
        }
    }

    async clear(): Promise<void> {
        try {
            await fs.unlink(this.filePath);
            console.error('[CookieStore] Cleared cookies');
        } catch {
            // Ignore if file doesn't exist
        }
    }

    getPath(): string {
        return this.filePath;
    }
}
