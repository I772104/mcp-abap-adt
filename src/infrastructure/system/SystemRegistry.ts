import * as fs from 'fs';
import * as path from 'path';
import { SystemConfig, SystemsFileConfig } from './types';

/**
 * Singleton registry for managing multiple SAP system configurations.
 * Loads configuration from .sap-systems.json or falls back to .env for backward compatibility.
 */
export class SystemRegistry {
    private static instance: SystemRegistry | null = null;
    private systems: Map<string, SystemConfig> = new Map();
    private defaultSystemId: string | null = null;
    private activeSystemId: string | null = null;
    private initialized = false;

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): SystemRegistry {
        if (!SystemRegistry.instance) {
            SystemRegistry.instance = new SystemRegistry();
            SystemRegistry.instance.initialize();
        }
        return SystemRegistry.instance;
    }

    /**
     * Initialize the registry by loading configuration
     */
    public initialize(): void {
        if (this.initialized) {
            return;
        }

        // Check if we're in test mode
        if (process.env.NODE_ENV === 'test') {
            this.initializeTestMode();
            this.initialized = true;
            return;
        }

        // Try to load from .sap-systems.json first
        const configPath = this.findConfigFile();
        if (configPath) {
            this.loadFromConfigFile(configPath);
        } else {
            // Fall back to .env for backward compatibility
            this.loadFromEnv();
        }

        this.initialized = true;
    }

    /**
     * Find the .sap-systems.json configuration file
     */
    private findConfigFile(): string | null {
        // Look relative to the server root (3 levels up from dist/infrastructure/system/)
        const serverRoot = path.resolve(__dirname, '../../..');
        const serverRootPath = path.join(serverRoot, '.sap-systems.json');
        if (fs.existsSync(serverRootPath)) {
            return serverRootPath;
        }

        // Fall back to current working directory
        const cwdPath = path.join(process.cwd(), '.sap-systems.json');
        if (fs.existsSync(cwdPath)) {
            return cwdPath;
        }

        return null;
    }

    /**
     * Load configuration from .sap-systems.json file
     */
    private loadFromConfigFile(configPath: string): void {
        try {
            const fileContent = fs.readFileSync(configPath, 'utf-8');
            const config: SystemsFileConfig = JSON.parse(fileContent);

            // Validate version
            if (config.version !== '1.0') {
                throw new Error(`Unsupported config version: ${config.version}`);
            }

            // Validate system count limit
            const MAX_SYSTEMS = 50;
            const systemCount = Object.keys(config.systems).length;
            if (systemCount > MAX_SYSTEMS) {
                throw new Error(
                    `Too many systems configured: ${systemCount}. ` +
                        `Maximum allowed: ${MAX_SYSTEMS}. ` +
                        `Please reduce the number of systems in .sap-systems.json`
                );
            }

            // Load all systems
            for (const [id, systemConfig] of Object.entries(config.systems)) {
                const fullConfig: SystemConfig = {
                    id,
                    ...systemConfig,
                };

                // Interpolate environment variables in auth config
                this.interpolateEnvVars(fullConfig);

                this.systems.set(id, fullConfig);
            }

            // Set default system
            if (!config.default || !this.systems.has(config.default)) {
                throw new Error(`Default system "${config.default}" not found in systems configuration`);
            }

            this.defaultSystemId = config.default;
            this.activeSystemId = config.default;

            console.log(
                `[SystemRegistry] Loaded ${this.systems.size} systems from ${configPath}, default: ${this.defaultSystemId}`
            );
        } catch (error) {
            throw new Error(
                `Failed to load system configuration from ${configPath}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Interpolate environment variables in system configuration
     * Supports ${ENV_VAR} syntax
     */
    private interpolateEnvVars(config: SystemConfig): void {
        if (config.auth.type === 'basic') {
            if (config.auth.username) {
                config.auth.username = this.interpolateString(config.auth.username);
            }
            if (config.auth.password) {
                config.auth.password = this.interpolateString(config.auth.password);
            }
        }
        if (config.auth.cookiePath) {
            config.auth.cookiePath = this.interpolateString(config.auth.cookiePath);
        }
    }

    /**
     * Interpolate ${ENV_VAR} references in a string
     */
    private interpolateString(str: string): string {
        return str.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
            // Validate env var name (alphanumeric + underscore only)
            if (!/^[A-Z0-9_]+$/i.test(envVar)) {
                throw new Error(
                    `Invalid environment variable name: ${envVar}. ` +
                        `Must contain only alphanumeric characters and underscores.`
                );
            }

            const value = process.env[envVar];
            if (!value) {
                throw new Error(`Environment variable ${envVar} referenced in configuration but not set`);
            }
            return value;
        });
    }

    /**
     * Load single system from .env for backward compatibility
     */
    private loadFromEnv(): void {
        const url = process.env.SAP_URL; // Use SAP_URL for consistency with existing code
        const client = process.env.SAP_CLIENT;
        const username = process.env.SAP_USERNAME;
        const password = process.env.SAP_PASSWORD;
        const cookiePath = process.env.SAP_COOKIE_PATH;

        if (!url || !client) {
            throw new Error('SAP_URL and SAP_CLIENT must be set in environment or .sap-systems.json must exist');
        }

        // Determine auth type
        const authType = cookiePath ? 'sso' : 'basic';

        const config: SystemConfig = {
            id: 'default',
            name: 'Default System',
            url,
            client,
            auth: {
                type: authType,
                ...(authType === 'basic' && { username, password }),
                ...(authType === 'sso' && { cookiePath }),
            },
        };

        this.systems.set('default', config);
        this.defaultSystemId = 'default';
        this.activeSystemId = 'default';

        console.log('[SystemRegistry] Loaded single system from .env (backward compatibility mode)');
    }

    /**
     * Initialize with mock configuration for tests
     */
    private initializeTestMode(): void {
        const testConfig: SystemConfig = {
            id: 'test',
            name: 'Test System',
            url: 'https://test-sap.example.com:443',
            client: '100',
            auth: {
                type: 'basic',
                username: 'testuser',
                password: 'testpass',
            },
        };

        this.systems.set('test', testConfig);
        this.defaultSystemId = 'test';
        this.activeSystemId = 'test';

        console.log('[SystemRegistry] Initialized test mode with mock system');
    }

    /**
     * Get a system by ID
     * @throws Error if system not found
     */
    public getSystem(systemId: string): SystemConfig {
        const system = this.systems.get(systemId);
        if (!system) {
            throw new Error(
                `System "${systemId}" not found. Available systems: ${Array.from(this.systems.keys()).join(', ')}`
            );
        }
        return system;
    }

    /**
     * Get the default system
     */
    public getDefaultSystem(): SystemConfig {
        if (!this.defaultSystemId) {
            throw new Error('No default system configured');
        }
        return this.getSystem(this.defaultSystemId);
    }

    /**
     * Get the currently active system
     */
    public getActiveSystem(): SystemConfig {
        if (!this.activeSystemId) {
            throw new Error('No active system set');
        }
        return this.getSystem(this.activeSystemId);
    }

    /**
     * Set the active system (runtime only, does not modify config)
     * @throws Error if system not found
     */
    public setActiveSystem(systemId: string): void {
        if (!this.systems.has(systemId)) {
            throw new Error(
                `Cannot set active system: "${systemId}" not found. Available systems: ${Array.from(this.systems.keys()).join(', ')}`
            );
        }
        this.activeSystemId = systemId;
        console.log(`[SystemRegistry] Active system changed to: ${systemId}`);
    }

    /**
     * List all configured systems
     */
    public listSystems(): SystemConfig[] {
        return Array.from(this.systems.values());
    }

    /**
     * Check if a system exists
     */
    public hasSystem(systemId: string): boolean {
        return this.systems.has(systemId);
    }

    /**
     * Resolve system from optional parameter
     * @param systemArg Optional system ID parameter
     * @returns The specified system, or active system if not specified
     */
    public resolveSystem(systemArg?: string): SystemConfig {
        if (systemArg) {
            return this.getSystem(systemArg);
        }
        return this.getActiveSystem();
    }

    /**
     * Get the default system ID
     */
    public getDefaultSystemId(): string | null {
        return this.defaultSystemId;
    }

    /**
     * Get the active system ID
     */
    public getActiveSystemId(): string | null {
        return this.activeSystemId;
    }

    /**
     * Check if multi-system mode is enabled
     */
    public isMultiSystemMode(): boolean {
        return this.systems.size > 1;
    }

    /**
     * Reset the registry (for testing)
     */
    public reset(): void {
        this.systems.clear();
        this.defaultSystemId = null;
        this.activeSystemId = null;
        this.initialized = false;
    }
}
