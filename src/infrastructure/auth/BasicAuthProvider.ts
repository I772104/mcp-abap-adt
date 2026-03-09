import { AuthProvider } from './AuthProvider';

/**
 * Basic Authentication provider using username/password credentials
 */
export class BasicAuthProvider implements AuthProvider {
    constructor(
        private username: string,
        private password: string,
        private systemUrl: string,
        private client: string
    ) {}

    async getAuthHeaders(): Promise<Record<string, string>> {
        const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        return {
            Authorization: `Basic ${auth}`,
            'X-SAP-Client': this.client,
        };
    }

    getSystemUrl(): string {
        return this.systemUrl;
    }

    getClient(): string {
        return this.client;
    }

    isAvailable(): boolean {
        return !!(this.username && this.password);
    }

    getName(): string {
        return 'Basic Auth (credentials)';
    }
}
