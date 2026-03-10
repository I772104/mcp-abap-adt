module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/__tests__/**/*.ts',
    '**/src/**/*.test.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Coverage threshold set to current level for pragmatic evaluation project
  // Handler coverage is 66%+ (good), lower coverage is in complex parsers and static text
  // See: https://github.tools.sap/D020426/mcp-abap-adt/issues/28 for rationale
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 35,
      functions: 50,
      lines: 50
    }
  },
  // Setup file runs before test suites to set test mode flag
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  // Separate test configurations
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      roots: ['<rootDir>/tests/unit', '<rootDir>/src'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      roots: ['<rootDir>/tests/integration', '<rootDir>/src'],
    },
    {
      displayName: 'legacy',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      roots: ['<rootDir>/src'],
    }
  ],
};