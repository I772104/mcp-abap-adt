/**
 * Authentication configuration for a system
 */
export interface SystemAuthConfig {
    /** Authentication type: basic (username/password) or sso (cookie-based) */
    type: 'basic' | 'sso';
    /** Username for basic auth (supports ${ENV_VAR} interpolation) */
    username?: string;
    /** Password for basic auth (supports ${ENV_VAR} interpolation) */
    password?: string;
    /** Path to SSO cookies file for sso auth */
    cookiePath?: string;
}

/**
 * Configuration for a single SAP system
 */
export interface SystemConfig {
    /** Unique identifier for the system (e.g., "DEV", "QAS", "PRD") */
    id: string;
    /** Human-readable name */
    name: string;
    /** SAP system URL (e.g., "https://sap.example.com:443") */
    url: string;
    /** SAP client number (e.g., "100") */
    client: string;
    /** Authentication configuration */
    auth: SystemAuthConfig;
}

/**
 * Structure of .sap-systems.json configuration file
 */
export interface SystemsFileConfig {
    /** Schema version for future compatibility */
    version: string;
    /** Default system ID to use when no system is specified */
    default: string;
    /** Map of system ID to system configuration */
    systems: Record<string, Omit<SystemConfig, 'id'>>;
}
