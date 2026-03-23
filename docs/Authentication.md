# Authentication Guide

This guide explains how to authenticate with your SAP system when using the mcp-abap-adt server.

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [Quick Start](#quick-start)
- [SSO Authentication (Recommended)](#sso-authentication-recommended)
- [Basic Authentication (Fallback)](#basic-authentication-fallback)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)

## Overview

The mcp-abap-adt server supports two authentication methods:

1. **Basic Authentication** - Uses username and password (recommended and preferred)
2. **SSO Authentication** - Uses cookies from browser-based SAP login (for systems requiring SSO)

The server **automatically selects** the authentication method with this priority:
- If credentials (`SAP_USERNAME` and `SAP_PASSWORD`) are in `.env`, uses Basic Auth (preferred)
- Otherwise, looks for SSO cookies and uses them
- If neither is available, shows a clear error message

## Authentication Methods

### Comparison

| Feature | Basic Authentication | SSO Authentication |
|---------|---------------------|-------------------|
| **Security** | ⚠️ Password stored in .env | ✅ More secure (no stored passwords) |
| **Setup Complexity** | ✅ Easy (just add to .env) | Medium (requires sap-auth-mcp tool) |
| **Use Case** | Development, testing, production | Systems requiring SSO only |
| **Preference** | ✅ Preferred method | Fallback for SSO-only systems |
| **Session Management** | Basic auth on every request | Automatic cookie refresh |

### When to Use Each Method

**Use Basic Authentication when:**
- You have username/password credentials for the SAP system
- You want simple, quick setup (preferred method)
- Working with development, testing, or production systems
- The SAP system allows Basic Authentication

**Use SSO Authentication when:**
- The SAP system **only** supports SSO (no Basic Auth allowed)
- Your organization mandates SSO for specific systems
- You need to access systems where you don't have direct credentials

## Quick Start

### Option 1: Basic Authentication (Recommended)

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

### Option 2: SSO Authentication (For SSO-only systems)

```bash
# 1. Configure SAP system (no credentials)
cat > .env << EOF
SAP_URL=https://your-sap-system.com:8000
SAP_CLIENT=001
EOF

# 2. Install sap-auth-mcp server
# See: https://github.tools.sap/claude/mcp-wiki

# 3. Authenticate via MCP client
# Use your MCP client to call: sap_authenticate
# Parameters:
#   - entry_url: https://your-sap-system.com:8000/sap/bc/adt?sap-client=001
#   - store_path: tmp

# 4. Restart MCP server
# Cookies are automatically loaded from tmp/sap_cookies.json
```

## Basic Authentication (Recommended)

Basic authentication uses username and password for every request. This is the preferred and simplest authentication method.

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

4. **Use SSO only when required**
   - Only use SSO for systems that don't support Basic Auth
   - Basic Auth is simpler and preferred when available

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

## SSO Authentication (For SSO-only Systems)

SSO authentication uses browser-based login cookies. Use this only when the SAP system requires SSO and doesn't support Basic Authentication.

### Prerequisites

1. **sap-auth-mcp MCP Server** - Separate MCP server that handles SAP authentication
   - Repository: https://github.tools.sap/claude/mcp-wiki
2. **MCP Client** - Any MCP-compatible client (Claude Code CLI, Cline, etc.)
3. **Browser Access** - Ability to log into SAP via web browser

### Setup Steps

#### 1. Install sap-auth-mcp Server

Follow the installation instructions at: https://github.tools.sap/claude/mcp-wiki

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

### How SSO Auth Works

1. **Cookie Loading**: On server startup, cookies are loaded from `sap_cookies.json`
2. **Cookie Parsing**: Supports two formats:
   - Direct array: `[{ name, value }, ...]`
   - Wrapped format: `{ cookies: [{ name, value }, ...] }`
3. **Header Conversion**: Cookies are converted to `Cookie` header format: `name1=value1; name2=value2`
4. **Request Headers**: `Cookie` header and `X-SAP-Client` header are added to every request
5. **Session Management**: SAP validates session cookies and maintains the session

**Technical Implementation:**

- **Provider**: `CookieAuthProvider` class (src/infrastructure/auth/CookieAuthProvider.ts)
- **Cookie Locations**: Checks multiple locations in order:
  1. `./tmp/sap_cookies.json` (default)
  2. `~/.sap/cookies/sap_cookies.json` (alternative)
  3. Custom path via `AUTH_COOKIE_PATH` env var
- **Headers**: Adds `Cookie: <cookies>` and `X-SAP-Client: <client>` headers
- **Priority**: SSO is used only if Basic Auth credentials are not available
- **Availability**: Validated by checking if cookies were successfully loaded from file
- **Session Cookies**: Cookies from SAP responses are automatically captured and stored per-system
- **Reload Support**: `reloadCookies()` method allows re-loading cookies after re-authentication

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

## Basic Authentication (Fallback)

Basic authentication uses username and password for every request.

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

4. **Prefer SSO for production**
   - SSO doesn't store passwords on disk
   - SSO sessions can be revoked centrally

### How Basic Auth Works

1. Username and password are read from `.env` on server start
2. Credentials are encoded as Base64: `username:password`
3. `Authorization: Basic <base64>` header is added to every request
4. SAP validates credentials for each API call

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
(PREFERRED)              ↓
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

**Priority**: Basic Auth > SSO Cookies > Error

### Authentication Providers

The server uses a provider-based architecture with a factory pattern:

**AuthProvider Interface** (src/infrastructure/auth/AuthProvider.ts):
- `getAuthHeaders()` - Returns auth headers for requests (async)
- `getSystemUrl()` - Returns SAP system URL
- `getClient()` - Returns SAP client number
- `isAvailable()` - Checks if provider is configured
- `getName()` - Returns descriptive name (for logging)

**BasicAuthProvider** (src/infrastructure/auth/BasicAuthProvider.ts):
- **Configuration**: Reads username/password from `.env` or system config
- **Encoding**: Encodes credentials as Base64: `Buffer.from(\`${username}:${password}\`).toString('base64')`
- **Headers**: Adds `Authorization: Basic <base64>` and `X-SAP-Client: <client>`
- **Name**: "Basic Auth (credentials)"
- **Availability**: Returns `true` if both username and password are non-empty

**CookieAuthProvider** (src/infrastructure/auth/CookieAuthProvider.ts):
- **Configuration**: Reads cookies from `sap_cookies.json` file
- **Cookie Parsing**: Supports both array and wrapped formats
- **Conversion**: Converts cookies to header format: `cookie.map(c => \`${c.name}=${c.value}\`).join('; ')`
- **Headers**: Adds `Cookie: <cookies>` and `X-SAP-Client: <client>`
- **Name**: "SSO (cookie file)"
- **Availability**: Returns `true` if cookies were successfully loaded from file
- **Reload**: `reloadCookies()` method for re-authentication scenarios

**AuthProviderFactory** (src/infrastructure/auth/AuthProviderFactory.ts):
- **Priority**: Basic Auth (credentials) > SSO Cookies
- **Cookie Locations**: Checks multiple paths in order:
  1. `./tmp/sap_cookies.json` - Default location
  2. `~/.sap/cookies/sap_cookies.json` - User home directory
  3. `AUTH_COOKIE_PATH` environment variable - Custom location
- **Error Handling**: Provides detailed error messages with troubleshooting steps

**AuthProviderRegistry** (src/infrastructure/auth/AuthProviderRegistry.ts):
- **Purpose**: Manages per-system authentication providers for multi-system support
- **Singleton Pattern**: Uses `getInstance()` for global access
- **Provider Cache**: `Map<string, AuthProvider>` - One provider per system ID
- **CSRF Token Cache**: `Map<string, string>` - Cached CSRF tokens per system
- **Session Cookies**: `Map<string, string>` - Session cookies from SAP responses per system
- **Methods**:
  - `getProvider(systemConfig)` - Get or create provider for a system
  - `getCsrfToken(systemId)` / `setCsrfToken(systemId, token)` - CSRF token management
  - `getCookies(systemId)` / `setCookies(systemId, cookies)` - Session cookie management
  - `clearSystem(systemId)` - Clear cached data for specific system
  - `clearAll()` - Clear all cached data

### CSRF Token Handling

For POST/PUT operations (like `GetTableContents`, `CreateClass`), the server automatically handles CSRF tokens:

**Token Fetch Process:**

1. **Detection**: Server detects when a CSRF token is needed (POST/PUT requests)
2. **Fetch Request**: Makes a GET request with `x-csrf-token: fetch` header to:
   - `{baseUrl}/sap/bc/adt/core/discovery` (most reliable, tried first)
   - `{baseUrl}/sap/bc/adt` (fallback)
   - Original URL (last resort)
3. **Token Extraction**: Reads token from response headers: `x-csrf-token`
4. **Cookie Capture**: If SAP returns `set-cookie` headers, cookies are captured and stored per-system
5. **Caching**: Token is cached in `AuthProviderRegistry` per system ID
6. **Token Usage**: Cached token is added to subsequent POST/PUT requests
7. **Retry Logic**: If 403 CSRF error occurs, fetches new token and retries request

**Multi-System Support:**

- Each system has its own CSRF token cache
- Tokens are stored in `AuthProviderRegistry.csrfTokens` (Map<systemId, token>)
- Session cookies are stored in `AuthProviderRegistry.cookies` (Map<systemId, cookies>)
- Cache is automatically cleared when switching systems or on authentication errors

**Implementation Details:**

- **Function**: `fetchCsrfTokenForSystem()` in src/lib/utils.ts
- **Error Handling**: Tries multiple endpoints if first fails
- **Token from Error**: Even error responses (403) can contain valid tokens
- **Logging**: `[CSRF] System "{systemId}": Fetching token using {authMethod}` messages
- **Headers**: Token is sent as `x-csrf-token: <token>` header

**Example Log Output:**

```
[CSRF] System "ER1": Fetching token using Basic Auth (credentials)
[CSRF] System "H6R": Fetching token using SSO (cookie file)
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

1. **Prefer Basic Auth when available**
   - Simpler setup and maintenance
   - Works for most SAP systems
   - Easier to troubleshoot

2. **Use SSO only when required**
   - Only for systems that don't support Basic Auth
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
