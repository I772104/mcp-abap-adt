/**
 * Handler for GetATCResults MCP Tool
 * Retrieves existing ABAP Test Cockpit results from last central run
 * Uses direct ADT API endpoints (not HATEOAS discovery)
 */

import { parseStringPromise } from 'xml2js';
import { makeAdtRequest, getBaseUrl } from '../lib/utils';

interface ATCResultsParams {
  object_name: string;
  object_type: string;
  include_exempted?: boolean;
  priority_filter?: string; // e.g., "1" for errors only, "1,2" for errors+warnings
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
    PACKAGE: 'packages',  // NEW: Package support
    DEVC: 'packages',     // Alternative name for package
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
 * List available ATC results for an object
 */
async function listAtcResults(objectUri: string): Promise<any[]> {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/sap/bc/adt/atc/results?createdBy=*&objectUri=${encodeURIComponent(objectUri)}`;

  console.log(`[ATC] Listing ATC results: ${url}`);

  const response = await makeAdtRequest(url, 'GET', 30000, undefined, {}, {
    'Accept': 'application/xml',
  });

  const parsed = await parseStringPromise(response.data, {
    explicitArray: false,
    mergeAttrs: false,
    xmlns: false,
  });

  const resultList = parsed['atcresult:resultList'] || parsed['resultList'];
  if (!resultList) return [];

  const results = resultList['atcresult:result'] || resultList['result'];
  if (!results) return [];

  const resultArray = Array.isArray(results) ? results : [results];

  return resultArray.map((r: any) => {
    const getId = (obj: any) => {
      if (typeof obj === 'string') return obj;
      if (obj && obj['_']) return obj['_'];
      if (obj && typeof obj === 'object') return Object.values(obj)[0];
      return String(obj);
    };

    return {
      displayId: getId(r['atcresult:displayId'] || r['displayId']),
      title: getId(r['atcresult:title'] || r['title']),
      checkVariant: getId(r['atcresult:checkVariant'] || r['checkVariant']),
      createdAt: getId(r['atcresult:createdAt'] || r['createdAt']),
      aggregates: {
        numPrio1: parseInt(getId(r['atcresult:aggregates']?.['atcresult:numPrio1'] || r['aggregates']?.['numPrio1'] || '0')),
        numPrio2: parseInt(getId(r['atcresult:aggregates']?.['atcresult:numPrio2'] || r['aggregates']?.['numPrio2'] || '0')),
        numPrio3: parseInt(getId(r['atcresult:aggregates']?.['atcresult:numPrio3'] || r['aggregates']?.['numPrio3'] || '0')),
      }
    };
  });
}

/**
 * Get detailed findings from a specific ATC result
 */
async function getAtcResultFindings(
  displayId: string,
  objectUri: string,
  includeExempted: boolean = false,
  priorityFilter?: string
): Promise<ATCFinding[]> {
  const baseUrl = await getBaseUrl();
  let url = `${baseUrl}/sap/bc/adt/atc/results/${displayId}?objectUri=${encodeURIComponent(objectUri)}`;

  // Add priority filter if specified
  if (priorityFilter) {
    const priorities = priorityFilter.split(',').map(p => p.trim());
    priorities.forEach(p => {
      url += `&priority=${p}`;
    });
  }

  console.log(`[ATC] Fetching findings: ${url}`);

  const response = await makeAdtRequest(url, 'GET', 90000, undefined, {}, {
    'Accept': 'application/xml',
  });

  const parsed = await parseStringPromise(response.data, {
    explicitArray: false,
    mergeAttrs: false,
    xmlns: false,
  });

  const findings: ATCFinding[] = [];

  // Navigate the XML structure
  const objects = parsed['atcobject:objectSet']?.['atcobject:object'];
  if (!objects) return findings;

  const objectArray = Array.isArray(objects) ? objects : [objects];

  for (const obj of objectArray) {
    const findingsList = obj['atcfinding:findings']?.['atcfinding:finding'] || [];
    const findingsArray = Array.isArray(findingsList) ? findingsList : [findingsList];

    for (const finding of findingsArray) {
      if (!finding) continue;

      const exempted = finding['atcfinding:exemptionApproval'] === 'APPROVED';

      // Skip exempted findings if not requested
      if (exempted && !includeExempted) continue;

      const priority = finding['atcfinding:priority'] || '3';

      findings.push({
        priority,
        priorityText: getPriorityText(priority),
        checkId: finding['atcfinding:checkId'] || '',
        checkTitle: finding['atcfinding:checkTitle'] || '',
        messageId: finding['atcfinding:messageId'] || '',
        messageTitle: finding['atcfinding:messageTitle'] || '',
        location: finding['atcfinding:location']?.['atcfinding:file'] || undefined,
        line: finding['atcfinding:location']?.['atcfinding:line'] || undefined,
        quickfixAvailable: finding['atcfinding:quickfixInfo']?.['atcfinding:quickfixAvailable'] === 'true',
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
    const { object_name, object_type, include_exempted = false, priority_filter } = params;

    // Step 1: Get object URI
    const objectUri = getObjectUri(object_type, object_name);
    console.log(`[ATC] Object URI: ${objectUri}`);

    // Step 2: List available ATC results for this object
    console.log('[ATC] Listing available ATC results...');
    const results = await listAtcResults(objectUri);
    console.log(`[ATC] Found ${results.length} ATC result(s)`);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️  No ATC Results Found

**Object:** ${object_name} (${object_type})

No ATC results found for this object. This could mean:
- The object has never been checked by central ATC
- The object was created after the last central ATC run
- The object passed all checks with no findings`,
          },
        ],
      };
    }

    // Step 3: Get the most recent result
    const mostRecent = results[0]; // Already sorted by date (most recent first)
    console.log(`[ATC] Using most recent result: ${mostRecent.title} (${mostRecent.displayId})`);
    if (priority_filter) {
      console.log(`[ATC] Priority filter: ${priority_filter}`);
    }

    // Step 4: Get detailed findings
    console.log('[ATC] Retrieving detailed findings...');
    const findings = await getAtcResultFindings(
      mostRecent.displayId,
      objectUri,
      include_exempted,
      priority_filter
    );
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
