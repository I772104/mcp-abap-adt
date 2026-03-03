# Agent-Specific Quick Reference

This folder contains lightweight quick reference files for different AI coding assistants.

---

## 📚 Start Here

**All agents should read [../AGENTS.md](../AGENTS.md) first** - it's a lightweight router that directs you to:
- Authentication setup
- Topic-specific workflow documentation
- Resource and tool catalogs
- Best practices and standards

---

## 🤖 Agent-Specific Files

### Claude Code / Claude Desktop
**File**: [CLAUDE.md](CLAUDE.md)

Lightweight guide with:
- Claude-specific strengths (large context, complex understanding, test generation)
- Quick access patterns
- Authentication troubleshooting
- Links to detailed workflow docs

### Cline
**File**: `.clinerules`

Auto-read by Cline, provides:
- Task progress tracking patterns
- XML tool formatting
- Quick access to workflows

**To use**: Copy to project root or Cline reads from here

### Cursor
**File**: `.cursorrules`

Auto-read by Cursor, provides:
- Multi-file editing patterns
- Code completion features
- Refactoring support

**To use**: Copy to project root or Cursor reads from here

### OpenCode
**File**: `.opencoderules`

Auto-read by OpenCode, provides:
- Structured workflow patterns
- Test-driven development
- Batch operation support

**To use**: Copy to project root or OpenCode reads from here

---

## 🎯 Usage Pattern

For any AI agent:
```
1. Read ../AGENTS.md (lightweight router)
2. Read agent-specific file (this folder)
3. Access detailed workflows as needed (../docs/workflows/)
4. Use MCP resources for dynamic guides (agent-guide://auto)
```

---

## 📁 Documentation Structure

```
Root
├── AGENTS.md                    Lightweight router (start here)
├── agents/
│   ├── CLAUDE.md               Claude-specific quick ref
│   ├── .clinerules             Cline quick ref
│   ├── .cursorrules            Cursor quick ref
│   └── .opencoderules          OpenCode quick ref
├── docs/workflows/
│   ├── ClassDevelopment.md     Detailed class workflow
│   ├── PackageDiscovery.md     Package navigation
│   ├── RAPAnalysis.md          RAP BO analysis
│   └── DataQuerying.md         Table/CDS querying
└── docs/
    ├── Resources.md            Complete resource catalog
    ├── RAP_Tools.md            RAP tools reference
    ├── ABAP_Standards.md       Naming conventions
    └── CDS_View_Performance.md Performance guidelines
```

---

## 🌟 Key Features

All agent files:
- ✅ Route to detailed documentation (not duplicate content)
- ✅ Provide agent-specific optimizations
- ✅ Link to workflow guides
- ✅ Reference MCP resources
- ✅ Quick access patterns

---

## 🔧 MCP Resources

Access dynamic, cacheable guides:

```
# Auto-detect agent type
access_mcp_resource: uri=agent-guide://auto

# Specific agent guides
access_mcp_resource: uri=agent-guide://cline
access_mcp_resource: uri=agent-guide://claude
access_mcp_resource: uri=agent-guide://cursor
access_mcp_resource: uri=agent-guide://opencode
```

---

## 📝 Maintenance

- **Add new workflow**: Create in `../docs/workflows/`, reference from `../AGENTS.md`
- **Update agent features**: Edit respective file in this folder
- **Add new agent**: Create new quick ref file, follow existing pattern
- **Avoid duplication**: Don't copy content from AGENTS.md or workflow docs

---

*For complete documentation → [../AGENTS.md](../AGENTS.md)*
