import { handleGetBehaviorForRapBo } from '../handlers/handleGetBehaviorForRapBo';
import { handleGetBehaviorDefinition } from '../handlers/handleGetBehaviorDefinition';
import { handleGetCDSView } from '../handlers/handleGetCDSView';
import { handleGetServiceDefinition } from '../handlers/handleGetServiceDefinition';
import { handleGetServiceBinding } from '../handlers/handleGetServiceBinding';
import { handleGetAccessControl } from '../handlers/handleGetAccessControl';
import { handleGetClass } from '../handlers/handleGetClass';
import { handleGetClassUsages } from '../handlers/handleGetClassUsages';
import { handleSearchObject } from '../handlers/handleSearchObject';

export interface RapBoAnalysisOptions {
    include_implementation_analysis?: boolean;
    include_service_analysis?: boolean;
    include_dependency_analysis?: boolean;
    include_security_analysis?: boolean;
    analysis_depth?: 'summary' | 'detailed' | 'comprehensive';
}

export interface RapBoAnalysisResult {
    analysis_metadata: {
        rap_bo_name: string;
        analysis_timestamp: string;
        analysis_version: string;
        status: 'complete' | 'partial' | 'error';
        options_used: RapBoAnalysisOptions;
        errors: string[];
        warnings: string[];
    };
    behavior_definitions: {
        interface_behaviors: any[];
        behavior_definitions: any[];
        implementation_classes: string[];
        operations_summary: any;
    };
    cds_views: {
        root_views: any[];
        projection_views: any[];
        dependencies: any[];
    };
    service_exposure?: {
        service_definitions: any[];
        service_bindings: any[];
        odata_services: any[];
    };
    access_control?: {
        dcl_definitions: any[];
        authorization_summary: any;
    };
    implementation_analysis?: {
        classes: any[];
        class_dependencies: any[];
        usage_analysis: any[];
    };
    recommendations: string[];
}

/**
 * RAP Business Object Analysis Engine
 * Orchestrates multiple MCP tools to provide comprehensive RAP BO analysis
 */
export class RapAnalysisEngine {
    private errors: string[] = [];
    private warnings: string[] = [];

    /**
     * Perform comprehensive RAP BO analysis
     */
    async analyzeRapBo(rapBoName: string, options: RapBoAnalysisOptions = {}): Promise<RapBoAnalysisResult> {
        const startTime = new Date();
        this.errors = [];
        this.warnings = [];

        // Set default options
        const analysisOptions: RapBoAnalysisOptions = {
            include_implementation_analysis: options.include_implementation_analysis ?? true,
            include_service_analysis: options.include_service_analysis ?? true,
            include_dependency_analysis: options.include_dependency_analysis ?? true,
            include_security_analysis: options.include_security_analysis ?? true,
            analysis_depth: options.analysis_depth ?? 'detailed'
        };

        const result: RapBoAnalysisResult = {
            analysis_metadata: {
                rap_bo_name: rapBoName,
                analysis_timestamp: startTime.toISOString(),
                analysis_version: '1.0',
                status: 'complete',
                options_used: analysisOptions,
                errors: [],
                warnings: []
            },
            behavior_definitions: {
                interface_behaviors: [],
                behavior_definitions: [],
                implementation_classes: [],
                operations_summary: {}
            },
            cds_views: {
                root_views: [],
                projection_views: [],
                dependencies: []
            },
            recommendations: []
        };

        try {
            // Phase 1: Discovery - Find interface behaviors
            await this.discoverInterfaceBehaviors(rapBoName, result);

            // Phase 2: Core Analysis - Behavior definitions and CDS views
            await this.analyzeBehaviorDefinitions(result);
            await this.analyzeCdsViews(result);

            // Phase 3: Optional analyses based on options
            if (analysisOptions.include_dependency_analysis) {
                await this.analyzeDependencies(result);
            }

            if (analysisOptions.include_service_analysis) {
                result.service_exposure = {
                    service_definitions: [],
                    service_bindings: [],
                    odata_services: []
                };
                await this.analyzeServiceExposure(rapBoName, result);
            }

            if (analysisOptions.include_security_analysis) {
                result.access_control = {
                    dcl_definitions: [],
                    authorization_summary: {}
                };
                await this.analyzeAccessControl(result);
            }

            if (analysisOptions.include_implementation_analysis) {
                result.implementation_analysis = {
                    classes: [],
                    class_dependencies: [],
                    usage_analysis: []
                };
                await this.analyzeImplementation(result);
            }

            // Phase 4: Generate recommendations
            this.generateRecommendations(result);

            // Set final status
            result.analysis_metadata.status = this.errors.length > 0 ? 'partial' : 'complete';
            result.analysis_metadata.errors = this.errors;
            result.analysis_metadata.warnings = this.warnings;

        } catch (error: any) {
            this.errors.push(`Critical analysis error: ${error.message}`);
            result.analysis_metadata.status = 'error';
            result.analysis_metadata.errors = this.errors;
            result.analysis_metadata.warnings = this.warnings;
        }

        return result;
    }

    /**
     * Phase 1: Discover interface behaviors from RONT_NODE table
     * If not found, try direct behavior definition lookup
     */
    private async discoverInterfaceBehaviors(rapBoName: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            const behaviorResponse = await handleGetBehaviorForRapBo({ rap_bo_name: rapBoName });
            
            if (behaviorResponse.content && behaviorResponse.content[0]) {
                const behaviorData = JSON.parse(behaviorResponse.content[0].text);
                result.behavior_definitions.interface_behaviors = behaviorData.behavior_definitions || [];
                
                if (behaviorData.matches_found === 0) {
                    this.warnings.push(`No interface behaviors found in RONT_NODE for: ${rapBoName}`);
                    // Try direct behavior definition lookup as fallback
                    await this.tryDirectBehaviorLookup(rapBoName, result);
                }
            }
        } catch (error: any) {
            this.warnings.push(`Failed to discover interface behaviors: ${error.message}`);
            // Try direct behavior definition lookup as fallback
            await this.tryDirectBehaviorLookup(rapBoName, result);
        }
    }

    /**
     * Fallback: Try direct behavior definition lookup when RONT_NODE search fails
     */
    private async tryDirectBehaviorLookup(rapBoName: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            // Try to get behavior definition directly with the provided name
            const behaviorResponse = await handleGetBehaviorDefinition({ cds_view_name: rapBoName });
            
            // Check if response is an error first - must check before accessing content
            if (!behaviorResponse || behaviorResponse.isError) {
                return; // Silently skip - not all views have behavior definitions
            }
            
            // Check if content exists and is valid
            if (!behaviorResponse.content || !behaviorResponse.content[0] || !behaviorResponse.content[0].text) {
                return; // Silently skip - no content available
            }
            
            try {
                const behaviorData = JSON.parse(behaviorResponse.content[0].text);
                
                // Add to behavior definitions
                result.behavior_definitions.behavior_definitions.push(behaviorData);
                
                // Extract implementation class
                if (behaviorData.implementation_class) {
                    result.behavior_definitions.implementation_classes.push(behaviorData.implementation_class);
                }
                
                // Summarize operations
                if (behaviorData.operations) {
                    result.behavior_definitions.operations_summary = {
                        ...result.behavior_definitions.operations_summary,
                        [rapBoName]: behaviorData.operations
                    };
                }
                
                this.warnings.push(`Found behavior definition directly for: ${rapBoName}`);
            } catch (parseError: any) {
                // JSON parsing failed - silently skip
            }
        } catch (error: any) {
            // Silently skip - not all views have behavior definitions
        }
    }

    /**
     * Phase 2a: Analyze behavior definitions
     */
    private async analyzeBehaviorDefinitions(result: RapBoAnalysisResult): Promise<void> {
        const behaviorPromises: Promise<void>[] = [];

        for (const interfaceBehavior of result.behavior_definitions.interface_behaviors) {
            // Extract CDS view name from RONT_NAME (typically contains the view name)
            const rontName = interfaceBehavior.ront_name;
            if (rontName) {
                // Try to extract CDS view name - common patterns: R_ViewName, ViewName_TP, etc.
                const possibleViewNames = this.extractPossibleViewNames(rontName);
                
                for (const viewName of possibleViewNames) {
                    behaviorPromises.push(this.analyzeSingleBehaviorDefinition(viewName, result));
                }
            }
        }

        await Promise.allSettled(behaviorPromises);
    }

    /**
     * Analyze a single behavior definition
     */
    private async analyzeSingleBehaviorDefinition(cdsViewName: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            const behaviorResponse = await handleGetBehaviorDefinition({ cds_view_name: cdsViewName });
            
            if (behaviorResponse.content && behaviorResponse.content[0] && !behaviorResponse.isError) {
                const behaviorData = JSON.parse(behaviorResponse.content[0].text);
                result.behavior_definitions.behavior_definitions.push(behaviorData);
                
                // Extract implementation class
                if (behaviorData.implementation_class) {
                    result.behavior_definitions.implementation_classes.push(behaviorData.implementation_class);
                }
                
                // Summarize operations
                if (behaviorData.operations) {
                    result.behavior_definitions.operations_summary = {
                        ...result.behavior_definitions.operations_summary,
                        [cdsViewName]: behaviorData.operations
                    };
                }
            }
        } catch (error: any) {
            // Silently skip - not all views have behavior definitions
        }
    }

    /**
     * Phase 2b: Analyze CDS views
     */
    private async analyzeCdsViews(result: RapBoAnalysisResult): Promise<void> {
        const viewNames = new Set<string>();
        
        // Always try the original RAP BO name first
        viewNames.add(result.analysis_metadata.rap_bo_name);
        
        // Collect view names from behavior definitions
        for (const behavior of result.behavior_definitions.behavior_definitions) {
            if (behavior.cds_view_name) {
                viewNames.add(behavior.cds_view_name);
            }
        }

        // Collect view names from interface behaviors
        for (const interfaceBehavior of result.behavior_definitions.interface_behaviors) {
            const possibleNames = this.extractPossibleViewNames(interfaceBehavior.ront_name);
            possibleNames.forEach(name => viewNames.add(name));
        }

        const viewPromises: Promise<void>[] = [];
        for (const viewName of viewNames) {
            viewPromises.push(this.analyzeSingleCdsView(viewName, result));
        }

        await Promise.allSettled(viewPromises);
    }

    /**
     * Analyze a single CDS view
     */
    private async analyzeSingleCdsView(viewName: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            const cdsResponse = await handleGetCDSView({ view_name: viewName, include_annotations: true });
            
            // Check if response is an error first
            if (cdsResponse.isError || !cdsResponse.content || !cdsResponse.content[0]) {
                return; // Silently skip - view might not exist
            }
            
            try {
                const cdsData = JSON.parse(cdsResponse.content[0].text);
                
                // Classify as root or projection view
                if (viewName.startsWith('R_') || viewName.endsWith('TP')) {
                    result.cds_views.root_views.push(cdsData);
                } else if (viewName.startsWith('C_') || viewName.startsWith('I_')) {
                    result.cds_views.projection_views.push(cdsData);
                } else {
                    // Default to projection views for unknown patterns
                    result.cds_views.projection_views.push(cdsData);
                }
            } catch (parseError: any) {
                // JSON parsing failed - silently skip
            }
        } catch (error: any) {
            // Silently skip - view might not exist
        }
    }

    /**
     * Phase 3a: Analyze dependencies
     */
    private async analyzeDependencies(result: RapBoAnalysisResult): Promise<void> {
        // Analyze dependencies for all discovered CDS views
        const allViews = [...result.cds_views.root_views, ...result.cds_views.projection_views];
        
        for (const view of allViews) {
            if (view.view_name) {
                await this.analyzeSingleViewDependencies(view.view_name, result);
            }
        }
    }

    /**
     * Analyze dependencies for a single CDS view
     */
    private async analyzeSingleViewDependencies(viewName: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            const { handleGetCDSViewDependencies } = await import('../handlers/handleGetCDSViewDependencies.js');
            const depsResponse = await handleGetCDSViewDependencies({ view_name: viewName });
            
            if (depsResponse.content && depsResponse.content[0] && !depsResponse.isError) {
                const depsData = JSON.parse(depsResponse.content[0].text);
                result.cds_views.dependencies.push({
                    view_name: viewName,
                    dependencies: depsData
                });
            }
        } catch (error: any) {
            // Silently skip - view might not have dependencies or tool not available
        }
    }

    /**
     * Phase 3b: Analyze service exposure
     */
    private async analyzeServiceExposure(rapBoName: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            // Search for service definitions related to the RAP BO
            const searchResponse = await handleSearchObject({ 
                query: `*${rapBoName.toUpperCase()}*`, 
                maxResults: 50 
            });

            // Check if response is an error first
            if (searchResponse.isError || !searchResponse.content || !searchResponse.content[0]) {
                return; // Silently skip - search might not return results
            }

            try {
                const searchData = JSON.parse(searchResponse.content[0].text);
                
                // Filter for service-related objects
                const serviceObjects = searchData.objects?.filter((obj: any) => 
                    obj.type === 'SRVD' || obj.type === 'SRVB' || 
                    obj.name?.includes('UI_') || obj.name?.includes('API_')
                ) || [];

                // Analyze each service object
                for (const serviceObj of serviceObjects) {
                    if (serviceObj.type === 'SRVD') {
                        await this.analyzeServiceDefinition(serviceObj.name, result);
                    } else if (serviceObj.type === 'SRVB') {
                        await this.analyzeServiceBinding(serviceObj.name, result);
                    }
                }
            } catch (parseError: any) {
                // JSON parsing failed - silently skip
            }
        } catch (error: any) {
            // Silently skip - search might not return results
        }
    }

    /**
     * Analyze a service definition
     */
    private async analyzeServiceDefinition(serviceName: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            const serviceResponse = await handleGetServiceDefinition({ service_name: serviceName });
            
            if (serviceResponse.content && serviceResponse.content[0] && !serviceResponse.isError) {
                const serviceData = JSON.parse(serviceResponse.content[0].text);
                result.service_exposure!.service_definitions.push(serviceData);
            }
        } catch (error: any) {
            // Silently skip
        }
    }

    /**
     * Analyze a service binding
     */
    private async analyzeServiceBinding(bindingName: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            const bindingResponse = await handleGetServiceBinding({ binding_name: bindingName });
            
            if (bindingResponse.content && bindingResponse.content[0] && !bindingResponse.isError) {
                const bindingData = JSON.parse(bindingResponse.content[0].text);
                result.service_exposure!.service_bindings.push(bindingData);
            }
        } catch (error: any) {
            // Silently skip
        }
    }

    /**
     * Phase 3c: Analyze access control
     */
    private async analyzeAccessControl(result: RapBoAnalysisResult): Promise<void> {
        const rootViews = result.cds_views.root_views;
        
        for (const view of rootViews) {
            if (view.view_name) {
                await this.analyzeSingleAccessControl(view.view_name, result);
            }
        }
    }

    /**
     * Analyze access control for a single view
     */
    private async analyzeSingleAccessControl(viewName: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            const aclResponse = await handleGetAccessControl({ dcl_name: viewName });
            
            if (aclResponse.content && aclResponse.content[0] && !aclResponse.isError) {
                const aclData = JSON.parse(aclResponse.content[0].text);
                result.access_control!.dcl_definitions.push(aclData);
            }
        } catch (error: any) {
            // Silently skip - not all views have access control
        }
    }

    /**
     * Phase 3d: Analyze implementation classes
     */
    private async analyzeImplementation(result: RapBoAnalysisResult): Promise<void> {
        const implementationClasses = result.behavior_definitions.implementation_classes;
        
        for (const className of implementationClasses) {
            await this.analyzeSingleImplementationClass(className, result);
        }
    }

    /**
     * Analyze a single implementation class
     */
    private async analyzeSingleImplementationClass(className: string, result: RapBoAnalysisResult): Promise<void> {
        try {
            // Get class details
            const classResponse = await handleGetClass({ class_name: className });
            
            if (classResponse.content && classResponse.content[0] && !classResponse.isError) {
                const classData = JSON.parse(classResponse.content[0].text);
                result.implementation_analysis!.classes.push(classData);
            }

            // Get class usages
            const usageResponse = await handleGetClassUsages({ class_name: className });
            
            if (usageResponse.content && usageResponse.content[0] && !usageResponse.isError) {
                const usageData = JSON.parse(usageResponse.content[0].text);
                result.implementation_analysis!.usage_analysis.push(usageData);
            }
        } catch (error: any) {
            // Silently skip
        }
    }

    /**
     * Generate recommendations based on analysis results
     */
    private generateRecommendations(result: RapBoAnalysisResult): void {
        const recommendations: string[] = [];

        // Check for missing behavior definitions
        if (result.behavior_definitions.behavior_definitions.length === 0) {
            recommendations.push("No behavior definitions found. Consider implementing RAP behavior for this business object.");
        }

        // Check for missing access control
        if (result.access_control && result.access_control.dcl_definitions.length === 0) {
            recommendations.push("No access control definitions found. Consider implementing authorization rules for security.");
        }

        // Check for service exposure
        if (result.service_exposure && result.service_exposure.service_definitions.length === 0) {
            recommendations.push("No service definitions found. Consider exposing this RAP BO as an OData service if external access is needed.");
        }

        // Check for implementation classes
        if (result.behavior_definitions.implementation_classes.length === 0) {
            recommendations.push("No implementation classes found. Behavior definitions may be using managed implementation.");
        }

        // Check for projection views
        if (result.cds_views.projection_views.length === 0) {
            recommendations.push("No projection views found. Consider creating consumption views for better separation of concerns.");
        }

        result.recommendations = recommendations;
    }

    /**
     * Extract possible CDS view names from RONT_NAME
     */
    private extractPossibleViewNames(rontName: string): string[] {
        const names: string[] = [];
        
        if (!rontName) return names;

        // Add the original name
        names.push(rontName);

        // Common patterns for RAP BO names
        const patterns = [
            rontName, // Original
            `R_${rontName}`, // Root view pattern
            `${rontName}TP`, // Transactional pattern
            `R_${rontName}TP`, // Root transactional pattern
            `C_${rontName}`, // Consumption view pattern
            `I_${rontName}`, // Interface view pattern
        ];

        // Remove duplicates and add to names
        patterns.forEach(pattern => {
            if (!names.includes(pattern)) {
                names.push(pattern);
            }
        });

        return names;
    }
}