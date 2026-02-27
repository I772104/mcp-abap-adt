/**
 * ADT Discovery and Link Resolution Utilities
 * Implements HATEOAS (Hypermedia As The Engine Of Application State) for SAP ADT APIs
 */

import { parseStringPromise } from 'xml2js';
import { makeAdtRequest } from '../lib/utils';
import { getBaseUrl } from '../lib/utils';

interface LinkRelation {
  rel: string;
  href: string;
  template?: string;
}

interface AdtCollection {
  href: string;
  title: string;
  accept: string[];
  relations: LinkRelation[];
}

interface AdtWorkspace {
  title: string;
  collections: AdtCollection[];
}

/**
 * Cache for discovery document to avoid repeated fetches
 */
let discoveryCache: {
  timestamp: number;
  workspaces: AdtWorkspace[];
} | null = null;

const CACHE_TTL = 300000; // 5 minutes

/**
 * Extract text content from XML parsed with xmlns: true
 * When xmlns is enabled, text is stored in the '_' property
 */
function extractText(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && '_' in value) {
    return value._;
  }
  return '';
}

/**
 * Extract attribute value from XML parsed with mergeAttrs: true and xmlns: true
 * Attributes become objects with 'value' property
 */
function extractAttr(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'value' in value) {
    return value.value;
  }
  return '';
}

/**
 * Fetch and parse the ADT discovery document
 */
async function fetchDiscoveryDocument(): Promise<AdtWorkspace[]> {
  // Check cache
  if (discoveryCache && Date.now() - discoveryCache.timestamp < CACHE_TTL) {
    return discoveryCache.workspaces;
  }

  const baseUrl = await getBaseUrl();
  const response = await makeAdtRequest(`${baseUrl}/sap/bc/adt/discovery`, 'GET', 30000);

  const parsed = await parseStringPromise(response.data, {
    explicitArray: false,
    mergeAttrs: true,
    xmlns: true,
  });

  const service = parsed['app:service'];
  const rawWorkspaces = Array.isArray(service['app:workspace'])
    ? service['app:workspace']
    : [service['app:workspace']];

  const workspaces: AdtWorkspace[] = rawWorkspaces
    .filter((ws: any) => ws)
    .map((workspace: any) => {
      const title = extractText(workspace['atom:title']);
      const rawCollections = Array.isArray(workspace['app:collection'])
        ? workspace['app:collection']
        : workspace['app:collection']
        ? [workspace['app:collection']]
        : [];

      const collections: AdtCollection[] = rawCollections.map((coll: any) => {
        const accepts = Array.isArray(coll['app:accept'])
          ? coll['app:accept'].map(extractText)
          : coll['app:accept']
          ? [extractText(coll['app:accept'])]
          : [];

        // Extract template links for HATEOAS
        const templateLinks = coll['adtcomp:templateLinks']?.['adtcomp:templateLink'] || [];
        const relations: LinkRelation[] = (
          Array.isArray(templateLinks) ? templateLinks : [templateLinks]
        )
          .filter((tl: any) => tl)
          .map((tl: any) => ({
            rel: extractAttr(tl.rel),
            href: extractAttr(tl.href),
            template: extractAttr(tl.template),
          }));

        // Also extract atom:link relations
        const atomLinks = coll['atom:link'] || [];
        const additionalRelations: LinkRelation[] = (
          Array.isArray(atomLinks) ? atomLinks : [atomLinks]
        )
          .filter((al: any) => al)
          .map((al: any) => ({
            rel: extractAttr(al.rel),
            href: extractAttr(al.href),
          }));

        return {
          href: extractAttr(coll.href),
          title: extractText(coll['atom:title']),
          accept: accepts,
          relations: [...relations, ...additionalRelations],
        };
      });

      return {
        title,
        collections,
      };
    });

  // Cache the result
  discoveryCache = {
    timestamp: Date.now(),
    workspaces,
  };

  return workspaces;
}

/**
 * Find a specific workspace by title (e.g., "ABAP Test Cockpit")
 */
export async function findWorkspace(titlePattern: string): Promise<AdtWorkspace | null> {
  const workspaces = await fetchDiscoveryDocument();
  return (
    workspaces.find((ws) => ws.title && ws.title.includes(titlePattern)) || null
  );
}

/**
 * Find a collection within a workspace by title or href pattern
 */
export function findCollection(
  workspace: AdtWorkspace,
  pattern: string
): AdtCollection | null {
  return (
    workspace.collections.find(
      (coll) =>
        coll.title.includes(pattern) ||
        coll.href.includes(pattern) ||
        coll.relations.some((rel) => rel.href?.includes(pattern))
    ) || null
  );
}

/**
 * Find a link relation within a collection by relation type
 */
export function findRelation(
  collection: AdtCollection,
  relationType: string
): LinkRelation | null {
  return collection.relations.find((rel) => rel.rel === relationType) || null;
}

/**
 * Resolve a template URL with parameters
 * Example: "/sap/bc/adt/foo{?param1,param2}" + {param1: "value"} => "/sap/bc/adt/foo?param1=value"
 */
export function resolveTemplate(template: string, params: Record<string, string>): string {
  // Simple RFC 6570 URI Template implementation
  let resolved = template;

  // Handle query parameters: {?param1,param2}
  const queryMatch = template.match(/\{\?([^}]+)\}/);
  if (queryMatch) {
    const paramNames = queryMatch[1].split(',').map((p) => p.trim());
    const queryParams = paramNames
      .filter((name) => params[name] !== undefined)
      .map((name) => `${name}=${encodeURIComponent(params[name])}`)
      .join('&');

    resolved = template.replace(/\{\?[^}]+\}/, queryParams ? `?${queryParams}` : '');
  }

  // Handle path parameters: {param}
  Object.keys(params).forEach((key) => {
    resolved = resolved.replace(`{${key}}`, encodeURIComponent(params[key]));
  });

  return resolved;
}

/**
 * High-level helper: Find ATC worklists endpoint
 */
export async function getAtcWorklistsUrl(): Promise<string | null> {
  const workspace = await findWorkspace('ABAP Test Cockpit');
  if (!workspace) return null;

  const collection = findCollection(workspace, 'worklists');
  return collection?.href || null;
}

/**
 * High-level helper: Find ATC runs endpoint
 */
export async function getAtcRunsUrl(): Promise<string | null> {
  const workspace = await findWorkspace('ABAP Test Cockpit');
  if (!workspace) return null;

  const collection = findCollection(workspace, 'runs');
  return collection?.href || null;
}

/**
 * Clear the discovery cache (useful for testing or when server configuration changes)
 */
export function clearDiscoveryCache(): void {
  discoveryCache = null;
}
