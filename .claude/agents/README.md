# Claude Code Agents

This directory contains custom Claude Code agents for automating project maintenance tasks in the mcp-abap-adt project.

## Available Agents

### 🔍 pr-reviewer (v1.0.0)

**Status**: ✅ Implemented
**Purpose**: Automated pull request review and code quality validation

**Capabilities**:
- TypeScript type safety checking
- Commit message validation (conventional commits)
- Test coverage analysis (70% handlers, 80% utilities)
- Handler structure validation
- Security scanning (credentials, secrets)
- Documentation verification
- ABAP ADT API pattern validation

**Usage**:
```bash
# Direct invocation
claude "Review my PR using the pr-reviewer agent"

# With helper script
npm run review:full

# Focused review
claude "Review PR focusing on TypeScript types and security"
```

**Documentation**: [Guide](docs/pr-reviewer/GUIDE.md) | [Examples](docs/pr-reviewer/EXAMPLES.md)

---

### 📋 issue-analyzer (v1.0.0)

**Status**: ✅ Implemented
**Purpose**: Analyze GitHub issues for clarity, feasibility, and implementation planning

**Capabilities**:
- Assess issue clarity and completeness
- Generate specific clarifying questions
- Conduct feasibility analysis with complexity ratings
- Propose multiple implementation approaches with trade-offs
- Draft detailed implementation plans
- Estimate effort and timeline
- Check ABAP ADT API availability
- Identify affected components and dependencies

**Usage**:
```bash
# By issue number
npm run analyze-issue -- --issue 42

# By URL
npm run analyze-issue -- --url https://github.com/user/repo/issues/42

# From file
npm run analyze-issue -- --file issue.txt

# With Claude Code
claude "Analyze GitHub issue #42 using the issue-analyzer agent"
```

**Documentation**: [Guide](docs/issue-analyzer/GUIDE.md) | [Quick Reference](docs/issue-analyzer/QUICK.md) | [Summary](docs/issue-analyzer/SUMMARY.md)

---

### 📊 maintainer-status (v1.0.0)

**Status**: ✅ Implemented
**Purpose**: Check repository health and provide status report with actionable recommendations

**Capabilities**:
- **Quick Overview (Default)** - Shows top 3 priorities in just a few lines
- List all open pull requests by status (ready to merge, needs review, etc.)
- Categorize and analyze open issues (bugs, features, priority)
- Check repository health indicators (CI/CD, recent activity)
- Identify stale PRs and issues
- Provide prioritized recommendations on what to work on next
- Suggest quick wins and high-impact tasks
- Monitor community engagement and response times

**Usage**:
```bash
# Quick overview - what to do next (default, recommended)
npm run status

# Brief summary with categories
npm run status:quick

# Full detailed report
npm run status:detailed

# Focus on specific area
node .claude/agents/run-maintainer-status.js --focus prs
node .claude/agents/run-maintainer-status.js --focus issues

# With Claude Code for analysis
claude "Check the repository status using the maintainer-status agent"
claude "Check PRs and give recommendations on what to review first"
```

**Documentation**: [Quick Reference](docs/maintainer-status/QUICK.md) | [Update Guide](docs/maintainer-status/UPDATE.md) | [Complete Guide](docs/maintainer-status/COMPLETE.md)

---

### 🛡️ risk-reviewer (v1.0.0)

**Status**: ✅ Implemented
**Purpose**: Deep operational and business risk assessment for SAP development tools and features

**Capabilities**:
- **Technical Risk Assessment** - Breaking changes, API compatibility, error handling
- **Data Risk Assessment** - Data loss scenarios, transaction consistency, validation gaps
- **Integration Risk Assessment** - System compatibility, timeout handling, cross-system operations
- **Operational Risk Assessment** - Monitoring gaps, rollback procedures, failure recovery
- **Security Risk Assessment** - Authorization checks, attack vectors, credential handling
- **Compliance Risk Assessment** - Audit trails, change management, SAP authorization concepts
- **Business Impact Assessment** - User disruption, service availability, financial impact
- **Mitigation Planning** - Preventive, detective, and corrective safeguards

**Usage**:
```bash
# Review a PR
npm run review:risks -- --pr 68

# Review a proposal file
npm run review:risks -- --file docs/proposals/transport-tools.md

# Review current changes
npm run review:risks -- --current

# Review a branch
npm run review:risks -- --branch feature/create-transport

# With Claude Code
claude "Use the risk-reviewer agent to analyze PR #68"
claude "Use the risk-reviewer agent to assess risks in the transport tools proposal"
```

**Output**: Comprehensive risk assessment report with:
- Executive summary with overall risk rating (🔴 Critical / 🟡 High / 🟠 Medium / 🟢 Low)
- Detailed analysis across 7 risk categories
- Attack vectors and failure scenarios
- Recommended safeguards (preventive, detective, corrective)
- Risk mitigation checklist
- Implementation recommendations (phased approach)
- Proceed/defer/block decision with conditions

**Documentation**: [Example Report](docs/risk-reviewer/EXAMPLE.md)

---

### 🧪 test-generator (Planned)

**Status**: 📋 Planned
**Purpose**: Generate unit and integration tests for handlers

**Planned Capabilities**:
- Analyze handler code structure
- Generate unit tests with mocked API calls
- Create integration test templates
- Add edge case tests
- Generate test fixtures
- Calculate coverage gaps

---

### 📚 doc-syncer (Planned)

**Status**: 📋 Planned
**Purpose**: Keep documentation synchronized with code changes

**Planned Capabilities**:
- Detect parameter changes in handlers
- Update corresponding .md files
- Generate documentation from TypeScript interfaces
- Verify examples still work
- Update README.md tool lists
- Maintain CHANGELOG.md

---

### ✅ mcp-validator (Planned)

**Status**: 📋 Planned
**Purpose**: Ensure MCP protocol compliance

**Planned Capabilities**:
- Validate tool parameter schemas
- Check tool response formats
- Verify resource URI patterns
- Test with MCP Inspector
- Validate error handling patterns

---

### 🎯 abap-standards-enforcer (Planned)

**Status**: 📋 Planned
**Purpose**: Enforce ABAP-specific development standards

**Planned Capabilities**:
- Verify ADT API endpoint patterns
- Check XML parsing implementations
- Validate ABAP object naming conventions
- Check ABAP Cloud compliance

---

## Quick Start

### Using an Agent

1. **Ensure Claude Code is running**:
   ```bash
   claude
   ```

2. **Invoke the agent**:
   ```bash
   "Use the [agent-name] agent to [task description]"
   ```

3. **Example**:
   ```bash
   "Use the pr-reviewer agent to review my current branch"
   ```

### Creating a New Agent

1. **Create agent definition file**:
   ```bash
   touch .claude/agents/your-agent-name.md
   ```

2. **Define agent capabilities** in the .md file:
   - Agent purpose and responsibilities
   - Review/analysis process
   - Output format
   - Examples

3. **Create configuration** (optional):
   ```bash
   touch .claude/agents/your-agent-name-config.json
   ```

4. **Add helper scripts** (optional):
   ```bash
   touch .claude/agents/run-your-agent.js
   ```

5. **Document the agent**:
   - Add entry to this README
   - Create usage guide if complex
   - Add examples

## Agent Development Guidelines

### Agent Definition Structure

Each agent definition (.md file) should include:

```markdown
# Agent Name

Brief description of the agent's purpose

## Your Responsibilities

1. **Responsibility 1**
   - Detail 1
   - Detail 2

2. **Responsibility 2**
   - Detail 1
   - Detail 2

## Process

### Step 1: [Action]
[Description and commands]

### Step 2: [Action]
[Description and commands]

## Output Format

[Expected output structure]

## Examples

[Practical examples]

## Tools You Should Use

- Tool 1: Purpose
- Tool 2: Purpose

## Important Notes

[Key considerations]
```

### Configuration Schema

```json
{
  "name": "agent-name",
  "version": "1.0.0",
  "description": "Brief description",
  "agent_file": "agent-name.md",
  "triggers": {
    "manual": true,
    "automatic": false
  },
  "checks": {
    "check_name": {
      "enabled": true,
      "severity": "critical|high|medium|low",
      "patterns": []
    }
  },
  "exclusions": {
    "files": [],
    "patterns": {}
  },
  "output": {
    "format": "markdown",
    "include_line_numbers": true
  }
}
```

### Best Practices

1. **Clear Purpose**: Agent should have a focused, well-defined purpose
2. **Actionable Output**: Provide specific, actionable recommendations
3. **Context Aware**: Use project-specific patterns and standards
4. **Examples**: Include practical examples of usage
5. **Tool Usage**: Leverage Claude Code's built-in tools effectively
6. **Error Handling**: Gracefully handle edge cases and errors
7. **Documentation**: Provide comprehensive usage documentation

## Integration with Development Workflow

### Git Hooks

Add agents to git hooks for automatic checks:

**.git/hooks/pre-commit**:
```bash
#!/bin/bash
node .claude/agents/run-pr-review.js --quick
```

**.git/hooks/pre-push**:
```bash
#!/bin/bash
node .claude/agents/run-pr-review.js --full
```

### VS Code Tasks

Add to **.vscode/tasks.json**:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "PR Review",
      "type": "shell",
      "command": "node .claude/agents/run-pr-review.js --full"
    }
  ]
}
```

### npm Scripts

Add to **package.json**:
```json
{
  "scripts": {
    "review": "node .claude/agents/run-pr-review.js",
    "review:full": "node .claude/agents/run-pr-review.js --full",
    "review:quick": "node .claude/agents/run-pr-review.js --quick",
    "analyze-issue": "node .claude/agents/run-issue-analyzer.js",
    "status": "node .claude/agents/run-maintainer-status.js",
    "status:detailed": "node .claude/agents/run-maintainer-status.js --detailed",
    "status:quick": "node .claude/agents/run-maintainer-status.js --quick"
  }
}
```

## Common Usage Patterns

### Pre-PR Review
```bash
# Before creating PR
npm run review:full
claude "Review my PR using pr-reviewer agent"
```

### Issue Analysis
```bash
# Before starting work
npm run analyze-issue -- --issue 42
claude "Analyze issue #42"

# From issue file
npm run analyze-issue -- --file issue-description.txt
```

### Pre-Implementation Planning
```bash
# Get implementation plan
npm run analyze-issue -- --issue 45
# Review the analysis report
# Follow the implementation plan when building
```

### Focused Review
```bash
# Focus on specific aspects
claude "Use pr-reviewer agent to check only TypeScript types and security"
```

### Iterative Development
```bash
# Quick checks during development
npm run review:quick
# Fix issues
# Full review before commit
npm run review:full
```

### Maintainer Workflow
```bash
# Daily check
npm run status:quick

# Review what needs attention
npm run status

# Get AI recommendations on priorities
claude "Check repository status and tell me what I should work on today"

# Review specific PR identified by status check
npm run review -- --branch feature-branch
```

## Troubleshooting

### Agent Not Loading

**Problem**: Claude Code doesn't recognize the agent

**Solutions**:
1. Check file exists: `.claude/agents/[agent-name].md`
2. Restart Claude Code
3. Use explicit path in prompt
4. Verify .md file format is correct

### Incorrect Results

**Problem**: Agent provides incorrect or incomplete analysis

**Solutions**:
1. Provide more context in prompt
2. Check agent configuration
3. Review exclusion patterns
4. Update agent definition

### Performance Issues

**Problem**: Agent takes too long to complete

**Solutions**:
1. Use focused reviews instead of full analysis
2. Exclude unnecessary files
3. Run checks in parallel
4. Optimize helper scripts

## Contributing

### Adding a New Agent

1. **Propose**: Open issue with agent proposal
2. **Design**: Create agent definition and configuration
3. **Implement**: Write agent .md file and helpers
4. **Test**: Test with various scenarios
5. **Document**: Add to this README and create guide
6. **PR**: Submit pull request

### Improving Existing Agents

1. **Identify**: Find limitation or improvement opportunity
2. **Update**: Modify agent definition or configuration
3. **Test**: Verify improvements work as expected
4. **Document**: Update relevant documentation
5. **PR**: Submit pull request with clear description

## Resources

- **Claude Code Documentation**: [Official Docs](https://docs.anthropic.com/claude/docs)
- **Claude Agent SDK**: [GitHub](https://github.com/anthropics/anthropic-sdk-typescript)
- **Contributing Guide**: [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **Project Standards**: [docs/ABAP_Standards.md](../../docs/ABAP_Standards.md)

## Version History

- **v1.0.0** (2024-03-05): Initial agents implementation
  - pr-reviewer agent (v1.0.0)
  - Agent infrastructure setup
  - Documentation and guidelines

- **v1.1.0** (2024-03-09): Issue analyzer agent
  - issue-analyzer agent (v1.0.0)
  - Automated issue clarity assessment
  - Feasibility analysis and implementation planning
  - Helper script and comprehensive documentation

- **v1.2.0** (2024-03-10): Maintainer status agent
  - maintainer-status agent (v1.0.0)
  - Repository health monitoring
  - PR and issue status tracking
  - Automated prioritization and recommendations
  - Quick, standard, and detailed reporting modes

- **v1.3.0** (2026-03-13): Risk review agent
  - risk-reviewer agent (v1.0.0)
  - Comprehensive operational and business risk assessment
  - 7 risk categories with severity ratings
  - Attack vector analysis and failure scenarios
  - Safeguard recommendations and mitigation planning
  - Helper script for PR, file, and branch analysis

## Related Issues

- [#46](https://github.tools.sap/D020426/mcp-abap-adt/issues/46) - Implement custom Claude Code agents

## License

These agents are part of the mcp-abap-adt project and follow the same MIT license.
