# Agents - Quick Reference

## Available Agents

### 🔍 pr-reviewer
**Purpose**: Review pull requests for code quality

### 📋 issue-analyzer
**Purpose**: Analyze GitHub issues for clarity and feasibility

---

## 🚀 PR Reviewer Commands

```bash
# Standard review
npm run review

# Full review (with tests)
npm run review:full

# Quick review (no tests)
npm run review:quick

# Direct with Claude Code
claude "Review my PR using pr-reviewer agent"
```

## 🔍 Issue Analyzer Commands

```bash
# By issue number
npm run analyze-issue -- --issue 42

# By URL
npm run analyze-issue -- --url https://github.com/user/repo/issues/42

# From file
npm run analyze-issue -- --file issue.txt

# Direct with Claude Code
claude "Analyze issue #42 using issue-analyzer agent"
```

---

## 📋 What PR Reviewer Checks

| Check | Severity | Description |
|-------|----------|-------------|
| 🚨 TypeScript Types | Critical | Detects `any` types |
| 🚨 Test Coverage | Critical | 70% handlers, 80% utilities |
| 🚨 Security | Critical | Credentials, secrets, URLs |
| ⚠️ Commit Messages | High | Conventional commits format |
| ⚠️ Documentation | High | New tools need docs |
| ⚠️ Handler Structure | High | 5-step pattern compliance |
| 💡 ABAP Patterns | Medium | ADT API usage |

## 🔧 Configuration

Edit: `.claude/agents/pr-reviewer-config.json`

```json
{
  "checks": {
    "typescript_types": { "enabled": true, "severity": "critical" },
    "commit_messages": { "enabled": true, "severity": "high" }
  }
}
```

## 📚 Documentation

### PR Reviewer
- **Full Guide**: `.claude/agents/PR_REVIEWER_GUIDE.md`
- **Agent Definition**: `.claude/agents/pr-reviewer.md`

### Issue Analyzer
- **Full Guide**: `.claude/agents/ISSUE_ANALYZER_GUIDE.md`
- **Quick Start**: `.claude/agents/ISSUE_ANALYZER_QUICK.md`
- **Agent Definition**: `.claude/agents/issue-analyzer.md`

### General
- **Agents Overview**: `.claude/agents/README.md`
- **Architecture**: `.claude/agents/ARCHITECTURE.md`

## 🎯 Common Use Cases

### Before Creating PR
```bash
npm run review:full
claude "Review my changes before I create a PR"
```

### Before Starting Work on Issue
```bash
npm run analyze-issue -- --issue 42
# Review analysis report, then start implementation
```

### Issue Triage
```bash
npm run analyze-issue -- --issue 45
# Determine if issue needs clarification
# Generate questions to ask
```

### Quick Check During Development
```bash
npm run review:quick
```

### Focus on Specific Issues
```bash
claude "Check my code for any types and security issues only"
```

### Review Specific Files
```bash
claude "Review these files: src/handlers/handleNewTool.ts"
```

### Compare Implementation Approaches
```bash
claude "Analyze issue #50 and propose 3 different implementation approaches"
```

## 🐛 Troubleshooting

**Agent not found?**
- Check `.claude/agents/pr-reviewer.md` exists
- Restart Claude Code

**No changes detected?**
- Ensure you're on a feature branch
- Check commits exist: `git log main..HEAD`

**Coverage not detected?**
- Run `npm test -- --coverage` first
- Check `coverage/` directory exists

## 💡 Pro Tips

1. **Self-review first** - Fix obvious issues before agent review
2. **Iterative** - Review → Fix → Review again
3. **Focused reviews** - Specify what to check for faster results
4. **Document decisions** - Explain non-obvious choices in comments

## 🔗 Related

- Issue: [#46](https://github.tools.sap/D020426/mcp-abap-adt/issues/46)
- Branch: `feature/custom-claude-agents`
- Contributing: `CONTRIBUTING.md`
