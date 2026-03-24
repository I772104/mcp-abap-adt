/**
 * Manual CJS mock for chrome-launcher (ESM-only package).
 * Prevents Jest from failing on ESM `export` syntax in node_modules.
 */
module.exports = {
    launch: jest.fn().mockResolvedValue({
        port: 9222,
        process: { pid: 12345 },
        kill: jest.fn().mockResolvedValue(undefined),
    }),
    killAll: jest.fn().mockResolvedValue(undefined),
};
