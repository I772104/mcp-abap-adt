# Test Structure

This directory contains all tests for the MCP ABAP ADT Server, organized by test type and functionality.

## Directory Structure

```
tests/
├── unit/                          # Fast, isolated unit tests
│   ├── handlers/                  # Handler unit tests
│   │   ├── read/                  # Read-only handlers (GetClass, GetTable, etc.)
│   │   ├── write/                 # State-modifying handlers (CreateClass, DeleteClass, etc.)
│   │   ├── query/                 # Data retrieval handlers (GetTableContents, etc.)
│   │   └── test-execution/        # Test execution handlers (RunClassTests, etc.)
│   ├── lib/                       # Library utility tests
│   │   ├── utils.test.ts
│   │   ├── activation-utils.test.ts
│   │   └── test-runner-utils.test.ts
│   └── parsers/                   # Response parser tests
├── integration/                   # Slow, system-dependent tests
│   └── full-workflow.test.ts      # End-to-end workflow tests
├── fixtures/                      # Test data fixtures
│   ├── xml/                       # XML response fixtures
│   ├── json/                      # JSON response fixtures
│   └── errors/                    # Error response fixtures
└── helpers/                       # Test utilities
    ├── mock-factories.ts          # Mock object factories
    ├── http-mock.ts               # HTTP client mocks
    └── test-setup.ts              # Test configuration
```

## Test Categories

### Unit Tests (`tests/unit/`)

Fast, isolated tests that mock external dependencies. These tests should:
- Run in < 100ms each
- Not require SAP system connection
- Mock all HTTP requests
- Test single units of functionality

**Current Coverage:**
- ✅ `handlers/write/handleCreateClass.test.ts` - 14 tests, 100% passing

### Integration Tests (`tests/integration/`)

Slower tests that interact with real SAP systems. These tests:
- Require SAP system connection
- Test full workflows end-to-end
- May take several seconds to complete
- Should be run less frequently

**Current Coverage:**
- ✅ `full-workflow.test.ts` - Integration tests for MCP server

## Running Tests

### Run Default Tests (Unit + Legacy, No Credentials Required)
```bash
npm test
```
Runs fast unit tests and legacy tests (if any exist). Does NOT require SAP system connection.

### Run Only Unit Tests
```bash
npm run test:unit
```

### Run Integration Tests (Requires SAP Credentials)
```bash
npm run test:integration
```
⚠️ **Requires:** Valid `.env` file with SAP credentials and active SAP system connection.

### Run All Tests (Unit + Integration + Legacy)
```bash
npm run test:all
```
⚠️ **Requires:** SAP credentials in `.env` file.

### Run with Coverage (Unit Tests Only)
```bash
npm run test:coverage
```

### Watch Mode (Unit Tests)
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npm test -- tests/unit/handlers/write/handleCreateClass.test.ts
```

## Credentials and Environment Setup

### Unit Tests (Default)
- ✅ **No credentials required**
- ✅ All external dependencies mocked
- ✅ Fast execution (< 100ms per test)
- ✅ Safe for CI/CD pipelines

### Integration Tests
- ⚠️ **Requires SAP system connection**
- ⚠️ **Requires `.env` file with credentials:**
  ```env
  SAP_URL=https://your-sap-system:port
  SAP_CLIENT=001
  SAP_USERNAME=your_username
  SAP_PASSWORD=your_password
  ```
- Copy `.env.example` to `.env` and fill in your credentials
- Run with: `npm run test:integration`

### CI/CD Configuration
For CI/CD pipelines without SAP access:
```bash
npm test  # Runs only unit tests, no credentials needed
```

For full validation with SAP system access:
```bash
npm run test:all  # Requires SAP credentials in environment
```

## Writing Tests

### Unit Test Template

```typescript
import { handlerFunction } from '../../../../src/handlers/handlerName';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils');

describe('handlerFunction', () => {
  let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
  });

  describe('Feature Category', () => {
    test('should do something', async () => {
      // Arrange
      mockMakeAdtRequest.mockResolvedValueOnce({ status: 200, data: 'test' } as any);

      // Act
      const result = await handlerFunction({ param: 'value' });

      // Assert
      expect(result.isError).toBe(false);
    });
  });
});
```

### Best Practices

1. **Organize by Functionality**: Group related tests in describe blocks
2. **Clear Test Names**: Use descriptive names that explain what is being tested
3. **AAA Pattern**: Arrange, Act, Assert
4. **Mock Cleanup**: Always reset mocks in `beforeEach`
5. **Isolated Tests**: Each test should be independent
6. **Error Object Structure**: When mocking errors, set all required properties:
   ```typescript
   const error: any = new Error('message');
   error.status = 404;
   error.response = { status: 404 };
   ```

## Test Coverage Goals

| Category | Target Coverage | Current |
|----------|----------------|---------|
| Handlers | 80% | 7% (1/14) |
| Libraries | 70% | 0% |
| Parsers | 90% | N/A |
| Overall | 75% | ~5% |

## Future Test Additions

### Priority 1 (Write Handlers)
- [ ] `handleCreateClassTests.test.ts`
- [ ] `handleDeleteLocalClass.test.ts`
- [ ] `handleActivateClasses.test.ts`

### Priority 2 (Read Handlers)
- [ ] `handleGetClass.test.ts`
- [ ] `handleGetTable.test.ts`
- [ ] `handleGetPackage.test.ts`

### Priority 3 (Query Handlers)
- [ ] `handleGetTableContents.test.ts`
- [ ] `handleGetCDSViewContents.test.ts`

### Priority 4 (Test Execution)
- [ ] `handleRunClassTests.test.ts`
- [ ] `handleGetClassCoverage.test.ts`

### Priority 5 (Libraries)
- [ ] `utils.test.ts`
- [ ] `activation-utils.test.ts`
- [ ] `test-runner-utils.test.ts`

## Troubleshooting

### Tests Fail When Run Together But Pass Individually
- Add `jest.resetAllMocks()` to `beforeEach`
- Check for shared state between tests
- Ensure mocks are properly cleaned up

### Mock Errors Not Working
- Verify error object has all required properties
- Check handler's error detection logic
- Use debug logging to inspect error structure

### Import Path Issues
- Unit tests use relative paths: `../../../../src/...`
- Integration tests may use different paths
- Check jest.config.js module resolution

## Contributing

When adding new tests:
1. Place in appropriate directory based on test type
2. Follow naming convention: `handlerName.test.ts`
3. Update this README with test coverage
4. Ensure all tests pass before committing
5. Add to appropriate priority list if not yet implemented

---

*Last Updated: 2024-02-24*