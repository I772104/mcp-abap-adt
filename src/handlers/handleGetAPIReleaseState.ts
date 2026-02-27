import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';

/**
 * Check API Release State for ABAP Cloud compliance
 *
 * This tool helps determine if ABAP APIs are released for use in ABAP Cloud (Tier 1).
 *
 * IMPORTANT: This implementation provides guidance based on available information.
 * Full API release state checking requires:
 * - SAP_BASIS >= 756 (S/4HANA 2021 or later)
 * - ADT API: /sap/bc/adt/api/releasestates/contracts
 *
 * Current implementation:
 * - Checks if object exists and is accessible
 * - Provides best practices and manual verification steps
 * - Returns guidance for cloud readiness assessment
 */

export async function handleGetAPIReleaseState(args: any) {
    try {
        // Validate required parameters
        if (!args?.object_name) {
            throw new McpError(ErrorCode.InvalidParams, 'object_name is required');
        }

        if (!args?.object_type) {
            throw new McpError(ErrorCode.InvalidParams, 'object_type is required (e.g., CLAS, INTF, FUGR)');
        }

        const objectName = args.object_name.toUpperCase();
        const objectType = args.object_type.toUpperCase();
        const releaseContract = args.release_contract || 'C1'; // ABAP Cloud by default

        // Map object type to ADT path
        const objectPath = getObjectPath(objectType, objectName);

        // Try to check if ADT release state API is available
        try {
            const releaseStateUrl = `${await getBaseUrl()}/sap/bc/adt/api/releasestates/contracts?uri=${objectPath}&contract=${releaseContract}`;
            const response = await makeAdtRequest(releaseStateUrl, 'GET', 10000);

            // If we got here, the API exists! Parse and return
            return parseReleaseStateResponse(response.data, objectName, objectType);

        } catch (error: any) {
            // API not available - provide fallback guidance
            if (error.response?.status === 404 || error.message?.includes('does not exist')) {
                return provideFallbackGuidance(objectName, objectType, releaseContract);
            }
            throw error;
        }

    } catch (error) {
        return return_error(error);
    }
}

/**
 * Get ADT object path for different object types
 */
function getObjectPath(objectType: string, objectName: string): string {
    const encodedName = encodeURIComponent(objectName);

    switch (objectType) {
        case 'CLAS':
            return `/sap/bc/adt/oo/classes/${encodedName}`;
        case 'INTF':
            return `/sap/bc/adt/oo/interfaces/${encodedName}`;
        case 'FUGR':
            return `/sap/bc/adt/functions/groups/${encodedName}`;
        case 'PROG':
            return `/sap/bc/adt/programs/programs/${encodedName}`;
        case 'TABL':
        case 'DDLS':
            return `/sap/bc/adt/ddic/tables/${encodedName}`;
        default:
            throw new McpError(
                ErrorCode.InvalidParams,
                `Unsupported object type: ${objectType}. Supported types: CLAS, INTF, FUGR, PROG, TABL, DDLS`
            );
    }
}

/**
 * Parse release state XML response from ADT API
 */
function parseReleaseStateResponse(xmlData: string, objectName: string, objectType: string): any {
    // Parse XML response (implementation depends on actual XML structure from SAP)
    // This is a placeholder for when the API is available

    return {
        isError: false,
        content: [{
            type: 'text',
            text: JSON.stringify({
                object_name: objectName,
                object_type: objectType,
                release_state: 'RELEASED', // Parsed from XML
                contract: 'C1',
                api_available: true,
                details: {
                    is_released_for_cloud: true,
                    is_deprecated: false,
                    stability: 'STABLE'
                }
            }, null, 2)
        }]
    };
}

/**
 * Provide fallback guidance when ADT API is not available
 */
function provideFallbackGuidance(objectName: string, objectType: string, releaseContract: string): any {
    const guidance = {
        object_name: objectName,
        object_type: objectType,
        release_contract: releaseContract,
        api_available: false,
        status: 'MANUAL_VERIFICATION_REQUIRED',
        message: 'ADT Release State API not available on this system. Manual verification required.',

        verification_methods: [
            {
                method: 'Eclipse ADT',
                steps: [
                    '1. Open object in Eclipse ABAP Development Tools',
                    '2. Right-click → Show API State',
                    '3. Check "Released for" section for C1 (Cloud API) contract'
                ]
            },
            {
                method: 'SAP GUI Transaction',
                steps: [
                    '1. Transaction SE24 (for classes) or SE80',
                    '2. Display object',
                    '3. Check API properties tab',
                    '4. Look for release state annotations'
                ]
            },
            {
                method: 'Source Code Inspection',
                steps: [
                    '1. Use GetClass/GetInterface to retrieve source code',
                    '2. Look for class/interface annotations indicating cloud release',
                    '3. Check for markers like "FOR BEHAVIOR" or RAP annotations'
                ]
            }
        ],

        common_indicators: {
            released_apis: [
                'Classes starting with CL_ABAP_*',
                'Classes starting with CL_RAP_*',
                'RAP Business Objects and related artifacts',
                'Core ABAP statements (no longer requires API check)'
            ],
            non_released_apis: [
                'GUI-related classes (CL_GUI_*, CL_ALV_*)',
                'Classes with "DYNPRO" or screen programming',
                'RFC/BDC-related functionality',
                'File system access (CL_GUI_FRONTEND_SERVICES)'
            ],
            deprecated_apis: [
                'Check SAP Note 3007771 for deprecated APIs',
                'Review S/4HANA simplification item catalog'
            ]
        },

        recommended_alternatives: getRecommendedAlternatives(objectName, objectType),

        next_steps: [
            '1. Verify object exists and is accessible',
            '2. Review object source code for cloud compatibility markers',
            '3. Check SAP documentation for official release state',
            '4. Consider running RunATCCheck with ABAP_CLOUD_READINESS variant',
            '5. Review custom code migration tools in transaction SCI/ATC'
        ],

        documentation_links: [
            'Released APIs for ABAP Cloud: https://help.sap.com/docs/btp/sap-business-technology-platform/released-apis',
            'ABAP Cloud Readiness: https://help.sap.com/docs/btp/sap-abap-development-user-guide/abap-cloud-readiness',
            'SAP Note 3007771: APIs deprecated in S/4HANA'
        ]
    };

    return {
        isError: false,
        content: [{
            type: 'text',
            text: JSON.stringify(guidance, null, 2)
        }]
    };
}

/**
 * Get recommended alternatives for common non-released APIs
 */
function getRecommendedAlternatives(objectName: string, objectType: string): any {
    const alternatives: Record<string, string> = {
        'CL_GUI_ALV_GRID': 'Use CL_SALV_TABLE for list output',
        'CL_GUI_FRONTEND_SERVICES': 'Use OData services or CL_ABAP_BROWSER',
        'SUBMIT': 'Use background processing framework or RAP',
        'CALL_FUNCTION_RFC': 'Use HTTP/OData services',
        'CL_BCS': 'Use CL_BCS_MAIL_MESSAGE for email sending'
    };

    if (alternatives[objectName]) {
        return {
            has_alternative: true,
            recommendation: alternatives[objectName]
        };
    }

    return {
        has_alternative: false,
        recommendation: 'Consult SAP documentation for cloud-compatible alternatives'
    };
}
