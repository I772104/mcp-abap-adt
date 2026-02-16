# Agent-Specific Quick Reference Files

This folder contains quick reference files for different AI coding assistants. Each file follows the conventions of its respective agent and provides agent-specific optimizations.

## 📚 Universal Guide First!

**All agents should read [../AGENTS.md](../AGENTS.md) first** - it contains the complete universal guide with:
- Complete resource and tool catalog
- Token-efficient workflow patterns
- Best practices for ABAP Cloud development
- RAP Business Object guidelines
- Common mistakes to avoid

## 🤖 Agent-Specific Files

### Cline
**File**: [.clinerules](.clinerules)

Cline automatically reads `.clinerules` files in the project root. This file provides:
- Task progress tracking with `task_progress` parameter
- XML tool formatting examples
- Quick access to Cline-specific MCP resource

**To use**: Copy `.clinerules` to your project root, or Cline will read it from here.

---

### Cursor
**File**: [.cursorrules](.cursorrules)

Cursor automatically reads `.cursorrules` files in the project root. This file provides:
- Multi-file editing capabilities
- Code completion features
- Refactoring support patterns

**To use**: Copy `.cursorrules` to your project root, or Cursor will read it from here.

---

### OpenCode
**File**: [.opencoderules](.opencoderules)

OpenCode automatically reads `.opencoderules` files in the project root. This file provides:
- Structured workflow patterns
- Test-driven development guidance
- Batch operation support

**To use**: Copy `.opencoderules` to your project root, or OpenCode will read it from here.

---

### Claude Desktop
**File**: [CLAUDE.md](CLAUDE.md)

Claude Desktop users should read this file for Claude-specific optimizations:
- Large context window utilization
- Complex structure understanding
- Comprehensive test generation

**To use**: Read this file or access the `agent-guide://claude` MCP resource.

---

## 🌟 Key Features

All agent files include:
- ✅ Reference to [../AGENTS.md](../AGENTS.md) for universal content
- ✅ Quick access to agent-specific MCP resource (`agent-guide://agent-name`)
- ✅ Agent-specific feature highlights
- ✅ Workflow prompt references
- ✅ Essential resource URIs
- ✅ Critical rules summary
- ✅ Quick reference examples

## 📊 File Sizes

| Agent | File | Size | Purpose |
|-------|------|------|---------|
| Cline | `.clinerules` | ~2K tokens | Quick reference |
| Cursor | `.cursorrules` | ~2K tokens | Quick reference |
| OpenCode | `.opencoderules` | ~2K tokens | Quick reference |
| Claude Desktop | `CLAUDE.md` | ~2K tokens | Quick reference |
| **Universal** | `../AGENTS.md` | ~50K tokens | Complete guide |

## 🎯 Usage Pattern

For any AI agent:
```
1. Read ../AGENTS.md (universal guide)
2. Read agent-specific file (if available)
3. Access agent-guide://auto MCP resource
4. Use MCP workflow prompts
5. Follow universal best practices
```

## 🔧 MCP Resources

All agents can access dynamic, cacheable guides through MCP resources:

```
# Auto-detect agent type
access_mcp_resource: uri=agent-guide://auto

# Specific agent guides
access_mcp_resource: uri=agent-guide://cline
access_mcp_resource: uri=agent-guide://claude
access_mcp_resource: uri=agent-guide://cursor
access_mcp_resource: uri=agent-guide://opencode
```

## 📝 Maintenance

- **Update universal content**: Edit [../AGENTS.md](../AGENTS.md)
- **Update agent-specific features**: Edit the respective file in this folder
- **Add new agent**: Create new file following the same pattern

---

*For complete documentation, always refer to [../AGENTS.md](../AGENTS.md)*