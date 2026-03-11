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

**Setup Steps:**
```bash
git clone https://github.tools.sap/D020426/mcp-abap-adt.git
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
      "command": "node",
      "args": ["C:/full/path/to/mcp-abap-adt/dist/index.js"],
      "disabled": false
    }
  }
}
```

**Example prompts:**
- "Show me class ZCL_MY_CLASS"
- "Search for objects starting with ZQMS*"
- "Get the transport history for class ZCL_TEST"
- "Run unit tests for ZCL_MY_CLASS"

---

### 2. sap-auth-mcp (SAP Authentication)

**Add to ~/.claude.json:**
```json
{
  "mcpServers": {
    "sap-auth-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "git+https://github.tools.sap/sfsfmcp/sap-auth-mcp.git"],
      "env": {
        "SAP_AUTH_ACCOUNT": "your.email@sap.com"
      },
      "type": "stdio"
    }
  }
}
```

**Example prompts:**
- "Authenticate with SAP system at https://my-sap.com:443/sap/bc/adt"
- "Check authentication cookie status"

---

### 3. sap-wiki (SAP Wiki Search)

**Add to ~/.claude.json:**
```json
{
  "mcpServers": {
    "sap-wiki": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "git+https://github.tools.sap/sfsfmcp/sap-wiki-mcp.git"],
      "env": {
        "AUTH_COOKIE_DIR": "C:/Users/<username>/tmp"
      },
      "type": "stdio"
    }
  }
}
```

**Example prompts:**
- "Search SAP Wiki for 'ABAP Cloud best practices'"
- "Find wiki pages about RAP development"
- "Get wiki content from https://wiki.one.int.sap/wiki/..."

---

## Complete Configuration Example

**Full ~/.claude.json with all MCP servers:**
```json
{
  "mcpServers": {
    "mcp-abap-adt": {
      "command": "node",
      "args": ["C:/path/to/mcp-abap-adt/dist/index.js"],
      "disabled": false
    },
    "sap-auth-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "git+https://github.tools.sap/sfsfmcp/sap-auth-mcp.git"],
      "env": {
        "SAP_AUTH_ACCOUNT": "your.email@sap.com"
      },
      "type": "stdio"
    },
    "sap-wiki": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "git+https://github.tools.sap/sfsfmcp/sap-wiki-mcp.git"],
      "env": {
        "AUTH_COOKIE_DIR": "C:/Users/YourUsername/tmp"
      },
      "type": "stdio"
    }
  }
}
```

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
| mcp-abap-adt | https://github.tools.sap/D020426/mcp-abap-adt |
| Claude API Docs | https://docs.anthropic.com/claude |
| MCP Protocol | https://modelcontextprotocol.io/ |

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
