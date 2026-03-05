#!/bin/bash

# Test Script for PR Reviewer Agent
# This script demonstrates the pr-reviewer agent by creating sample scenarios

echo "🧪 PR Reviewer Agent - Test Scenarios"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Create a branch with type safety issues
echo "Test 1: TypeScript Type Safety Issues"
echo "--------------------------------------"
git checkout -b test/pr-reviewer-typescript 2>/dev/null || git checkout test/pr-reviewer-typescript

# Create a file with 'any' types
cat > test-file-with-any.ts << 'EOF'
// This file contains intentional issues for testing pr-reviewer agent

export async function badFunction(params: any): Promise<any> {
  const data: any = await fetchData();
  return data;
}

function fetchData(): any {
  return { value: 'test' };
}
EOF

echo -e "${YELLOW}Created test file with 'any' types${NC}"
echo ""

# Test 2: Check commit message format
echo "Test 2: Commit Message Validation"
echo "----------------------------------"
git add test-file-with-any.ts
git commit -m "Added new function" 2>/dev/null

echo -e "${YELLOW}Created commit with non-conventional message${NC}"
echo ""

# Test 3: Create proper handler structure
echo "Test 3: Handler Structure Validation"
echo "-------------------------------------"

cat > test-handler-good.ts << 'EOF'
import { makeApiCall } from '../lib/utils';

interface TestParams {
  param1: string;
  param2?: boolean;
}

export async function handleTestTool(params: TestParams) {
  try {
    // 1. Validate parameters
    if (!params.param1) {
      throw new Error('param1 is required');
    }

    // 2. Build request
    const path = '/sap/bc/adt/test/endpoint';

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
      content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
      isError: true
    };
  }
}

function processResponse(response: unknown): Record<string, unknown> {
  return { data: response };
}
EOF

cat > test-handler-bad.ts << 'EOF'
// Bad handler - missing error handling, no validation

export async function handleBadTool(params) {
  const response = await fetch('/api/endpoint');
  return response.json();
}
EOF

git add test-handler-good.ts test-handler-bad.ts
git commit -m "feat(test): add test handlers for validation" 2>/dev/null

echo -e "${GREEN}Created good handler (follows pattern)${NC}"
echo -e "${RED}Created bad handler (missing patterns)${NC}"
echo ""

# Test 4: Security issues
echo "Test 4: Security Scanning"
echo "-------------------------"

cat > test-security-issues.ts << 'EOF'
// File with security issues for testing

const config = {
  sap_url: 'https://sap-system.com:8000',
  sap_username: 'testuser',
  sap_password: 'MyPassword123',  // Hardcoded password!
  api_token: 'secret-token-12345'  // Hardcoded token!
};

export function connectToSAP() {
  const url = `https://testuser:MyPassword123@sap-system.com:8000`;  // Credentials in URL!
  return fetch(url);
}
EOF

git add test-security-issues.ts
git commit -m "fix(config): add SAP configuration" 2>/dev/null

echo -e "${RED}Created file with security issues (hardcoded credentials)${NC}"
echo ""

# Summary
echo "======================================"
echo "Test Scenarios Created Successfully!"
echo "======================================"
echo ""
echo "The following test scenarios are ready:"
echo ""
echo "1. ❌ TypeScript Type Safety Issues"
echo "   - File: test-file-with-any.ts"
echo "   - Issues: Uses 'any' types everywhere"
echo ""
echo "2. ❌ Commit Message Format"
echo "   - Commit: 'Added new function'"
echo "   - Issues: Not conventional format"
echo ""
echo "3. ✅ Good Handler vs ❌ Bad Handler"
echo "   - Good: test-handler-good.ts (follows 5-step pattern)"
echo "   - Bad: test-handler-bad.ts (missing validation and error handling)"
echo ""
echo "4. ❌ Security Issues"
echo "   - File: test-security-issues.ts"
echo "   - Issues: Hardcoded passwords, tokens, credentials in URLs"
echo ""
echo "======================================"
echo "How to Test the PR Reviewer Agent"
echo "======================================"
echo ""
echo "Method 1: Using Helper Script"
echo "  node .claude/agents/run-pr-review.js --branch test/pr-reviewer-typescript --base main"
echo ""
echo "Method 2: Using Claude Code Directly"
echo "  claude \"Review the test/pr-reviewer-typescript branch using pr-reviewer agent\""
echo ""
echo "Method 3: Quick Test"
echo "  claude \"Review these files for issues: test-file-with-any.ts, test-handler-bad.ts, test-security-issues.ts\""
echo ""
echo "Expected Agent Findings:"
echo "  🚨 Critical: Hardcoded credentials and secrets"
echo "  🚨 Critical: Multiple 'any' types without justification"
echo "  ⚠️  High: Bad handler missing error handling"
echo "  ⚠️  High: Non-conventional commit message"
echo "  ⚠️  High: Missing tests for new handlers"
echo "  💡 Medium: Handler could use utility functions"
echo ""
echo "Cleanup:"
echo "  git checkout main"
echo "  git branch -D test/pr-reviewer-typescript"
echo "  rm -f test-*.ts"
echo ""
