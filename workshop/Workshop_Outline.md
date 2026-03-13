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

**Prerequisites for Core Setup:**
- Node.js installed (v18+) - Check: `node --version`
- Windows laptop with admin rights
- SAP network access

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

**Prerequisites:**
- Git installed
- Node.js (v18+) installed
- SAP system access with ADT enabled
- SAP credentials (username/password for dev/test)

**Quick setup:**
```bash
# Clone repository
git clone https://github.tools.sap/<username>/mcp-abap-adt.git
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
    "command": "cmd",
    "args": ["/c", "node", "C:\\Users\\<username>\\SAPDevelop\\mcp-abap-adt\\dist\\index.js"],
    "type": "stdio"
  }
}
```

**Note:** Use double backslashes (`\\`) or forward slashes (`/`) in paths. Replace `<username>` with actual Windows username.

**Demo:** "Show me class ZCL_EXAMPLE_CLASS"

#### Option B: mcp-wiki (SAP Wiki Search)
**Use case:** AI assistant can search and fetch SAP Wiki content

**Prerequisites:**
- Git installed
- Bun runtime installed (https://bun.sh/)
- Access to SAP Wiki

**Quick setup:**
```bash
# Clone repository
git clone https://github.tools.sap/claude/mcp-wiki.git
cd mcp-wiki

# Add to ~/.claude.json mcpServers section
{
  "mcp-wiki": {
    "command": "bun",
    "args": ["C:/Users/<username>/SAPDevelop/mcp-wiki/src/index.ts"],
    "env": {
      "WIKI_DOMAIN": "wiki.one.int.sap"
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

### Core Setup (Required for Everyone)
- Windows laptop with admin rights
- SAP network access
- Node.js installed (v18+)
- Text editor (VS Code, Notepad++, etc.)

### Optional MCP Servers (Choose what you need)

**For mcp-abap-adt:**
- Git installed
- SAP system credentials
- Knowledge of your SAP system URL and client

**For mcp-wiki:**
- Git installed
- Bun runtime (https://bun.sh/)
- SAP Wiki access

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
   - mcp-abap-adt: https://github.tools.sap/<username>/mcp-abap-adt/issues
   - mcp-wiki: https://github.tools.sap/claude/mcp-wiki/issues
   - Hyperspace docs: https://pages.github.tools.sap/hAIperspace/hai-docs/
4. **Share feedback** with your team

---

## Support Resources

- **Hyperspace LLM Proxy**: https://pages.github.tools.sap/hAIperspace/hai-docs/
- **mcp-abap-adt Documentation**: https://github.tools.sap/<username>/mcp-abap-adt
- **mcp-wiki Documentation**: https://github.tools.sap/claude/mcp-wiki
- **Claude Code Official Docs**: https://docs.anthropic.com/claude/docs/claude-code
- **MCP Protocol**: https://modelcontextprotocol.io/

---

## Recommended Additional Software

### Pandoc (Document Converter)
- **Purpose**: Convert markdown to HTML, PDF, and other formats
- **Installation**: https://pandoc.org/installing.html
- **Use case**: Create formatted documentation from markdown files
- **Example**: `pandoc document.md -o document.html`

### Other Useful Tools
- Git GUI clients (GitHub Desktop, GitKraken)
- Markdown editors (Typora, VS Code with extensions)
- Windows Terminal (manage multiple sessions)
- JSON validators (jsonlint.com for config validation)

---

## Workshop Files

- **Cheat Sheet** (`Workshop_CheatSheet.md`) - Quick reference commands
- **Handout** (`Workshop_Handout.pdf`) - Take-home guide with setup instructions
- **Example Config** (`example_claude.json`) - Sample configuration file
