import { handleActivateClasses } from '../handlers/handleActivateClasses';

/**
 * Interface for activation attempt result
 */
export interface ActivationAttemptResult {
    status: 'success' | 'error' | 'skipped';
    message?: string;
    activatedClasses?: any[];
    summary?: {
        totalClasses: number;
        successCount: number;
        errorCount: number;
        warningCount: number;
    };
    error_message?: string;
    details?: {
        error_code: string;
        raw_response?: string;
        suggested_action: string;
    };
    timestamp: string;
}

/**
 * Interface for workflow result combining creation and activation
 */
export interface WorkflowResult {
    creation: any;
    activation: ActivationAttemptResult;
    workflow: {
        auto_activated: boolean;
        overall_status: 'success' | 'partial_success' | 'error';
        creation_successful: boolean;
        activation_successful: boolean;
        next_steps?: string[];
        total_duration?: string;
    };
}

/**
 * Attempts to activate a class and returns comprehensive result information
 */
export async function attemptClassActivation(
    className: string,
    preauditRequested: boolean = true
): Promise<ActivationAttemptResult> {
    const startTime = Date.now();

    try {
        console.log(`Attempting auto-activation of class ${className}...`);

        // Use the existing ActivateClasses handler
        const activationResult = await handleActivateClasses({
            class_name: className,
            preaudit_requested: preauditRequested,
        });

        if (activationResult.isError) {
            // Activation failed - extract error details
            const errorContent =
                activationResult.content && activationResult.content.length > 0
                    ? activationResult.content[0].text
                    : 'Unknown activation error';

            return {
                status: 'error',
                error_message: `Activation failed for class ${className}`,
                details: {
                    error_code: 'ACTIVATION_FAILED',
                    raw_response: errorContent,
                    suggested_action:
                        'Check class syntax and dependencies, then manually activate using ActivateClasses tool',
                },
                timestamp: new Date().toISOString(),
            };
        }

        // Parse successful activation result - with safe access
        if (!activationResult.content || activationResult.content.length === 0) {
            return {
                status: 'error',
                error_message: `Activation result missing content for class ${className}`,
                details: {
                    error_code: 'ACTIVATION_NO_CONTENT',
                    raw_response: 'Empty activation response',
                    suggested_action: 'Check system connectivity and try manual activation',
                },
                timestamp: new Date().toISOString(),
            };
        }

        const activationData = JSON.parse(activationResult.content[0].text);

        if (activationData.activation?.status === 'error') {
            return {
                status: 'error',
                error_message: `Activation completed with errors for class ${className}`,
                details: {
                    error_code: 'ACTIVATION_ERRORS',
                    raw_response: activationData.rawResponse || 'No raw response available',
                    suggested_action: 'Review activation errors and fix issues before proceeding',
                },
                summary: activationData.activation.summary,
                timestamp: new Date().toISOString(),
            };
        }

        // Successful activation
        console.log(`Auto-activation successful for class ${className}`);
        return {
            status: 'success',
            message: `Class ${className} activated successfully`,
            activatedClasses: activationData.activation?.activatedClasses || [],
            summary: activationData.activation?.summary || {
                totalClasses: 1,
                successCount: 1,
                errorCount: 0,
                warningCount: 0,
            },
            timestamp: new Date().toISOString(),
        };
    } catch (error: any) {
        console.error(`Auto-activation failed for class ${className}:`, error);

        return {
            status: 'error',
            error_message: `Unexpected error during activation of class ${className}`,
            details: {
                error_code: 'ACTIVATION_EXCEPTION',
                raw_response: error?.message || error?.toString() || 'Unknown error',
                suggested_action: 'Check system connectivity and permissions, then try manual activation',
            },
            timestamp: new Date().toISOString(),
        };
    }
}

/**
 * Combines creation and activation results into a unified workflow response
 */
export function createWorkflowResponse(
    creationResult: any,
    activationResult: ActivationAttemptResult,
    autoActivateRequested: boolean
): WorkflowResult {
    const creationSuccessful = !creationResult.isError;
    const activationSuccessful = activationResult.status === 'success';

    let overallStatus: 'success' | 'partial_success' | 'error';
    const nextSteps: string[] = [];

    if (!creationSuccessful) {
        overallStatus = 'error';
        nextSteps.push('Fix creation issues and retry');
    } else if (creationSuccessful && activationSuccessful) {
        overallStatus = 'success';
    } else {
        overallStatus = 'partial_success';
        nextSteps.push('Class created successfully but activation failed');
        nextSteps.push('Use ActivateClasses tool to manually activate');

        if (activationResult.details?.suggested_action) {
            nextSteps.push(activationResult.details.suggested_action);
        }
    }

    // Safe extraction of creation data
    let creationData;
    if (creationSuccessful) {
        try {
            // Check if creationResult has a data property (from enhanced response)
            if (creationResult.data) {
                creationData = JSON.parse(creationResult.data);
            } else if (creationResult.content && creationResult.content.length > 0) {
                creationData = JSON.parse(creationResult.content[0].text);
            } else {
                creationData = { status: 'success', message: 'Class created successfully', details: {} };
            }
        } catch (parseError) {
            creationData = { status: 'success', message: 'Class created successfully', details: {} };
        }
    } else {
        const errorText =
            creationResult.content && creationResult.content.length > 0
                ? creationResult.content[0].text
                : 'Unknown creation error';
        creationData = { status: 'error', message: errorText };
    }

    return {
        creation: creationData,
        activation: activationResult,
        workflow: {
            auto_activated: autoActivateRequested,
            overall_status: overallStatus,
            creation_successful: creationSuccessful,
            activation_successful: activationSuccessful,
            ...(nextSteps.length > 0 && { next_steps: nextSteps }),
        },
    };
}

/**
 * Attempts batch activation of multiple classes
 */
export async function attemptBatchActivation(
    classNames: string[],
    preauditRequested: boolean = true
): Promise<ActivationAttemptResult> {
    try {
        console.log(`Attempting batch auto-activation of classes: ${classNames.join(', ')}`);

        const activationResult = await handleActivateClasses({
            class_names: classNames,
            preaudit_requested: preauditRequested,
        });

        if (activationResult.isError) {
            const errorContent = activationResult.content?.[0]?.text || 'Unknown batch activation error';

            return {
                status: 'error',
                error_message: `Batch activation failed for classes: ${classNames.join(', ')}`,
                details: {
                    error_code: 'BATCH_ACTIVATION_FAILED',
                    raw_response: errorContent,
                    suggested_action: 'Check individual class syntax and activate classes one by one',
                },
                timestamp: new Date().toISOString(),
            };
        }

        const activationData = JSON.parse(activationResult.content[0].text);

        return {
            status: activationData.activation?.status === 'error' ? 'error' : 'success',
            message: `Batch activation completed for ${classNames.length} classes`,
            activatedClasses: activationData.activation?.activatedClasses || [],
            summary: activationData.activation?.summary,
            timestamp: new Date().toISOString(),
        };
    } catch (error: any) {
        return {
            status: 'error',
            error_message: `Unexpected error during batch activation`,
            details: {
                error_code: 'BATCH_ACTIVATION_EXCEPTION',
                raw_response: error?.message || 'Unknown error',
                suggested_action: 'Try activating classes individually using ActivateClasses tool',
            },
            timestamp: new Date().toISOString(),
        };
    }
}
