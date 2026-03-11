# Multi-System Configuration Guide

## Overview

The MCP ABAP ADT server supports working with multiple SAP systems simultaneously. This allows you to:

- Configure multiple ABAP systems (DEV, QAS, PRD, etc.) in a single configuration file
- Switch between systems dynamically at runtime
- Target specific systems for individual operations using the `system` parameter
- Use different authentication methods per system (Basic Auth vs SSO)

## Configuration File

### Creating `.sap-systems.json`

Create a file named `.sap-systems.json` in your project root directory (where you run the MCP server):

```json
{
  "$schema": "./schemas/sap-systems.schema.json",
  "version": "1.0",
  "default": "DEV",
  "systems": {
    "DEV": {
      "name": "Development System",
      "url": "https://dev-sap.example.com:443",
      "client": "100",
      "auth": {
        "type": "basic",
        "username": "${SAP_DEV_USERNAME}",
        "password": "${SAP_DEV_PASSWORD}"
      }
    },
    "QAS": {
      "name": "Quality Assurance",
      "url": "https://qas-sap.example.com:443",
      "client": "200",
      "auth": {
        "type": "sso",
        "cookiePath": "./tmp/qas_cookies.json"
      }
    },
    "PRD": {
      "name": "Production",
      "url": "https://prd-sap.example.com:443",
      "client": "300",
      "auth": {
        "type": "sso"
      }
    }
  }
}
```

### Configuration Structure

#### Root Properties

- **`$schema`** (optional): Points to the JSON schema for IDE autocompletion and validation
- **`version`** (required): Configuration format version, currently `"1.0"`
- **`default`** (required): System ID to use by default (must match a key in `systems`)
- **`systems`** (required): Object mapping system IDs to system configurations

#### System Configuration

Each system in the `systems` object has the following properties:

- **`name`** (required): Human-readable name for display
- **`url`** (required): Full SAP system URL including protocol and port (e.g., `https://sap.example.com:443`)
- **`client`** (required): SAP client number (3 digits, e.g., `"100"`)
- **`auth`** (required): Authentication configuration object

#### Authentication Configuration

**Basic Authentication:**
```json
{
  "type": "basic",
  "username": "${SAP_DEV_USERNAME}",
  "password": "${SAP_DEV_PASSWORD}"
}
```

- Suitable for development and testing environments
- Supports environment variable interpolation using `${ENV_VAR}` syntax
- Both `username` and `password` are required

**SSO Authentication:**
```json
{
  "type": "sso",
  "cookiePath": "./tmp/qas_cookies.json"
}
```

- Recommended for production and corporate systems
- `cookiePath` is optional, defaults to `./tmp/sap_cookies.json`
- Requires authentication via `sap_authenticate` tool from the `sap-auth-mcp-main` MCP server

### Environment Variable Interpolation

You can reference environment variables in your configuration using `${ENV_VAR}` syntax:

```json
{
  "auth": {
    "type": "basic",
    "username": "${SAP_USERNAME}",
    "password": "${SAP_PASSWORD}"
  }
}
```

The server will replace these references with the actual environment variable values at runtime.

## Using Multi-System Configuration

### 1. List Available Systems

Use the `ListSystems` tool to see all configured systems:

```
ListSystems
```

Output shows:
- System IDs and names
- URLs and clients
- Authentication methods
- Which system is default/active

### 2. Change Active System

Use the `SetDefaultSystem` tool to switch the active system:

```
SetDefaultSystem { "system_id": "QAS" }
```

All subsequent operations will use QAS unless explicitly overridden.

**Note:** This change is temporary and only applies to the current session. To permanently change the default, edit the `default` field in `.sap-systems.json` and restart the server.

### 3. Target Specific Systems

Add the `system` parameter to any tool call to target a specific system:

```
GetClass {
  "class_name": "ZCL_MY_CLASS",
  "system": "PRD"
}
```

This overrides the active system for just this one operation.

### 4. Check System Information

Use `GetSystemInfo` to see connection details:

```
GetSystemInfo
```

In multi-system mode, this shows:
- Total number of configured systems
- Default and active system IDs
- Details of the currently active system
- Multi-system commands and configuration file location

## Authentication Setup

### Basic Authentication

1. Set environment variables in `.env` file:
   ```bash
   SAP_DEV_USERNAME=your_username
   SAP_DEV_PASSWORD=your_password
   ```

2. Reference them in `.sap-systems.json`:
   ```json
   {
     "auth": {
       "type": "basic",
       "username": "${SAP_DEV_USERNAME}",
       "password": "${SAP_DEV_PASSWORD}"
     }
   }
   ```

3. Restart the MCP server

### SSO Authentication

1. Install and configure the `sap-auth-mcp-main` MCP server

2. Authenticate for each system:
   ```
   sap_authenticate {
     "entry_url": "https://qas-sap.example.com:443/sap/bc/adt?sap-client=200",
     "store_path": "./tmp"
   }
   ```

3. Configure the system in `.sap-systems.json`:
   ```json
   {
     "auth": {
       "type": "sso",
       "cookiePath": "./tmp/sap_cookies.json"
     }
   }
   ```

4. Restart the MCP server

## Backward Compatibility

### Single-System Mode

If no `.sap-systems.json` file exists, the server falls back to single-system mode using `.env` variables:

```bash
SAP_BASE_URL=https://sap.example.com:443
SAP_CLIENT=100
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
```

All existing functionality continues to work exactly as before.

### Migration from Single to Multi-System

1. Create `.sap-systems.json` with your current system as the default
2. Add additional systems as needed
3. Restart the MCP server
4. The `.env` file is still used for environment variable interpolation

## Best Practices

### System IDs

- Use uppercase alphanumeric identifiers (e.g., `DEV`, `QAS`, `PRD`)
- Keep them short and meaningful
- Follow your organization's naming conventions

### Security

- **Never commit credentials** to version control
- Use environment variables for sensitive data
- Add `.sap-systems.json` to `.gitignore` if it contains sensitive information
- Consider using SSO for production systems
- Use Basic Auth only for development/testing

### Configuration Management

- Keep a `.sap-systems.example.json` template in version control
- Document required environment variables in your README
- Use consistent cookie paths across systems
- Keep the JSON schema reference for IDE support

### Per-System Cookie Storage

When using SSO for multiple systems, use distinct cookie paths:

```json
{
  "systems": {
    "QAS": {
      "auth": {
        "type": "sso",
        "cookiePath": "./tmp/qas_cookies.json"
      }
    },
    "PRD": {
      "auth": {
        "type": "sso",
        "cookiePath": "./tmp/prd_cookies.json"
      }
    }
  }
}
```

This prevents cookie conflicts between systems.

## Troubleshooting

### "System not found" Error

- Check that the system ID exists in `.sap-systems.json`
- Verify the `default` field points to a valid system ID
- System IDs are case-sensitive

### Authentication Failures

- For Basic Auth: Verify environment variables are set correctly
- For SSO: Re-authenticate using `sap_authenticate` tool
- Check that the `cookiePath` points to a valid file
- Restart the MCP server after configuration changes

### Configuration Validation

- Use an IDE with JSON Schema support for automatic validation
- Check the console output when the server starts for configuration errors
- Verify the `version` field is `"1.0"`
- Ensure all required fields are present

### Registry Initialization Errors

If you see registry initialization errors in the console:
- Check `.sap-systems.json` syntax (valid JSON)
- Verify environment variables referenced with `${...}` are set
- Check file permissions on the configuration file
- Look for detailed error messages in the console output

## Examples

### Example 1: Mixed Authentication

```json
{
  "version": "1.0",
  "default": "DEV",
  "systems": {
    "DEV": {
      "name": "Development",
      "url": "https://dev.example.com:443",
      "client": "100",
      "auth": {
        "type": "basic",
        "username": "${DEV_USER}",
        "password": "${DEV_PASS}"
      }
    },
    "PRD": {
      "name": "Production",
      "url": "https://prd.example.com:443",
      "client": "300",
      "auth": {
        "type": "sso"
      }
    }
  }
}
```

### Example 2: All SSO

```json
{
  "version": "1.0",
  "default": "QAS",
  "systems": {
    "QAS": {
      "name": "Quality",
      "url": "https://qas.example.com:443",
      "client": "200",
      "auth": {
        "type": "sso",
        "cookiePath": "./tmp/qas_cookies.json"
      }
    },
    "PRD": {
      "name": "Production",
      "url": "https://prd.example.com:443",
      "client": "300",
      "auth": {
        "type": "sso",
        "cookiePath": "./tmp/prd_cookies.json"
      }
    }
  }
}
```

### Example 3: Single System (Backward Compatible)

No `.sap-systems.json` file, just `.env`:

```bash
SAP_BASE_URL=https://sap.example.com:443
SAP_CLIENT=100
SAP_USERNAME=myuser
SAP_PASSWORD=mypass
```

## Related Documentation

- [README.md](../README.md) - Main project documentation
- [sap-auth-mcp-main](https://github.com/orchestraight/sap-auth-mcp-main) - SSO authentication server
- [.sap-systems.example.json](../.sap-systems.example.json) - Example configuration file
