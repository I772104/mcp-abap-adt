/**
 * Handler for GetATCResults MCP Tool
 * Retrieves existing ABAP Test Cockpit results from last central run
 * Uses HATEOAS-based discovery to find the correct endpoints
 */

import { parseStringPromise } from 'xml2js';
import { makeAdtRequest, getBaseUrl } from '../lib/utils';
import { findWorkspace, findCollection, findRelation } from '../utils/adtDiscovery';

interface ATCResultsParams {
  object_name: string;
  object_type: string;
  include_exempted?: boolean;
}

interface ATCFinding {
  priority: string;
  priorityText: string;
  checkId: string;
  checkTitle: string;
  messageId: string;
  messageTitle: string;
  location?: string;
  line?: string;
  quickfixAvailable?: boolean;
  exempted?: boolean;
}

/**
 * Get object URI for ATC results query
 */
function getObjectUri(objectType: string, objectName: string): string {
  const typeMap: Record<string, string> = {
    CLAS: 'oo/classes',
    INTF: 'oo/interfaces',
    PROG: 'programs/programs',
    FUGR: 'functions/groups',
    DDLS: 'ddic/ddl/sources',
    BDEF: 'ddic/bdef/sources',
    DCLS: 'acm/dcl/sources',
  };

  const path = typeMap[objectType.toUpperCase()];
  if (!path) {
    throw new Error(`Unsupported object type: ${objectType}`);
  }

  return `/sap/bc/adt/${path}/${objectName.toLowerCase()}`;
}

/**
 * Map priority codes to text
 */
function getPriorityText(priority: string): string {
  const map: Record<string, string> = {
    '1': 'Error',
    '2': 'Warning',
    '3': 'Info',
    'ERROR': 'Error',
    'WARNING': 'Warning',
    'INFO': 'Info',
  };
  return map[priority.toUpperCase()] || priority;
}

/**
 * Get ATC results for an object from the central/active results
 */
async function getAtcResults(
  resultsUrl: string,
  objectUri: string,
  includeExempted: boolean = false
): Promise<ATCFinding[]> {
  const baseUrl = await getBaseUrl();

  // Query central/active results for this specific object
  const url = `${baseUrl}${resultsUrl}?objectUri=${encodeURIComponent(objectUri)}`;

  const response = await makeAdtRequest(url, 'GET', 30000, undefined, {}, {
    'Accept': 'application/vnd.sap.atc.results.v1+xml',
  });

  // Parse the results response
  const parsed = await parseStringPromise(response.data, {
    explicitArray: false,
    mergeAttrs: true,
    xmlns: true,
  });

  const findings: ATCFinding[] = [];

  // Extract findings from the results
  const results = parsed['atc:results'];
  if (!results) return findings;

  const result = results['atc:result'];
  if (!result) return findings;

  const objects = result['atc:objects']?.['atc:object'];
  if (!objects) return findings;

  const objectArray = Array.isArray(objects) ? objects : [objects];

  for (const obj of objectArray) {
    const findingsList = obj['atc:findings']?.['atc:finding'] || [];
    const findingsArray = Array.isArray(findingsList) ? findingsList : [findingsList];

    for (const finding of findingsArray) {
      if (!finding) continue;

      const exempted = finding['atc:exempted'] === 'true' || finding['atc:exempted'] === true;

      // Skip exempted findings if not requested
      if (exempted && !includeExempted) continue;

      const priority = finding['atc:priority'] || finding.priority || 'UNKNOWN';

      findings.push({
        priority,
        priorityText: getPriorityText(priority),
        checkId: finding['atc:checkId'] || finding.checkId || '',
        checkTitle: finding['atc:checkTitle'] || finding.checkTitle || '',
        messageId: finding['atc:messageId'] || finding.messageId || '',
        messageTitle: finding['atc:messageTitle'] || finding.messageTitle || '',
        location: finding['atc:location'] || finding.location || undefined,
        line: finding['atc:line'] || finding.line || undefined,
        quickfixAvailable: finding['atc:quickfixInfo'] === 'true' || finding.quickfixInfo === 'true',
        exempted,
      });
    }
  }

  return findings;
}

/**
 * Main handler for GetATCResults
 */
export async function handleGetATCResults(params: ATCResultsParams) {
  try {
    const { object_name, object_type, include_exempted = false } = params;

    // Step 1: Discover ATC endpoints using HATEOAS
    console.log('[ATC] Discovering ATC endpoints...');
    const workspace = await findWorkspace('ABAP Test Cockpit');

    if (!workspace) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ ATC API Not Available

**ABAP Test Cockpit workspace not found in discovery document.**

This SAP system may not have ATC REST API enabled or configured.

**To view ATC results:**
1. Open Eclipse ABAP Development Tools (ADT)
2. Navigate to ${object_name} (${object_type})
3. View existing ATC results in the ATC Results view`,
          },
        ],
      };
    }

    // Look for the "results" collection
    const resultsCollection =
      findCollection(workspace, 'results') ||
      findCollection(workspace, 'active') ||
      findCollection(workspace, 'central');

    if (!resultsCollection) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ ATC Results Endpoint Not Found

Found ATC workspace but the results collection is not available.

Available collections:
${workspace.collections.map(c => `- ${c.title} (${c.href})`).join('\n')}

Please use Eclipse ADT to view ATC results on this system.`,
          },
        ],
      };
    }

    const resultsUrl = resultsCollection.href;
    console.log(`[ATC] Discovered results endpoint: ${resultsUrl}`);

    // Step 2: Get object URI
    const objectUri = getObjectUri(object_type, object_name);
    console.log(`[ATC] Object URI: ${objectUri}`);

    // Step 3: Get ATC results
    console.log('[ATC] Retrieving ATC results from last central run...');
    const findings = await getAtcResults(resultsUrl, objectUri, include_exempted);
    console.log(`[ATC] Found ${findings.length} findings`);

    // Format results
    const priorityGroups = {
      ERROR: findings.filter((f) => f.priority === '1' || f.priorityText === 'Error'),
      WARNING: findings.filter((f) => f.priority === '2' || f.priorityText === 'Warning'),
      INFO: findings.filter((f) => f.priority === '3' || f.priorityText === 'Info'),
    };

    const exemptedCount = findings.filter(f => f.exempted).length;

    let resultText = `# ATC Results: ${object_name} (${object_type})

**Source:** Last Central ATC Run
**Total Findings:** ${findings.length}${exemptedCount > 0 ? ` (${exemptedCount} exempted)` : ''}

## Summary by Priority

- ❌ **Errors:** ${priorityGroups.ERROR.length}
- ⚠️  **Warnings:** ${priorityGroups.WARNING.length}
- ℹ️  **Info:** ${priorityGroups.INFO.length}

`;

    // Add findings by priority
    if (priorityGroups.ERROR.length > 0) {
      resultText += `\n## ❌ Errors\n\n`;
      for (const finding of priorityGroups.ERROR) {
        resultText += `### ${finding.checkTitle}\n`;
        resultText += `- **Message:** ${finding.messageTitle}\n`;
        resultText += `- **Check ID:** ${finding.checkId}\n`;
        if (finding.location) resultText += `- **Location:** ${finding.location}\n`;
        if (finding.line) resultText += `- **Line:** ${finding.line}\n`;
        if (finding.quickfixAvailable) resultText += `- ⚡ **Quick Fix Available**\n`;
        if (finding.exempted) resultText += `- 🔓 **Exempted**\n`;
        resultText += `\n`;
      }
    }

    if (priorityGroups.WARNING.length > 0) {
      resultText += `\n## ⚠️  Warnings\n\n`;
      for (const finding of priorityGroups.WARNING) {
        resultText += `### ${finding.checkTitle}\n`;
        resultText += `- **Message:** ${finding.messageTitle}\n`;
        resultText += `- **Check ID:** ${finding.checkId}\n`;
        if (finding.location) resultText += `- **Location:** ${finding.location}\n`;
        if (finding.line) resultText += `- **Line:** ${finding.line}\n`;
        if (finding.quickfixAvailable) resultText += `- ⚡ **Quick Fix Available**\n`;
        if (finding.exempted) resultText += `- 🔓 **Exempted**\n`;
        resultText += `\n`;
      }
    }

    if (priorityGroups.INFO.length > 0) {
      resultText += `\n## ℹ️  Information\n\n`;
      for (const finding of priorityGroups.INFO) {
        resultText += `### ${finding.checkTitle}\n`;
        resultText += `- **Message:** ${finding.messageTitle}\n`;
        resultText += `- **Check ID:** ${finding.checkId}\n`;
        if (finding.location) resultText += `- **Location:** ${finding.location}\n`;
        if (finding.line) resultText += `- **Line:** ${finding.line}\n`;
        if (finding.quickfixAvailable) resultText += `- ⚡ **Quick Fix Available**\n`;
        if (finding.exempted) resultText += `- 🔓 **Exempted**\n`;
        resultText += `\n`;
      }
    }

    if (findings.length === 0) {
      resultText += `\n✅ **No findings!** The object has no ATC issues in the last central run.\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  } catch (error: any) {
    // Handle specific error cases
    if (error.response?.status === 404) {
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️  No ATC Results Found

**Object:** ${params.object_name} (${params.object_type})

No ATC results found for this object. This could mean:
- The object has never been checked by central ATC
- The object was created after the last central ATC run
- The object passed all checks with no findings`,
          },
        ],
      };
    }

    if (error.response?.status === 403) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Access Denied

**Object:** ${params.object_name} (${params.object_type})

You don't have authorization to view ATC results for this object.`,
          },
        ],
      };
    }

    // Generic error
    throw error;
  }
}
