/**
 * Jest setup file - runs before any tests
 * Sets a marker to indicate we're in test mode BEFORE module imports happen
 */

// This runs BEFORE any test files import anything
// It allows getConfig() to detect test mode during import-time calls
(global as any).__JEST_TEST_MODE__ = true;

// Set NODE_ENV to test for runtime checks
process.env.NODE_ENV = 'test';
