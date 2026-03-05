# PR Reviewer Agent - Quick Reference

## 🚀 Quick Commands

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

## 📋 What It Checks

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

- **Full Guide**: `.claude/agents/PR_REVIEWER_GUIDE.md`
- **Agents Overview**: `.claude/agents/README.md`
- **Implementation**: `.claude/agents/IMPLEMENTATION_SUMMARY.md`

## 🎯 Common Use Cases

### Before Creating PR
```bash
npm run review:full
claude "Review my changes before I create a PR"
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
