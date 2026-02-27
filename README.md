> [!CAUTION]
> **🚨 INTERNAL EVALUATION PROJECT - NOT FOR PRODUCTION USE 🚨**
>
> This project is an internal evaluation tool at SAP and is **NOT INTENDED TO BE PRODUCTIZED**. It is provided for SAP internal testing and evaluation purposes only. Do not use this in production environments or rely on it for critical business operations.
>
> This project is a clone of [https://github.com/mario-andreschak/mcp-abap-adt](https://github.com/mario-andreschak/mcp-abap-adt) to evaluate possible further capabilities of the server supporting SAP internal development use cases.
> The implementation might be straight forward and pragmatic and is not intended to follow standards nor specific quality requirements!
>
> **For AI Agents**: See [AGENTS.md](AGENTS.md) for comprehensive guidance on using this MCP server with AI coding assistants. Agent-specific quick reference files in the `agents/` folder:
>
> - **Cline**: [agents/.clinerules](agents/.clinerules)
> - **Claude Desktop**: [agents/CLAUDE.md](agents/CLAUDE.md)
> - **Cursor**: [agents/.cursorrules](agents/.cursorrules)
> - **OpenCode**: [agents/.opencoderules](agents/.opencoderules)
> - **All Others**: Use [AGENTS.md](AGENTS.md) directly
>
> Find an [Example AGENTS.md file](Example_AGENTS.md) for ABAP projects. Place it as AGENTS.md in the root folder of an ABAP project. See [agents.md](https://agents.md/) for reference.
>
> [Enhancement proposals for the MCP server are collected here.](Enhancement%20Proposal.md)
>
> Found a bug or have a feature request? Please check our [GitHub Issues](https://github.tools.sap/D020426/mcp-abap-adt/issues) page to report issues or request new features.

---

# mcp-abap-adt: Your Gateway to ABAP Development Tools (ADT)

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

<a href="https://glama.ai/mcp/servers/gwkh12xlu7">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/gwkh12xlu7/badge" alt="ABAP ADT MCP server" />
</a>

A Model Context Protocol (MCP) server that provides AI coding assistants with direct access to SAP ABAP systems through ABAP Development Tools (ADT). Think of it as a bridge that lets tools like Cline, Claude Code CLI, and other MCP clients interact with your ABAP system to retrieve source code, analyze structures, run tests, and more.

## 📑 Table of Contents

1. [Key Features](#key-features)
2. [Quick Start](#quick-start)
3. [Prerequisites](#prerequisites)
4. [Installation and Setup](#installation-and-setup)
5. [AI Agent Integration](#ai-agent-integration)
6. [Available Tools & Resources](#available-tools--resources)
7. [Running the Server Manually](#running-the-server-manually)
8. [Docker Deployment](#docker-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Contributing & Support](#contributing--support)

## Key Features

- 🔍 **Comprehensive ABAP Object Access**: Retrieve programs, classes, interfaces, functions, tables, structures, and more
- 🚀 **RAP Development Support**: Full support for CDS views, behavior definitions, service bindings, metadata extensions, and access control
- 🚚 **Transport & Version Control**: List transport requests, view version history, and compare object versions across transports
- 📦 **Batch Query Operations**: Query multiple tables or CDS views in a single call with advanced filtering and pagination
- 🧪 **Testing & Quality Assurance**: Execute unit tests, analyze coverage, validate syntax, and find object usages
- 🏗️ **Class Management**: Create, modify, activate, and delete ABAP classes directly from your AI assistant
- 📊 **RAP BO Analysis**: Comprehensive analysis of RAP Business Objects via cacheable MCP resources
- 🤖 **AI Agent Ready**: Optimized for Cline, Claude Code CLI, Cursor, OpenCode, and other MCP-compatible clients
- ☁️ **ABAP Cloud Compliant**: Built-in guidance for ABAP Cloud (Tier 1) development standards

## Quick Start

**For experienced developers** - get up and running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.tools.sap/D020426/mcp-abap-adt.git
cd mcp-abap-adt

# 2. Install dependencies and build
npm install && npm run build

# 3. Configure SAP credentials
cat > .env << EOF
SAP_URL=https://your-sap-system.com:8000
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
EOF

# 4. Add to your MCP client configuration (see AI Agent Integration section)

# 5. Start coding with AI assistance!
```

📚 **First time with MCP servers?** Continue reading for detailed step-by-step instructions.

## Prerequisites

Before you begin, ensure you have:

### SAP ABAP System Access

- System URL (e.g., `https://my-sap-system.com:8000`)
- Valid username and password
- SAP client number (e.g., `100`)
- ADT services activated in transaction `SICF` (specifically `/sap/bc/adt`)
- For `GetTableContents`: Custom service `/z_mcp_abap_adt/z_tablecontent` ([setup guide](https://community.sap.com/t5/application-development-blog-posts/how-to-use-rfc-read-table-from-javascript-via-webservice/ba-p/13172358))

### Development Tools

- **Git**: [Download Git](https://git-scm.com/downloads) or [GitHub Desktop](https://desktop.github.com/)
- **Node.js & npm**: [Download Node.js LTS](https://nodejs.org/en/download/) (includes npm)

**Verify installation:**

```bash
node -v  # Should show version number
npm -v   # Should show version number
```

## Installation and Setup

### 1. Clone the Repository

**Using Git (command line):**

```bash
cd Desktop  # Or your preferred directory
git clone https://github.tools.sap/D020426/mcp-abap-adt.git
cd mcp-abap-adt
```

**Using GitHub Desktop:**

1. Open GitHub Desktop
2. File → Clone Repository
3. URL tab → Paste repository URL
4. Choose local path → Clone

### 2. Install Dependencies

```bash
npm install
```

This downloads all required libraries (may take a few minutes).

### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript code into executable JavaScript.

### 4. Configure SAP Credentials

Create a `.env` file in the root directory:

```bash
SAP_URL=https://your-sap-system.com:8000
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
```

⚠️ **Important**:

- If your password contains `#`, enclose it in quotes: `SAP_PASSWORD="my#password"`
- Never commit `.env` to version control
- Keep this file secure

## LLM Access Setup (SAP Internal)

> **SAP Employees**: Before configuring MCP tools in your development environment, you must set up the Hyperspace AI Proxy to access LLM capabilities.

Most AI coding assistants (Cline, Claude Code CLI, Cursor, etc.) require LLM access to function. At SAP, this is provided through the Hyperspace AI Proxy.

### Setting Up Hyperspace AI Proxy

**Complete setup guide**: [Hyperspace AI Proxy Documentation](https://pages.github.tools.sap/hAIperspace/hai-docs/)

**Quick Overview:**

1. **Install the hai CLI** - Command-line tool for managing LLM proxy
2. **Configure your AI coding assistant** - Connect your tool (Cline, Claude Code, Cursor, etc.) to the proxy
3. **Start the proxy** - Run the proxy service before using AI tools

**Tool-Specific Guides:**

- **Claude Code CLI**: [Configure Claude Code with hai](https://pages.github.tools.sap/hAIperspace/hai-docs/llm-proxy/recipes/claude/)
- **Cline**: [Configure Cline with hai](https://pages.github.tools.sap/hAIperspace/hai-docs/llm-proxy/recipes/cline/)
- **Cursor**: [Configure Cursor with hai](https://pages.github.tools.sap/hAIperspace/hai-docs/llm-proxy/recipes/cursor/)
- **Other Tools**: Check the [Hyperspace documentation](https://pages.github.tools.sap/hAIperspace/hai-docs/) for additional integrations

⚠️ **Complete this setup first** before proceeding to configure the MCP server in your AI tool. Without LLM access, your AI coding assistant won't function.

## AI Agent Integration

This MCP server integrates with various AI coding assistants. Choose your preferred tool:

### Cline (VS Code Extension)

Cline is a VS Code extension that uses MCP servers for AI-assisted development.

**Setup:**

1. **Install Cline** extension in VS Code

2. **Open Cline Settings:**
   - VS Code Settings (Ctrl+,)
   - Search "Cline MCP Settings"
   - Click "Edit in settings.json"

3. **Add Server Configuration:**

   ```json
   {
     "mcpServers": {
       "mcp-abap-adt": {
         "command": "node",
         "args": ["C:/PATH_TO/mcp-abap-adt/dist/index.js"],
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

4. **Test Connection:**
   - Server appears in "MCP Servers" panel
   - Ask Cline to retrieve ABAP source code
   - Verify it uses the MCP server tools

📚 **For detailed Cline integration**, see [docs/Cline_Integration_Guide.md](docs/Cline_Integration_Guide.md)

### Claude Code CLI (SAP Internal)

> **SAP Employees Only**: Claude Code CLI is officially approved for productive code development at SAP when used with the Hyperspace LLM Proxy.

Claude Code CLI provides a command-line interface for AI-assisted coding.

**Prerequisites:**

- Claude Code CLI must be installed
- **hai CLI** must be installed and configured
- See [official Claude Code CLI guide](https://pages.github.tools.sap/hAIperspace/hai-docs/llm-proxy/recipes/claude/) for complete LLM proxy setup

**Setup:**

1. **Open Claude Code Settings:**
   Open file `.claude.json` in your user home folder in your default editor (note: it might be hidden, make sure to view hidden files)

2. **Add MCP Server Configuration:**
   Add to the `mcpServers` section (or add the whole section to the root of the json):

   ```json
   {
     "mcpServers": {
       "mcp-abap-adt": {
         "command": "node",
         "args": ["C:/PATH_TO/mcp-abap-adt/dist/index.js"],
         "disabled": false
       }
     }
   }
   ```

   Replace `C:/PATH_TO/` with the actual path to your cloned repository.

3. **Start Coding:**

   ```bash
   # Terminal 1: Start the proxy (if not already running)
   hai proxy start

   # Terminal 2: Launch Claude Code
   claude
   ```

4. **Test Connection:**
   - Server loads automatically when Claude Code starts
   - Ask Claude to retrieve ABAP source code
   - Verify it uses the MCP server tools

**Important Notes:**

- ✅ Production ready when used with Hyperspace LLM Proxy
- ✅ Only use Anthropic models (Haiku, Sonnet, Opus)
- ⚠️ Keep hai proxy running while using Claude Code CLI
- ⚠️ Use absolute paths in MCP configuration
- ⚠️ Do not login - use proxy authentication configured in settings.json

**Troubleshooting:**

- **MCP server not loading**: Check path in settings.json, ensure `npm run build` was executed
- **hai proxy issues**: Run `hai proxy status`, restart with `hai proxy start`
- **Configuration issues**: See [manual configuration guide](https://pages.github.tools.sap/hAIperspace/hai-docs/llm-proxy/recipes/claude/)

📚 **Complete documentation**: [Hyperspace LLM Proxy Claude Code CLI Guide](https://pages.github.tools.sap/hAIperspace/hai-docs/llm-proxy/recipes/claude/)

### Other AI Agents

This server works with any MCP-compatible client:

- **Cursor**: See [agents/.cursorrules](agents/.cursorrules)
- **OpenCode**: See [agents/.opencoderules](agents/.opencoderules)
- **Claude Desktop**: See [agents/CLAUDE.md](agents/CLAUDE.md)
- **Universal Guide**: See [AGENTS.md](AGENTS.md)

## Available Tools & Resources

### MCP Resources

Resources provide **cacheable, token-efficient** access to ABAP objects. Always prefer resources over tools when available.

| Resource URI                      | Description                      | Token Usage | Documentation                                                   |
| --------------------------------- | -------------------------------- | ----------- | --------------------------------------------------------------- |
| `abap://packages/top-level/names` | Lightweight package names list   | ~5K         | [TopLevelPackagesResource.md](docs/TopLevelPackagesResource.md) |
| `abap://packages/top-level`       | Complete top-level packages      | ~35K        | [TopLevelPackagesResource.md](docs/TopLevelPackagesResource.md) |
| `abap://package/{name}`           | Detailed package information     | ~2-5K       | [PackageResource.md](docs/PackageResource.md)                   |
| `rap-bo-analysis:///{bo_name}`    | Complete RAP BO analysis         | ~20-50K     | [RAP_Analysis_Resource.md](docs/RAP_Analysis_Resource.md)       |
| `abap://class/{name}`             | ABAP class source code           | Varies      | [Resources.md](docs/Resources.md)                               |
| `abap://cds/{name}`               | CDS view source and metadata     | Varies      | [Resources.md](docs/Resources.md)                               |
| `abap://table/{name}`             | Database table structure         | Varies      | [Resources.md](docs/Resources.md)                               |
| `cds-view-data:///{name}?params`  | CDS view data with filtering     | Varies      | [Resources.md](docs/Resources.md)                               |
| `agent-guide://auto`              | Auto-detect agent-specific guide | ~15K        | [AGENTS.md](AGENTS.md)                                          |

📚 **Complete resource documentation**: [docs/Resources.md](docs/Resources.md)

### Core ABAP Object Retrieval

Retrieve source code and definitions from your ABAP system.

| Tool                 | Description                                          | Documentation                                       |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `GetProgram`         | Retrieve ABAP program source code                    | [GetProgram.md](docs/GetProgram.md)                 |
| `GetClass`           | Retrieve ABAP class definition and implementation    | [GetClass.md](docs/GetClass.md)                     |
| `GetInterface`       | Retrieve ABAP interface source code                  | [GetInterface.md](docs/GetInterface.md)             |
| `GetInclude`         | Retrieve ABAP include program source                 | [GetInclude.md](docs/GetInclude.md)                 |
| `GetFunction`        | Retrieve function module source code                 | [GetFunction.md](docs/GetFunction.md)               |
| `GetFunctionGroup`   | Retrieve entire function group source                | [GetFunctionGroup.md](docs/GetFunctionGroup.md)     |
| `GetTable`           | Retrieve database table structure and metadata       | [GetTable.md](docs/GetTable.md)                     |
| `GetStructure`       | Retrieve DDIC structure definitions                  | [GetStructure.md](docs/GetStructure.md)             |
| `GetTypeInfo`        | Retrieve ABAP type information                       | -                                                   |
| `GetPackage`         | Retrieve package details and contained objects       | [GetPackage.md](docs/GetPackage.md)                 |
| `GetPackageContents` | List objects within a package                        | [GetPackageContents.md](docs/GetPackageContents.md) |
| `GetTransaction`     | Retrieve transaction code details                    | [GetTransaction.md](docs/GetTransaction.md)         |
| `SearchObject`       | Search for ABAP objects using wildcards (e.g., `Z*`) | [SearchObject.md](docs/SearchObject.md)             |

### Data Query & Analysis

Query table and CDS view data with advanced filtering and batch operations.

| Tool                 | Description                                                    | Documentation                                       |
| -------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `GetTableContents`   | Query table data with filtering, pagination, and batch support | [GetTableContents.md](docs/GetTableContents.md)     |
| `GetCDSViewContents` | Query CDS view data with parameters and filtering              | [GetCDSViewContents.md](docs/GetCDSViewContents.md) |

**Key Features:**

- Advanced WHERE conditions (equality operator)
- Column selection and ordering
- Pagination with offset
- Batch queries (multiple tables/views in one call)
- Column metadata inclusion

### Transport & Version Control

Manage transport requests and track version history across your ABAP landscape. **NEW**: Improved tools with automatic task/request hierarchy handling, formatted output, and **direct version comparison**.

| Tool                        | Description                                                      | Documentation                                                 |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| `GetTransportVersions` ⭐   | **Quick analysis**: Combines transport + version analysis in one command | [GetTransportVersions.md](docs/GetTransportVersions.md) |
| `CompareObjectVersions` ⭐  | **Compare versions**: Shows exactly what changed between two versions (unified diff, side-by-side, or summary) | [CompareObjectVersions.md](docs/CompareObjectVersions.md) |
| `ListUserTransports`        | List ALL transport requests for a user (modifiable + released) with optional date filtering | [ListUserTransports.md](docs/ListUserTransports.md)           |
| `GetTransportRequest`       | Show transport hierarchy, objects, and next steps (formatted output) | [GetTransportRequest.md](docs/GetTransportRequest.md)    |
| `GetVersionHistory`         | View version history with transport hierarchy guidance          | [GetVersionHistory.md](docs/GetVersionHistory.md)             |

**Key Capabilities:**

- **Direct version comparison** - see exact changes with unified diff, side-by-side, or summary formats
- **Automatic task/parent request hierarchy detection** - no manual investigation needed
- **Intelligent version filtering** - automatically skips test transports and untransported versions
- **Formatted, human-readable output** - clear hierarchy visualization with guided next steps
- **Complete workflow documentation** - see [TRANSPORT_WORKFLOWS.md](docs/TRANSPORT_WORKFLOWS.md)
- **Date-filtered transport listing** - efficiently find recent transports with `from_date` parameter (avoids token waste)
- Filter transport requests by user, status, and target system
- View detailed transport contents including all objects, tasks, and locks
- View complete version history including dates, authors, and transport numbers
- Support for classes, programs, function groups, interfaces, CDS views, and more

**Typical Workflows:**

*Quick Analysis (Recommended):*
1. `GetTransportVersions` - One command to analyze what changed in a transport
   - Automatically handles task → parent request hierarchy
   - Finds the relevant version and suggests comparison
2. `CompareObjectVersions` - See exactly what changed (one command instead of manual diff)
   - Choose format: unified (git diff), side-by-side, or summary

*Step-by-Step Analysis:*
1. `GetTransportRequest` - Understand transport hierarchy and see all objects
2. `GetVersionHistory` - View version history (look for parent request if analyzing a task)
3. `CompareObjectVersions` - Compare versions directly to see exact changes

*Finding Changes by User:*
1. `ListUserTransports` - Find ALL transports for a specific user (add `from_date` parameter for recent transports)
2. `GetTransportVersions` - Analyze each transport quickly
3. `CompareObjectVersions` - Review changes in detail

📚 **Complete Workflow Guide**: See [docs/TRANSPORT_WORKFLOWS.md](docs/TRANSPORT_WORKFLOWS.md) for:
- SAP transport hierarchy explanation (Request → Task → Objects)
- 4 step-by-step workflows with examples
- Common pitfalls and how to avoid them
- Version numbering patterns for different object types

### RAP Development Tools

Full support for RESTful ABAP Programming (RAP) development.

| Tool                    | Description                                          | Documentation                     |
| ----------------------- | ---------------------------------------------------- | --------------------------------- |
| `GetCDSView`            | Retrieve CDS view source code and annotations        | [RAP_Tools.md](docs/RAP_Tools.md) |
| `GetBehaviorDefinition` | Retrieve RAP behavior definition source              | [RAP_Tools.md](docs/RAP_Tools.md) |
| `GetServiceDefinition`  | Retrieve RAP service definition source               | [RAP_Tools.md](docs/RAP_Tools.md) |
| `GetServiceBinding`     | Retrieve RAP service binding details                 | [RAP_Tools.md](docs/RAP_Tools.md) |
| `GetMetadataExtension`  | Retrieve metadata extension (UI annotations)         | [RAP_Tools.md](docs/RAP_Tools.md) |
| `GetAccessControl`      | Retrieve access control (DCL) definition             | [RAP_Tools.md](docs/RAP_Tools.md) |
| `GetBehaviorForRapBo`   | Retrieve interface behavior for RAP Business Objects | [RAP_Tools.md](docs/RAP_Tools.md) |
| `SearchRapBo`           | Search RAP Business Objects by description           | [RAP_Tools.md](docs/RAP_Tools.md) |

📚 **Complete RAP tools documentation**: [docs/RAP_Tools.md](docs/RAP_Tools.md)

### Class Management Tools

Create, modify, and manage ABAP classes directly.

| Tool               | Description                                          | Documentation                                   |
| ------------------ | ---------------------------------------------------- | ----------------------------------------------- |
| `CreateClass`      | Create new ABAP class in local package ($TMP)        | [CreateClass.md](docs/CreateClass.md)           |
| `CreateClassTests` | Create or replace test classes within existing class | [CreateClassTests.md](docs/CreateClassTests.md) |
| `ActivateClasses`  | Activate one or multiple ABAP classes                | [ActivateClasses.md](docs/ActivateClasses.md)   |
| `CheckSyntax`      | Validate ABAP source code syntax                     | [CheckSyntax.md](docs/CheckSyntax.md)           |
| `DeleteLocalClass` | Delete local ABAP class (Z/Y classes only)           | [DeleteLocalClass.md](docs/DeleteLocalClass.md) |

**Typical Workflow:**

1. `CheckSyntax` - Validate class source code
2. `CreateClass` - Create the class (auto_activate: false)
3. `CheckSyntax` - Validate test source code
4. `CreateClassTests` - Add unit tests
5. `RunClassTests` - Execute tests
6. `ActivateClasses` - Activate after tests pass

📚 **Auto-activation guide**: [docs/AutoActivation.md](docs/AutoActivation.md)

### Testing & Quality Assurance

Execute tests, analyze coverage, validate quality, and ensure ABAP Cloud compliance.

| Tool                  | Description                                                       | Documentation                                       |
| --------------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| `GetClassTests`       | Retrieve local test classes from a class                          | [GetClassTests.md](docs/GetClassTests.md)           |
| `RunClassTests`       | Execute unit tests and retrieve results                           | [RunClassTests.md](docs/RunClassTests.md)           |
| `RunPackageTests`     | Execute tests for all objects in a package                        | [RunPackageTests.md](docs/RunPackageTests.md)       |
| `GetClassCoverage`    | Run tests and retrieve code coverage metrics                      | [GetClassCoverage.md](docs/GetClassCoverage.md)     |
| `GetObjectUsages`     | Find where-used list for ABAP objects (classes, interfaces, etc.) | [GetObjectUsages.md](docs/GetObjectUsages.md)       |
| `GetClassUsages`      | Find where ABAP classes are used (convenience wrapper)            | [GetClassUsages.md](docs/GetClassUsages.md)         |
| `GetAPIReleaseState`  | Check if APIs are released for ABAP Cloud (Tier 1)                | [GetAPIReleaseState.md](docs/GetAPIReleaseState.md) |
| `RunATCCheck`         | Execute ATC quality checks programmatically                       | [RunATCCheck.md](docs/RunATCCheck.md)               |

**Coverage Targets:**

- RAP Behavior Implementation: 80% minimum, 90% target
- Business Logic Classes: 70% minimum, 85% target
- Utility/Helper Classes: 60% minimum, 75% target

**Quality Pipeline:**

```
CheckSyntax → GetAPIReleaseState → RunATCCheck → RunClassTests
     ↓              ↓                   ↓              ↓
  Syntax OK    APIs Released      Quality OK      Tests Pass
                                                       ↓
                                              Approved for Transport
```

## Running the Server Manually

Typically, you don't run this server standalone - it's integrated into MCP clients. However, you can run it manually for testing:

### Standalone Mode

```bash
npm run start
```

Server starts and waits for MCP client connections.

### Development/Debug Mode (with Inspector)

```bash
npm run dev
```

Opens MCP Inspector at `http://localhost:5173` for interactive testing.

**Using the Inspector:**

1. Open the URL in your browser
2. Click "Connect" on the left
3. Click "Tools" → "List Tools"
4. Select a tool (e.g., GetProgram)
5. Enter parameters and test

## Docker Deployment

Deploy the MCP server using Docker for containerized environments.

### Build and Run

```bash
# Build the image
docker build -t mcp-abap-adt .

# Run with environment variables
docker run -d \
  -e SAP_URL=https://your-sap-system.com:8000 \
  -e SAP_USERNAME=your_username \
  -e SAP_PASSWORD=your_password \
  -e SAP_CLIENT=100 \
  -p 5173:5173 \
  mcp-abap-adt
```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: "3.8"
services:
  mcp-abap-adt:
    build: .
    environment:
      - SAP_URL=https://your-sap-system.com:8000
      - SAP_USERNAME=your_username
      - SAP_PASSWORD=your_password
      - SAP_CLIENT=100
    ports:
      - "5173:5173"
```

Run with:

```bash
docker-compose up -d
```

📚 **Advanced configuration**: See [Dockerfile](Dockerfile)

## Troubleshooting

### Common Issues

**Node.js/npm not found:**

- Verify installation: `node -v` and `npm -v`
- Ensure Node.js is in your system PATH
- Reinstall Node.js if needed

**npm install fails:**

- Check internet connection
- Delete `node_modules` folder and retry
- Configure proxy if behind corporate firewall: [npm proxy settings](https://docs.npmjs.com/cli/v7/using-npm/config#proxy)

**MCP client doesn't connect:**

- Verify correct absolute path in client configuration
- Ensure server is built: `npm run build`
- Restart your MCP client (VS Code, etc.)
- Check server logs for errors

**SAP connection errors:**

- Verify credentials in `.env` file
- Ensure SAP system is accessible from your network
- Check user authorizations for ADT services
- Verify ADT services are active in transaction `SICF`
- For self-signed certificates, set `NODE_TLS_REJECT_UNAUTHORIZED=0` (development only!)

**Tool-specific issues:**

- Check tool documentation in `docs/` folder
- Verify object names and parameters
- Review error messages for specific guidance

### Getting Help

- 📖 **Documentation**: Check `docs/` folder for detailed guides
- 🐛 **Bug Reports**: [GitHub Issues](https://github.tools.sap/D020426/mcp-abap-adt/issues)
- 💡 **Feature Requests**: [Enhancement Proposals](Enhancement%20Proposal.md)
- 📝 **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## Contributing & Support

### For SAP Internal Users

This is an internal evaluation project. Contributions and feedback are welcome:

1. **Report Issues**: Use [GitHub Issues](https://github.tools.sap/D020426/mcp-abap-adt/issues)
2. **Suggest Features**: Add to [Enhancement Proposals](Enhancement%20Proposal.md)
3. **Share Feedback**: Help us improve the server for SAP development use cases

### Documentation

- **AI Agent Guide**: [AGENTS.md](AGENTS.md) - Comprehensive guide for AI coding assistants
- **Agent-Specific Guides**: `agents/` folder - Optimized guides for specific AI agents
- **Tool Documentation**: `docs/` folder - Detailed documentation for each tool
- **Example Project**: [Example_AGENTS.md](Example_AGENTS.md) - Sample AGENTS.md for ABAP projects

### Standards & Best Practices

- **ABAP Standards**: [docs/ABAP_Standards.md](docs/ABAP_Standards.md)
- **CDS Performance**: [docs/CDS_View_Performance.md](docs/CDS_View_Performance.md)
- **RAP Development**: [docs/RAP_Tools.md](docs/RAP_Tools.md)

### Version Information

- **Current Version**: 1.1.0
- **License**: MIT
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

_This MCP server bridges the gap between AI coding assistants and SAP ABAP systems, enabling intelligent, context-aware development workflows._
