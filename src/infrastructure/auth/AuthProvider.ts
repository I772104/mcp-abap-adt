/**
 * Authentication provider interface for SAP ADT requests
 */
export interface AuthProvider {
    /**
     * Get authentication headers for SAP requests
     */
    getAuthHeaders(): Promise<Record<string, string>>;

    /**
     * Get the base system URL
     */
    getSystemUrl(): string;

    /**
     * Get SAP client number
     */
    getClient(): string;

    /**
     * Check if this auth provider is available/configured
     */
    isAvailable(): boolean;

    /**
     * Get a descriptive name for this auth provider
     */
    getName(): string;
}
