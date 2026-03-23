# Authentication Guide

This guide explains how to authenticate with your SAP system when using the mcp-abap-adt server.

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [Quick Start](#quick-start)
- [Basic Authentication (Default)](#basic-authentication-default)
- [SSO Authentication (Alternative Option)](#sso-authentication-alternative-option)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)

## Overview

The mcp-abap-adt server supports two authentication methods:

1. **Basic Authentication** - Uses username and password (default method)
2. **SSO Authentication** - Uses cookies from browser-based SAP login (alternative option for SSO-only systems)

The server **automatically selects** the authentication method:
- If credentials (`SAP_USERNAME` and `SAP_PASSWORD`) are in `.env`, uses Basic Auth
- Otherwise, looks for SSO cookies and uses them
- If neither is available, shows a clear error message

## Authentication Methods

### Comparison

| Feature | Basic Authentication | SSO Authentication |
|---------|---------------------|-------------------|
| **Security** | ⚠️ Password stored in .env | ✅ More secure (no stored passwords) |
| **Setup Complexity** | ✅ Easy (just add to .env) | Medium (requires sap-auth-mcp tool) |
| **Use Case** | Development, testing, production | SSO-only systems |
| **Default Method** | ✅ Default | Alternative option |
| **Session Management** | Basic auth on every request | Automatic cookie refresh |

### When to Use Each Method

**Use Basic Authentication when:**
- You have username/password credentials for the SAP system
- You want simple, quick setup (default method)
- Working with development, testing, or production systems
- The SAP system allows Basic Authentication

**Use SSO Authentication when:**
- The SAP system **only** supports SSO (no Basic Auth allowed)
- Your organization mandates SSO for specific systems
- You need to access systems where you don't have direct credentials

## Quick Start

### Option 1: Basic Authentication (Default)

```bash
# Configure SAP system with credentials
cat > .env << EOF
SAP_URL=https://your-sap-system.com:8000
SAP_CLIENT=001
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
EOF

# That's it! Server uses credentials automatically
```

### Option 2: SSO Authentication (Alternative Option)

```bash
# 1. Configure SAP system (no credentials)
cat > .env << EOF
SAP_URL=https://your-sap-system.com:8000
SAP_CLIENT=001
EOF

# 2. Install sap-auth-mcp server
# See: https://github.tools.sap/sfsfmcp/sap-auth-mcp/

# 3. Authenticate via MCP client
# Use your MCP client to call: sap_authenticate
# Parameters:
#   - entry_url: https://your-sap-system.com:8000/sap/bc/adt?sap-client=001
#   - store_path: tmp

# 4. Restart MCP server
# Cookies are automatically loaded from tmp/sap_cookies.json
```

## Basic Authentication (Default)

Basic authentication uses username and password for every request. This is the default and simplest authentication method.

### Setup

Add credentials to `.env` file:

```bash
SAP_URL=https://your-sap-system.com:8000
SAP_CLIENT=001
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
```

### Password Special Characters

If your password contains special characters, enclose it in quotes:

```bash
# Password with #, $, or other special characters
SAP_PASSWORD="my#pass$word"

# Simple password (quotes optional)
SAP_PASSWORD=mypassword
```

### Security Considerations

⚠️ **Security Best Practices:**

1. **Never commit .env to version control**
   - `.env` is in `.gitignore` by default
   - Verify: `git status` should not show `.env`

2. **Use environment variables for sensitive data**
   ```bash
   # Instead of hardcoding in .env, use environment variables
   export SAP_PASSWORD="mypassword"
   ```

3. **Rotate passwords regularly**
   - Change passwords according to your organization's policy
   - Update `.env` when password changes

### How Basic Auth Works

1. **Server Startup**: Username and password are read from `.env` on server start
2. **Encoding**: Credentials are encoded as Base64: `username:password`
3. **Request Headers**: `Authorization: Basic <base64>` header is added to every request
4. **SAP Validation**: SAP validates credentials for each API call

**Technical Implementation:**

- **Provider**: `BasicAuthProvider` class (src/infrastructure/auth/BasicAuthProvider.ts)
- **Headers**: Adds `Authorization: Basic <base64>` and `X-SAP-Client: <client>` headers
- **Priority**: Basic Auth is checked first in `AuthProviderFactory`
- **Availability**: Validated by checking if username and password are non-empty

## SSO Authentication (Alternative Option)

SSO authentication uses browser-based login cookies. This is an alternative authentication option for SAP systems that require SSO.

### Prerequisites

1. **sap-auth-mcp MCP Server** - Separate MCP server that handles SAP authentication
   - Repository: https://github.tools.sap/sfsfmcp/sap-auth-mcp/
2. **MCP Client** - Any MCP-compatible client (Claude Code CLI, Cline, etc.)
3. **Browser Access** - Ability to log into SAP via web browser

### Setup Steps

#### 1. Install sap-auth-mcp Server

Follow the installation instructions at: https://github.tools.sap/sfsfmcp/sap-auth-mcp/

Add it to your MCP client configuration:

**Claude Code CLI** (`~/.claude.json`):
```json
{
  "mcpServers": {
    "sap-auth-mcp-main": {
      "command": "node",
      "args": ["/path/to/sap-auth-mcp-main/dist/index.js"]
    },
    "mcp-abap-adt": {
      "command": "node",
      "args": ["/path/to/mcp-abap-adt/dist/index.js"]
    }
  }
}
```

**Cline** (VS Code Settings):
```json
{
  "mcpServers": {
    "sap-auth-mcp-main": {
      "command": "node",
      "args": ["C:/path/to/sap-auth-mcp-main/dist/index.js"]
    },
    "mcp-abap-adt": {
      "command": "node",
      "args": ["C:/path/to/mcp-abap-adt/dist/index.js"]
    }
  }
}
```

#### 2. Configure mcp-abap-adt (No Credentials)

In your mcp-abap-adt project, create `.env`:

```bash
SAP_URL=https://your-sap-system.com:8000
SAP_CLIENT=001

# Do NOT add SAP_USERNAME or SAP_PASSWORD
# Leave them out to use SSO authentication
```

#### 3. Authenticate Using sap_authenticate Tool

Use your MCP client to call the `sap_authenticate` tool:

**Using Claude Code CLI:**
```
You: I need to authenticate with SAP system

Claude: I'll help you authenticate using the sap_authenticate tool.
[Calls sap_authenticate with your parameters]

✅ Successfully authenticated
📁 Cookie saved to: tmp/sap_cookies.json
```

**Tool Parameters:**
- `entry_url`: Your SAP system ADT URL
  - Format: `{SAP_URL}/sap/bc/adt?sap-client={SAP_CLIENT}`
  - Example: `https://mysystem.sap.com:8000/sap/bc/adt?sap-client=001`
- `store_path`: Where to save cookies (use `tmp` for mcp-abap-adt project)

**What happens:**
1. Browser window opens with SAP login page
2. You log in using your SSO credentials
3. Tool captures session cookies
4. Cookies are saved to `tmp/sap_cookies.json`
5. Browser closes automatically

#### 4. Restart MCP Server

Restart your MCP client to reload the server with new cookies:

**Claude Code CLI:**
```bash
# Type in chat:
/mcp
```

**Cline:**
```
Reload window or restart VS Code
```

#### 5. Verify Authentication

Test that authentication works:

```
You: Get the source code for class CL_ABAP_CHAR_UTILITIES

Claude: [Uses GetClass tool successfully]
```

You should see in the console logs:
```
[Auth] Loaded 2 SSO cookies from tmp/sap_cookies.json
[Auth] Using SSO Authentication (cookies from tmp/sap_cookies.json)
```

### Cookie File Locations

The server automatically checks these locations for cookies:

1. `./tmp/sap_cookies.json` - Primary location (default for sap_authenticate tool)
2. `~/.sap/cookies/sap_cookies.json` - Alternative user home directory
3. Custom location via `AUTH_COOKIE_PATH` environment variable

**Custom location example:**
```bash
# In .env file
AUTH_COOKIE_PATH=/custom/path/to/cookies
```

### Cookie Format

The `sap_cookies.json` file contains:

```json
{
  "cookies": [
    {
      "name": "SAP_SESSIONID_XXX_001",
      "value": "...",
      "domain": "your-system.sap.com",
      "path": "/",
      "expires": -1,
      "httpOnly": true,
      "secure": true
    }
  ],
  "timestamp": 1234567890,
  "domain": "your-system.sap.com"
}
```

### Re-authentication

SSO cookies expire after some time. When they expire, you'll see:

```
🔒 Authentication Failed (401)

Current authentication method: SSO (cookie file)
Credentials are invalid or expired.

Troubleshooting steps:
2. If using SSO:
   - Re-authenticate using sap_authenticate MCP tool
   - Restart MCP server: /mcp
```

To re-authenticate:
1. Call `sap_authenticate` tool again
2. Log in via browser
3. Restart MCP server (`/mcp` in Claude Code CLI)

## How It Works

### Authentication Selection Flow

```
Server starts
    ↓
Load config from .env
    ↓
┌─────────────────────────────────────┐
│ Are SAP_USERNAME and SAP_PASSWORD  │
│ present and not empty?             │
└─────────────────────────────────────┘
         ↓YES              ↓NO
         ↓                 ↓
Use Basic Auth      Look for SSO cookies
         ↓                 ↓
         ↓         ┌───────────────────┐
         ↓         │ Cookie file found │
         ↓         │ and valid?        │
         ↓         └───────────────────┘
         ↓              ↓YES        ↓NO
         ↓              ↓           ↓
         ↓         Use SSO Auth   ERROR
         ↓              ↓           ↓
         └──────────────┴───────────┘
                    ↓
            Ready to handle
            API requests
```

### Authentication Providers

The server uses a provider-based architecture:

**AuthProvider Interface:**
- `getAuthHeaders()` - Returns auth headers for requests
- `getSystemUrl()` - Returns SAP system URL
- `getClient()` - Returns SAP client number
- `isAvailable()` - Checks if provider is configured
- `getName()` - Returns descriptive name (for logging)

**BasicAuthProvider:**
- Reads username/password from config
- Encodes as Base64
- Adds `Authorization: Basic` header
- Name: "Basic Auth (credentials)"

**CookieAuthProvider:**
- Reads cookies from `sap_cookies.json`
- Converts to `Cookie` header format
- Supports multiple cookie file formats
- Name: "SSO (cookie file)"

### CSRF Token Handling

For POST/PUT operations (like `GetTableContents`), the server:

1. Fetches CSRF token from SAP using current auth method
2. Adds `x-csrf-token` header to subsequent requests
3. Retries with new token if 403 CSRF error occurs
4. Caches token for reuse

**CSRF token fetch log:**
```
[CSRF] Fetching token using SSO (cookie file)
```
or
```
[CSRF] Fetching token using Basic Auth (credentials)
```

## Troubleshooting

### No Authentication Method Available

**Error:**
```
🔒 No Authentication Method Available

Neither basic auth credentials nor SSO cookies are configured.
```

**Solution 1 - Add Basic Auth:**
```bash
# Add to .env
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
```

**Solution 2 - Use SSO:**
1. Install sap-auth-mcp server
2. Call `sap_authenticate` tool
3. Restart MCP server

### Authentication Failed (401)

**Error:**
```
🔒 Authentication Failed (401)

Current authentication method: Basic Auth (credentials)
Credentials are invalid or expired.
```

**For Basic Auth:**
1. Check username/password in `.env`
2. Verify credentials work in SAP GUI or browser
3. Check if password expired
4. Restart MCP server: `/mcp`

**For SSO:**
1. Re-authenticate using `sap_authenticate` tool
2. Restart MCP server: `/mcp`

### CSRF Token Validation Failed (403)

**Error:**
```
🔒 CSRF Token Validation Failed (403)

Current authentication method: SSO (cookie file)
CSRF token fetch or validation failed.
```

**For Basic Auth:**
1. Check if credentials expired mid-session
2. Verify credentials in `.env`
3. Restart MCP server: `/mcp`

**For SSO:**
1. Re-authenticate using `sap_authenticate` tool
2. Restart MCP server: `/mcp`
3. Check SAP system connectivity

### SSO Cookie Not Found

**Error:**
```
🔒 Authentication Required

No authentication method available.
```

**Check cookie locations:**
```bash
# Check if cookie file exists
ls -la tmp/sap_cookies.json
ls -la ~/.sap/cookies/sap_cookies.json

# Verify cookie file format
cat tmp/sap_cookies.json
```

**Solution:**
1. Call `sap_authenticate` tool
2. Verify `store_path` parameter matches expected location
3. Check cookie file was created
4. Restart MCP server

### Cookie File Permissions

**Linux/Mac:**
```bash
# Ensure cookie file is readable
chmod 600 tmp/sap_cookies.json

# Check ownership
ls -l tmp/sap_cookies.json
```

**Windows:**
```powershell
# Check file exists
Test-Path tmp/sap_cookies.json

# View file properties
Get-Item tmp/sap_cookies.json
```

### Authentication Method Not Detected

**Check current auth method:**

Look for console logs when server starts:
```
[Auth] Using SSO Authentication (cookies from tmp/sap_cookies.json)
```
or
```
[Auth] Using Basic Authentication (credentials)
```

**Verify configuration:**
```bash
# Check .env file
cat .env

# Verify credentials are set (Basic Auth)
echo $SAP_USERNAME
echo $SAP_PASSWORD

# Check cookie file exists (SSO)
ls -la tmp/sap_cookies.json
```

### Debugging Authentication Issues

**Enable detailed logging:**

1. Run MCP server in development mode
2. Check console output for auth-related messages
3. Look for `[Auth]` and `[CSRF]` prefixed logs

**Example logs:**
```
[Auth] Loaded 2 SSO cookies from C:/path/to/tmp/sap_cookies.json
[Auth] Using SSO Authentication (cookies from C:/path/to/tmp/sap_cookies.json)
[CSRF] Fetching token using SSO (cookie file)
```

## Best Practices

1. **Use Basic Auth for simplicity**
   - Simpler setup and maintenance
   - Works for most SAP systems
   - Easier to troubleshoot

2. **Use SSO when required**
   - For systems that only support SSO
   - When organization mandates SSO for specific systems
   - More complex setup with external dependencies

3. **Never commit credentials**
   - Keep `.env` in `.gitignore`
   - Use environment variables for CI/CD
   - Rotate passwords regularly

4. **Monitor authentication logs**
   - Check console for auth method used
   - Watch for 401/403 errors
   - Re-authenticate when sessions expire

5. **Keep cookies secure**
   - Store in project directory (`tmp/`)
   - Don't commit to version control
   - Set appropriate file permissions

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SAP_URL` | ✅ Yes | SAP system URL | `https://system.sap.com:8000` |
| `SAP_CLIENT` | ✅ Yes | SAP client number | `001` |
| `SAP_USERNAME` | ⚠️ Optional* | Username for Basic Auth | `MYUSER` |
| `SAP_PASSWORD` | ⚠️ Optional* | Password for Basic Auth | `MyPass123` |
| `AUTH_COOKIE_PATH` | ❌ No | Custom cookie directory | `/custom/path` |

\* Required for Basic Auth, not needed for SSO

## See Also

- [README.md](../README.md) - Main documentation
- [Quick Start Guide](../README.md#quick-start) - Get started in 5 minutes
- [Troubleshooting](../README.md#troubleshooting) - Common issues
- [SAP System Setup](../README.md#prerequisites) - Prerequisites and SAP configuration
