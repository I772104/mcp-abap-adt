/**
 * Tool schema enhancement utilities for multi-system support
 */

/**
 * Add optional 'system' parameter to a tool's input schema
 */
export function withSystemParameter(schema: any): any {
    return {
        ...schema,
        inputSchema: {
            ...schema.inputSchema,
            properties: {
                ...schema.inputSchema.properties,
                system: {
                    type: 'string',
                    description:
                        'Optional: Target SAP system ID (e.g., "DEV", "QAS", "PRD"). If not specified, uses the active/default system. Only relevant when multiple systems are configured in .sap-systems.json.',
                },
            },
        },
    };
}

/**
 * Enhance all tool schemas with the system parameter
 * @param tools Array of tool schemas
 * @returns Enhanced tool schemas with system parameter
 */
export function enhanceAllToolSchemas(tools: any[]): any[] {
    return tools.map(withSystemParameter);
}

/**
 * Extract system parameter from tool arguments
 * @param args Tool arguments object
 * @returns Object with systemId and remaining args
 */
export function extractSystemParameter(args: any): { systemId?: string; args: any } {
    const { system, ...rest } = args;
    return {
        systemId: system,
        args: rest,
    };
}
