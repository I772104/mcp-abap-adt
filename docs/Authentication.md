# Authentication Guide

This guide explains how to authenticate with your SAP system when using the mcp-abap-adt server.

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [Quick Start](#quick-start)
- [Basic Authentication (Recommended)](#basic-authentication-recommended)
- [SSO Authentication (For SSO-only Systems)](#sso-authentication-for-sso-only-systems)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)

## Overview

The mcp-abap-adt server supports three authentication methods:

1. **Basic Authentication** - Uses username and password (simplest setup)
2. **Browser SSO** (built-in) - Launches Chrome for interactive SSO login, caches cookies automatically
3. **Legacy Cookie File** - Reads cookies from `sap_cookies.json` created by an external tool

The server **automatically selects** the authentication method with this priority:
1. **Basic Auth** — if `SAP_USERNAME` and `SAP_PASSWORD` are configured
2. **Legacy cookie file** — if `sap_cookies.json` exists in a known location
3. **Browser SSO** — launches Chrome on first request (or uses cached cookies from `$TMPDIR/mcp-abap-adt/<domain>.json`)

## Authentication Methods

### Comparison

| Feature | Basic Auth | Browser SSO (built-in) | Legacy Cookie File |
|---------|-----------|----------------------|-------------------|
| **Security** | Password in .env | No stored passwords | Cookies on disk |
| **Setup** | Easy (add to .env) | Zero config | Requires external tool |
| **Re-auth** | N/A | Automatic on 401/403 | Manual |
| **Use Case** | Dev/test systems | SSO-only systems | Deprecated fallback |

### When to Use Each Method

**Use Basic Authentication when:**
- You have username/password credentials for the SAP system
- You want the simplest setup
- The SAP system allows Basic Authentication

**Use Browser SSO (built-in) when:**
- The SAP system requires SSO (no Basic Auth allowed)
- Your organization mandates SSO or certificate-based login
- You need to authenticate via any IDP (SAP IAS, ADFS, 2FA, etc.)

**Use Legacy Cookie File when:**
- You have an existing workflow using the external `sap-auth-mcp` server
- Browser SSO does not work in your environment (e.g., no Chrome available)

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

### Option 2: Browser SSO (For SSO-only systems)

```bash
# 1. Configure SAP system (no credentials needed)
cat > .env << EOF
SAP_URL=https://your-sap-system.com:8000
SAP_CLIENT=001
EOF

# 2. That's it! On first request, Chrome launches automatically for SSO login.
#    Cookies are cached to $TMPDIR/mcp-abap-adt/<domain>.json (12h TTL).
#    On 401/403, Chrome re-launches automatically for re-authentication.

# Optional: proactively authenticate before making requests
# Use your MCP client to call: SapBrowserLogin
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

4. **Prefer Browser SSO for production systems**
   - No passwords stored on disk
   - SSO sessions can be revoked centrally
   - Auto-refresh on expiry

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

SSO authentication uses browser-based login cookies. The server has **built-in browser SSO** that launches Chrome directly -- no external tools required.

### Built-in Browser SSO

This is the primary SSO method. No extra MCP servers or manual cookie management needed.

#### Prerequisites

- **Chrome or Chromium** installed on your machine
- An MCP client (Claude Code CLI, Cline, etc.)

#### Setup

Just configure your SAP system without credentials:

```bash
# .env
SAP_URL=https://your-sap-system.com:8000
SAP_CLIENT=001
# Do NOT add SAP_USERNAME or SAP_PASSWORD
```

That's it. The server handles everything else automatically.

#### How It Works

1. **First request** -- server detects no credentials, no cached cookies. Chrome launches with your SAP login page.
2. **You log in** -- via any IDP (SAP IAS, ADFS, certificate, 2FA, etc.)
3. **Cookies captured** -- session cookies are extracted via CDP and cached to disk
4. **Chrome closes** -- browser window closes automatically after login
5. **Subsequent requests** -- use cached cookies (no browser needed)
6. **On 401/403** -- server automatically re-launches Chrome for re-authentication (once per request, no infinite loops)

**No server restart needed** after authentication or re-authentication.

#### Cookie Cache

- **Location**: `$TMPDIR/mcp-abap-adt/<domain>.json` (e.g., `/tmp/mcp-abap-adt/my-system.sap.com.json`)
- **TTL**: 12 hours -- expired cookies trigger automatic re-authentication
- **Format**: Pre-joined cookie string with timestamp and domain metadata

#### `SapBrowserLogin` Tool

You can proactively trigger browser SSO before making requests:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `systemId` | string | No | System ID to authenticate (e.g., `"DEV"`, `"PRD"`). Defaults to the active system. |

**When to use:**
- To pre-authenticate before a batch of requests
- To force re-authentication if you suspect stale cookies
- To switch SSO sessions between systems

**Example (Claude Code CLI):**
```
You: Please authenticate with the DEV system

Claude: [Calls SapBrowserLogin with systemId: "DEV"]
→ Chrome opens, you log in
→ "Successfully authenticated with system DEV. Cookies cached and ready for use."
```

**Note:** `SapBrowserLogin` only works for systems using Browser SSO. Systems configured with Basic Auth will return an error message.

**Technical Implementation:**

- **Provider**: `BrowserSsoAuthProvider` class (src/infrastructure/auth/BrowserSsoAuthProvider.ts)
- **Cookie Storage**: `CookieStore` class (src/infrastructure/auth/CookieStore.ts)
- **Handler**: `handleSapBrowserLogin` (src/handlers/handleSapBrowserLogin.ts)
- **Headers**: Adds `Cookie: <cookies>` and `X-SAP-Client: <client>` headers
- **Concurrency**: Only one Chrome instance per system at a time (queued via promise guard)
- **Login Timeout**: 5 minutes to complete interactive login before timeout error
- **Auto-retry**: On 401/403, `refreshAuth()` is called automatically before retrying the failed request

### Legacy Alternative: External sap-auth-mcp

> **Deprecated.** The built-in Browser SSO above replaces this workflow. Only use this if Chrome is unavailable or your environment requires the external tool.

The `sap-auth-mcp` is a separate MCP server (bundled with the mcp-wiki project) that performs browser-based SAP authentication and saves cookies to a JSON file.

#### Setup

1. Install `sap-auth-mcp` and add it to your MCP client configuration alongside mcp-abap-adt
2. Call the `sap_authenticate` tool with:
   - `entry_url`: `https://your-system.com:8000/sap/bc/adt?sap-client=001`
   - `store_path`: `tmp`
3. Cookies are saved to `tmp/sap_cookies.json`
4. **Restart the MCP server** (`/mcp` in Claude Code CLI) -- required for legacy cookie files

#### Cookie File Locations

The server checks these locations for legacy cookie files:

1. `./tmp/sap_cookies.json` -- default for `sap_authenticate` tool
2. `~/.sap/cookies/sap_cookies.json` -- user home directory
3. Custom path via `AUTH_COOKIE_PATH` environment variable

**Technical Implementation:**

- **Provider**: `CookieAuthProvider` class (src/infrastructure/auth/CookieAuthProvider.ts)
- **Priority**: Legacy cookies are checked before Browser SSO in the provider chain
- **Re-authentication**: Manual -- call `sap_authenticate` again, then restart the server

## How It Works

### Authentication Selection Flow

```
Server starts → Load config
    ↓
┌─ SAP_USERNAME + SAP_PASSWORD set? ─┐
│ YES → Use Basic Auth               │
│ NO  ↓                              │
│ ┌─ Legacy cookie file found? ──┐   │
│ │ YES → Use CookieAuthProvider │   │
│ │ NO  ↓                        │   │
│ │ Use BrowserSsoAuthProvider   │   │
│ │  (launches Chrome on demand) │   │
│ └──────────────────────────────┘   │
└────────────────────────────────────┘
    ↓
Ready to handle API requests
    ↓
On 401/403 with BrowserSsoAuthProvider:
  → Auto re-launch Chrome → retry request
```

**Priority**: Basic Auth > Legacy Cookie File > Browser SSO (auto-launch Chrome)

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

**CookieAuthProvider** (src/infrastructure/auth/CookieAuthProvider.ts):
- **Configuration**: Reads cookies from `sap_cookies.json` file (legacy)
- **Cookie Parsing**: Supports both array and wrapped formats
- **Conversion**: Converts cookies to header format: `cookie.map(c => \`${c.name}=${c.value}\`).join('; ')`
- **Headers**: Adds `Cookie: <cookies>` and `X-SAP-Client: <client>`
- **Name**: "SSO (cookie file)"
- **Availability**: Returns `true` if cookies were successfully loaded from file
- **Reload**: `reloadCookies()` method for re-authentication scenarios

**BrowserSsoAuthProvider** (src/infrastructure/auth/BrowserSsoAuthProvider.ts):
- **Configuration**: Zero-config -- only needs system URL, client, and domain
- **Chrome Launch**: Uses `chrome-launcher` + CDP (Chrome DevTools Protocol)
- **Cookie Capture**: Extracts all cookies matching the domain via `Network.getAllCookies`
- **Persistence**: Saves to `$TMPDIR/mcp-abap-adt/<domain>.json` via `CookieStore`
- **TTL**: 12 hours -- expired cookies trigger automatic re-authentication
- **Headers**: Adds `Cookie: <cookies>` and `X-SAP-Client: <client>`
- **Name**: "Browser SSO"
- **Availability**: Always returns `true` (Chrome is launched on demand)
- **Auto-refresh**: `refreshAuth()` clears cache and re-launches Chrome on 401/403
- **Concurrency**: Only one Chrome instance at a time (promise-based guard)

**AuthProviderFactory** (src/infrastructure/auth/AuthProviderFactory.ts):
- **Priority**: Basic Auth > Legacy Cookie File > Browser SSO
- **Cookie Locations**: Checks multiple paths for legacy cookies:
  1. `./tmp/sap_cookies.json` - Default location
  2. `~/.sap/cookies/sap_cookies.json` - User home directory
  3. `AUTH_COOKIE_PATH` environment variable - Custom location
- **Fallback**: If no credentials and no cookie file, creates `BrowserSsoAuthProvider` (instead of throwing an error)

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

### Authentication Failed (401/403)

**For Basic Auth:**
1. Check username/password in `.env`
2. Verify credentials work in SAP GUI or browser
3. Check if password expired
4. Restart MCP server: `/mcp`

**For Browser SSO:**
The server **automatically re-launches Chrome** on 401/403 errors. If auto-retry also fails:
1. Call `SapBrowserLogin` tool to manually re-authenticate
2. Check that Chrome/Chromium is installed and accessible
3. Verify you can log into the SAP system in a normal browser

**For Legacy Cookie File:**
1. Re-authenticate using `sap_authenticate` tool from `sap-auth-mcp`
2. Restart MCP server: `/mcp`

### Chrome Not Found (Browser SSO)

**Error:**
```
Chrome/Chromium is required for browser-based SSO but was not found.
```

**Solutions:**
- Install Chrome or Chromium
- Use Basic Auth instead (set `SAP_USERNAME` and `SAP_PASSWORD` in `.env`)
- Use legacy `sap-auth-mcp` to create cookie files externally

### Browser Login Timeout

**Error:**
```
Login timeout — 5 minutes exceeded.
```

The browser SSO flow gives you 5 minutes to complete interactive login. If it times out:
1. Call `SapBrowserLogin` again
2. Complete the login faster (bookmark the IDP page, have credentials ready)
3. Check if your IDP has additional approval steps that take too long

### Debugging Authentication Issues

**Check console logs for auth-related messages:**
```
[Auth] Using Basic Authentication (credentials)
[Auth] Using Browser SSO Authentication (will launch Chrome when needed)
[BrowserSSO] Opening browser for login at https://...
[BrowserSSO] Login detected, capturing cookies...
[CookieStore] Saved cookies to /tmp/mcp-abap-adt/my-system.json
[Auth] SSO session expired, re-authenticating...
```

Look for `[Auth]`, `[BrowserSSO]`, `[CookieStore]`, and `[CSRF]` prefixed messages.

## Best Practices

1. **Use Basic Auth for simplicity** -- when the system supports it
2. **Use built-in Browser SSO for SSO systems** -- zero config, auto-retry on expiry
3. **Never commit credentials** -- keep `.env` in `.gitignore`, use environment variables for CI/CD
4. **Monitor auth logs** -- look for `[Auth]` and `[BrowserSSO]` prefixed messages
5. **Pre-authenticate with `SapBrowserLogin`** -- avoid Chrome popup during a batch of requests

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
