import { CookieStore } from '../../../../src/infrastructure/auth/CookieStore';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CookieStore', () => {
    const testDomain = 'test-sap-system.example.com';
    let store: CookieStore;
    let expectedDir: string;
    let expectedPath: string;

    beforeEach(async () => {
        store = new CookieStore(testDomain);
        expectedDir = join(tmpdir(), 'mcp-abap-adt');
        expectedPath = join(expectedDir, `${testDomain}.json`);
        try { await fs.unlink(expectedPath); } catch { /* ignore */ }
    });

    afterEach(async () => {
        try { await fs.unlink(expectedPath); } catch { /* ignore */ }
    });

    test('save() writes cookies to disk with timestamp', async () => {
        await store.save('NAME1=val1; NAME2=val2', testDomain);
        const content = JSON.parse(await fs.readFile(expectedPath, 'utf-8'));
        expect(content.cookies).toBe('NAME1=val1; NAME2=val2');
        expect(content.domain).toBe(testDomain);
        expect(typeof content.timestamp).toBe('number');
        expect(content.timestamp).toBeGreaterThan(0);
    });

    test('load() returns saved cookies', async () => {
        await store.save('NAME1=val1', testDomain);
        const result = await store.load();
        expect(result).not.toBeNull();
        expect(result!.cookies).toBe('NAME1=val1');
        expect(result!.domain).toBe(testDomain);
    });

    test('load() returns null when no file exists', async () => {
        const result = await store.load();
        expect(result).toBeNull();
    });

    test('load() returns null when cookies are expired (> 12h)', async () => {
        const data = {
            cookies: 'NAME1=val1',
            timestamp: Date.now() - (13 * 60 * 60 * 1000),
            domain: testDomain,
        };
        await fs.mkdir(expectedDir, { recursive: true });
        await fs.writeFile(expectedPath, JSON.stringify(data));
        const result = await store.load();
        expect(result).toBeNull();
    });

    test('load() returns cookies within TTL (< 12h)', async () => {
        const data = {
            cookies: 'NAME1=val1',
            timestamp: Date.now() - (6 * 60 * 60 * 1000),
            domain: testDomain,
        };
        await fs.mkdir(expectedDir, { recursive: true });
        await fs.writeFile(expectedPath, JSON.stringify(data));
        const result = await store.load();
        expect(result).not.toBeNull();
        expect(result!.cookies).toBe('NAME1=val1');
    });

    test('clear() deletes the cookie file', async () => {
        await store.save('NAME1=val1', testDomain);
        await store.clear();
        const result = await store.load();
        expect(result).toBeNull();
    });

    test('clear() does not throw when file does not exist', async () => {
        await expect(store.clear()).resolves.not.toThrow();
    });

    test('getPath() returns expected file path', () => {
        expect(store.getPath()).toBe(expectedPath);
    });

    test('sanitizes domain for filename', () => {
        const unsafeStore = new CookieStore('sys:8443/path');
        const path = unsafeStore.getPath();
        const filename = path.split(/[/\\]/).pop() || '';
        expect(path).toContain('sys_8443_path.json');
        expect(filename).toBe('sys_8443_path.json');
        expect(filename).not.toContain(':');
    });
});
