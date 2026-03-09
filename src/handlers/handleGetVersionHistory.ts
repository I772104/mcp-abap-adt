import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

/**
 * Handler for retrieving version history of an ABAP object across transports.
 *
 * IMPORTANT - SAP Version Numbering Convention:
 * - Version "00000" = CURRENT/ACTIVE version (most recent) for ALL object types
 * - Numbered versions (00001, 00002, etc.) = Historical TRANSPORTED versions
 * - Results are sorted by <atom:updated> timestamp (most recent first)
 * - Version IDs returned are in format "timestamp/version" (e.g., "20260220162734/00014")
 * - Version 00000 may have an earlier timestamp than transported versions but contains the current active code
 *
 * @param args - Arguments object
 * @param args.object_type - Object type: CLAS (class), PROG (program), INCL (include), FUGR (function group), INTF (interface), DDLS (CDS view), BDEF (behavior definition), DCLS (access control)
 * @param args.object_name - Name of the ABAP object
 * @returns Version history in formatted table with version IDs ready for use with CompareObjectVersions
 */
export async function handleGetVersionHistory(args: any) {
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

        const objectType = args.object_type.toUpperCase();
        const objectName = encodeURIComponent(args.object_name);
        const baseUrl = await getBaseUrl();

        // Construct the appropriate path based on object type
        // Note: OO objects (CLAS/INTF) use /includes/main/versions
        //       BDEF uses /source/main/versions
        //       DDLS and DCLS use direct /versions append
        let objectPath: string;

        switch (objectType) {
            case 'CLAS':
                objectPath = `oo/classes/${objectName}/includes/main`;
                break;
            case 'PROG':
                // Programs use /source/main (tested and verified - returns HTTP 200)
                // NOT /includes/main (returns 404)
                objectPath = `programs/programs/${objectName}/source/main`;
                break;
            case 'INCL':
                // Includes (PROG/I) use the same pattern as standalone programs but with /includes/ path
                objectPath = `programs/includes/${objectName}/source/main`;
                break;
            case 'FUGR':
                objectPath = `functions/groups/${objectName}/includes/main`;
                break;
            case 'INTF':
                objectPath = `oo/interfaces/${objectName}/includes/main`;
                break;
            case 'DDLS':
                // CDS views use direct /versions append (no /source/main segment)
                objectPath = `ddic/ddl/sources/${objectName}`;
                break;
            case 'BDEF':
                objectPath = `bo/behaviordefinitions/${objectName}/source/main`;
                break;
            case 'DCLS':
                // Access controls use the acm/dcl path (NOT ddic/dcls)
                // Version history is directly appended (no /source/main segment)
                objectPath = `acm/dcl/sources/${objectName}`;
                break;
            default:
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `Unsupported object type: ${objectType}. Supported types: CLAS, PROG, INCL, FUGR, INTF, DDLS, BDEF, DCLS`
                );
        }

        // Construct versions URL
        const url = `${baseUrl}/sap/bc/adt/${objectPath}/versions`;

        // Make request with Accept header for Atom feed (note: requires ;type=feed suffix)
        const response = await makeAdtRequest(url, 'GET', 30000, undefined, undefined, {
            Accept: 'application/atom+xml;type=feed',
        });

        // Parse the XML response and format it nicely
        const xmlData = response.data;
        const formattedHistory = formatVersionHistory(xmlData, args.object_name, objectType);

        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: formattedHistory,
                },
            ],
        };
    } catch (error) {
        return return_error(error);
    }
}

/**
 * Format version history XML into a readable table format
 */
function formatVersionHistory(xmlData: string, objectName: string, objectType: string): string {
    // Extract version entries from XML
    const entryRegex = /<atom:entry[^>]*>([\s\S]*?)<\/atom:entry>/g;
    const entries: any[] = [];
    let match;

    while ((match = entryRegex.exec(xmlData)) !== null) {
        const entryXml = match[1];

        // Extract version ID from atom:content src attribute instead of atom:id
        // The atom:content src contains the full path needed for version comparison
        // Examples:
        //   DDLS: /sap/bc/adt/ddic/ddl/sources/P_PURCHASEORDERITEMFORPEGGING/versions/20260220162734/00014/content
        //   CLAS: /sap/bc/adt/oo/classes/CL_MAN_CHANGELOG/includes/main/versions/20260201144253/00000/content
        // We need to extract: timestamp/version (e.g., "20260220162734/00014")

        let versionId: string;
        const contentSrcMatch = entryXml.match(/<atom:content[^>]*src="([^"]+)"/i);

        if (contentSrcMatch) {
            const contentSrc = contentSrcMatch[1];
            // Extract timestamp/version from pattern: /versions/{timestamp}/{version}/content
            const versionMatch = contentSrc.match(/\/versions\/([^\/]+\/[^\/]+)\/content/);
            versionId = versionMatch ? versionMatch[1] : extractXmlField(entryXml, 'atom:id');
        } else {
            // Fallback to atom:id if atom:content src is not found
            versionId = extractXmlField(entryXml, 'atom:id');
        }

        const author = extractXmlField(entryXml, 'atom:name');
        const updated = extractXmlField(entryXml, 'atom:updated');
        const title = extractXmlField(entryXml, 'atom:title');
        const isTestTransport = entryXml.includes('adtcore:isTestTransport="true"');

        // Extract transport request name from atom:link
        const transportMatch = entryXml.match(/adtcore:name="([^"]+)"/);
        const transport = transportMatch ? transportMatch[1] : '';

        entries.push({
            versionId,
            author,
            updated,
            title,
            transport,
            isTestTransport,
        });
    }

    // Build formatted output
    let output = `Version History for ${objectName} (${objectType})\n`;
    output += `Total versions: ${entries.length}\n`;
    output += `${'='.repeat(100)}\n\n`;

    if (entries.length === 0) {
        output += 'No version history available.\n';
        return output;
    }

    // Header
    output += `${'Ver'.padEnd(8)} ${'Date'.padEnd(20)} ${'Author'.padEnd(15)} ${'Transport'.padEnd(15)} ${'Description'}\n`;
    output += `${'-'.repeat(8)} ${'-'.repeat(20)} ${'-'.repeat(15)} ${'-'.repeat(15)} ${'-'.repeat(40)}\n`;

    // Entries
    entries.forEach((entry, index) => {
        const lineNum = (index + 1).toString().padStart(2, ' ');
        const version = entry.versionId.padEnd(8);
        const date = formatDate(entry.updated).padEnd(20);
        const author = entry.author.substring(0, 15).padEnd(15);
        const transport = entry.transport.substring(0, 15).padEnd(15);
        const title = entry.title || '';
        const testFlag = entry.isTestTransport ? ' [TEST]' : '';

        output += `${version} ${date} ${author} ${transport} ${title}${testFlag}\n`;
    });

    output += `\n${'='.repeat(100)}\n`;
    output += `\nNOTE: Version numbering for all object types:\n`;
    output += `      - Version "00000" = CURRENT/ACTIVE version (most recent code in system)\n`;
    output += `      - Numbered versions (00001+) = Historical transported versions\n`;
    output += `      - Version 00000 may have earlier timestamp but contains current code\n`;
    output += `      [TEST] = Generated test transport\n`;
    output += `\n`;
    output += `TRANSPORT HIERARCHY:\n`;
    output += `      - Transport numbers can be either TASKS or REQUESTS (parent transports)\n`;
    output += `      - Tasks belong to a parent Request (e.g., ER1K8AK0XI is task of ER1K8AK0XH)\n`;
    output += `      - When analyzing a transport, the version may be recorded under the parent request\n`;
    output += `      - Use GetTransportRequest(<transport_number>) to see hierarchy and objects\n`;
    output += `\n`;
    output += `Use CompareObjectVersions with version IDs shown above to see changes between versions.\n`;

    return output;
}

/**
 * Extract a field value from XML
 */
function extractXmlField(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
}

/**
 * Format ISO date string to readable format
 */
function formatDate(isoDate: string): string {
    if (!isoDate) return '';
    try {
        const date = new Date(isoDate);
        return date.toISOString().substring(0, 19).replace('T', ' ');
    } catch {
        return isoDate.substring(0, 19);
    }
}
