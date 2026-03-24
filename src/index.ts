#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    ReadResourceRequestSchema,
    ListPromptsRequestSchema,
    GetPromptRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import dotenv from 'dotenv';

// Import handler functions
import { handleGetProgram } from './handlers/handleGetProgram';
import { handleGetClass } from './handlers/handleGetClass';
import { handleGetFunctionGroup } from './handlers/handleGetFunctionGroup';
import { handleGetFunction } from './handlers/handleGetFunction';
import { handleGetTable } from './handlers/handleGetTable';
import { handleGetStructure } from './handlers/handleGetStructure';
import { handleGetTableContents } from './handlers/handleGetTableContents';
import { handleGetPackage } from './handlers/handleGetPackage';
import { handleGetPackageContents } from './handlers/handleGetPackageContents';
import { handleGetInclude } from './handlers/handleGetInclude';
import { handleGetTypeInfo } from './handlers/handleGetTypeInfo';
import { handleGetInterface } from './handlers/handleGetInterface';
import { handleGetTransaction } from './handlers/handleGetTransaction';
import { handleGetClassTests } from './handlers/handleGetClassTests';
import { handleRunClassTests } from './handlers/handleRunClassTests';
import { handleRunPackageTests } from './handlers/handleRunPackageTests';
import { handleGetClassCoverage } from './handlers/handleGetClassCoverage';
import { handleSearchObject } from './handlers/handleSearchObject';
import { handleGetClassUsages } from './handlers/handleGetClassUsages';
import { handleGetObjectUsages } from './handlers/handleGetObjectUsages';
import { handleCheckSyntax } from './handlers/handleCheckSyntax';
import { handleCreateClass } from './handlers/handleCreateClass';
import { handleDeleteLocalClass } from './handlers/handleDeleteLocalClass';
import { handleCreateClassTests } from './handlers/handleCreateClassTests';
import { handleActivateClasses } from './handlers/handleActivateClasses';
import { handleGetCDSView } from './handlers/handleGetCDSView';
import { handleGetCDSViewContents } from './handlers/handleGetCDSViewContents';
import { handleGetBehaviorDefinition } from './handlers/handleGetBehaviorDefinition';
import { handleGetServiceDefinition } from './handlers/handleGetServiceDefinition';
import { handleGetServiceBinding } from './handlers/handleGetServiceBinding';
import { handleGetMetadataExtension } from './handlers/handleGetMetadataExtension';
import { handleGetAccessControl } from './handlers/handleGetAccessControl';
import { handleGetBehaviorForRapBo } from './handlers/handleGetBehaviorForRapBo';
import { handleSearchRapBo } from './handlers/handleSearchRapBo';
import { handleRapBoAnalysisResource, listRapBoAnalysisResources } from './handlers/handleRapBoAnalysisResource';
import { handleListUserTransports } from './handlers/handleListUserTransports';
import { handleGetTransportRequest } from './handlers/handleGetTransportRequest';
import { handleGetVersionHistory } from './handlers/handleGetVersionHistory';
import { handleGetTransportVersions } from './handlers/handleGetTransportVersions';
import { handleCompareObjectVersions } from './handlers/handleCompareObjectVersions';
import { handleExportClassToFile } from './handlers/handleExportClassToFile';
import { handleImportClassFromFile } from './handlers/handleImportClassFromFile';
import { handleExportCDSViewToFile } from './handlers/handleExportCDSViewToFile';
import { handleExportInterfaceToFile } from './handlers/handleExportInterfaceToFile';
import { handleExportProgramToFile } from './handlers/handleExportProgramToFile';
import { handleExportFunctionGroupToFile } from './handlers/handleExportFunctionGroupToFile';
import { handleExportBehaviorDefinitionToFile } from './handlers/handleExportBehaviorDefinitionToFile';
import { handleExportAccessControlToFile } from './handlers/handleExportAccessControlToFile';
import { handleExportMetadataExtensionToFile } from './handlers/handleExportMetadataExtensionToFile';
import { handleGetSystemInfo } from './handlers/handleGetSystemInfo';
import { handleListSystems } from './handlers/handleListSystems';
import { handleSetDefaultSystem } from './handlers/handleSetDefaultSystem';
import { handleSapBrowserLogin } from './handlers/handleSapBrowserLogin';
import { handleListRuntimeErrors } from './handlers/handleListRuntimeErrors';
import { handleGetRuntimeError } from './handlers/handleGetRuntimeError';
import { handleRunATC } from './handlers/handleRunATC';
import { handleListATCCheckVariants } from './handlers/handleListATCCheckVariants';

// Import resource handlers
import { listResources, listResourceTemplates, readResource } from './handlers/resources/index';

// Import prompt handlers
import { listWorkflowPrompts, getWorkflowPrompt } from './prompts/workflows';

// Import SystemRegistry for multi-system support
import { SystemRegistry } from './infrastructure/system';

// Import shared utility functions and types
import {
    getBaseUrl,
    getAuthHeaders,
    createAxiosInstance,
    makeAdtRequest,
    return_error,
    return_response,
} from './lib/utils';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Interface for SAP configuration
export interface SapConfig {
    url: string;
    username: string;
    password: string;
    client: string;
}

/**
 * Retrieves SAP configuration from environment variables.
 * Username and password are optional - SSO cookies can be used as fallback.
 *
 * @returns {SapConfig} The SAP configuration object.
 * @throws {Error} If required environment variables (URL, client) are missing.
 */
export function getConfig(): SapConfig {
    // Test mode detection: Allow lazy mock config during test imports
    // This prevents test failures when handlers import utils.ts → index.ts at module level
    const isTestMode =
        process.env.NODE_ENV === 'test' || (typeof global !== 'undefined' && (global as any).__JEST_TEST_MODE__);

    if (isTestMode) {
        // Return a lazy test mock - tests will override specific functions via jest.mock()
        // This config is ONLY used during import-time, not during actual test execution
        return {
            url: process.env.SAP_URL || 'https://test-sap-system.local:443',
            username: process.env.SAP_USERNAME || '',
            password: process.env.SAP_PASSWORD || '',
            client: process.env.SAP_CLIENT || '000',
        };
    }

    // PRODUCTION MODE: Strict validation (unchanged behavior)
    const url = process.env.SAP_URL;
    const username = process.env.SAP_USERNAME || '';
    const password = process.env.SAP_PASSWORD || '';
    const client = process.env.SAP_CLIENT;

    // Only URL and client are strictly required
    // Username/password are optional (SSO cookies can be used instead)
    if (!url || !client) {
        throw new Error(`Missing required environment variables. Required variables:
- SAP_URL
- SAP_CLIENT

Optional (for Basic Authentication):
- SAP_USERNAME
- SAP_PASSWORD

Note: If credentials are not provided, SSO cookies will be used (via sap_authenticate tool).`);
    }

    return { url, username, password, client };
}

/**
 * Server class for interacting with ABAP systems via ADT.
 */
export class mcp_abap_adt_server {
    private server: Server; // Instance of the MCP server

    /**
     * Constructor for the mcp_abap_adt_server class.
     */
    constructor() {
        this.server = new Server( // Initialize the MCP server
            {
                name: 'mcp-abap-adt', // Server name
                version: '0.1.0', // Server version
            },
            {
                capabilities: {
                    tools: {}, // Tools are registered
                    resources: {}, // Resources are registered
                    prompts: {}, // Prompts are registered
                },
            }
        );

        // Initialize SystemRegistry for multi-system support
        // This loads .sap-systems.json if available, otherwise falls back to .env
        try {
            SystemRegistry.getInstance();
        } catch (error) {
            // If SystemRegistry initialization fails, log the error but continue
            // Server will fall back to single-system mode using .env
            console.error('Failed to initialize SystemRegistry:', error);
        }

        this.setupHandlers(); // Setup request handlers
    }

    /**
     * Sets up request handlers for listing and calling tools.
     * @private
     */
    private setupHandlers() {
        // Setup prompt handlers

        // Handler for ListPromptsRequest
        this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return {
                prompts: listWorkflowPrompts(),
            };
        });

        // Handler for GetPromptRequest
        this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
            const promptName = request.params.name;
            const args = request.params.arguments || {};

            try {
                const content = getWorkflowPrompt(promptName, args);

                return {
                    messages: [
                        {
                            role: 'user',
                            content: {
                                type: 'text',
                                text: content,
                            },
                        },
                    ],
                };
            } catch (error) {
                throw new McpError(
                    ErrorCode.InvalidRequest,
                    `Failed to get prompt: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        });

        // Setup resource handlers

        // Handler for ListResourceTemplatesRequest
        this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
            return await listResourceTemplates();
        });

        // Handler for ListResourcesRequest
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            return await listResources();
        });

        // Handler for ReadResourceRequest
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            return await readResource(request.params.uri);
        });

        // Setup tool handlers

        // Handler for ListToolsRequest
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    // Define available tools
                    {
                        name: 'ExportClassToFile',
                        description:
                            'Export an ABAP class from the system directly to a file in the tmp folder. Automatically creates the tmp folder if it does not exist.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP class to export',
                                },
                            },
                            required: ['class_name'],
                        },
                    },
                    {
                        name: 'ImportClassFromFile',
                        description:
                            'Import an ABAP class from a file in the tmp folder and create it in the SAP system. Only supports local classes (Z/Y prefix) in local packages.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP class to import (must start with Z or Y)',
                                },
                                description: {
                                    type: 'string',
                                    description:
                                        'Optional description for the class (extracted from file if not provided)',
                                },
                                package: {
                                    type: 'string',
                                    description: 'Optional package name (defaults to $TMP)',
                                    default: '$TMP',
                                },
                                auto_activate: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Automatically activate the class after import (default: false)',
                                    default: false,
                                },
                                preaudit_requested: {
                                    type: 'boolean',
                                    description: 'Optional: Request pre-audit during activation (default: true)',
                                    default: true,
                                },
                            },
                            required: ['class_name'],
                        },
                    },
                    {
                        name: 'ExportCDSViewToFile',
                        description:
                            'Export a CDS DDL view from the system directly to a file in the tmp folder with .ddls.asddls extension. Automatically converts view name and SQL view name to Z-namespace.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                view_name: {
                                    type: 'string',
                                    description: 'Name of the CDS view to export (e.g., I_Material, C_SalesOrder)',
                                },
                            },
                            required: ['view_name'],
                        },
                    },
                    {
                        name: 'ExportInterfaceToFile',
                        description:
                            'Export an ABAP interface from the system directly to a file in the tmp folder with .intf.abap extension. Automatically converts interface name to Z-namespace.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                interface_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP interface to export',
                                },
                            },
                            required: ['interface_name'],
                        },
                    },
                    {
                        name: 'ExportProgramToFile',
                        description:
                            'Export an ABAP program from the system directly to a file in the tmp folder with .prog.abap extension. Automatically converts program name to Z-namespace.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                program_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP program to export',
                                },
                            },
                            required: ['program_name'],
                        },
                    },
                    {
                        name: 'ExportFunctionGroupToFile',
                        description:
                            'Export an ABAP function group from the system directly to a file in the tmp folder with .fugr.abap extension. Automatically converts function group name to Z-namespace.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                function_group: {
                                    type: 'string',
                                    description: 'Name of the ABAP function group to export',
                                },
                            },
                            required: ['function_group'],
                        },
                    },
                    {
                        name: 'ExportBehaviorDefinitionToFile',
                        description:
                            'Export a RAP behavior definition from the system directly to a file in the tmp folder with .bdef.asbdef extension. Automatically converts behavior name to Z-namespace.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                behavior_name: {
                                    type: 'string',
                                    description: 'Name of the behavior definition to export',
                                },
                            },
                            required: ['behavior_name'],
                        },
                    },
                    {
                        name: 'ExportAccessControlToFile',
                        description:
                            'Export a CDS access control (DCL) from the system directly to a file in the tmp folder with .dcls.asdcls extension. Automatically converts DCL name to Z-namespace.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                dcl_name: {
                                    type: 'string',
                                    description: 'Name of the access control (DCL) to export',
                                },
                            },
                            required: ['dcl_name'],
                        },
                    },
                    {
                        name: 'ExportMetadataExtensionToFile',
                        description:
                            'Export a CDS metadata extension from the system directly to a file in the tmp folder with .ddlx.asddlxs extension. Automatically converts extension name to Z-namespace.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                extension_name: {
                                    type: 'string',
                                    description: 'Name of the metadata extension to export',
                                },
                            },
                            required: ['extension_name'],
                        },
                    },
                    {
                        name: 'GetSystemInfo',
                        description:
                            'Get current SAP system connection information including system URL, client, authentication method, and connection status',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: 'ListSystems',
                        description:
                            'List all configured SAP systems from .sap-systems.json. Shows system IDs, names, URLs, clients, authentication methods, and indicates which is the default/active system.',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: 'SetDefaultSystem',
                        description:
                            'Change the active SAP system at runtime. All subsequent operations will use this system unless explicitly overridden with the "system" parameter. Note: This change is temporary and only applies to the current session.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                system_id: {
                                    type: 'string',
                                    description:
                                        'The system ID to set as active (e.g., "DEV", "QAS", "PRD"). Must be configured in .sap-systems.json.',
                                },
                            },
                            required: ['system_id'],
                        },
                    },
                    {
                        name: 'SapBrowserLogin',
                        description:
                            'Perform browser-based SSO authentication for a SAP system. Launches Chrome/Chromium, waits for user to complete SSO flow, and caches authentication cookies. Use this when SSO cookies have expired or initial authentication is needed.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                systemId: {
                                    type: 'string',
                                    description: 'Optional system ID to authenticate (defaults to active system)',
                                },
                            },
                            required: [],
                        },
                    },
                    {
                        name: 'ListRuntimeErrors',
                        description:
                            'List recent ABAP runtime errors (ST22 dumps) from the system. Returns error type, program, user, timestamp, and dump ID for each entry. Use GetRuntimeError to retrieve detailed analysis of a specific dump.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                user: {
                                    type: 'string',
                                    description:
                                        'SAP username to filter dumps by (uppercased automatically). If not provided, returns all accessible dumps.',
                                },
                                from: {
                                    type: 'string',
                                    description: 'Start timestamp filter (ISO format, e.g., "2024-01-15T00:00:00")',
                                },
                                to: {
                                    type: 'string',
                                    description: 'End timestamp filter (ISO format, e.g., "2024-01-16T23:59:59")',
                                },
                                max_results: {
                                    type: 'number',
                                    description: 'Maximum number of entries to return (default: 50, max: 100)',
                                },
                            },
                            required: [],
                        },
                    },
                    {
                        name: 'GetRuntimeError',
                        description:
                            'Retrieve detailed information about a specific runtime error dump (ST22). Returns formatted text with error analysis, call stack, variables, and source code extract.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                dump_id: {
                                    type: 'string',
                                    description:
                                        'The dump identifier from ListRuntimeErrors (URL-encoded, e.g., with %20 for spaces)',
                                },
                                content: {
                                    type: 'string',
                                    enum: ['formatted', 'metadata', 'summary'],
                                    description:
                                        'What to retrieve: "formatted" (default, full text dump), "metadata" (XML reference), "summary" (HTML summary)',
                                },
                            },
                            required: ['dump_id'],
                        },
                    },
                    {
                        name: 'RunATC',
                        description:
                            'Run ATC (ABAP Test Cockpit) static code analysis on an ABAP object. Returns findings including errors, warnings, and informational messages with locations and check IDs.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                object_name: {
                                    type: 'string',
                                    description:
                                        'Name of the ABAP object to check (e.g., "ZCL_MY_CLASS", "ZTEST_PROGRAM")',
                                },
                                object_type: {
                                    type: 'string',
                                    enum: ['class', 'interface', 'program', 'function_group', 'include', 'package'],
                                    description: 'Type of object to check',
                                },
                                check_variant: {
                                    type: 'string',
                                    description:
                                        'ATC check variant name (optional, defaults to system default). Use ListATCCheckVariants to discover available variants.',
                                },
                                max_findings: {
                                    type: 'number',
                                    description: 'Maximum number of findings to return (default: 100)',
                                },
                                with_exemptions: {
                                    type: 'boolean',
                                    description: 'Include exempted findings in results (default: false)',
                                },
                            },
                            required: ['object_name', 'object_type'],
                        },
                    },
                    {
                        name: 'ListATCCheckVariants',
                        description:
                            'List available ATC check variants on the SAP system. Returns variant names and descriptions. Use this to discover which check variants are available before running ATC checks.',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: 'GetProgram',
                        description: 'Retrieve ABAP program source code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                program_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP program',
                                },
                            },
                            required: ['program_name'],
                        },
                    },
                    {
                        name: 'GetClass',
                        description: 'Retrieve ABAP class source code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP class',
                                },
                            },
                            required: ['class_name'],
                        },
                    },
                    {
                        name: 'GetFunctionGroup',
                        description: 'Retrieve ABAP Function Group source code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                function_group: {
                                    type: 'string',
                                    description: 'Name of the function module',
                                },
                            },
                            required: ['function_group'],
                        },
                    },
                    {
                        name: 'GetFunction',
                        description: 'Retrieve ABAP Function Module source code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                function_name: {
                                    type: 'string',
                                    description: 'Name of the function module',
                                },
                                function_group: {
                                    type: 'string',
                                    description: 'Name of the function group',
                                },
                            },
                            required: ['function_name', 'function_group'],
                        },
                    },
                    {
                        name: 'GetStructure',
                        description: 'Retrieve ABAP Structure',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                structure_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP Structure',
                                },
                            },
                            required: ['structure_name'],
                        },
                    },
                    {
                        name: 'GetTable',
                        description: 'Retrieve ABAP table structure',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                table_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP table',
                                },
                            },
                            required: ['table_name'],
                        },
                    },
                    {
                        name: 'GetTableContents',
                        description:
                            'Retrieve contents of an ABAP table with advanced filtering, pagination, and batch query support. Either provide table_name for a single query, or provide queries array for batch mode.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                table_name: {
                                    type: 'string',
                                    description:
                                        'Name of the ABAP table (required for single query mode, omit when using queries array)',
                                },
                                columns: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description:
                                        'Optional: Specific columns to retrieve (default: all columns). Column names are validated against table metadata.',
                                },
                                max_rows: {
                                    type: 'number',
                                    description:
                                        'Optional: Maximum number of rows to retrieve (default: 100, max: 500)',
                                    default: 100,
                                },
                                where_conditions: {
                                    type: 'object',
                                    description:
                                        'Optional: WHERE conditions for filtering. Simple: {"MATNR": "ABC123", "MTART": "FERT"}. Advanced: {"MATNR": {"eq": "ABC123"}}. Note: ADT Data Preview API only supports equality (=) operator.',
                                    additionalProperties: true,
                                },
                                order_by: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description:
                                        'Optional: Column names for sorting results. Column names are validated against table metadata.',
                                },
                                offset: {
                                    type: 'number',
                                    description: 'Optional: Number of rows to skip for pagination (default: 0)',
                                    default: 0,
                                },
                                include_column_metadata: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Include column type and description in response (default: false)',
                                    default: false,
                                },
                                queries: {
                                    type: 'array',
                                    description:
                                        'Optional: Batch mode - execute multiple queries in one call (max: 10, omit when using table_name). Each query supports all single-query parameters.',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: {
                                                type: 'string',
                                                description: 'Optional identifier for this query in batch results',
                                            },
                                            table_name: {
                                                type: 'string',
                                                description: 'Name of the ABAP table',
                                            },
                                            columns: {
                                                type: 'array',
                                                items: { type: 'string' },
                                            },
                                            max_rows: {
                                                type: 'number',
                                            },
                                            where_conditions: {
                                                type: 'object',
                                            },
                                            order_by: {
                                                type: 'array',
                                                items: { type: 'string' },
                                            },
                                            offset: {
                                                type: 'number',
                                            },
                                        },
                                        required: ['table_name'],
                                    },
                                },
                            },
                        },
                    },
                    {
                        name: 'GetPackage',
                        description:
                            'Retrieve comprehensive ABAP package information including metadata, attributes, hierarchy (super/sub-packages), transport details, application component, and package interfaces',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                package_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP package',
                                },
                            },
                            required: ['package_name'],
                        },
                    },
                    {
                        name: 'GetPackageContents',
                        description:
                            'Retrieve objects and contents within an ABAP package, with optional recursive sub-package exploration',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                package_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP package',
                                },
                                include_subpackages: {
                                    type: 'boolean',
                                    description: 'Optional: Include sub-packages in the results (default: true)',
                                    default: true,
                                },
                                recursive: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Recursively retrieve contents of sub-packages (default: false)',
                                    default: false,
                                },
                            },
                            required: ['package_name'],
                        },
                    },
                    {
                        name: 'GetTypeInfo',
                        description: 'Retrieve ABAP type information',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                type_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP type',
                                },
                            },
                            required: ['type_name'],
                        },
                    },
                    {
                        name: 'GetInclude',
                        description: 'Retrieve ABAP Include Source Code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                include_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP Include',
                                },
                            },
                            required: ['include_name'],
                        },
                    },
                    {
                        name: 'SearchObject',
                        description: 'Search for ABAP objects using quick search',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query string (use * wildcard for partial match)',
                                },
                                maxResults: {
                                    type: 'number',
                                    description: 'Maximum number of results to return',
                                    default: 100,
                                },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        name: 'GetTransaction',
                        description: 'Retrieve ABAP transaction details',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                transaction_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP transaction',
                                },
                            },
                            required: ['transaction_name'],
                        },
                    },
                    {
                        name: 'GetInterface',
                        description: 'Retrieve ABAP interface source code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                interface_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP interface',
                                },
                            },
                            required: ['interface_name'],
                        },
                    },
                    {
                        name: 'GetClassTests',
                        description: 'Retrieve local test classes from a class',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP class',
                                },
                            },
                            required: ['class_name'],
                        },
                    },
                    {
                        name: 'RunClassTests',
                        description: 'Run unit tests for a class and retrieve results',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP class',
                                },
                                auto_activate: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Automatically activate the class before running tests (default: false)',
                                    default: false,
                                },
                                preaudit_requested: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Request pre-audit during activation (default: true, only used if auto_activate is true)',
                                    default: true,
                                },
                            },
                            required: ['class_name'],
                        },
                    },
                    {
                        name: 'RunPackageTests',
                        description:
                            'Run unit tests for all test-enabled objects in a package and retrieve aggregated results',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                package_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP package',
                                },
                            },
                            required: ['package_name'],
                        },
                    },
                    {
                        name: 'GetClassCoverage',
                        description: 'Run unit tests for a class and retrieve test coverage results',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP class',
                                },
                                auto_activate: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Automatically activate the class before running coverage analysis (default: false)',
                                    default: false,
                                },
                                preaudit_requested: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Request pre-audit during activation (default: true, only used if auto_activate is true)',
                                    default: true,
                                },
                            },
                            required: ['class_name'],
                        },
                    },
                    {
                        name: 'GetObjectUsages',
                        description:
                            'Retrieve comprehensive where-used list for ABAP objects (classes, interfaces, programs, function groups, type groups). Supports filtering by object types and usage grades.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                object_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP object',
                                },
                                object_type: {
                                    type: 'string',
                                    description:
                                        'Type of object: class, interface, program, function_group, type_group, cds, behavior, table, structure (default: class)',
                                    default: 'class',
                                },
                                include_object_types: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description:
                                        'Optional: Specific object types to search in (e.g., ["class", "interface", "program"]). If not specified, searches in default types (class, interface, program, function_group, type_group)',
                                },
                                include_definitions: {
                                    type: 'boolean',
                                    description: 'Include definition usages (default: true)',
                                    default: true,
                                },
                                include_elements: {
                                    type: 'boolean',
                                    description: 'Include element usages like methods and attributes (default: true)',
                                    default: true,
                                },
                                include_indirect: {
                                    type: 'boolean',
                                    description: 'Include indirect references (default: true)',
                                    default: true,
                                },
                                local_usage_only: {
                                    type: 'boolean',
                                    description: 'Limit search to local package only (default: false)',
                                    default: false,
                                },
                                max_results: {
                                    type: 'number',
                                    description:
                                        'Optional: Maximum number of results to return (default: 500, min: 1, max: 500)',
                                    default: 500,
                                },
                                summary_only: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Return summary with aggregated counts instead of full usage list (default: false)',
                                    default: false,
                                },
                                include_metadata: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Include full metadata (URIs, responsible, package) in results (default: true)',
                                    default: true,
                                },
                                group_by: {
                                    type: 'string',
                                    description:
                                        'Optional: Group results by package or type (values: none, package, type; default: none)',
                                    enum: ['none', 'package', 'type'],
                                    default: 'none',
                                },
                            },
                            required: ['object_name'],
                        },
                    },
                    {
                        name: 'GetClassUsages',
                        description:
                            '[DEPRECATED - Use GetObjectUsages instead] Retrieve usages for an ABAP class. This tool is deprecated and will be removed in a future version.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP class',
                                },
                            },
                            required: ['class_name'],
                        },
                    },
                    {
                        name: 'CheckSyntax',
                        description:
                            'Check ABAP source code syntax and return detailed error information. Supports three input modes: file_path (from tmp folder), source_code (direct code), or object_name (existing object). Priority: file_path > source_code > object_name.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                file_path: {
                                    type: 'string',
                                    description:
                                        'Path to ABAP source file to check. Defaults to tmp folder for relative paths (e.g., "ZCL_MY_CLASS.abap"). Supports absolute paths. Auto-detects class name from filename.',
                                },
                                source_code: {
                                    type: 'string',
                                    description:
                                        'ABAP source code to check for syntax errors (used if file_path not provided)',
                                },
                                object_name: {
                                    type: 'string',
                                    description:
                                        'Name of the ABAP object. If file_path and source_code not provided, will fetch source from this existing class. Also used for file_path when class name cannot be auto-detected.',
                                },
                                object_type: {
                                    type: 'string',
                                    description:
                                        'Optional ABAP object type (CLAS, PROG, FUGR, etc. - auto-detected if not provided)',
                                },
                            },
                        },
                    },
                    {
                        name: 'CreateClass',
                        description: 'Create a new ABAP class in local package ($TMP) without transport assignment',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP class (must start with Z or Y)',
                                },
                                source_code: {
                                    type: 'string',
                                    description: 'Complete ABAP class source code (definition and implementation)',
                                },
                                description: {
                                    type: 'string',
                                    description: 'Optional description for the class',
                                },
                                package: {
                                    type: 'string',
                                    description: 'Package name (defaults to $TMP, must be local package)',
                                },
                                auto_activate: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Automatically activate the class after creation (default: false)',
                                    default: false,
                                },
                                preaudit_requested: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Request pre-audit during activation (default: true, only used if auto_activate is true)',
                                    default: true,
                                },
                            },
                            required: ['class_name', 'source_code'],
                        },
                    },
                    {
                        name: 'DeleteLocalClass',
                        description: 'Delete a local ABAP class (only Z/Y classes in local packages)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP class to delete (must start with Z or Y)',
                                },
                            },
                            required: ['class_name'],
                        },
                    },
                    {
                        name: 'CreateClassTests',
                        description: 'Create or replace test classes within an existing global ABAP class',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                parent_class_name: {
                                    type: 'string',
                                    description: 'Name of the existing ABAP class to add test classes to',
                                },
                                test_source_code: {
                                    type: 'string',
                                    description: 'Complete test class source code (local test classes implementation)',
                                },
                                backup_existing: {
                                    type: 'boolean',
                                    description: 'Optional: Create backup of existing test classes before replacing',
                                    default: false,
                                },
                                auto_activate: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Automatically activate the parent class after adding tests (default: false)',
                                    default: false,
                                },
                                preaudit_requested: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Request pre-audit during activation (default: true, only used if auto_activate is true)',
                                    default: true,
                                },
                            },
                            required: ['parent_class_name', 'test_source_code'],
                        },
                    },
                    {
                        name: 'ActivateClasses',
                        description:
                            'Activate ABAP classes after creation or modification. Provide either class_name for a single class or class_names array for multiple classes.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                class_names: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Array of ABAP class names to activate (provide this OR class_name)',
                                },
                                class_name: {
                                    type: 'string',
                                    description: 'Single ABAP class name to activate (provide this OR class_names)',
                                },
                                preaudit_requested: {
                                    type: 'boolean',
                                    description: 'Whether to request pre-audit (default: true)',
                                    default: true,
                                },
                            },
                        },
                    },
                    {
                        name: 'GetCDSView',
                        description: 'Retrieve CDS view source code and metadata',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                view_name: {
                                    type: 'string',
                                    description: 'Name of the CDS view entity',
                                },
                                include_annotations: {
                                    type: 'boolean',
                                    description: 'Include CDS annotations in response (default: true)',
                                    default: true,
                                },
                            },
                            required: ['view_name'],
                        },
                    },
                    {
                        name: 'GetCDSViewContents',
                        description:
                            'Query CDS view data with filtering, pagination, parameter support, and batch queries. Either provide view_name for a single query, or provide queries array for batch mode.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                view_name: {
                                    type: 'string',
                                    description:
                                        'Name of the CDS view (required for single query mode, omit when using queries array)',
                                },
                                parameters: {
                                    type: 'object',
                                    description:
                                        'Optional: CDS view parameters as key-value pairs (e.g., {"p_date": "2024-01-01"})',
                                    additionalProperties: { type: 'string' },
                                },
                                columns: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description:
                                        'Optional: Specific columns to retrieve (default: all columns). Column names are validated against view metadata.',
                                },
                                max_rows: {
                                    type: 'number',
                                    description:
                                        'Optional: Maximum number of rows to retrieve (default: 100, max: 500)',
                                    default: 100,
                                },
                                where_conditions: {
                                    type: 'object',
                                    description:
                                        'Optional: WHERE conditions for filtering. Simple: {"SalesOrderType": "OR"}. Advanced: {"SalesOrderType": {"eq": "OR"}}. Note: ADT Data Preview API only supports equality (=) operator.',
                                    additionalProperties: true,
                                },
                                order_by: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description:
                                        'Optional: Column names for sorting results. Column names are validated against view metadata.',
                                },
                                offset: {
                                    type: 'number',
                                    description:
                                        'Optional: Number of rows to skip for pagination (default: 0). Warning: CDS views recalculate on each query.',
                                    default: 0,
                                },
                                include_column_metadata: {
                                    type: 'boolean',
                                    description:
                                        'Optional: Include column type and description in response (default: false)',
                                    default: false,
                                },
                                queries: {
                                    type: 'array',
                                    description:
                                        'Optional: Batch mode - execute multiple queries in one call (max: 5 for CDS views, omit when using view_name). Each query supports all single-query parameters.',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: {
                                                type: 'string',
                                                description: 'Optional identifier for this query in batch results',
                                            },
                                            view_name: {
                                                type: 'string',
                                                description: 'Name of the CDS view',
                                            },
                                            parameters: {
                                                type: 'object',
                                                additionalProperties: { type: 'string' },
                                            },
                                            columns: {
                                                type: 'array',
                                                items: { type: 'string' },
                                            },
                                            max_rows: {
                                                type: 'number',
                                            },
                                            where_conditions: {
                                                type: 'object',
                                            },
                                            order_by: {
                                                type: 'array',
                                                items: { type: 'string' },
                                            },
                                            offset: {
                                                type: 'number',
                                            },
                                        },
                                        required: ['view_name'],
                                    },
                                },
                            },
                        },
                    },
                    {
                        name: 'GetBehaviorDefinition',
                        description: 'Retrieve RAP behavior definition source code and metadata',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                cds_view_name: {
                                    type: 'string',
                                    description: 'Name of the root CDS view entity',
                                },
                            },
                            required: ['cds_view_name'],
                        },
                    },
                    {
                        name: 'GetServiceDefinition',
                        description: 'Retrieve RAP service definition source code and metadata',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                service_name: {
                                    type: 'string',
                                    description: 'Name of the service definition',
                                },
                            },
                            required: ['service_name'],
                        },
                    },
                    {
                        name: 'GetServiceBinding',
                        description: 'Retrieve RAP service binding details and configuration',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                binding_name: {
                                    type: 'string',
                                    description: 'Name of the service binding',
                                },
                            },
                            required: ['binding_name'],
                        },
                    },
                    {
                        name: 'GetMetadataExtension',
                        description: 'Retrieve metadata extension (UI annotations) source code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                extension_name: {
                                    type: 'string',
                                    description: 'Name of the metadata extension',
                                },
                            },
                            required: ['extension_name'],
                        },
                    },
                    {
                        name: 'GetAccessControl',
                        description: 'Retrieve access control (DCL) definition source code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                dcl_name: {
                                    type: 'string',
                                    description: 'Name of the access control definition',
                                },
                            },
                            required: ['dcl_name'],
                        },
                    },
                    {
                        name: 'GetBehaviorForRapBo',
                        description:
                            'Retrieve interface behavior definition for RAP Business Object from RONT_NODE table',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                rap_bo_name: {
                                    type: 'string',
                                    description: 'Name of the RAP Business Object to search for',
                                },
                            },
                            required: ['rap_bo_name'],
                        },
                    },
                    {
                        name: 'SearchRapBo',
                        description:
                            'Search for RAP Business Objects by description and return the best matching technical name',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                search_term: {
                                    type: 'string',
                                    description: 'Search term to find RAP Business Objects by description',
                                },
                            },
                            required: ['search_term'],
                        },
                    },
                    {
                        name: 'ListUserTransports',
                        description: `⚠️ IMPORTANT: Always use from_date parameter to ensure recent transports are visible!

List ALL transport requests for a user by querying CTS database tables (E070/E07T) directly.

✅ WORKS FOR BOTH MODIFIABLE AND RELEASED TRANSPORTS

This tool:
- Queries CTS database tables (E070, E07T) directly
- Shows ALL transports: Modifiable (D), Released (R), and others
- Returns results in DESCENDING order (newest first)
- Provides transport type, status, date, target system, and description
- **Auto-defaults to previous year** if no from_date specified (prevents missing recent data)

⚠️ CRITICAL LIMITATION:
- Can only fetch 500 rows per query (ADT API limit)
- If result count equals limit, MORE RECENT TRANSPORTS MAY BE HIDDEN
- **SOLUTION: Always provide from_date parameter** (e.g., "20260101" for 2026 onwards)
- Tool will warn you if limit is reached

Common status values:
- D: Modifiable (in development)
- R: Released
- L: Modifiable + Protected
- O: Released + ready for import

Use this tool to find a developer's transports, both in-progress and released.`,
                        inputSchema: {
                            type: 'object',
                            properties: {
                                user: {
                                    type: 'string',
                                    description: 'Username (required)',
                                },
                                status: {
                                    type: 'string',
                                    description:
                                        'Optional: Filter by status (D=Modifiable, R=Released, L=Modifiable+Protected, O=Released+Import)',
                                },
                                max_results: {
                                    type: 'number',
                                    description:
                                        'Optional: Maximum number of results to return (default: 50, max possible from API: 500)',
                                },
                                from_date: {
                                    type: 'string',
                                    description:
                                        '⚠️ HIGHLY RECOMMENDED: Minimum date filter in YYYYMMDD format. Defaults to last year if not provided. Always use this to ensure recent transports are visible! Example: "20260101" for 2026 onwards.',
                                },
                            },
                            required: ['user'],
                        },
                    },
                    {
                        name: 'GetTransportRequest',
                        description:
                            'Retrieve detailed transport information showing task/request hierarchy and object list. IMPORTANT: Use this FIRST when analyzing a specific transport to understand if it is a task (child) or request (parent), as version history may record changes under the parent request. Returns formatted output with hierarchy, objects, and guidance for next steps.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                transport_number: {
                                    type: 'string',
                                    description: 'The transport request number (e.g., ER1K8AKL0L)',
                                },
                            },
                            required: ['transport_number'],
                        },
                    },
                    {
                        name: 'GetVersionHistory',
                        description:
                            'Retrieve version history for an ABAP object across transports. Returns formatted table with version IDs, dates, authors, and transport numbers. IMPORTANT: Transport numbers shown may be either tasks or parent requests - use GetTransportRequest to understand the hierarchy. Version "00000" = CURRENT/ACTIVE for all object types (may have earlier timestamp than transported versions but contains current code). See footer notes for complete guidance on transport hierarchy and version numbering.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                object_type: {
                                    type: 'string',
                                    description:
                                        'Object type: CLAS (class), PROG (program), INCL (include), FUGR (function group), INTF (interface), DDLS (CDS view), BDEF (behavior definition), DCLS (access control)',
                                },
                                object_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP object',
                                },
                            },
                            required: ['object_type', 'object_name'],
                        },
                    },
                    {
                        name: 'GetTransportVersions',
                        description:
                            'Helper tool that combines transport analysis and version history in one command. Given a transport number and object, automatically handles task/parent request hierarchy, finds the relevant version(s), and suggests comparison steps. This is the recommended starting point for analyzing what changed in a specific transport.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                transport_number: {
                                    type: 'string',
                                    description:
                                        'Transport number (can be either a task or parent request, e.g., ER1K8AK0XI)',
                                },
                                object_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP object (e.g., CL_MAN_CHANGELOG)',
                                },
                                object_type: {
                                    type: 'string',
                                    description:
                                        'Object type: CLAS (class), PROG (program), INCL (include), FUGR (function group), INTF (interface), DDLS (CDS view), BDEF (behavior definition), DCLS (access control)',
                                },
                            },
                            required: ['transport_number', 'object_name', 'object_type'],
                        },
                    },
                    {
                        name: 'CompareObjectVersions',
                        description:
                            'Compare two versions of an ABAP object and return a formatted diff. Supports multiple output formats: unified (like git diff), side-by-side, or summary. Use with GetVersionHistory or GetTransportVersions to identify version IDs, then compare them to see exactly what changed.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                object_type: {
                                    type: 'string',
                                    description:
                                        'Object type: CLAS (class), PROG (program), INCL (include), FUGR (function group), INTF (interface), DDLS (CDS view), BDEF (behavior definition), DCLS (access control)',
                                },
                                object_name: {
                                    type: 'string',
                                    description: 'Name of the ABAP object (e.g., CL_MAN_CHANGELOG)',
                                },
                                version_old: {
                                    type: 'string',
                                    description:
                                        'Older version identifier in timestamp/version format (e.g., 20260201144253/00006) from GetVersionHistory',
                                },
                                version_new: {
                                    type: 'string',
                                    description:
                                        'Newer version identifier in timestamp/version format (e.g., 20260201144253/00000) from GetVersionHistory',
                                },
                                context_lines: {
                                    type: 'number',
                                    description:
                                        'Number of context lines to show around changes in unified format (default: 3)',
                                    default: 3,
                                },
                                format: {
                                    type: 'string',
                                    enum: ['unified', 'side-by-side', 'summary'],
                                    description:
                                        'Output format: unified (like git diff, default), side-by-side (comparison view), or summary (statistics only)',
                                    default: 'unified',
                                },
                            },
                            required: ['object_type', 'object_name', 'version_old', 'version_new'],
                        },
                    },
                ],
            };
        });

        // Handler for CallToolRequest
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            switch (request.params.name) {
                case 'ExportClassToFile':
                    return await handleExportClassToFile(request.params.arguments as any);
                case 'ImportClassFromFile':
                    return await handleImportClassFromFile(request.params.arguments as any);
                case 'ExportCDSViewToFile':
                    return await handleExportCDSViewToFile(request.params.arguments as any);
                case 'ExportInterfaceToFile':
                    return await handleExportInterfaceToFile(request.params.arguments as any);
                case 'ExportProgramToFile':
                    return await handleExportProgramToFile(request.params.arguments as any);
                case 'ExportFunctionGroupToFile':
                    return await handleExportFunctionGroupToFile(request.params.arguments as any);
                case 'ExportBehaviorDefinitionToFile':
                    return await handleExportBehaviorDefinitionToFile(request.params.arguments as any);
                case 'ExportAccessControlToFile':
                    return await handleExportAccessControlToFile(request.params.arguments as any);
                case 'ExportMetadataExtensionToFile':
                    return await handleExportMetadataExtensionToFile(request.params.arguments as any);
                case 'GetSystemInfo':
                    return await handleGetSystemInfo(request.params.arguments || {});
                case 'ListSystems':
                    return await handleListSystems();
                case 'SetDefaultSystem':
                    return await handleSetDefaultSystem(request.params.arguments as any);
                case 'SapBrowserLogin':
                    return await handleSapBrowserLogin(request.params.arguments || {});
                case 'ListRuntimeErrors':
                    return await handleListRuntimeErrors(request.params.arguments || {});
                case 'GetRuntimeError':
                    return await handleGetRuntimeError(request.params.arguments as any);
                case 'RunATC':
                    return await handleRunATC(request.params.arguments as any);
                case 'ListATCCheckVariants':
                    return await handleListATCCheckVariants({});
                case 'GetProgram':
                    return await handleGetProgram(request.params.arguments);
                case 'GetClass':
                    return await handleGetClass(request.params.arguments);
                case 'GetFunction':
                    return await handleGetFunction(request.params.arguments);
                case 'GetFunctionGroup':
                    return await handleGetFunctionGroup(request.params.arguments);
                case 'GetStructure':
                    return await handleGetStructure(request.params.arguments);
                case 'GetTable':
                    return await handleGetTable(request.params.arguments);
                case 'GetTableContents':
                    return await handleGetTableContents(request.params.arguments);
                case 'GetPackage':
                    return await handleGetPackage(request.params.arguments);
                case 'GetPackageContents':
                    return await handleGetPackageContents(request.params.arguments);
                case 'GetTypeInfo':
                    return await handleGetTypeInfo(request.params.arguments);
                case 'GetInclude':
                    return await handleGetInclude(request.params.arguments);
                case 'SearchObject':
                    return await handleSearchObject(request.params.arguments);
                case 'GetInterface':
                    return await handleGetInterface(request.params.arguments);
                case 'GetTransaction':
                    return await handleGetTransaction(request.params.arguments);
                case 'GetClassTests':
                    return await handleGetClassTests(request.params.arguments);
                case 'RunClassTests':
                    return await handleRunClassTests(request.params.arguments);
                case 'RunPackageTests':
                    return await handleRunPackageTests(request.params.arguments);
                case 'GetClassCoverage':
                    return await handleGetClassCoverage(request.params.arguments);
                case 'GetObjectUsages':
                    return await handleGetObjectUsages(request.params.arguments);
                case 'GetClassUsages':
                    return await handleGetClassUsages(request.params.arguments);
                case 'CheckSyntax':
                    return await handleCheckSyntax(request.params.arguments);
                case 'CreateClass':
                    return await handleCreateClass(request.params.arguments);
                case 'DeleteLocalClass':
                    return await handleDeleteLocalClass(request.params.arguments);
                case 'CreateClassTests':
                    return await handleCreateClassTests(request.params.arguments);
                case 'ActivateClasses':
                    return await handleActivateClasses(request.params.arguments);
                case 'GetCDSView':
                    return await handleGetCDSView(request.params.arguments);
                case 'GetCDSViewContents':
                    return await handleGetCDSViewContents(request.params.arguments);
                case 'GetBehaviorDefinition':
                    return await handleGetBehaviorDefinition(request.params.arguments);
                case 'GetServiceDefinition':
                    return await handleGetServiceDefinition(request.params.arguments);
                case 'GetServiceBinding':
                    return await handleGetServiceBinding(request.params.arguments);
                case 'GetMetadataExtension':
                    return await handleGetMetadataExtension(request.params.arguments);
                case 'GetAccessControl':
                    return await handleGetAccessControl(request.params.arguments);
                case 'GetBehaviorForRapBo':
                    return await handleGetBehaviorForRapBo(request.params.arguments);
                case 'SearchRapBo':
                    return await handleSearchRapBo(request.params.arguments);
                case 'ListUserTransports':
                    return await handleListUserTransports(request.params.arguments);
                case 'GetTransportRequest':
                    return await handleGetTransportRequest(request.params.arguments);
                case 'GetVersionHistory':
                    return await handleGetVersionHistory(request.params.arguments);
                case 'GetTransportVersions':
                    return await handleGetTransportVersions(request.params.arguments);
                case 'CompareObjectVersions':
                    return await handleCompareObjectVersions(request.params.arguments);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
        });

        // Setup resource handlers

        // Handler for ListResourceTemplatesRequest
        this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
            return await listResourceTemplates();
        });

        // Handler for ListResourcesRequest
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            // Combine resources from different handlers
            const packageResources = await listResources();
            const rapBoResources = listRapBoAnalysisResources();

            return {
                resources: [...packageResources.resources, ...rapBoResources.resources],
            };
        });

        // Handler for ReadResourceRequest
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const uri = request.params.uri;

            // Handle RAP BO analysis resources
            if (uri.startsWith('rap-bo-analysis:///')) {
                return await handleRapBoAnalysisResource(uri);
            }

            // Handle all abap:// resources (server, package, packages)
            if (uri.startsWith('abap://')) {
                return await readResource(uri);
            }

            // Handle CDS view data resources
            if (uri.startsWith('cds-view-data:///')) {
                return await readResource(uri);
            }

            // Handle agent guide resources
            if (uri.startsWith('agent-guide://')) {
                return await readResource(uri);
            }

            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource URI: ${uri}`);
        });

        // Handle server shutdown on SIGINT (Ctrl+C)
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    /**
     * Starts the MCP server and connects it to the transport.
     */
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}

// Create and run the server (only when executed directly, not when imported by tests)
// This guard prevents server instantiation during test imports while preserving production behavior
if (require.main === module) {
    const server = new mcp_abap_adt_server();
    server.run().catch((error) => {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    });
}
