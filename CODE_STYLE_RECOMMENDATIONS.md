# Code Style Checking Recommendations for mcp-abap-adt

## Current State Analysis

### ✅ What's Already in Place
- **TypeScript Compiler**: Enforces type safety with `strict: true`
- **Build Process**: `npm run build` catches compilation errors
- **Testing**: Jest tests verify functionality
- **Consistent Formatting**: Code uses spaces (not tabs), Unix line endings

### ❌ What's Missing
- No ESLint configuration for code style enforcement
- No Prettier for automatic code formatting
- No pre-commit hooks to enforce standards
- No CI/CD checks for code quality
- No EditorConfig for consistent editor settings

---

## Recommended Implementation Strategy

### Phase 1: Quick Wins (Immediate)

#### 1.1 Add ESLint
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

**Create `.eslintrc.json`:**
```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "indent": ["error", 4],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  },
  "ignorePatterns": ["dist/", "node_modules/", "*.js"]
}
```

**Add npm scripts to `package.json`:**
```json
{
  "scripts": {
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix"
  }
}
```

#### 1.2 Add Prettier
```bash
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
```

**Create `.prettierrc.json`:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 120,
  "tabWidth": 4,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Create `.prettierignore`:**
```
dist/
node_modules/
*.md
*.json
*.xml
```

**Add npm scripts:**
```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\""
  }
}
```

#### 1.3 Add EditorConfig
**Create `.editorconfig`:**
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true

[*.{json,yml,yaml}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

---

### Phase 2: Automation (Next Step)

#### 2.1 Add Husky for Pre-commit Hooks
```bash
npm install --save-dev husky lint-staged
npx husky init
```

**Create `.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**Add to `package.json`:**
```json
{
  "lint-staged": {
    "src/**/*.ts": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

#### 2.2 Update package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "build": "tsc -p tsconfig.json",
    "start": "node ./dist/index.js",
    "dev": "npx @modelcontextprotocol/inspector node ./dist/index.js",
    "updated": "npm i && npm run build",

    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit",

    "check": "npm run format:check && npm run lint && npm run typecheck",
    "fix": "npm run format && npm run lint:fix",
    "validate": "npm run check && npm run build && npm run test"
  }
}
```

---

### Phase 3: CI/CD Integration (Future)

#### 3.1 GitHub Actions Workflow
**Create `.github/workflows/code-quality.yml`:**
```yaml
name: Code Quality

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  quality-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Prettier check
        run: npm run format:check

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript type check
        run: npm run typecheck

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test
```

---

## Quick Implementation Guide

### Option A: Minimal Setup (30 minutes)
```bash
# 1. Install ESLint & Prettier
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier

# 2. Create config files (copy from recommendations above)
# - .eslintrc.json
# - .prettierrc.json
# - .editorconfig

# 3. Add scripts to package.json
# - lint, lint:fix, format, format:check, check, fix, validate

# 4. Test it
npm run check
npm run fix
```

### Option B: Full Setup (1-2 hours)
```bash
# Everything from Option A, plus:

# 5. Install Husky and lint-staged
npm install --save-dev husky lint-staged
npx husky init

# 6. Configure pre-commit hook

# 7. Test workflow
git add .
git commit -m "test: verify pre-commit hooks"
```

---

## Usage Examples

### Daily Development Workflow
```bash
# Before committing (if no pre-commit hooks)
npm run check          # Check all code quality issues
npm run fix            # Auto-fix formatting and lint issues

# Full validation before push
npm run validate       # format:check + lint + typecheck + build + test

# Quick formatting
npm run format         # Format all TypeScript files

# Find issues only
npm run lint           # Show all ESLint issues
```

### PR Review Checklist
```bash
# Reviewer runs:
npm run validate       # Ensures code meets all quality standards

# Check specific file
npx eslint src/handlers/handleNewFeature.ts
npx prettier --check src/handlers/handleNewFeature.ts
```

---

## Expected Benefits

### Immediate (Phase 1)
- ✅ Consistent code formatting across the project
- ✅ Early detection of common coding mistakes
- ✅ Reduced code review time on style issues
- ✅ Better IDE support with ESLint/Prettier integration

### After Automation (Phase 2)
- ✅ Prevents badly formatted code from being committed
- ✅ No manual checking needed
- ✅ Consistent experience for all contributors

### With CI/CD (Phase 3)
- ✅ Automated quality checks on every PR
- ✅ Prevents merging code that doesn't meet standards
- ✅ Visible quality badges
- ✅ Historical quality tracking

---

## Handling Existing Code

### Strategy 1: Big Bang (Recommended for small projects)
```bash
# Format all files at once
npm run format
npm run lint:fix

# Commit as single "chore: apply code formatting standards"
git add .
git commit -m "chore: apply ESLint and Prettier formatting to entire codebase"
```

### Strategy 2: Incremental (For large projects)
```bash
# Only format files you touch
# Add to .eslintrc.json:
{
  "ignorePatterns": ["src/handlers/old/**"]
}

# Gradually remove ignore patterns as files are updated
```

---

## Cost-Benefit Analysis

### Setup Time
- Phase 1 (ESLint + Prettier): **30 minutes**
- Phase 2 (Pre-commit hooks): **30 minutes**
- Phase 3 (CI/CD): **1 hour**
- **Total: ~2 hours**

### Time Saved Per PR
- Manual code review time: **-50%** (less focus on style)
- Formatting inconsistencies: **-100%** (automated)
- Catching bugs earlier: **-30%** (ESLint catches common issues)

### ROI
After just **5 PRs**, the time investment pays for itself!

---

## Recommended Next Steps

1. **Start with Phase 1** - Add ESLint + Prettier (30 min)
2. **Run on new code only** - Don't format entire codebase yet
3. **Add to PR review process** - `npm run check` before review
4. **Add Phase 2** - Pre-commit hooks (when team is comfortable)
5. **Eventually add Phase 3** - CI/CD integration

---

## Alternative: Use Standard Presets

### For fastest setup, use community standards:
```bash
# Option 1: TypeScript Standard Style
npm install --save-dev eslint-config-standard-with-typescript

# Option 2: Airbnb style guide
npm install --save-dev eslint-config-airbnb-typescript

# Option 3: Google style guide
npm install --save-dev eslint-config-google
```

Then extend in `.eslintrc.json`:
```json
{
  "extends": ["airbnb-typescript/base"]
}
```

---

## Summary

**Minimum Viable Setup (Do This First):**
1. Install ESLint + Prettier
2. Add config files
3. Add `npm run check` and `npm run fix` scripts
4. Use before committing: `npm run fix && npm run validate`

**When Ready for More:**
5. Add pre-commit hooks (Husky)
6. Add CI/CD workflow

This ensures code quality without disrupting current development workflow!
