# Claude Code & MCP Workshop - 30 Minutes
## AI-Assisted ABAP Development at SAP

### Workshop Objective
Enable SAP developers to set up and use Claude Code CLI with MCP servers for AI-assisted ABAP development, with optional advanced MCP server installations.

---

## Agenda (30 minutes)

### Part 1: Introduction (5 minutes)
- **What is Claude Code CLI?** (2 min)
  - Official Anthropic CLI for AI-assisted coding
  - Approved for productive use at SAP with Hyperspace LLM Proxy
  - Command-line interface for conversational development

- **What is MCP (Model Context Protocol)?** (3 min)
  - Open standard for connecting AI assistants to data sources
  - Think of it as "plugins" for AI coding assistants
  - Benefits: Direct SAP system access, Wiki search, authentication helpers

### Part 2: Core Setup (10 minutes)
*Everyone should complete this section*

#### Step 1: Hyperspace LLM Proxy Setup (5 min)
- **Why needed?** LLM access gateway for SAP
- **Install hai CLI**
  - Link: https://pages.github.tools.sap/hAIperspace/hai-docs/
  - Quick test: `hai --version`

- **Configure Claude Code**
  - Edit `~/.claude.json` (home directory, hidden file)
  - Add Hyperspace proxy configuration
  - Test: `hai proxy start` → `claude`

#### Step 2: Claude Code Installation (5 min)
- **Install Claude Code CLI**
  - Follow official guide: https://pages.github.tools.sap/hAIperspace/hai-docs/llm-proxy/recipes/claude/
  - Verify: `claude --version`

- **First interaction**
  - Start: `claude`
  - Try: "What version of Node.js am I running?"
  - Exit: Type `exit` or Ctrl+C

### Part 3: Optional MCP Servers (10 minutes)
*Participants can choose which to install*

#### Option A: mcp-abap-adt (ABAP Development Tools)
**Use case:** AI assistant can read/write ABAP code, run tests, check transports

**Quick setup:**
```bash
# Clone repository
git clone https://github.tools.sap/D020426/mcp-abap-adt.git
cd mcp-abap-adt
npm install && npm run build

# Configure SAP connection (.env file)
SAP_URL=https://your-sap-system.com:8000
SAP_CLIENT=100
SAP_USERNAME=your_username  # Basic auth for dev/test
SAP_PASSWORD=your_password

# Add to ~/.claude.json mcpServers section
{
  "mcp-abap-adt": {
    "command": "node",
    "args": ["C:/path/to/mcp-abap-adt/dist/index.js"],
    "disabled": false
  }
}
```

**Demo:** "Show me class ZCL_EXAMPLE_CLASS"

#### Option B: sap-auth-mcp (SAP Authentication Helper)
**Use case:** SSO authentication for SAP systems with complex login flows

**Quick setup:**
```bash
# Add to ~/.claude.json mcpServers section
{
  "sap-auth-mcp": {
    "command": "cmd",
    "args": ["/c", "npx", "-y", "git+https://github.tools.sap/sfsfmcp/sap-auth-mcp.git"],
    "env": {
      "SAP_AUTH_ACCOUNT": "your.email@sap.com"
    },
    "type": "stdio"
  }
}
```

**Demo:** "Authenticate with SAP system at https://..."

#### Option C: sap-wiki (SAP Wiki Search)
**Use case:** AI assistant can search and fetch SAP Wiki content

**Quick setup:**
```bash
# Add to ~/.claude.json mcpServers section
{
  "sap-wiki": {
    "command": "cmd",
    "args": ["/c", "npx", "-y", "git+https://github.tools.sap/sfsfmcp/sap-wiki-mcp.git"],
    "env": {
      "AUTH_COOKIE_DIR": "/path/to/cookie/folder"
    },
    "type": "stdio"
  }
}
```

**Demo:** "Search SAP Wiki for 'ABAP Cloud'"

### Part 4: Live Demo & Q&A (5 minutes)
- **Live demonstration** (3 min)
  - Basic Claude Code interaction
  - MCP server in action (if time permits)
  - Show conversation history navigation

- **Q&A and troubleshooting** (2 min)
  - Common issues and solutions
  - Where to get help

---

## Prerequisites for Participants

### Required (Everyone)
- Windows laptop with admin rights
- SAP network access
- Node.js installed (v18+)
- Git installed
- Text editor (VS Code, Notepad++, etc.)

### Optional (For MCP servers)
- SAP system credentials (for mcp-abap-adt)
- Knowledge of your SAP system URL and client

---

## Key Takeaways

1. **Claude Code CLI** is approved for productive use at SAP via Hyperspace
2. **MCP servers** extend AI capabilities with SAP-specific integrations
3. **Start simple**: Core setup works immediately, add MCP servers as needed
4. **Resources available**: Documentation, examples, support channels

---

## Next Steps After Workshop

1. **Practice** with basic Claude Code commands
2. **Install one MCP server** that matches your workflow
3. **Join community**:
   - mcp-abap-adt: https://github.tools.sap/D020426/mcp-abap-adt/issues
   - Hyperspace docs: https://pages.github.tools.sap/hAIperspace/hai-docs/
4. **Share feedback** with your team

---

## Support Resources

- **Hyperspace LLM Proxy**: https://pages.github.tools.sap/hAIperspace/hai-docs/
- **mcp-abap-adt Documentation**: https://github.tools.sap/D020426/mcp-abap-adt
- **Claude Code Official Docs**: https://docs.anthropic.com/claude/docs/claude-code
- **MCP Protocol**: https://modelcontextprotocol.io/

---

## Workshop Files

- **Cheat Sheet** (`Workshop_CheatSheet.md`) - Quick reference commands
- **Handout** (`Workshop_Handout.pdf`) - Take-home guide with setup instructions
- **Example Config** (`example_claude.json`) - Sample configuration file
