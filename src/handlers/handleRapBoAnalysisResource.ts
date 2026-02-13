import { RapAnalysisEngine, RapBoAnalysisOptions } from '../lib/rap-analysis-engine';
import { return_error } from '../lib/utils';

/**
 * Handle RAP BO Analysis Resource requests
 * 
 * This resource provides comprehensive analysis of RAP Business Objects
 * by orchestrating multiple MCP tools to gather and analyze all related artifacts.
 */
export async function handleRapBoAnalysisResource(uri: string) {
    try {
        // Parse URI: rap-bo-analysis:///{rap_bo_name}?options
        const uriParts = uri.replace('rap-bo-analysis:///', '').split('?');
        const rapBoName = decodeURIComponent(uriParts[0]);
        
        if (!rapBoName) {
            throw new Error('RAP BO name is required in URI path');
        }

        // Parse query parameters for analysis options
        const options: RapBoAnalysisOptions = {};
        if (uriParts[1]) {
            const queryParams = new URLSearchParams(uriParts[1]);
            
            options.include_implementation_analysis = queryParams.get('include_implementation') !== 'false';
            options.include_service_analysis = queryParams.get('include_services') !== 'false';
            options.include_dependency_analysis = queryParams.get('include_dependencies') !== 'false';
            options.include_security_analysis = queryParams.get('include_security') !== 'false';
            options.analysis_depth = (queryParams.get('depth') as 'summary' | 'detailed' | 'comprehensive') || 'detailed';
        }

        // Perform the analysis
        const analysisEngine = new RapAnalysisEngine();
        const analysisResult = await analysisEngine.analyzeRapBo(rapBoName, options);

        // Return the resource content
        return {
            contents: [{
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify(analysisResult, null, 2)
            }]
        };

    } catch (error) {
        return return_error(error);
    }
}

/**
 * List available RAP BO Analysis resources
 * 
 * This provides static example resources for common RAP BOs
 */
export function listRapBoAnalysisResources() {
    return {
        resources: [
            {
                uri: 'rap-bo-analysis:///I_SalesOrder',
                name: 'RAP BO Analysis: Sales Order',
                description: 'Comprehensive analysis of Sales Order RAP Business Object (I_SalesOrder)',
                mimeType: 'application/json'
            },
            {
                uri: 'rap-bo-analysis:///I_PurchaseOrder',
                name: 'RAP BO Analysis: Purchase Order', 
                description: 'Comprehensive analysis of Purchase Order RAP Business Object (I_PurchaseOrder)',
                mimeType: 'application/json'
            }
        ]
    };
}

/**
 * Get resource metadata and usage information
 */
export function getRapBoAnalysisResourceInfo() {
    return {
        name: 'RAP Business Object Analysis Resource',
        version: '1.0',
        description: 'Provides comprehensive analysis of RAP Business Objects by orchestrating multiple MCP tools',
        
        uri_pattern: 'rap-bo-analysis:///{rap_bo_name}',
        
        supported_parameters: {
            include_implementation: {
                type: 'boolean',
                default: true,
                description: 'Include analysis of implementation classes and their dependencies'
            },
            include_services: {
                type: 'boolean', 
                default: true,
                description: 'Include analysis of service definitions and bindings'
            },
            include_dependencies: {
                type: 'boolean',
                default: true,
                description: 'Include analysis of CDS view dependencies'
            },
            include_security: {
                type: 'boolean',
                default: true,
                description: 'Include analysis of access control definitions'
            },
            depth: {
                type: 'string',
                enum: ['summary', 'detailed', 'comprehensive'],
                default: 'detailed',
                description: 'Level of analysis detail to provide'
            }
        },

        examples: [
            {
                uri: 'rap-bo-analysis:///SalesOrder',
                description: 'Full analysis of SalesOrder RAP BO with all options enabled'
            },
            {
                uri: 'rap-bo-analysis:///SalesOrder?depth=summary',
                description: 'Summary analysis of SalesOrder RAP BO'
            },
            {
                uri: 'rap-bo-analysis:///SalesOrder?include_services=false&include_security=false',
                description: 'Analysis of SalesOrder RAP BO excluding services and security'
            },
            {
                uri: 'rap-bo-analysis:///CustomBO?depth=comprehensive',
                description: 'Comprehensive analysis of a custom RAP Business Object'
            }
        ],

        analysis_phases: [
            {
                phase: 'Discovery',
                description: 'Find interface behaviors from RONT_NODE table',
                tools_used: ['GetBehaviorForRapBo']
            },
            {
                phase: 'Core Analysis',
                description: 'Analyze behavior definitions and CDS views',
                tools_used: ['GetBehaviorDefinition', 'GetCDSView']
            },
            {
                phase: 'Dependency Analysis',
                description: 'Map CDS view dependencies and associations',
                tools_used: ['GetCDSViewDependencies']
            },
            {
                phase: 'Service Analysis',
                description: 'Analyze service definitions and bindings',
                tools_used: ['SearchObject', 'GetServiceDefinition', 'GetServiceBinding']
            },
            {
                phase: 'Security Analysis',
                description: 'Analyze access control definitions',
                tools_used: ['GetAccessControl']
            },
            {
                phase: 'Implementation Analysis',
                description: 'Analyze implementation classes and their usage',
                tools_used: ['GetClass', 'GetClassUsages']
            }
        ],

        output_structure: {
            analysis_metadata: 'Analysis execution information and status',
            behavior_definitions: 'RAP behavior definitions and interface behaviors',
            cds_views: 'Root views, projection views, and their dependencies',
            service_exposure: 'Service definitions, bindings, and OData services',
            access_control: 'DCL definitions and authorization rules',
            implementation_analysis: 'Implementation classes and their dependencies',
            recommendations: 'Analysis-based recommendations for improvement'
        }
    };
}