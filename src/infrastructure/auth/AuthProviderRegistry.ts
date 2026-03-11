import { AuthProvider } from './AuthProvider';
import { SystemConfig } from '../system/types';
import { createAuthProviderFromConfig } from './AuthProviderFactory';

/**
 * Registry for managing per-system authentication providers, CSRF tokens, and cookies.
 * Replaces global variables in utils.ts for multi-system support.
 */
export class AuthProviderRegistry {
    private static instance: AuthProviderRegistry | null = null;

    /** Cache of auth providers per system ID */
    private providers: Map<string, AuthProvider> = new Map();

    /** CSRF tokens per system ID */
    private csrfTokens: Map<string, string> = new Map();

    /** Cookie strings per system ID */
    private cookies: Map<string, string> = new Map();

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): AuthProviderRegistry {
        if (!AuthProviderRegistry.instance) {
            AuthProviderRegistry.instance = new AuthProviderRegistry();
        }
        return AuthProviderRegistry.instance;
    }

    /**
     * Get or create an auth provider for a system
     */
    public getProvider(systemConfig: SystemConfig): AuthProvider {
        const existing = this.providers.get(systemConfig.id);
        if (existing) {
            return existing;
        }

        // Create new provider
        const provider = createAuthProviderFromConfig(systemConfig);
        this.providers.set(systemConfig.id, provider);
        return provider;
    }

    /**
     * Get cached CSRF token for a system
     */
    public getCsrfToken(systemId: string): string | null {
        return this.csrfTokens.get(systemId) || null;
    }

    /**
     * Set CSRF token for a system
     */
    public setCsrfToken(systemId: string, token: string): void {
        this.csrfTokens.set(systemId, token);
    }

    /**
     * Get cached cookies for a system
     */
    public getCookies(systemId: string): string | null {
        return this.cookies.get(systemId) || null;
    }

    /**
     * Set cookies for a system
     */
    public setCookies(systemId: string, cookies: string): void {
        this.cookies.set(systemId, cookies);
    }

    /**
     * Clear all cached data for a specific system
     */
    public clearSystem(systemId: string): void {
        this.providers.delete(systemId);
        this.csrfTokens.delete(systemId);
        this.cookies.delete(systemId);
    }

    /**
     * Clear all cached data for all systems
     */
    public clearAll(): void {
        this.providers.clear();
        this.csrfTokens.clear();
        this.cookies.clear();
    }

    /**
     * Reset the registry (for testing)
     */
    public reset(): void {
        this.clearAll();
    }
}
