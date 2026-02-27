# Contributing to mcp-abap-adt

Thank you for your interest in contributing to the ABAP ADT MCP Server! This project serves as both an evaluation platform for Model Context Protocol capabilities and a practical tool for AI-assisted ABAP development.

## 📋 Table of Contents

- [Project Goals](#project-goals)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)

## Project Goals

This project balances three objectives:

1. **Exploration First**: Test what's possible with MCP in ABAP development contexts
2. **Practical Value**: Provide immediate utility for AI-assisted ABAP development
3. **Learning Platform**: Serve as a reference for building domain-specific MCP servers

### What We Welcome

- ✅ Bug fixes and error handling improvements
- ✅ New MCP tools that expand ABAP development capabilities
- ✅ Documentation improvements and examples
- ✅ Performance optimizations
- ✅ Test coverage improvements
- ✅ MCP resource implementations
- ✅ Integration improvements with AI coding assistants

### What We Avoid

- ❌ Over-engineering for hypothetical future requirements
- ❌ Production-grade hardening beyond evaluation needs
- ❌ Breaking changes without clear benefits
- ❌ Features unrelated to AI-assisted ABAP development

## Getting Started

### For SAP Internal Contributors

1. Ensure you have access to the SAP internal repository: `https://github.tools.sap/D020426/mcp-abap-adt`
2. Set up your development environment (see below)
3. Check [GitHub Issues](https://github.tools.sap/D020426/mcp-abap-adt/issues) for open tasks
4. Review [Enhancement Proposals](Enhancement%20Proposal.md) for feature ideas

### For External Contributors

1. This fork focuses on SAP-internal evaluation scenarios
2. For upstream contributions, consider [mario-andreschak/mcp-abap-adt](https://github.com/mario-andreschak/mcp-abap-adt)
3. Features that enhance MCP evaluation capabilities are welcome here

## Development Setup

### Prerequisites

- **Node.js**: v18.x or later (LTS recommended)
- **npm**: v9.x or later
- **Git**: Latest version
- **SAP System Access**: For testing (ABAP system with ADT enabled)
- **TypeScript**: Installed via npm (no global install needed)

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.tools.sap/D020426/mcp-abap-adt.git
cd mcp-abap-adt

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Configure SAP credentials (copy from .env.example)
cp .env.example .env
# Edit .env with your SAP system credentials

# 5. Run tests
npm test
```

### Development Workflow

```bash
# Start development mode with MCP inspector
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Run specific test file
npm test -- src/handlers/handleGetClass.test.ts
```

## How to Contribute

### 1. Find or Create an Issue

- Check [existing issues](https://github.tools.sap/D020426/mcp-abap-adt/issues)
- For bugs: Create a bug report with reproduction steps
- For features: Discuss in [Enhancement Proposals](Enhancement%20Proposal.md) first
- For questions: Use issue comments or internal SAP channels

### 2. Fork and Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

**Branch Naming Conventions:**
- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `test/` - Test additions or improvements
- `refactor/` - Code refactoring without behavior changes

### 3. Make Your Changes

- Write clear, readable code
- Follow existing code style and patterns
- Add or update tests as needed
- Update documentation if adding/changing features
- Test your changes locally

### 4. Commit Your Changes

Follow conventional commit format (see below).

### 5. Submit a Pull Request

- Push your branch to the repository
- Create a pull request against `main` branch
- Fill out the PR template (if available)
- Link related issues
- Request review from maintainers

## Coding Standards

### TypeScript Style

```typescript
// ✅ Good: Clear types, descriptive names
interface ClassParameters {
  class_name: string;
  include_metadata?: boolean;
}

export async function handleGetClass(
  params: ClassParameters
): Promise<ToolResponse> {
  // Implementation
}

// ❌ Avoid: Any types, unclear names
async function getData(p: any): Promise<any> {
  // Implementation
}
```

### Key Principles

1. **Type Safety**: Use TypeScript types, avoid `any`
2. **Clear Naming**: Function and variable names should be self-documenting
3. **Error Handling**: Always handle errors gracefully
4. **Comments**: Only where logic isn't self-evident
5. **DRY Principle**: Extract reusable logic to utility functions

### File Organization

```
src/
├── handlers/          # MCP tool handlers
│   ├── handleGetClass.ts
│   └── __tests__/     # Unit tests for handlers
├── lib/              # Utility functions
│   ├── utils.ts
│   └── __tests__/    # Unit tests for utilities
├── resources/        # MCP resource implementations
└── index.ts          # Main server entry point
```

### Handler Structure

```typescript
import { makeApiCall } from '../lib/utils';

export async function handleYourTool(params: YourParams) {
  try {
    // 1. Validate parameters
    if (!params.required_field) {
      throw new Error('required_field is required');
    }

    // 2. Build request
    const path = `/sap/bc/adt/your/endpoint`;

    // 3. Make API call
    const response = await makeApiCall(path);

    // 4. Process response
    const result = processResponse(response);

    // 5. Return formatted result
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
```

## Testing Guidelines

### Test Coverage Requirements

- **New handlers**: Minimum 70% coverage
- **Utilities**: Minimum 80% coverage
- **Critical paths**: 90%+ coverage

### Writing Tests

```typescript
describe('handleGetClass', () => {
  // Unit test (no backend required)
  it('should validate required parameters', async () => {
    const result = await handleGetClass({ class_name: '' });
    expect(result.isError).toBe(true);
  });

  // Integration test (requires SAP backend)
  it('should retrieve class source code', async () => {
    const result = await handleGetClass({
      class_name: 'CL_DEMO_CLASS'
    });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('CLASS');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- handleGetClass.test.ts

# Run in watch mode
npm test -- --watch
```

### Test Strategy

- **Unit tests**: Mock axios/API calls, test logic in isolation
- **Integration tests**: Test against real SAP backend (use for validation)
- **Prefer unit tests**: Faster execution, no credentials required

## Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
# Feature
feat(handlers): add GetBehaviorDefinition tool for RAP development

Implements new MCP tool to retrieve RAP behavior definitions.
Supports filtering and metadata inclusion.

Closes #123

# Bug fix
fix(utils): handle special characters in class names

Previously, class names with underscores caused API errors.
Now properly URL-encodes all special characters.

Fixes #456

# Documentation
docs(readme): update installation instructions for Windows

Added troubleshooting section for Node.js path issues.

# Test
test(handlers): add unit tests for GetClass parameter validation

Increases coverage from 65% to 85%.
```

### Commit Guidelines

- **Subject line**:
  - Max 72 characters
  - Lowercase after type
  - No period at the end
  - Imperative mood ("add" not "added")

- **Body** (optional):
  - Explain what and why, not how
  - Wrap at 72 characters
  - Separate from subject with blank line

- **Footer** (optional):
  - Reference issues: `Closes #123` or `Fixes #456`
  - Breaking changes: `BREAKING CHANGE: description`

## Pull Request Process

### Before Submitting

- [ ] Code builds successfully (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] New features have tests
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No credentials or sensitive data in code

### PR Title Format

Use conventional commit format:
```
feat: add GetServiceBinding tool
fix: resolve timeout issue in GetClassCoverage
docs: improve CONTRIBUTING.md clarity
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test improvement

## Related Issues
Closes #123

## Testing
Describe how you tested your changes

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and build *(⚠️ Coming soon)*
2. **Code Review**: Maintainer reviews code quality
3. **Manual Verification**: Contributors must run `npm run build` and `npm test` locally
4. **Testing**: Changes tested in development environment
5. **Approval**: At least one maintainer approval required
6. **Merge**: Squash and merge to main branch
   
### After Merge

- Your branch will be deleted automatically
- Changes appear in next release
- Contributor recognition in CHANGELOG.md

## Community Guidelines

### Code of Conduct

- **Be Respectful**: Treat all contributors with respect
- **Be Constructive**: Provide helpful feedback
- **Be Collaborative**: Work together toward project goals
- **Be Patient**: Remember this is an evaluation project

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **Pull Requests**: Code discussions
- **Enhancement Proposals**: Feature ideation
- **SAP Internal**: Use internal channels for sensitive topics

### Getting Help

- **Technical Questions**: Open an issue with `question` label
- **Documentation**: Check `docs/` folder first
- **Examples**: See existing handlers for patterns
- **Debugging**: Use `npm run dev` with MCP Inspector

### Recognition

Contributors are recognized in:
- Pull request merge comments
- CHANGELOG.md release notes
- Project README (for significant contributions)

---

## Questions?

- 📖 **Documentation**: [docs/](docs/) folder
- 🐛 **Issues**: [GitHub Issues](https://github.tools.sap/D020426/mcp-abap-adt/issues)
- 💡 **Ideas**: [Enhancement Proposals](Enhancement%20Proposal.md)
- 📝 **Changelog**: [CHANGELOG.md](CHANGELOG.md)

Thank you for contributing to mcp-abap-adt! 🚀
