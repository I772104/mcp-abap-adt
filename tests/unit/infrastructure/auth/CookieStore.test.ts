import { CookieStore } from '../../../../src/infrastructure/auth/CookieStore';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('CookieStore', () => {
    const testDomain = 'test.sap.com';
    let store: CookieStore;
    let testFilePath: string;

    beforeEach(() => {
        store = new CookieStore(testDomain);
        const tmpDir = os.tmpdir();
        const sanitizedDomain = testDomain.replace(/[^a-zA-Z0-9.-]/g, '_');
        testFilePath = path.join(tmpDir, 'mcp-abap-adt', `${sanitizedDomain}.json`);
    });

    afterEach(async () => {
        // Clean up test files
        await store.clear();
    });

    describe('save and load', () => {
        it('should save and load cookies', async () => {
            const testCookies = 'COOKIE1=value1; COOKIE2=value2';

            await store.save(testCookies);

            const loaded = await store.load();
            expect(loaded).not.toBeNull();
            expect(loaded?.cookies).toBe(testCookies);
            expect(loaded?.domain).toBe(testDomain);
            expect(loaded?.timestamp).toBeGreaterThan(Date.now() - 1000);
        });

        it('should return null for expired cookies', async () => {
            const testCookies = 'COOKIE1=value1';

            // Save with expired timestamp
            const tmpDir = os.tmpdir();
            const storageDir = path.join(tmpDir, 'mcp-abap-adt');
            await fs.mkdir(storageDir, { recursive: true });

            const expiredData = {
                cookies: testCookies,
                timestamp: Date.now() - 13 * 60 * 60 * 1000, // 13 hours ago
                domain: testDomain,
            };
            await fs.writeFile(testFilePath, JSON.stringify(expiredData), 'utf-8');

            const loaded = await store.load();
            expect(loaded).toBeNull();
        });

        it('should return null for non-existent file', async () => {
            const loaded = await store.load();
            expect(loaded).toBeNull();
        });
    });

    describe('clear', () => {
        it('should delete cookie file', async () => {
            const testCookies = 'COOKIE1=value1';

            await store.save(testCookies);
            expect(await store.load()).not.toBeNull();

            await store.clear();
            expect(await store.load()).toBeNull();
        });

        it('should not error when clearing non-existent file', async () => {
            await expect(store.clear()).resolves.not.toThrow();
        });
    });

    describe('getPath', () => {
        it('should return correct file path', () => {
            const path = store.getPath();
            expect(path).toContain('mcp-abap-adt');
            expect(path).toContain('test.sap.com');
            expect(path).toMatch(/\.json$/);
        });
    });

    describe('domain sanitization', () => {
        it('should sanitize special characters in domain', () => {
            const specialDomain = 'test:8000@sap.com';
            const specialStore = new CookieStore(specialDomain);
            const filePath = specialStore.getPath();
            const fileName = path.basename(filePath);

            // Should replace non-alphanumeric chars (except dots and hyphens)
            expect(fileName).toBe('test_8000_sap.com.json');
            expect(fileName).not.toContain('@');
        });
    });
});
