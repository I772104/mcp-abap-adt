import { McpError, ErrorCode } from '../lib/utils';
import { return_error } from '../lib/utils';
import { runAbapUnitTests, createPackageObjectSet } from '../lib/test-runner-utils';

export async function handleRunPackageTests(args: any) {
    try {
        if (!args?.package_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Package name is required');
        }

        const packageName = args.package_name;

        // Create package object set XML
        const objectSetXml = createPackageObjectSet(packageName);

        // Run the tests using shared utility
        const formattedResults = await runAbapUnitTests(
            objectSetXml,
            `PACKAGE: ${packageName}`,
            packageName,
            null // No activation for packages
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