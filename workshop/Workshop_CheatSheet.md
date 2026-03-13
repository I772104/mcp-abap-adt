# Claude Code & MCP Workshop - Cheat Sheet

## Quick Reference Guide for AI-Assisted ABAP Development

---

## Essential Commands

### Hyperspace LLM Proxy
```bash
# Check hai installation
hai --version

# Start proxy (required before using Claude)
hai proxy start

# Check proxy status
hai proxy status

# Stop proxy
hai proxy stop
```

### Claude Code CLI
```bash
# Start Claude Code
claude

# Start in specific directory
cd /path/to/project
claude

# Exit Claude Code
exit
# or press Ctrl+C
```

### Inside Claude Code Session
```
# Navigation
↑/↓         - Browse conversation history
Tab         - Autocomplete
Ctrl+C      - Cancel current operation
exit        - Exit Claude Code

# Useful commands
/help       - Show help
/clear      - Clear conversation history
/model      - Switch AI model (sonnet, opus, haiku)
```

---

## Configuration Files

### Location
- **Windows**: `C:\Users\<username>\.claude.json`
- **Linux/Mac**: `~/.claude.json`

### Basic Claude Config (~/.claude.json)
```json
{
  "mcpServers": {}
}
```

---

## MCP Server Configurations

### 1. mcp-abap-adt (ABAP Development)

**Prerequisites:**
- Git installed
- Node.js (v18+) installed
- SAP system access with ADT enabled
- SAP credentials

**Setup Steps:**
```bash
git clone https://github.tools.sap/<username>/mcp-abap-adt.git
cd mcp-abap-adt
npm install && npm run build
```

**Config file (.env in project root):**
```bash
SAP_URL=https://your-sap-system.com:8000
SAP_CLIENT=100
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
```

**Add to ~/.claude.json:**
```json
{
  "mcpServers": {
    "mcp-abap-adt": {
      "command": "cmd",
      "args": ["/c", "node", "C:\\Users\\<username>\\SAPDevelop\\mcp-abap-adt\\dist\\index.js"],
      "type": "stdio"
    }
  }
}
```

**Note:** Use double backslashes (`\\`) in the path or forward slashes (`/`). Replace `<username>` with your Windows username.

**Example prompts:**
- "Show me class ZCL_MY_CLASS"
- "Search for objects starting with ZQMS*"
- "Get the transport history for class ZCL_TEST"
- "Run unit tests for ZCL_MY_CLASS"

---

### 2. mcp-wiki (SAP Wiki Search)

**Prerequisites:**
- Git installed
- Bun runtime installed (https://bun.sh/)
- Access to SAP Wiki

**Setup Steps:**
```bash
git clone https://github.tools.sap/claude/mcp-wiki.git
cd mcp-wiki
```

**Add to ~/.claude.json:**
```json
{
  "mcpServers": {
    "mcp-wiki": {
      "command": "bun",
      "args": ["C:/Users/<username>/SAPDevelop/mcp-wiki/src/index.ts"],
      "env": {
        "WIKI_DOMAIN": "wiki.one.int.sap"
      },
      "type": "stdio"
    }
  }
}
```

**Note:** Use forward slashes (`/`) in the path. Replace `<username>` with your Windows username.

**Example prompts:**
- "Search SAP Wiki for 'ABAP Cloud best practices'"
- "Find wiki pages about RAP development"
- "Get wiki content from https://wiki.one.int.sap/wiki/..."

---

## Complete Configuration Example

**Full ~/.claude.json with both MCP servers:**
```json
{
  "mcpServers": {
    "mcp-abap-adt": {
      "command": "cmd",
      "args": ["/c", "node", "C:\\Users\\<username>\\SAPDevelop\\mcp-abap-adt\\dist\\index.js"],
      "type": "stdio"
    },
    "mcp-wiki": {
      "command": "bun",
      "args": ["C:/Users/<username>/SAPDevelop/mcp-wiki/src/index.ts"],
      "env": {
        "WIKI_DOMAIN": "wiki.one.int.sap"
      },
      "type": "stdio"
    }
  }
}
```

**Note:** Replace `<username>` with your actual Windows username in all paths.

---

## Troubleshooting

### hai proxy issues
```bash
# Check status
hai proxy status

# Restart proxy
hai proxy stop
hai proxy start

# Check logs
hai proxy logs
```

### Claude Code not starting
```bash
# Verify installation
claude --version

# Check configuration
# Edit ~/.claude.json and verify JSON syntax

# Test without MCP servers (comment them out)
```

### MCP server not loading
```bash
# Check path in .claude.json (must be absolute path)
# For mcp-abap-adt: verify npm build completed
cd /path/to/mcp-abap-adt
npm run build

# Check MCP server logs in Claude Code session
```

### SAP connection errors (mcp-abap-adt)
```bash
# Verify .env file exists in project root
# Check SAP_URL, SAP_CLIENT, credentials
# Test SAP system accessibility in browser
# For self-signed certs (dev only):
# Add to .env: NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

## Best Practices

### 1. Start Simple
- Install hai + Claude Code first
- Test basic functionality
- Add MCP servers one at a time

### 2. Security
- Never commit credentials to version control
- Use `.env` files for sensitive data
- Keep `.claude.json` secure (contains auth info)

### 3. Workflow
- Always start `hai proxy start` before `claude`
- Keep proxy running in background terminal
- Use project-specific directories for context

### 4. Effective Prompts
- Be specific: "Show class X" vs "Show me code"
- Ask for explanations: "Explain what this class does"
- Request actions: "Run tests", "Create a new class"
- Follow up: Build on previous responses

---

## Quick Links

| Resource | URL |
|----------|-----|
| Hyperspace Docs | https://pages.github.tools.sap/hAIperspace/hai-docs/ |
| mcp-abap-adt | https://github.tools.sap/<username>/mcp-abap-adt |
| mcp-wiki | https://github.tools.sap/claude/mcp-wiki |
| Claude API Docs | https://docs.anthropic.com/claude |
| MCP Protocol | https://modelcontextprotocol.io/ |

---

## Recommended Additional Software

### Pandoc (Document Converter)
**Install**: https://pandoc.org/installing.html or `winget install pandoc`

**Common conversions**:
```bash
# Markdown to HTML
pandoc document.md -o document.html

# Markdown to PDF (requires LaTeX)
pandoc document.md -o document.pdf

# With custom styling
pandoc document.md -s -o document.html --metadata title="Title"
```

### Other Tools
- **Git GUI**: GitHub Desktop, GitKraken, SourceTree
- **Markdown editors**: Typora, MarkText, VS Code + extensions
- **Terminal**: Windows Terminal (multiple tabs for proxy + Claude)
- **JSON validator**: jsonlint.com (validate .claude.json)

---

## Getting Help

1. **Check documentation** - Links above
2. **GitHub Issues** - For mcp-abap-adt bugs/features
3. **Team/Community** - Ask colleagues who use Claude Code
4. **Hyperspace Support** - For LLM proxy issues

---

## Keyboard Shortcuts (Claude Code)

| Key | Action |
|-----|--------|
| `↑` / `↓` | Browse history |
| `Tab` | Autocomplete |
| `Ctrl+C` | Cancel/Interrupt |
| `Ctrl+D` | Exit |
| `Enter` | Submit message |

---

**Remember**: Practice makes perfect! Start with simple queries and gradually explore more complex interactions.
