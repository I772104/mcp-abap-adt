# Claude Code & MCP Workshop - Participant Handout
## AI-Assisted ABAP Development at SAP

**Workshop Date**: _____________
**Instructor**: _____________
**Duration**: 30 minutes

---

## What You'll Learn Today

This workshop introduces you to Claude Code CLI, Anthropic's official AI coding assistant approved for productive use at SAP. You'll learn how to set up the core tools and optionally extend them with MCP (Model Context Protocol) servers for SAP-specific integrations.

### Key Concepts

**Claude Code CLI**: A command-line AI assistant for conversational software development
- Approved for productive use at SAP with Hyperspace LLM Proxy
- Works with your files and folders
- Understands context and can make code changes

**MCP (Model Context Protocol)**: Open standard for connecting AI assistants to data sources
- Think of it as "plugins" for AI coding assistants
- Extends Claude's capabilities with SAP system access
- Optional but powerful additions

---

## Part 1: Core Setup (Required for Everyone)

### Step 1: Install Hyperspace LLM Proxy

The Hyperspace LLM Proxy provides LLM access for Claude Code at SAP.

#### Installation
1. Visit: https://pages.github.tools.sap/hAIperspace/hai-docs/
2. Follow installation instructions for `hai CLI`
3. Verify installation:
   ```bash
   hai --version
   ```

#### Configure Claude Code
1. Find the specific guide: https://pages.github.tools.sap/hAIperspace/hai-docs/llm-proxy/recipes/claude/
2. Follow configuration steps to edit `~/.claude.json`
3. Test the proxy:
   ```bash
   # Terminal 1: Start proxy
   hai proxy start

   # Terminal 2: Launch Claude Code
   claude
   ```

**✅ Checkpoint**: You should see Claude Code start successfully and respond to basic questions.

---

### Step 2: Your First Claude Code Interaction

#### Starting Claude Code
```bash
# Navigate to your project folder
cd C:\path\to\your\project

# Start Claude Code
claude
```

#### Try These Commands
```
# In Claude Code session:
What version of Node.js am I running?
List the files in the current directory
Show me the README file
```

#### Exiting Claude Code
- Type: `exit`
- Or press: `Ctrl+C`

**✅ Checkpoint**: Claude Code responds to your queries and can read files.

---

## Part 2: Optional MCP Server Setup

Choose one or more MCP servers to extend Claude's capabilities. You can add more later!

### Option A: mcp-abap-adt (ABAP Development Tools)

**What it does**: Allows Claude to read ABAP code, run tests, check transports, and more.

#### Setup Steps

1. **Clone and build** (one-time setup):
   ```bash
   cd C:\Users\<username>\SAPDevelop
   git clone https://github.tools.sap/D020426/mcp-abap-adt.git
   cd mcp-abap-adt
   npm install
   npm run build
   ```

2. **Configure SAP connection**:
   Create `.env` file in `mcp-abap-adt` folder:
   ```bash
   SAP_URL=https://your-sap-system.com:8000
   SAP_CLIENT=100
   SAP_USERNAME=your_username
   SAP_PASSWORD=your_password
   ```

   **⚠️ Important**: Keep this file secure, never commit to Git!

3. **Add to Claude Code config**:
   Edit `~/.claude.json` (Windows: `C:\Users\<username>\.claude.json`):
   ```json
   {
     "mcpServers": {
       "mcp-abap-adt": {
         "command": "node",
         "args": ["C:/Users/<username>/SAPDevelop/mcp-abap-adt/dist/index.js"],
         "disabled": false
       }
     }
   }
   ```

   **Replace** `<username>` with your actual Windows username!

4. **Restart Claude Code** to load the MCP server

#### Testing
Try these prompts in Claude Code:
```
Search for ABAP objects starting with Z*
Show me class ZCL_YOUR_CLASS
Get the transport history for ZCL_YOUR_CLASS
```

**✅ Checkpoint**: Claude can access your SAP system and retrieve ABAP code.

---

### Option B: sap-auth-mcp (SAP Authentication Helper)

**What it does**: Handles SSO authentication for SAP systems with complex login flows.

#### Setup Steps

1. **Add to Claude Code config**:
   Edit `~/.claude.json`:
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

2. **Restart Claude Code**

#### Testing
```
Authenticate with SAP system at https://your-sap-system.com:8000/sap/bc/adt?sap-client=100
```

**✅ Checkpoint**: Claude opens browser for authentication and saves cookies.

---

### Option C: sap-wiki (SAP Wiki Search)

**What it does**: Searches and retrieves content from SAP's internal Wiki.

#### Setup Steps

1. **Create cookie storage folder**:
   ```bash
   mkdir C:\Users\<username>\tmp
   ```

2. **Add to Claude Code config**:
   Edit `~/.claude.json`:
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

3. **Restart Claude Code**

#### Testing
```
Search SAP Wiki for "ABAP Cloud best practices"
Find wiki pages about RAP development
```

**✅ Checkpoint**: Claude can search and retrieve Wiki content.

---

## Combining Multiple MCP Servers

You can use all three MCP servers together! Here's the complete config:

**~/.claude.json**:
```json
{
  "mcpServers": {
    "mcp-abap-adt": {
      "command": "node",
      "args": ["C:/Users/<username>/SAPDevelop/mcp-abap-adt/dist/index.js"],
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
        "AUTH_COOKIE_DIR": "C:/Users/<username>/tmp"
      },
      "type": "stdio"
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "hai command not found"
- **Solution**: Reinstall hai CLI, check PATH environment variable

#### 2. Claude Code doesn't start
- **Check**: `claude --version` works
- **Check**: `~/.claude.json` has valid JSON syntax (use https://jsonlint.com/)
- **Try**: Comment out MCP servers temporarily to isolate issue

#### 3. MCP server not loading
- **Check**: Absolute paths in config (not relative paths like `./` or `../`)
- **For mcp-abap-adt**: Run `npm run build` again in project folder
- **Check**: Windows username is correct in paths

#### 4. SAP connection fails (mcp-abap-adt)
- **Check**: `.env` file exists in `mcp-abap-adt` folder
- **Check**: SAP_URL, SAP_CLIENT, credentials are correct
- **Check**: SAP system is accessible (try in browser)
- **Check**: ADT services active (transaction `SICF`, path `/sap/bc/adt`)

#### 5. "hai proxy not running"
- **Solution**:
  ```bash
  hai proxy start
  # Keep this terminal open
  # Open new terminal for Claude Code
  claude
  ```

---

## Best Practices

### Security
- ✅ Use `.env` files for credentials (never commit to Git)
- ✅ Keep `~/.claude.json` secure
- ✅ Use Basic Auth for dev/test, SSO for production systems
- ❌ Don't share credentials in chat or commits

### Workflow
1. Start `hai proxy start` (keep running)
2. Open new terminal
3. Navigate to project: `cd /path/to/project`
4. Start Claude: `claude`
5. Work with AI assistant

### Effective Prompts
- **Be specific**: "Show me class ZCL_MY_CLASS" vs "Show me code"
- **Ask for context**: "Explain what this class does"
- **Request actions**: "Run unit tests for this class"
- **Iterate**: Build on previous responses, ask follow-up questions

---

## Next Steps

### After the Workshop
1. **Practice** with basic Claude Code commands
2. **Install one MCP server** that matches your workflow
3. **Try real work tasks** - start simple, build confidence
4. **Share learnings** with your team

### Learning Resources
- **Hyperspace Docs**: https://pages.github.tools.sap/hAIperspace/hai-docs/
- **mcp-abap-adt GitHub**: https://github.tools.sap/D020426/mcp-abap-adt
  - Full documentation in `docs/` folder
  - Examples and use cases
  - Report issues or suggest features
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Claude API Docs**: https://docs.anthropic.com/claude

### Get Help
1. Check documentation (links above)
2. GitHub Issues for mcp-abap-adt: https://github.tools.sap/D020426/mcp-abap-adt/issues
3. Ask colleagues who use Claude Code
4. Hyperspace support for LLM proxy issues

---

## Workshop Checklist

### ✅ I completed:
- [ ] Installed hai CLI
- [ ] Configured Hyperspace LLM Proxy
- [ ] Installed Claude Code CLI
- [ ] Had first successful Claude Code interaction
- [ ] (Optional) Installed mcp-abap-adt
- [ ] (Optional) Installed sap-auth-mcp
- [ ] (Optional) Installed sap-wiki
- [ ] Tested at least one MCP server
- [ ] Understand how to get help

### 📝 My Notes:
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

## Quick Command Reference

```bash
# Hyperspace proxy
hai proxy start        # Start proxy (required)
hai proxy status       # Check status
hai proxy stop         # Stop proxy

# Claude Code
claude                 # Start Claude Code
exit                   # Exit (or Ctrl+C)

# Inside Claude Code
/help                  # Show help
/model                 # Switch AI model
/clear                 # Clear history

# MCP server rebuild (if needed)
cd mcp-abap-adt
npm run build
```

---

**Questions?** Ask the instructor or check the resources above!

**Workshop complete!** 🎉 Now go build something amazing with AI assistance!
