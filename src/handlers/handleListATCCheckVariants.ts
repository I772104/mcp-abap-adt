import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { parseStringPromise } from 'xml2js';

interface ATCVariant {
    name: string;
    description: string;
}

/**
 * Parse ATC variants XML response
 */
async function parseVariantsResponse(xmlResponse: string): Promise<ATCVariant[]> {
    const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });

    // Handle different possible XML structures (with or without namespace)
    const objectReferences = parsed?.['adtcore:objectReferences'] || parsed?.objectReferences;
    const items = objectReferences?.['adtcore:objectReference'] || objectReferences?.objectReference;

    if (!items) {
        return [];
    }

    // Normalize to array
    const itemsArray = Array.isArray(items) ? items : [items];

    return itemsArray.map((item: any) => {
        const attrs = item.$ || {};
        return {
            name: attrs['adtcore:name'] || attrs.name || '',
            description: attrs['adtcore:description'] || attrs.description || attrs['adtcore:name'] || attrs.name || '',
        };
    });
}

/**
 * Handle ListATCCheckVariants request
 *
 * Lists available ATC check variants on the SAP system.
 */
export async function handleListATCCheckVariants(args: any) {
    try {
        const baseUrl = await getBaseUrl();

        // Build URL with query parameters
        const url = `${baseUrl}/sap/bc/adt/atc/variants?maxItemCount=500&name=*`;

        // Make request
        const response = await makeAdtRequest(url, 'GET', 30000, undefined, {
            Accept: 'application/vnd.sap.adt.nameditems.v1+xml, application/xml',
        });

        if (!response.data) {
            throw new McpError(ErrorCode.InternalError, 'Empty response from ATC variants list');
        }

        // Parse response
        const variants = await parseVariantsResponse(response.data);

        // Format output
        let output = `ATC Check Variants (${variants.length} available)\n`;
        output += '='.repeat(80) + '\n\n';

        if (variants.length === 0) {
            output += 'No ATC check variants found.\n';
        } else {
            variants.forEach((variant, index) => {
                output += `${index + 1}. ${variant.name}\n`;
                if (variant.description && variant.description !== variant.name) {
                    output += `   ${variant.description}\n`;
                }
                output += '\n';
            });

            output += '\nUsage:\n';
            output += 'Use the variant name with RunATC tool, e.g.:\n';
            output += `  RunATC({ object_name: "ZCL_MY_CLASS", object_type: "class", check_variant: "${variants[0].name}" })\n`;
        }

        return {
            content: [
                {
                    type: 'text',
                    text: output,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}
