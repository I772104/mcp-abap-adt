import { McpError, ErrorCode } from '../lib/utils';
import { return_error, return_response } from '../lib/utils';
import { attemptClassActivation, ActivationAttemptResult } from '../lib/activation-utils';
import { runAbapUnitTests, createClassObjectSet } from '../lib/test-runner-utils';

export async function handleRunClassTests(args: any) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }

        const className = args.class_name;
        const autoActivate = args.auto_activate === true;
        const preauditRequested = args.preaudit_requested !== false; // default to true

        // Auto-activate class before running tests if requested
        let activationResult: ActivationAttemptResult | null = null;
        if (autoActivate) {
            console.log(`Auto-activation requested before running tests for class ${className}`);
            activationResult = await attemptClassActivation(className, preauditRequested);
            
            // If activation failed critically, we might still want to try running tests
            if (activationResult.status === 'error') {
                console.warn(`Auto-activation failed for class ${className}, but proceeding with test execution`);
            }
        }

        // Create class object set XML
        const objectSetXml = createClassObjectSet(className);

        // Run the tests using shared utility
        const formattedResults = await runAbapUnitTests(
            objectSetXml,
            className,
            className,
            activationResult
        );
        
        // Return formatted results directly
        return {
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify(formattedResults, null, 2)
            }]
        };
    } catch (error) {
        return return_error(error);
    }
}
