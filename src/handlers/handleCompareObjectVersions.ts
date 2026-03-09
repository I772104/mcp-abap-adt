import { McpError, ErrorCode, getBaseUrl, makeAdtRequest, return_error } from '../lib/utils';
import * as Diff from 'diff';

/**
 * Handler for comparing two versions of an ABAP object and returning a formatted diff.
 *
 * Use with GetVersionHistory to identify version IDs, then compare them to see what changed.
 * Supports multiple output formats: unified (like git diff), side-by-side, or summary.
 *
 * @param args - Arguments object
 * @param args.object_type - Object type: CLAS, PROG, INCL, FUGR, INTF, DDLS, BDEF, DCLS
 * @param args.object_name - Name of the ABAP object
 * @param args.version_old - Older version identifier (timestamp/version format from GetVersionHistory)
 * @param args.version_new - Newer version identifier (timestamp/version format from GetVersionHistory)
 * @param args.context_lines - Number of context lines to show around changes (default: 3)
 * @param args.format - Output format: 'unified', 'side-by-side', 'summary' (default: 'unified')
 * @returns Formatted diff output based on selected format
 */
export async function handleCompareObjectVersions(args: any) {
    try {
        // Validate required parameters
        if (!args?.object_type) {
            throw new McpError(
                ErrorCode.InvalidParams,
                'Object type is required (e.g., CLAS, PROG, INCL, FUGR, INTF, DDLS, BDEF, DCLS)'
            );
        }
        if (!args?.object_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Object name is required');
        }
        if (!args?.version_old) {
            throw new McpError(
                ErrorCode.InvalidParams,
                'version_old is required (timestamp/version format from GetVersionHistory)'
            );
        }
        if (!args?.version_new) {
            throw new McpError(
                ErrorCode.InvalidParams,
                'version_new is required (timestamp/version format from GetVersionHistory)'
            );
        }

        const objectType = args.object_type.toUpperCase();
        const objectName = encodeURIComponent(args.object_name);
        // Version format: "timestamp/version" (e.g., "20260201144253/00000")
        // Do NOT encode the slash in the version string
        const versionOld = args.version_old;
        const versionNew = args.version_new;
        const contextLines = args.context_lines || 3;
        const format = args.format || 'unified';
        const baseUrl = await getBaseUrl();

        // Validate format
        if (!['unified', 'side-by-side', 'summary'].includes(format)) {
            throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid format: ${format}. Must be 'unified', 'side-by-side', or 'summary'`
            );
        }

        // Determine object path
        const objectPath = getObjectPath(objectType, objectName);

        // Construct version URLs
        // IMPORTANT: The /source/main?version= endpoint ignores the version parameter
        // Must use /versions/{timestamp}/{version}/content pattern
        // - CLAS/PROG/FUGR/INTF: {basePath}/includes/main/versions/{timestamp}/{version}/content
        // - BDEF/INCL: {basePath}/source/main/versions/{timestamp}/{version}/content
        // - DDLS/DCLS: {basePath}/versions/{timestamp}/{version}/content

        let urlOld: string;
        let urlNew: string;

        if (objectType === 'DDLS' || objectType === 'DCLS') {
            // DDLS and DCLS use direct /versions path
            urlOld = `${baseUrl}/sap/bc/adt/${objectPath}/versions/${versionOld}/content`;
            urlNew = `${baseUrl}/sap/bc/adt/${objectPath}/versions/${versionNew}/content`;
        } else if (objectType === 'PROG' || objectType === 'BDEF' || objectType === 'INCL') {
            // PROG, BDEF, and INCL use /source/main/versions path (not /includes/main)
            urlOld = `${baseUrl}/sap/bc/adt/${objectPath}/source/main/versions/${versionOld}/content`;
            urlNew = `${baseUrl}/sap/bc/adt/${objectPath}/source/main/versions/${versionNew}/content`;
        } else {
            // CLAS, FUGR, INTF use /includes/main/versions path
            urlOld = `${baseUrl}/sap/bc/adt/${objectPath}/includes/main/versions/${versionOld}/content`;
            urlNew = `${baseUrl}/sap/bc/adt/${objectPath}/includes/main/versions/${versionNew}/content`;
        }

        // Fetch both versions in parallel
        const [responseOld, responseNew] = await Promise.all([
            makeAdtRequest(urlOld, 'GET', 30000, undefined, undefined, { Accept: 'text/plain' }),
            makeAdtRequest(urlNew, 'GET', 30000, undefined, undefined, { Accept: 'text/plain' }),
        ]);

        const sourceOld = responseOld.data;
        const sourceNew = responseNew.data;

        // Generate diff based on format
        let diffResult: string;

        switch (format) {
            case 'unified':
                diffResult = generateUnifiedDiff(
                    sourceOld,
                    sourceNew,
                    contextLines,
                    args.object_name,
                    versionOld,
                    versionNew
                );
                break;
            case 'side-by-side':
                diffResult = generateSideBySideDiff(sourceOld, sourceNew, args.object_name, versionOld, versionNew);
                break;
            case 'summary':
                diffResult = generateDiffSummary(sourceOld, sourceNew, args.object_name, versionOld, versionNew);
                break;
            default:
                throw new McpError(ErrorCode.InvalidParams, `Invalid format: ${format}`);
        }

        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: diffResult,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}

/**
 * Get the ADT object path for a given object type
 */
function getObjectPath(objectType: string, objectName: string): string {
    switch (objectType) {
        case 'CLAS':
            return `oo/classes/${objectName}`;
        case 'PROG':
            return `programs/programs/${objectName}`;
        case 'FUGR':
            return `functions/groups/${objectName}`;
        case 'INTF':
            return `oo/interfaces/${objectName}`;
        case 'DDLS':
            return `ddic/ddl/sources/${objectName}`;
        case 'BDEF':
            return `bo/behaviordefinitions/${objectName}`;
        case 'DCLS':
            return `acm/dcl/sources/${objectName}`; // Fixed: acm/dcl not ddic/dcls
        case 'INCL':
            return `programs/includes/${objectName}`;
        default:
            throw new McpError(
                ErrorCode.InvalidParams,
                `Unsupported object type: ${objectType}. Supported types: CLAS, PROG, INCL, FUGR, INTF, DDLS, BDEF, DCLS`
            );
    }
}

/**
 * Generate unified diff format (like git diff)
 */
function generateUnifiedDiff(
    oldText: string,
    newText: string,
    contextLines: number,
    objectName: string,
    versionOld: string,
    versionNew: string
): string {
    const patch = Diff.createPatch(objectName, oldText, newText, `version ${versionOld}`, `version ${versionNew}`, {
        context: contextLines,
    });

    // Add header with object information
    let output = `${'='.repeat(80)}\n`;
    output += `UNIFIED DIFF: ${objectName}\n`;
    output += `${'='.repeat(80)}\n`;
    output += `Old version: ${versionOld}\n`;
    output += `New version: ${versionNew}\n`;
    output += `${'='.repeat(80)}\n\n`;
    output += patch;

    return output;
}

/**
 * Generate side-by-side diff format
 */
function generateSideBySideDiff(
    oldText: string,
    newText: string,
    objectName: string,
    versionOld: string,
    versionNew: string
): string {
    const changes = Diff.diffLines(oldText, newText);

    let output = `${'='.repeat(80)}\n`;
    output += `SIDE-BY-SIDE DIFF: ${objectName}\n`;
    output += `${'='.repeat(80)}\n`;
    output += `Old version: ${versionOld}\n`;
    output += `New version: ${versionNew}\n`;
    output += `${'='.repeat(80)}\n\n`;

    output += `OLD (${versionOld})`.padEnd(50) + ` | NEW (${versionNew})\n`;
    output += `${'-'.repeat(50)} | ${'-'.repeat(50)}\n`;

    let lineNumOld = 1;
    let lineNumNew = 1;

    changes.forEach((part: any) => {
        const lines = part.value.split('\n');
        // Remove last empty line from split
        if (lines[lines.length - 1] === '') {
            lines.pop();
        }

        lines.forEach((line: string) => {
            if (part.added) {
                // Added line - only in new version
                const newLine = `${lineNumNew.toString().padStart(4)}: ${line}`;
                output += `${' '.repeat(50)} | + ${newLine}\n`;
                lineNumNew++;
            } else if (part.removed) {
                // Removed line - only in old version
                const oldLine = `${lineNumOld.toString().padStart(4)}: ${line}`;
                output += `- ${oldLine}`.padEnd(50) + ` |\n`;
                lineNumOld++;
            } else {
                // Unchanged line - in both versions
                const oldLine = `${lineNumOld.toString().padStart(4)}: ${line}`;
                const newLine = `${lineNumNew.toString().padStart(4)}: ${line}`;
                output += `  ${oldLine}`.padEnd(50) + ` |   ${newLine}\n`;
                lineNumOld++;
                lineNumNew++;
            }
        });
    });

    return output;
}

/**
 * Generate diff summary with statistics
 */
function generateDiffSummary(
    oldText: string,
    newText: string,
    objectName: string,
    versionOld: string,
    versionNew: string
): string {
    const changes = Diff.diffLines(oldText, newText);

    let linesAdded = 0;
    let linesRemoved = 0;
    let linesUnchanged = 0;
    const changedSections: string[] = [];
    let currentLine = 1;

    changes.forEach((part: any) => {
        const lines = part.value.split('\n');
        // Remove last empty line from split
        if (lines[lines.length - 1] === '') {
            lines.pop();
        }
        const lineCount = lines.length;

        if (part.added) {
            linesAdded += lineCount;
            changedSections.push(`  [Line ~${currentLine}] Added ${lineCount} line(s)`);
        } else if (part.removed) {
            linesRemoved += lineCount;
            changedSections.push(`  [Line ~${currentLine}] Removed ${lineCount} line(s)`);
        } else {
            linesUnchanged += lineCount;
            currentLine += lineCount;
        }
    });

    let output = `${'='.repeat(80)}\n`;
    output += `DIFF SUMMARY: ${objectName}\n`;
    output += `${'='.repeat(80)}\n`;
    output += `Old version: ${versionOld}\n`;
    output += `New version: ${versionNew}\n`;
    output += `${'='.repeat(80)}\n\n`;

    output += `Statistics:\n`;
    output += `  Lines added:     ${linesAdded}\n`;
    output += `  Lines removed:   ${linesRemoved}\n`;
    output += `  Lines unchanged: ${linesUnchanged}\n`;
    output += `  Total sections:  ${changes.length}\n\n`;

    if (changedSections.length > 0) {
        output += `Changed sections:\n`;
        output += changedSections.join('\n');
        output += `\n`;
    } else {
        output += `No changes detected - versions are identical.\n`;
    }

    output += `\n${'='.repeat(80)}\n`;
    output += `Use format='unified' to see detailed line-by-line changes.\n`;
    output += `Use format='side-by-side' to see old and new versions side-by-side.\n`;

    return output;
}
