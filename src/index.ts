#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
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
import { handleGetInclude } from './handlers/handleGetInclude';
import { handleGetTypeInfo } from './handlers/handleGetTypeInfo';
import { handleGetInterface } from './handlers/handleGetInterface';
import { handleGetTransaction } from './handlers/handleGetTransaction';
import { handleGetClassTests } from './handlers/handleGetClassTests';
import { handleRunClassTests } from './handlers/handleRunClassTests';
import { handleGetClassCoverage } from './handlers/handleGetClassCoverage';
import { handleSearchObject } from './handlers/handleSearchObject';
import { handleGetClassUsages } from './handlers/handleGetClassUsages';
import { handleCheckSyntax } from './handlers/handleCheckSyntax';
import { handleCreateClass } from './handlers/handleCreateClass';
import { handleDeleteLocalClass } from './handlers/handleDeleteLocalClass';
import { handleCreateClassTests } from './handlers/handleCreateClassTests';
import { handleActivateClasses } from './handlers/handleActivateClasses';
import { handleGetCDSView } from './handlers/handleGetCDSView';
import { handleGetBehaviorDefinition } from './handlers/handleGetBehaviorDefinition';
import { handleGetServiceDefinition } from './handlers/handleGetServiceDefinition';
import { handleGetServiceBinding } from './handlers/handleGetServiceBinding';
import { handleGetCDSViewDependencies } from './handlers/handleGetCDSViewDependencies';
import { handleGetMetadataExtension } from './handlers/handleGetMetadataExtension';
import { handleGetAccessControl } from './handlers/handleGetAccessControl';
import { handleGetBehaviorForRapBo } from './handlers/handleGetBehaviorForRapBo';

// Import shared utility functions and types
import { getBaseUrl, getAuthHeaders, createAxiosInstance, makeAdtRequest, return_error, return_response } from './lib/utils';

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
 *
 * @returns {SapConfig} The SAP configuration object.
 * @throws {Error} If any required environment variable is missing.
 */
export function getConfig(): SapConfig {
  const url = process.env.SAP_URL;
  const username = process.env.SAP_USERNAME;
  const password = process.env.SAP_PASSWORD;
  const client = process.env.SAP_CLIENT;

  // Check if all required environment variables are set
  if (!url || !username || !password || !client) {
    throw new Error(`Missing required environment variables. Required variables:
- SAP_URL
- SAP_USERNAME
- SAP_PASSWORD
- SAP_CLIENT`);
  }

  return { url, username, password, client };
}

/**
 * Server class for interacting with ABAP systems via ADT.
 */
export class mcp_abap_adt_server {
  private server: Server;  // Instance of the MCP server
  private sapConfig: SapConfig; // SAP configuration

  /**
   * Constructor for the mcp_abap_adt_server class.
   */
  constructor() {
    this.sapConfig = getConfig(); // Load SAP configuration
    this.server = new Server(  // Initialize the MCP server
      {
        name: 'mcp-abap-adt', // Server name
        version: '0.1.0',       // Server version
      },
      {
        capabilities: {
          tools: {}, // Initially, no tools are registered
        },
      }
    );

    this.setupHandlers(); // Setup request handlers
  }

  /**
   * Sets up request handlers for listing and calling tools.
   * @private
   */
  private setupHandlers() {
    // Setup tool handlers

    // Handler for ListToolsRequest
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [ // Define available tools
          {
            name: 'GetProgram',
            description: 'Retrieve ABAP program source code',
            inputSchema: {
              type: 'object',
              properties: {
                program_name: {
                  type: 'string',
                  description: 'Name of the ABAP program'
                }
              },
              required: ['program_name']
            }
          },
          {
            name: 'GetClass',
            description: 'Retrieve ABAP class source code',
            inputSchema: {
              type: 'object',
              properties: {
                class_name: {
                  type: 'string',
                  description: 'Name of the ABAP class'
                }
              },
              required: ['class_name']
            }
          },
          {
            name: 'GetFunctionGroup',
            description: 'Retrieve ABAP Function Group source code',
            inputSchema: {
              type: 'object',
              properties: {
                function_group: {
                  type: 'string',
                  description: 'Name of the function module'
                }
              },
              required: ['function_group']
            }
          },
          {
            name: 'GetFunction',
            description: 'Retrieve ABAP Function Module source code',
            inputSchema: {
              type: 'object',
              properties: {
                function_name: {
                  type: 'string',
                  description: 'Name of the function module'
                },
                function_group: {
                  type: 'string',
                  description: 'Name of the function group'
                }
              },
              required: ['function_name', 'function_group']
            }
          },
          {
            name: 'GetStructure',
            description: 'Retrieve ABAP Structure',
            inputSchema: {
              type: 'object',
              properties: {
                structure_name: {
                  type: 'string',
                  description: 'Name of the ABAP Structure'
                }
              },
              required: ['structure_name']
            }
          },
          {
            name: 'GetTable',
            description: 'Retrieve ABAP table structure',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: 'Name of the ABAP table'
                }
              },
              required: ['table_name']
            }
          },
          {
            name: 'GetTableContents',
            description: 'Retrieve contents of an ABAP table with advanced filtering, pagination, and batch query support',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: 'Name of the ABAP table (required for single query mode)'
                },
                columns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional: Specific columns to retrieve (default: all columns). Column names are validated against table metadata.'
                },
                max_rows: {
                  type: 'number',
                  description: 'Optional: Maximum number of rows to retrieve (default: 100, max: 500)',
                  default: 100
                },
                where_conditions: {
                  type: 'object',
                  description: 'Optional: WHERE conditions for filtering. Simple: {"MATNR": "ABC123", "MTART": "FERT"}. Advanced: {"MATNR": {"eq": "ABC123"}}. Note: ADT Data Preview API only supports equality (=) operator.',
                  additionalProperties: true
                },
                order_by: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional: Column names for sorting results. Column names are validated against table metadata.'
                },
                offset: {
                  type: 'number',
                  description: 'Optional: Number of rows to skip for pagination (default: 0)',
                  default: 0
                },
                include_column_metadata: {
                  type: 'boolean',
                  description: 'Optional: Include column type and description in response (default: false)',
                  default: false
                },
                queries: {
                  type: 'array',
                  description: 'Optional: Batch mode - execute multiple queries in one call (max: 10). Each query supports all single-query parameters.',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'Optional identifier for this query in batch results'
                      },
                      table_name: {
                        type: 'string',
                        description: 'Name of the ABAP table'
                      },
                      columns: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      max_rows: {
                        type: 'number'
                      },
                      where_conditions: {
                        type: 'object'
                      },
                      order_by: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      offset: {
                        type: 'number'
                      }
                    },
                    required: ['table_name']
                  }
                }
              },
              anyOf: [
                { required: ['table_name'] },
                { required: ['queries'] }
              ]
            }
          },
          {
            name: 'GetPackage',
            description: 'Retrieve ABAP package details',
            inputSchema: {
              type: 'object',
              properties: {
                package_name: {
                  type: 'string',
                  description: 'Name of the ABAP package'
                }
              },
              required: ['package_name']
            }
          },
          {
            name: 'GetTypeInfo',
            description: 'Retrieve ABAP type information',
            inputSchema: {
              type: 'object',
              properties: {
                type_name: {
                  type: 'string',
                  description: 'Name of the ABAP type'
                }
              },
              required: ['type_name']
            }
          },
          {
            name: 'GetInclude',
            description: 'Retrieve ABAP Include Source Code',
            inputSchema: {
              type: 'object',
              properties: {
                include_name: {
                  type: 'string',
                  description: 'Name of the ABAP Include'
                }
              },
              required: ['include_name']
            }
          },
          {
            name: 'SearchObject',
            description: 'Search for ABAP objects using quick search',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query string (use * wildcard for partial match)'
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 100
                }
              },
              required: ['query']
            }
          },
          {
            name: 'GetTransaction',
            description: 'Retrieve ABAP transaction details',
            inputSchema: {
              type: 'object',
              properties: {
                transaction_name: {
                  type: 'string',
                  description: 'Name of the ABAP transaction'
                }
              },
              required: ['transaction_name']
            }
          },
          {
            name: 'GetInterface',
            description: 'Retrieve ABAP interface source code',
            inputSchema: {
              type: 'object',
              properties: {
                interface_name: {
                  type: 'string',
                  description: 'Name of the ABAP interface'
                }
              },
              required: ['interface_name']
            }
          },
          {
            name: 'GetClassTests',
            description: 'Retrieve local test classes from a class',
            inputSchema: {
              type: 'object',
              properties: {
                class_name: {
                  type: 'string',
                  description: 'Name of the ABAP class'
                }
              },
              required: ['class_name']
            }
          },
          {
            name: 'RunClassTests',
            description: 'Run unit tests for a class and retrieve results',
            inputSchema: {
              type: 'object',
              properties: {
                class_name: {
                  type: 'string',
                  description: 'Name of the ABAP class'
                },
                auto_activate: {
                  type: 'boolean',
                  description: 'Optional: Automatically activate the class before running tests (default: false)',
                  default: false
                },
                preaudit_requested: {
                  type: 'boolean',
                  description: 'Optional: Request pre-audit during activation (default: true, only used if auto_activate is true)',
                  default: true
                }
              },
              required: ['class_name']
            }
          },
          {
            name: 'GetClassCoverage',
            description: 'Run unit tests for a class and retrieve test coverage results',
            inputSchema: {
              type: 'object',
              properties: {
                class_name: {
                  type: 'string',
                  description: 'Name of the ABAP class'
                },
                auto_activate: {
                  type: 'boolean',
                  description: 'Optional: Automatically activate the class before running coverage analysis (default: false)',
                  default: false
                },
                preaudit_requested: {
                  type: 'boolean',
                  description: 'Optional: Request pre-audit during activation (default: true, only used if auto_activate is true)',
                  default: true
                }
              },
              required: ['class_name']
            }
          },
          {
            name: 'GetClassUsages',
            description: 'Retrieve usages for an ABAP class',
            inputSchema: {
              type: 'object',
              properties: {
                class_name: {
                  type: 'string',
                  description: 'Name of the ABAP class'
                }
              },
              required: ['class_name']
            }
          },
          {
            name: 'CheckSyntax',
            description: 'Check ABAP source code syntax and return detailed error information',
            inputSchema: {
              type: 'object',
              properties: {
                source_code: {
                  type: 'string',
                  description: 'ABAP source code to check for syntax errors (optional if object_name is provided - will fetch from existing class)'
                },
                object_name: {
                  type: 'string',
                  description: 'Name of the ABAP object. If source_code is not provided, will attempt to fetch source from this existing class'
                },
                object_type: {
                  type: 'string',
                  description: 'Optional ABAP object type (CLAS, PROG, FUGR, etc. - auto-detected if not provided)'
                }
              },
              required: [],
              anyOf: [
                { required: ['source_code'] },
                { required: ['object_name'] }
              ]
            }
          },
          {
            name: 'CreateClass',
            description: 'Create a new ABAP class in local package ($TMP) without transport assignment',
            inputSchema: {
              type: 'object',
              properties: {
                class_name: {
                  type: 'string',
                  description: 'Name of the ABAP class (must start with Z or Y)'
                },
                source_code: {
                  type: 'string',
                  description: 'Complete ABAP class source code (definition and implementation)'
                },
                description: {
                  type: 'string',
                  description: 'Optional description for the class'
                },
                package: {
                  type: 'string',
                  description: 'Package name (defaults to $TMP, must be local package)'
                },
                auto_activate: {
                  type: 'boolean',
                  description: 'Optional: Automatically activate the class after creation (default: false)',
                  default: false
                },
                preaudit_requested: {
                  type: 'boolean',
                  description: 'Optional: Request pre-audit during activation (default: true, only used if auto_activate is true)',
                  default: true
                }
              },
              required: ['class_name', 'source_code']
            }
          },
          {
            name: 'DeleteLocalClass',
            description: 'Delete a local ABAP class (only Z/Y classes in local packages)',
            inputSchema: {
              type: 'object',
              properties: {
                class_name: {
                  type: 'string',
                  description: 'Name of the ABAP class to delete (must start with Z or Y)'
                }
              },
              required: ['class_name']
            }
          },
          {
            name: 'CreateClassTests',
            description: 'Create or replace test classes within an existing global ABAP class',
            inputSchema: {
              type: 'object',
              properties: {
                parent_class_name: {
                  type: 'string',
                  description: 'Name of the existing ABAP class to add test classes to'
                },
                test_source_code: {
                  type: 'string',
                  description: 'Complete test class source code (local test classes implementation)'
                },
                backup_existing: {
                  type: 'boolean',
                  description: 'Optional: Create backup of existing test classes before replacing',
                  default: false
                },
                auto_activate: {
                  type: 'boolean',
                  description: 'Optional: Automatically activate the parent class after adding tests (default: false)',
                  default: false
                },
                preaudit_requested: {
                  type: 'boolean',
                  description: 'Optional: Request pre-audit during activation (default: true, only used if auto_activate is true)',
                  default: true
                }
              },
              required: ['parent_class_name', 'test_source_code']
            }
          },
          {
            name: 'ActivateClasses',
            description: 'Activate ABAP classes after creation or modification',
            inputSchema: {
              type: 'object',
              properties: {
                class_names: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of ABAP class names to activate'
                },
                class_name: {
                  type: 'string',
                  description: 'Single ABAP class name to activate'
                },
                preaudit_requested: {
                  type: 'boolean',
                  description: 'Whether to request pre-audit (default: true)',
                  default: true
                }
              },
              anyOf: [
                { required: ['class_names'] },
                { required: ['class_name'] }
              ]
            }
          },
          {
            name: 'GetCDSView',
            description: 'Retrieve CDS view source code and metadata',
            inputSchema: {
              type: 'object',
              properties: {
                view_name: {
                  type: 'string',
                  description: 'Name of the CDS view entity'
                },
                include_annotations: {
                  type: 'boolean',
                  description: 'Include CDS annotations in response (default: true)',
                  default: true
                }
              },
              required: ['view_name']
            }
          },
          {
            name: 'GetBehaviorDefinition',
            description: 'Retrieve RAP behavior definition source code and metadata',
            inputSchema: {
              type: 'object',
              properties: {
                cds_view_name: {
                  type: 'string',
                  description: 'Name of the root CDS view entity'
                }
              },
              required: ['cds_view_name']
            }
          },
          {
            name: 'GetServiceDefinition',
            description: 'Retrieve RAP service definition source code and metadata',
            inputSchema: {
              type: 'object',
              properties: {
                service_name: {
                  type: 'string',
                  description: 'Name of the service definition'
                }
              },
              required: ['service_name']
            }
          },
          {
            name: 'GetServiceBinding',
            description: 'Retrieve RAP service binding details and configuration',
            inputSchema: {
              type: 'object',
              properties: {
                binding_name: {
                  type: 'string',
                  description: 'Name of the service binding'
                }
              },
              required: ['binding_name']
            }
          },
          {
            name: 'GetCDSViewDependencies',
            description: 'Analyze CDS view dependencies and associations',
            inputSchema: {
              type: 'object',
              properties: {
                view_name: {
                  type: 'string',
                  description: 'Name of the CDS view to analyze'
                }
              },
              required: ['view_name']
            }
          },
          {
            name: 'GetMetadataExtension',
            description: 'Retrieve metadata extension (UI annotations) source code',
            inputSchema: {
              type: 'object',
              properties: {
                extension_name: {
                  type: 'string',
                  description: 'Name of the metadata extension'
                }
              },
              required: ['extension_name']
            }
          },
          {
            name: 'GetAccessControl',
            description: 'Retrieve access control (DCL) definition source code',
            inputSchema: {
              type: 'object',
              properties: {
                dcl_name: {
                  type: 'string',
                  description: 'Name of the access control definition'
                }
              },
              required: ['dcl_name']
            }
          },
          {
            name: 'GetBehaviorForRapBo',
            description: 'Retrieve interface behavior definition for RAP Business Object from RONT_NODE table',
            inputSchema: {
              type: 'object',
              properties: {
                rap_bo_name: {
                  type: 'string',
                  description: 'Name of the RAP Business Object to search for'
                }
              },
              required: ['rap_bo_name']
            }
          }
        ]
      };
    });

    // Handler for CallToolRequest
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
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
        case 'GetClassCoverage':
          return await handleGetClassCoverage(request.params.arguments);
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
        case 'GetBehaviorDefinition':
          return await handleGetBehaviorDefinition(request.params.arguments);
        case 'GetServiceDefinition':
          return await handleGetServiceDefinition(request.params.arguments);
        case 'GetServiceBinding':
          return await handleGetServiceBinding(request.params.arguments);
        case 'GetCDSViewDependencies':
          return await handleGetCDSViewDependencies(request.params.arguments);
        case 'GetMetadataExtension':
          return await handleGetMetadataExtension(request.params.arguments);
        case 'GetAccessControl':
          return await handleGetAccessControl(request.params.arguments);
        case 'GetBehaviorForRapBo':
          return await handleGetBehaviorForRapBo(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
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

// Create and run the server
const server = new mcp_abap_adt_server();
server.run().catch((error) => {
  process.exit(1);
});
