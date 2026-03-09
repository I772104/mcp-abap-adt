# Security Policy

## Reporting a Vulnerability

We take the security of the mcp-abap-adt project seriously. If you have discovered a security vulnerability, please report it responsibly.

### How to Report

**Do NOT create a public GitHub issue for security vulnerabilities.**

Instead, please use one of these methods:

1. **GitHub Security Advisories** (Recommended)
   - Navigate to the [Security tab](https://github.tools.sap/D020426/mcp-abap-adt/security/advisories)
   - Click "Report a vulnerability"
   - Provide detailed information about the vulnerability

2. **Email**
   - Contact the project maintainers directly
   - Include "SECURITY" in the subject line
   - Provide detailed information about the vulnerability

### What to Include

When reporting a security vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes or mitigations
- Your contact information for follow-up

## Response Timeline

- **Initial Response**: We aim to acknowledge receipt within 1 week
- **Status Updates**: We will provide updates on our progress
- **Resolution**: We aim to address valid security issues promptly based on severity

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Best Practices for Users

### Credential Management

This project requires SAP system credentials. **Never commit credentials to version control.**

- Use `.env` files for local development (already in `.gitignore`)
- Use environment variables in CI/CD pipelines
- See [Authentication Guide](../docs/Authentication.md) for secure setup

### SSO Authentication (Recommended)

For production environments, use SSO authentication with the `sap-auth-mcp` server:
- Stores session cookies in `tmp/sap_cookies.json`
- No credentials in environment variables
- See [Authentication Guide](../docs/Authentication.md) for setup

### Basic Authentication (Development Only)

If using basic authentication:
- Only use in development/test environments
- Store credentials in `.env` file (never commit)
- Rotate credentials regularly
- Use dedicated service accounts with minimal permissions

### Network Security

- Verify SAP system URLs before connecting
- Use HTTPS for all SAP connections
- Review `NODE_TLS_REJECT_UNAUTHORIZED` usage (development only)

### MCP Server Security

- Run MCP server in trusted environments only
- Limit network access to the MCP server
- Review logs for unauthorized access attempts

## Scope

### In Scope

- Vulnerabilities in mcp-abap-adt code
- Authentication/authorization bypasses
- Credential exposure risks
- Code injection vulnerabilities
- Dependencies with known vulnerabilities

### Out of Scope

- Issues in SAP systems themselves
- Network infrastructure issues
- Social engineering attacks
- Physical security

## Legal

This project is provided "as is" under the MIT License. We appreciate security researchers who practice responsible disclosure and will acknowledge contributors (with permission) in security advisories.

## Contact

For security-related questions or concerns:
- Open an issue (for non-sensitive questions): [GitHub Issues](https://github.tools.sap/D020426/mcp-abap-adt/issues)
- For SAP internal escalations: Contact project maintainers directly

---

**Last Updated**: March 2026
