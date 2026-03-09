import { Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * Agent-specific guide resources
 * These provide optimized guidance for different AI agents
 */

// Agent detection patterns
const AGENT_PATTERNS = {
    cline: /cline|claude-dev/i,
    claude: /claude|anthropic/i,
    cursor: /cursor/i,
    opencode: /opencode/i,
};

/**
 * Detect agent type from user agent string or context
 */
export function detectAgentType(userAgent?: string): string {
    if (!userAgent) return 'universal';

    for (const [agent, pattern] of Object.entries(AGENT_PATTERNS)) {
        if (pattern.test(userAgent)) {
            return agent;
        }
    }

    return 'universal';
}

/**
 * Get agent-specific guide content
 */
export function getAgentGuide(agentType: string): string {
    switch (agentType.toLowerCase()) {
        case 'cline':
            return getClineGuide();
        case 'claude':
            return getClaudeGuide();
        case 'cursor':
            return getCursorGuide();
        case 'opencode':
            return getOpenCodeGuide();
        case 'universal':
        default:
            return getUniversalGuide();
    }
}

/**
 * Universal guide for all agents
 */
function getUniversalGuide(): string {
    return `# Universal MCP ABAP ADT Server Guide

## Core Principles

1. **Resources First**: Always prefer MCP resources over tools when available
2. **Token Efficiency**: Use lightweight resources for discovery
3. **Workflow Discipline**: Follow mandatory workflows (especially class creation)
4. **ABAP Cloud Compliance**: Use only released APIs
5. **Test-Driven**: Always test before activation

## Essential Resources

### Package Discovery (Token-Efficient)
\`\`\`
# Lightest: Package names only (~5K tokens)
abap://packages/top-level/names

# Filtered: Specific packages (~500 tokens)
abap://packages/top-level?prefix=FIN&fields=name,description&limit=20

# Detailed: Single package (~2K tokens)
abap://package/FINANCIAL_BASIS
\`\`\`

### RAP Business Object Analysis
\`\`\`
# Complete BO structure in one call
rap-bo-analysis:///I_SalesOrder

# Summary level (faster)
rap-bo-analysis:///I_SalesOrder?depth=summary
\`\`\`

### ABAP Objects
\`\`\`
# CDS View
abap://cds/I_SalesOrder

# Class
abap://class/CL_ABAP_TYPEDESCR

# Table
abap://table/MARA
\`\`\`

## Mandatory Class Creation Workflow

**ALWAYS follow this exact sequence:**

1. **CheckSyntax** - Validate class source code
2. **CreateClass** - Create with auto_activate: false
3. **CheckSyntax** - Validate test source code
4. **CreateClassTests** - Add tests with auto_activate: false
5. **RunClassTests** - Verify all tests pass
6. **ActivateClasses** - Activate only after tests pass

**Critical Rules:**
- ❌ NEVER skip CheckSyntax
- ❌ NEVER use auto_activate: true during development
- ❌ NEVER activate without running tests
- ✅ ALWAYS validate both class and test code

## Quick Reference

**Most Common Operations:**
\`\`\`
# Package discovery
abap://packages/top-level/names

# RAP BO analysis
rap-bo-analysis:///I_SalesOrder?depth=summary

# Create class
CheckSyntax → CreateClass → CheckSyntax → CreateClassTests → RunClassTests → ActivateClasses
\`\`\`

---

*For agent-specific optimizations, access:*
- Cline: agent-guide://cline
- Claude Desktop: agent-guide://claude
- Cursor: agent-guide://cursor
- OpenCode: agent-guide://opencode
`;
}

/**
 * Cline-specific guide
 */
function getClineGuide(): string {
    return `# Cline-Specific MCP ABAP ADT Server Guide

## Cline Optimizations

Cline has excellent MCP support with:
- ✅ Strong resource caching capabilities
- ✅ XML-based tool use formatting
- ✅ Task progress tracking with task_progress parameter
- ✅ Excellent at following structured workflows

## Cline-Specific Patterns

### Using task_progress Parameter

\`\`\`xml
<access_mcp_resource>
<server_name>mcp-abap-adt-1</server_name>
<uri>abap://packages/top-level/names</uri>
<task_progress>
- [x] Get package list
- [ ] Filter to relevant packages
- [ ] Analyze package contents
</task_progress>
</access_mcp_resource>
\`\`\`

### Class Creation with Progress Tracking

\`\`\`xml
<use_mcp_tool>
<server_name>mcp-abap-adt-1</server_name>
<tool_name>CheckSyntax</tool_name>
<arguments>
{
  "source_code": "CLASS zcl_test DEFINITION..."
}
</arguments>
<task_progress>
- [x] Design class structure
- [x] Validate syntax
- [ ] Create class
- [ ] Create tests
- [ ] Run tests
- [ ] Activate
</task_progress>
</use_mcp_tool>
\`\`\`

## Best Practices for Cline

1. **Always use task_progress** to track multi-step workflows
2. **Cache resources** - Cline caches well, use resources liberally
3. **XML formatting** - Use proper XML structure for tool calls
4. **Sequential execution** - Wait for confirmation after each step

## Recommended Workflow

1. Start session with: \`agent-guide://cline\`
2. Use resources for discovery
3. Track progress with task_progress
4. Follow mandatory workflows strictly

---

*See AGENTS.md for universal patterns and best practices*
`;
}

/**
 * Claude Desktop-specific guide
 */
function getClaudeGuide(): string {
    return `# Claude Desktop-Specific MCP ABAP ADT Server Guide

## Claude Desktop Optimizations

Claude Desktop excels at:
- ✅ Full MCP protocol support
- ✅ Understanding complex RAP structures
- ✅ Generating comprehensive test cases
- ✅ Large context window for codebases

## Claude-Specific Patterns

### Comprehensive Analysis

Claude can handle large RAP BO analyses effectively:

\`\`\`
# Get complete BO structure
access_mcp_resource: uri=rap-bo-analysis:///I_SalesOrder

# Claude can process and explain the entire structure
# including behavior, CDS views, services, and implementation
\`\`\`

### Test Generation

Claude excels at generating comprehensive test suites:

\`\`\`
# After creating a class, request:
"Generate comprehensive unit tests covering:
- Positive scenarios
- Negative scenarios (error cases)
- Edge cases
- Boundary conditions
- Test doubles for dependencies"
\`\`\`

## Best Practices for Claude

1. **Leverage context window** - Load multiple resources at once
2. **Request explanations** - Ask Claude to explain complex ABAP patterns
3. **Comprehensive testing** - Request full test coverage
4. **RAP expertise** - Use for complex RAP BO analysis

## Recommended Workflow

1. Start with: \`agent-guide://claude\`
2. Load comprehensive resources (RAP BO analysis)
3. Request detailed explanations
4. Generate complete test suites

---

*See AGENTS.md for universal patterns and best practices*
`;
}

/**
 * Cursor-specific guide
 */
function getCursorGuide(): string {
    return `# Cursor-Specific MCP ABAP ADT Server Guide

## Cursor Optimizations

Cursor excels at:
- ✅ Strong code completion capabilities
- ✅ Excellent refactoring support
- ✅ Multi-file editing
- ✅ Understanding project structure

## Cursor-Specific Patterns

### Code Discovery

Use resources for efficient code discovery:

\`\`\`
# Discover packages
abap://packages/top-level/names

# Get class structure
abap://class/ZCL_EXISTING_CLASS

# Find usages
GetClassUsages: class_name=ZCL_EXISTING_CLASS
\`\`\`

### Refactoring Workflow

Cursor is excellent for refactoring:

\`\`\`
1. Get current code: abap://class/ZCL_OLD_CLASS
2. Analyze dependencies: GetClassUsages
3. Validate changes: CheckSyntax
4. Update with backup: CreateClass (backup_existing: true)
5. Verify tests: RunClassTests
6. Activate: ActivateClasses
\`\`\`

## Best Practices for Cursor

1. **Use resources for reading** - More efficient than tools
2. **Multi-file context** - Leverage for RAP development
3. **Refactoring focus** - Use GetClassUsages before changes
4. **Verify with tests** - Always run tests after refactoring

## Recommended Workflow

1. Start with: \`agent-guide://cursor\`
2. Use resources for code discovery
3. Leverage multi-file editing for RAP
4. Verify all changes with tests

---

*See AGENTS.md for universal patterns and best practices*
`;
}

/**
 * OpenCode-specific guide
 */
function getOpenCodeGuide(): string {
    return `# OpenCode-Specific MCP ABAP ADT Server Guide

## OpenCode Optimizations

OpenCode excels at:
- ✅ Standard MCP protocol support
- ✅ Following structured workflows
- ✅ Test-driven development
- ✅ Batch operations

## OpenCode-Specific Patterns

### Structured Workflows

OpenCode follows workflows well:

\`\`\`
# Class creation workflow
1. CheckSyntax (class)
2. CreateClass (auto_activate: false)
3. CheckSyntax (tests)
4. CreateClassTests (auto_activate: false)
5. RunClassTests
6. ActivateClasses
\`\`\`

### Batch Operations

Use batch queries efficiently:

\`\`\`
GetTableContents:
  queries: [
    {table_name: "MARA", max_rows: 20},
    {table_name: "MAKT", max_rows: 20},
    {table_name: "MARC", max_rows: 20}
  ]
\`\`\`

## Best Practices for OpenCode

1. **Follow workflows strictly** - OpenCode excels at structured approaches
2. **Use lightweight resources** - Package names, summary analysis
3. **Batch operations** - Combine multiple queries
4. **Test-driven** - Always validate before activation

## Recommended Workflow

1. Start with: \`agent-guide://opencode\`
2. Use lightweight resources for discovery
3. Follow step-by-step workflows
4. Leverage batch operations

---

*See AGENTS.md for universal patterns and best practices*
`;
}

/**
 * List available agent guide resources
 */
export function listAgentGuideResources(): Resource[] {
    return [
        {
            uri: 'agent-guide://auto',
            name: 'Auto-Detect Agent Guide',
            description: 'Automatically detects your agent type and returns optimized guide',
            mimeType: 'text/markdown',
        },
        {
            uri: 'agent-guide://universal',
            name: 'Universal Agent Guide',
            description: 'Core guide for all AI agents',
            mimeType: 'text/markdown',
        },
        {
            uri: 'agent-guide://cline',
            name: 'Cline-Specific Guide',
            description: 'Optimizations and patterns for Cline',
            mimeType: 'text/markdown',
        },
        {
            uri: 'agent-guide://claude',
            name: 'Claude Desktop-Specific Guide',
            description: 'Optimizations and patterns for Claude Desktop',
            mimeType: 'text/markdown',
        },
        {
            uri: 'agent-guide://cursor',
            name: 'Cursor-Specific Guide',
            description: 'Optimizations and patterns for Cursor',
            mimeType: 'text/markdown',
        },
        {
            uri: 'agent-guide://opencode',
            name: 'OpenCode-Specific Guide',
            description: 'Optimizations and patterns for OpenCode',
            mimeType: 'text/markdown',
        },
    ];
}
