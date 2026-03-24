# GetSystemInfo Tool - Documentation

## Overview
A new MCP tool has been added to check which SAP system you are currently connected to without needing to read configuration files.

## Tool Name
`GetSystemInfo`

## Description
Retrieves and displays current SAP system connection information including:
- System URL (base URL)
- SAP Client number
- Authentication method being used (Basic Auth or SSO)
- Authentication status
- Full ADT URL
- Detailed authentication method information

## Usage

### Via MCP Tool Call
```typescript
// No parameters required
GetSystemInfo()
```

### Via Claude Code
After restarting the MCP server, you can call this tool natively:
```
Can you show me which SAP system I'm connected to?
```

## Output Format
The tool returns a formatted text output with system information:

```
╔══════════════════════════════════════════════════════════════╗
║         SAP System Connection Information                    ║
╚══════════════════════════════════════════════════════════════╝

🌐 System URL:        https://your-sap-system.com
🏢 Client:            100
🔐 Auth Method:       Basic Auth (credentials) / SSO (cookies)
✓ Authenticated:      Yes / No
🔗 Full ADT URL:      https://your-sap-system.com/sap/bc/adt

═══════════════════════════════════════════════════════════════

📋 Authentication Details:
   [Detailed information about the authentication method]
```

## Implementation Details

### File Structure
- **Handler**: `src/handlers/handleGetSystemInfo.ts`
- **Registration**: Tool registered in `src/index.ts`

### How It Works
1. Retrieves the current SAP configuration from environment variables
2. Gets the authentication provider instance
3. Extracts system information from the auth provider:
   - System URL (base URL)
   - Client number
   - Authentication method name
   - Authentication availability status
4. Formats the information into a user-friendly display

### Authentication Methods Detected
The tool automatically detects and reports which authentication method is active:

1. **Basic Authentication**
   - Uses credentials from `.env` file (SAP_USERNAME, SAP_PASSWORD)
   - Suitable for development and testing environments

2. **SSO (Single Sign-On)**
   - **Built-in browser SSO**: Chrome launches automatically when no credentials are configured; call `SapBrowserLogin` to proactively authenticate. Cookies cached to `$TMPDIR/mcp-abap-adt/<domain>.json`
   - **Legacy**: Session cookies from `sap_cookies.json` loaded via `sap_authenticate` MCP tool (external `sap-auth-mcp-main`)
   - Recommended for production systems

## Benefits

### No File Access Required
Unlike manually checking configuration files, this tool:
- ✅ Directly queries the active authentication provider
- ✅ Shows the **actual** system being used (not just what's in config)
- ✅ Displays the current authentication state
- ✅ Works regardless of authentication method

### Native System Integration
- Runs entirely within the MCP server process
- No external dependencies or file I/O
- Fast and reliable
- Always shows current state

### Clear Authentication Status
- Immediately shows which auth method is active
- Helps troubleshoot authentication issues
- Provides guidance for each auth method

## Use Cases

1. **Verify Connection**
   - Before making changes, check which system you're connected to
   - Ensure you're not accidentally working on production

2. **Troubleshooting**
   - Identify authentication method in use
   - Verify client number and system URL
   - Check if authentication is properly configured

3. **Multi-System Development**
   - Quickly switch contexts between different SAP systems
   - Confirm which system is active after changing `.env` configuration

4. **Audit Trail**
   - Document which system was used for specific operations
   - Include system info in reports or documentation

## Testing

### Build the Project
```bash
npm run build
```

### Restart MCP Server
After building, restart the MCP server in Claude Code:
```
/mcp
```

### Call the Tool
```
Please show me my current SAP system information
```

## Error Handling

The tool handles various error scenarios:

1. **No Authentication Available**
   - Returns detailed error message with setup instructions
   - Guides user to configure either Basic Auth or SSO

2. **Configuration Missing**
   - Catches missing SAP_URL or SAP_CLIENT
   - Provides clear error messages

3. **Provider Initialization Failure**
   - Gracefully handles auth provider initialization errors
   - Returns error details for troubleshooting

## Technical Architecture

### Auth Provider Interface
The tool leverages the existing `AuthProvider` interface:
```typescript
interface AuthProvider {
  getSystemUrl(): string;     // Base SAP system URL
  getClient(): string;         // SAP client number
  getName(): string;           // Human-readable auth method name
  isAvailable(): boolean;      // Auth availability status
  getAuthHeaders(): Promise<Record<string, string>>;
}
```

### Factory Pattern
Uses `AuthProviderFactory` to determine which auth method is active:
1. Checks for Basic Auth credentials first
2. Falls back to legacy SSO cookies if credentials not available
3. Falls back to built-in browser SSO (`SapBrowserLogin` / `BrowserSsoAuthProvider`) if no cookie file exists

## Future Enhancements

Potential additions:
- [ ] Show connection latency/performance metrics
- [ ] Display last successful request timestamp
- [ ] Show CSRF token status
- [ ] List available ADT services
- [ ] Include user information (if available)
- [ ] Add JSON output format option
- [ ] Connection health check

## Related Files
- `src/handlers/handleGetSystemInfo.ts` - Main handler implementation
- `src/infrastructure/auth/AuthProvider.ts` - Auth provider interface
- `src/infrastructure/auth/AuthProviderFactory.ts` - Auth provider factory
- `src/infrastructure/auth/BasicAuthProvider.ts` - Basic auth implementation
- `src/infrastructure/auth/CookieAuthProvider.ts` - SSO cookie auth implementation
- `src/lib/utils.ts` - Utility functions for auth and requests
- `src/index.ts` - Tool registration

## See Also
- `README.md` - Main project documentation
- Authentication setup guide
- MCP tool documentation
