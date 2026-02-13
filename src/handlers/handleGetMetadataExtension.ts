import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetMetadataExtension(args: any) {
    try {
        if (!args?.extension_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Metadata extension name is required');
        }

        const encodedExtensionName = encodeURIComponent(args.extension_name);
        
        // Try different ADT endpoints for metadata extensions
        const baseUrl = await getBaseUrl();
        const endpoints = [
            `/sap/bc/adt/ddic/ddlx/sources/${encodedExtensionName}`, // Metadata extension source
            `/sap/bc/adt/ddic/extensions/${encodedExtensionName}`, // Alternative extension endpoint
            `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodedExtensionName}&objectType=DDLX/EX`
        ];

        let lastError: any;
        
        for (const endpoint of endpoints) {
            try {
                const url = `${baseUrl}${endpoint}`;
                const response = await makeAdtRequest(url, 'GET', 30000);
                
                // If we got a successful response, parse and enhance it
                if (response.data) {
                    let result = {
                        extension_name: args.extension_name,
                        source_code: response.data,
                        annotated_view: extractAnnotatedView(response.data),
                        layer: extractLayer(response.data),
                        ui_annotations: extractUIAnnotations(response.data),
                        consumption_annotations: extractConsumptionAnnotations(response.data),
                        metadata_annotations: extractMetadataAnnotations(response.data),
                        object_model_annotations: extractObjectModelAnnotations(response.data),
                        analytics_annotations: extractAnalyticsAnnotations(response.data)
                    };
                    
                    return {
                        isError: false,
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                }
            } catch (error) {
                lastError = error;
                // Continue to next endpoint
                continue;
            }
        }
        
        // If all endpoints failed, throw the last error
        throw lastError || new Error('Failed to retrieve metadata extension from any endpoint');
        
    } catch (error) {
        return return_error(error);
    }
}

function extractAnnotatedView(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Match annotate view patterns like: annotate view C_SalesOrderTP with
        const annotateMatch = trimmed.match(/annotate\s+view\s+(\w+)\s+with/i);
        if (annotateMatch) {
            return annotateMatch[1].trim();
        }
        
        // Match annotate entity patterns
        const entityMatch = trimmed.match(/annotate\s+entity\s+(\w+)\s+with/i);
        if (entityMatch) {
            return entityMatch[1].trim();
        }
    }
    
    return null;
}

function extractLayer(sourceCode: string): string | null {
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Match layer annotations like: @Metadata.layer: #CORE
        const layerMatch = trimmed.match(/@Metadata\.layer\s*:\s*#(\w+)/i);
        if (layerMatch) {
            return layerMatch[1].trim();
        }
    }
    
    return null;
}

function extractUIAnnotations(sourceCode: string): any[] {
    const uiAnnotations: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('@UI.')) {
            const annotation = parseUIAnnotation(trimmed);
            if (annotation) {
                uiAnnotations.push(annotation);
            }
        }
    }
    
    return uiAnnotations;
}

function parseUIAnnotation(annotationLine: string): any | null {
    // Parse different UI annotation types
    
    // @UI.lineItem
    const lineItemMatch = annotationLine.match(/@UI\.lineItem\s*:\s*\[([^\]]+)\]/i);
    if (lineItemMatch) {
        return {
            type: 'lineItem',
            definition: lineItemMatch[1].trim(),
            parsed: parseAnnotationArray(lineItemMatch[1])
        };
    }
    
    // @UI.identification
    const identificationMatch = annotationLine.match(/@UI\.identification\s*:\s*\[([^\]]+)\]/i);
    if (identificationMatch) {
        return {
            type: 'identification',
            definition: identificationMatch[1].trim(),
            parsed: parseAnnotationArray(identificationMatch[1])
        };
    }
    
    // @UI.selectionField
    const selectionFieldMatch = annotationLine.match(/@UI\.selectionField\s*:\s*\[([^\]]+)\]/i);
    if (selectionFieldMatch) {
        return {
            type: 'selectionField',
            definition: selectionFieldMatch[1].trim(),
            parsed: parseAnnotationArray(selectionFieldMatch[1])
        };
    }
    
    // @UI.facet
    const facetMatch = annotationLine.match(/@UI\.facet\s*:\s*\[([^\]]+)\]/i);
    if (facetMatch) {
        return {
            type: 'facet',
            definition: facetMatch[1].trim(),
            parsed: parseAnnotationArray(facetMatch[1])
        };
    }
    
    // @UI.headerInfo
    const headerInfoMatch = annotationLine.match(/@UI\.headerInfo\s*:\s*\{([^}]+)\}/i);
    if (headerInfoMatch) {
        return {
            type: 'headerInfo',
            definition: headerInfoMatch[1].trim(),
            parsed: parseAnnotationObject(headerInfoMatch[1])
        };
    }
    
    // @UI.dataPoint
    const dataPointMatch = annotationLine.match(/@UI\.dataPoint\s*:\s*\{([^}]+)\}/i);
    if (dataPointMatch) {
        return {
            type: 'dataPoint',
            definition: dataPointMatch[1].trim(),
            parsed: parseAnnotationObject(dataPointMatch[1])
        };
    }
    
    return null;
}

function extractConsumptionAnnotations(sourceCode: string): any[] {
    const consumptionAnnotations: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('@Consumption.')) {
            const annotation = parseConsumptionAnnotation(trimmed);
            if (annotation) {
                consumptionAnnotations.push(annotation);
            }
        }
    }
    
    return consumptionAnnotations;
}

function parseConsumptionAnnotation(annotationLine: string): any | null {
    // @Consumption.valueHelpDefinition
    const valueHelpMatch = annotationLine.match(/@Consumption\.valueHelpDefinition\s*:\s*\[([^\]]+)\]/i);
    if (valueHelpMatch) {
        return {
            type: 'valueHelpDefinition',
            definition: valueHelpMatch[1].trim(),
            parsed: parseAnnotationArray(valueHelpMatch[1])
        };
    }
    
    // @Consumption.filter
    const filterMatch = annotationLine.match(/@Consumption\.filter\s*:\s*\{([^}]+)\}/i);
    if (filterMatch) {
        return {
            type: 'filter',
            definition: filterMatch[1].trim(),
            parsed: parseAnnotationObject(filterMatch[1])
        };
    }
    
    return null;
}

function extractMetadataAnnotations(sourceCode: string): any[] {
    const metadataAnnotations: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('@Metadata.')) {
            const annotation = parseMetadataAnnotation(trimmed);
            if (annotation) {
                metadataAnnotations.push(annotation);
            }
        }
    }
    
    return metadataAnnotations;
}

function parseMetadataAnnotation(annotationLine: string): any | null {
    // @Metadata.allowExtensions
    const allowExtensionsMatch = annotationLine.match(/@Metadata\.allowExtensions\s*:\s*(\w+)/i);
    if (allowExtensionsMatch) {
        return {
            type: 'allowExtensions',
            value: allowExtensionsMatch[1].trim()
        };
    }
    
    // @Metadata.layer
    const layerMatch = annotationLine.match(/@Metadata\.layer\s*:\s*#(\w+)/i);
    if (layerMatch) {
        return {
            type: 'layer',
            value: layerMatch[1].trim()
        };
    }
    
    return null;
}

function extractObjectModelAnnotations(sourceCode: string): any[] {
    const objectModelAnnotations: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('@ObjectModel.')) {
            const annotation = parseObjectModelAnnotation(trimmed);
            if (annotation) {
                objectModelAnnotations.push(annotation);
            }
        }
    }
    
    return objectModelAnnotations;
}

function parseObjectModelAnnotation(annotationLine: string): any | null {
    // @ObjectModel.text.element
    const textElementMatch = annotationLine.match(/@ObjectModel\.text\.element\s*:\s*\[([^\]]+)\]/i);
    if (textElementMatch) {
        return {
            type: 'text.element',
            definition: textElementMatch[1].trim()
        };
    }
    
    return null;
}

function extractAnalyticsAnnotations(sourceCode: string): any[] {
    const analyticsAnnotations: any[] = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('@Analytics.')) {
            const annotation = parseAnalyticsAnnotation(trimmed);
            if (annotation) {
                analyticsAnnotations.push(annotation);
            }
        }
    }
    
    return analyticsAnnotations;
}

function parseAnalyticsAnnotation(annotationLine: string): any | null {
    // @Analytics.query
    const queryMatch = annotationLine.match(/@Analytics\.query\s*:\s*(\w+)/i);
    if (queryMatch) {
        return {
            type: 'query',
            value: queryMatch[1].trim()
        };
    }
    
    return null;
}

function parseAnnotationArray(arrayContent: string): any[] {
    const items: any[] = [];
    
    // Simple parsing for annotation arrays - this could be enhanced
    const itemMatches = arrayContent.match(/\{[^}]+\}/g);
    if (itemMatches) {
        itemMatches.forEach(item => {
            const parsed = parseAnnotationObject(item.slice(1, -1)); // Remove { }
            if (parsed) {
                items.push(parsed);
            }
        });
    }
    
    return items;
}

function parseAnnotationObject(objectContent: string): any {
    const obj: any = {};
    
    // Simple key-value parsing - this could be enhanced for complex nested structures
    const pairs = objectContent.split(',');
    pairs.forEach(pair => {
        const colonIndex = pair.indexOf(':');
        if (colonIndex > 0) {
            const key = pair.substring(0, colonIndex).trim();
            const value = pair.substring(colonIndex + 1).trim();
            obj[key] = value.replace(/['"]/g, ''); // Remove quotes
        }
    });
    
    return obj;
}