import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';
import { fetchIncludes } from '../lib/classUtils';

interface GetBopfBusinessObjectParams {
    bo_name: string;
    analyze?: boolean;
}

export async function handleGetBopfBusinessObject(args: GetBopfBusinessObjectParams) {
    try {
        if (!args?.bo_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Business object name is required');
        }

        const encodedName = encodeURIComponent(args.bo_name.toLowerCase());
        const baseUrl = await getBaseUrl();
        const url = `${baseUrl}/sap/bc/adt/bopf/businessobjects/${encodedName}`;

        const response = await makeAdtRequest(url, 'GET', 30000);

        if (!response.data) {
            throw new Error('No data received from BOPF business object endpoint');
        }

        const xml: string = response.data;
        const result: Record<string, any> = parseBopfXml(xml, args.bo_name.toUpperCase());

        if (args.analyze) {
            result.implementation = await fetchImplementationClasses(result.nodes);
        }

        return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    } catch (error) {
        return return_error(error);
    }
}

async function fetchImplementationClasses(nodes: any[]): Promise<Record<string, any>> {
    const classNames = new Set<string>();

    for (const node of nodes) {
        for (const cls of Object.values(node.implementationClasses ?? {})) {
            if (typeof cls === 'string') classNames.add(cls);
        }
        for (const list of [node.actions ?? [], node.determinations ?? [], node.validations ?? []]) {
            for (const el of list) {
                if (!el.objectModelGenerated && el.implementationClass) {
                    classNames.add(el.implementationClass);
                }
            }
        }
    }

    const INCLUDES = ['main', 'definitions', 'implementations', 'testclasses'] as const;

    const entries = await Promise.all(
        [...classNames].map(async (className) => {
            try {
                const fetched = await fetchIncludes(className, [...INCLUDES]);
                const sources: Record<string, string | null> = {};
                for (const inc of fetched) {
                    sources[inc.type] = inc.source ?? null;
                }
                return [className, sources] as const;
            } catch (err: any) {
                return [className, { error: err?.message ?? String(err) }] as const;
            }
        })
    );

    return Object.fromEntries(entries);
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function attr(s: string, name: string): string {
    const m = s.match(new RegExp(`${escapeRegex(name)}="([^"]*)"`, ''));
    return m ? m[1] : '';
}

function optionalAttr(s: string, name: string): string | null {
    const v = attr(s, name);
    return v !== '' ? v : null;
}

function parseBopfXml(xml: string, boName: string) {
    const boMatch = xml.match(/<bo:businessObject([^>]*)>/);
    const boAttrs = boMatch ? boMatch[1] : '';

    const programmingModel = attr(boAttrs, 'bo:programmingModel');
    const isCdsBased = !programmingModel.toLowerCase().includes('classic');
    const isDraft = isCdsBased && xml.includes('bo:draftDataType=');

    const header: Record<string, any> = {
        name: attr(boAttrs, 'adtcore:name') || boName,
        description: optionalAttr(boAttrs, 'adtcore:description'),
        type: attr(boAttrs, 'adtcore:type'),
        objectCategory: attr(boAttrs, 'bo:objectCategory'),
        programmingModel,
        modelVariant: isCdsBased ? (isDraft ? 'CDS-based (with Draft)' : 'CDS-based') : 'Classic BOPF',
        isExtensible: attr(boAttrs, 'bo:isExtensible') === 'true',
        objectModelGenerated: attr(boAttrs, 'bo:objectModelGenerated') === 'true',
        thirdGenBO: attr(boAttrs, 'bo:thirdGenBO') === 'true',
        rapBO: attr(boAttrs, 'bo:rapBO') === 'true',
        smartValidation: attr(boAttrs, 'bo:smartValidation') === 'true',
        responsible: attr(boAttrs, 'adtcore:responsible'),
        masterLanguage: attr(boAttrs, 'adtcore:masterLanguage'),
        masterSystem: attr(boAttrs, 'adtcore:masterSystem'),
        createdAt: attr(boAttrs, 'adtcore:createdAt'),
        createdBy: attr(boAttrs, 'adtcore:createdBy'),
        changedAt: attr(boAttrs, 'adtcore:changedAt'),
        changedBy: attr(boAttrs, 'adtcore:changedBy'),
        version: attr(boAttrs, 'adtcore:version'),
    };

    // Remove null description to keep output clean for CDS-based BOs
    if (header.description === null) delete header.description;

    const pkgMatch = xml.match(/<adtcore:packageRef[^>]*adtcore:name="([^"]*)"/);
    const packageName = pkgMatch ? pkgMatch[1] : '';

    const constMatch = xml.match(/<bo:constantsInterfaceRef[^>]*adtcore:name="([^"]*)"/);
    const constantsInterface = constMatch ? constMatch[1] : null;

    // Source CDS view at BO level (CDS-based only — appears after the last </bo:nodes>)
    let sourceCDSView: { name: string; description: string } | null = null;
    if (isCdsBased) {
        const lastNodesEnd = xml.lastIndexOf('</bo:nodes>');
        const boTail = lastNodesEnd >= 0 ? xml.slice(lastNodesEnd) : xml;
        // Match only the first bo:sourceCDSViewRef tag that is a direct child of the BO (not inside a node)
        const srcTag = boTail.match(/<bo:sourceCDSViewRef\s([^>]*)\/?>/);
        if (srcTag) {
            const name = attr(srcTag[1], 'adtcore:name');
            const description = attr(srcTag[1], 'adtcore:description');
            if (name) sourceCDSView = { name, description };
        }
    }

    const nodes = parseNodes(xml, isCdsBased);
    resolveImplicitCrossBoRefs(nodes, header.name);

    const result: Record<string, any> = { header, package: packageName };
    if (constantsInterface) result.constantsInterface = constantsInterface;
    if (sourceCDSView) result.sourceCDSView = sourceCDSView;
    result.nodes = nodes;

    if (!isCdsBased) {
        result._limitations = [
            'Node categories (e.g. CR, MOC, QAM) are not available via ADT API. ' +
                'Use SAP GUI transactions BOBX or BOBF to view node categories for Classic BOPF objects. ' +
                'Note: for CDS-based BOBF objects each node has exactly one category whose name is identical to the node name itself.',
            'Field properties (readonly, mandatory) shown per node reflect the default category only. ' +
                'In Classic BOPF, each node category can define different static field properties. ' +
                'Use BOBX or BOBF to inspect per-category field properties. ' +
                'In CDS-based BOBF, field properties are derived from CDS field annotations instead.',
            'Some stub nodes representing Cross Business Object Relationships may not be resolvable to their ' +
                'external target BO via the ADT API when their node name does not correspond to any part of the ' +
                'target BO name (e.g. generated names like REP_ABIFNMR...). ' +
                'Use SAP GUI transactions BOBX or BOBF to view Cross Business Object Relationships.',
        ];
    }

    return result;
}

function resolveImplicitCrossBoRefs(nodes: any[], currentBoName: string) {
    const KEY_PROPS = new Set(['KEY', 'PARENT_KEY', 'ROOT_KEY']);

    const isStubNode = (node: any) =>
        node.parentNode === null &&
        !node.externalBoRef &&
        Object.keys(node.persistence ?? {}).length === 0 &&
        [
            ...(node.properties?.readonly ?? []),
            ...(node.properties?.editable ?? []),
            ...(node.properties?.mandatoryEditable ?? []),
            ...(node.properties?.transient ?? []),
        ].every((p: string) => KEY_PROPS.has(p));

    const stubNodes = nodes.filter(isStubNode);
    if (stubNodes.length === 0) return;

    // Build a lookup: association name → all targetNodes (multiple nodes can share an assoc name)
    const assocByName = new Map<string, string[]>();
    for (const node of nodes) {
        for (const assoc of node.associations ?? []) {
            if (assoc.targetNode && assoc.name) {
                const existing = assocByName.get(assoc.name);
                if (existing) {
                    existing.push(assoc.targetNode);
                } else {
                    assocByName.set(assoc.name, [assoc.targetNode]);
                }
            }
        }
    }

    for (const stub of stubNodes) {
        // Try direct name match first
        const directTargets = assocByName.get(stub.name) ?? [];
        const externalDirect = directTargets.find((t) => t.includes('~'));
        if (externalDirect) {
            const tilde = externalDirect.indexOf('~');
            const boName = externalDirect.slice(0, tilde);
            const nodeName = externalDirect.slice(tilde + 1);
            if (boName.toUpperCase() !== currentBoName.toUpperCase()) {
                stub.externalBoRef = { name: boName, node: nodeName, type: 'BOBF' };
                continue;
            }
        }

        // Fallback: scan all associations for any that target an external BO node.
        // Match strategy (in order):
        //   1. BO basename equals stub name (e.g. /ZTEST/ACTIVITY → ACTIVITY)
        //   2. BO name contains stub name as a segment after removing namespace prefix
        //      (e.g. /BOBF/EPM_BUSINESS_PARTNER → BUSINESS_PARTNER)
        outer: for (const targets of assocByName.values()) {
            for (const target of targets) {
                if (!target.includes('~')) continue;
                const tilde = target.indexOf('~');
                const boName = target.slice(0, tilde);
                const nodeName = target.slice(tilde + 1);
                if (boName.toUpperCase() === currentBoName.toUpperCase()) continue;
                const boBaseName = boName.replace(/^.*\//, ''); // last segment after final /
                const stubUpper = stub.name.toUpperCase();
                const boBaseUpper = boBaseName.toUpperCase();
                // Exact match: ACTIVITY === ACTIVITY
                if (boBaseUpper === stubUpper) {
                    stub.externalBoRef = { name: boName, node: nodeName, type: 'BOBF' };
                    break outer;
                }
                // Suffix match: EPM_BUSINESS_PARTNER ends with BUSINESS_PARTNER
                if (boBaseUpper.endsWith('_' + stubUpper)) {
                    stub.externalBoRef = { name: boName, node: nodeName, type: 'BOBF' };
                    break outer;
                }
            }
        }
    }
}

function parseNodes(xml: string, isCdsBased: boolean) {
    const nodes: any[] = [];
    const nodePattern = /<bo:nodes\s([^>]*)>([\s\S]*?)<\/bo:nodes>/g;
    let nodeMatch;

    while ((nodeMatch = nodePattern.exec(xml)) !== null) {
        const nodeAttrs = nodeMatch[1];
        const nodeBody = nodeMatch[2];

        const node: Record<string, any> = {
            name: attr(nodeAttrs, 'bo:name'),
            xmlName: optionalAttr(nodeAttrs, 'bo:xmlName'),
            nodeID: attr(nodeAttrs, 'bo:nodeID'),
            rootNode: attr(nodeAttrs, 'bo:rootNode') === 'true',
            objectModelGenerated: attr(nodeAttrs, 'bo:objectModelGenerated') === 'true',
            createEnabled: attr(nodeAttrs, 'bo:createEnabled') === 'true',
            updateEnabled: attr(nodeAttrs, 'bo:updateEnabled') === 'true',
            deleteEnabled: attr(nodeAttrs, 'bo:deleteEnabled') === 'true',
            authorizationCheck: attr(nodeAttrs, 'bo:authorizationCheck') === 'true',
            isDependentObjectNode: attr(nodeAttrs, 'bo:isDependentObjectNode') === 'true',
            textNode: attr(nodeAttrs, 'bo:textNode') === 'true',
            objectModelObsolete: attr(nodeAttrs, 'bo:objectModelObsolete') === 'true',
        };

        // Remove null xmlName for nodes that don't have a label
        if (!node.xmlName) delete node.xmlName;

        // Parent node reference
        const parentAttr = attr(nodeAttrs, 'bo:parent');
        const parentMatch = parentAttr.match(/@bo:name='([^']+)'/);
        node.parentNode = parentMatch ? parentMatch[1] : null;

        // Persistence — CDS-based has draft tables, classic has only active tables
        node.persistence = parsePersistence(nodeAttrs, nodeBody, isCdsBased);

        // Implementation classes
        node.implementationClasses = parseImplClasses(nodeBody);

        // Properties
        node.properties = parseNodeProperties(nodeBody);

        // Alternative keys
        node.alternativeKeys = parseAlternativeKeys(nodeBody);

        // Associations
        node.associations = parseAssociations(nodeBody);

        // External BO reference (Classic BOPF only — node delegates to another BO)
        const doRefTag = nodeBody.match(/<bo:doRef[^>]*>/);
        if (doRefTag) {
            const doRefName = attr(doRefTag[0], 'adtcore:name');
            if (doRefName) {
                node.externalBoRef = {
                    name: doRefName,
                    type: optionalAttr(doRefTag[0], 'adtcore:type') ?? 'BOBF',
                };
            }
        }

        // Queries
        const queries = parseNamedElements(nodeBody, 'bo:queries', false);
        if (queries.length > 0) node.queries = queries;

        // Actions
        node.actions = parseNamedElements(nodeBody, 'bo:actions', true);

        // Determinations
        node.determinations = parseNamedElements(nodeBody, 'bo:determinations', true);

        // Validations
        node.validations = parseNamedElements(nodeBody, 'bo:validations', true);

        nodes.push(node);
    }

    return nodes;
}

function parsePersistence(nodeAttrs: string, nodeBody: string, isCdsBased: boolean) {
    const p: Record<string, any> = {};

    const persStructMatch = nodeBody.match(/<bo:persistentStructureRef[^>]*adtcore:name="([^"]*)"/);
    if (persStructMatch) p.persistentStructure = persStructMatch[1];

    const persTableMatch = nodeBody.match(/<bo:persistentTableRef[^>]*adtcore:name="([^"]*)"/);
    if (persTableMatch) p.persistentTable = persTableMatch[1];

    const combStructMatch = nodeBody.match(/<bo:combinedStructureRef[^>]*adtcore:name="([^"]*)"/);
    if (combStructMatch) p.combinedStructure = combStructMatch[1];

    if (isCdsBased) {
        // Draft-specific fields
        const draftDataType = attr(nodeAttrs, 'bo:draftDataType');
        if (draftDataType) p.draftDataType = draftDataType;

        const draftPersistence = attr(nodeAttrs, 'bo:draftPersistence');
        if (draftPersistence) p.draftTable = draftPersistence;

        const activPersistence = attr(nodeAttrs, 'bo:activPersistence');
        if (activPersistence) p.activeView = activPersistence;

        const srcCdsMatch = nodeBody.match(/<bo:sourceCDSViewRef[^>]*adtcore:name="([^"]*)"/);
        if (srcCdsMatch) p.sourceCDSView = srcCdsMatch[1];

        const draftClassMatch = nodeBody.match(/<bo:draftClassRef[^>]*adtcore:name="([^"]*)"/);
        if (draftClassMatch) p.draftClass = draftClassMatch[1];
    } else {
        // Classic BOPF — may have transient structure
        const transStructMatch = nodeBody.match(/<bo:transientStructureRef[^>]*adtcore:name="([^"]*)"/);
        if (transStructMatch) p.transientStructure = transStructMatch[1];
    }

    return p;
}

function parseImplClasses(nodeBody: string) {
    const classes: Record<string, string> = {};

    const dacMatch = nodeBody.match(/<bo:dataAccessClassRef[^>]*adtcore:name="([^"]*)"/);
    if (dacMatch) classes.dataAccess = dacMatch[1];

    const authMatch = nodeBody.match(/<bo:authorizationClassRef[^>]*adtcore:name="([^"]*)"/);
    if (authMatch) classes.authorization = authMatch[1];

    const defaultingMatch = nodeBody.match(/<bo:defaultingClassRef[^>]*adtcore:name="([^"]*)"/);
    if (defaultingMatch) classes.defaulting = defaultingMatch[1];

    return Object.keys(classes).length > 0 ? classes : undefined;
}

function parseNodeProperties(nodeBody: string) {
    const readonly: string[] = [];
    const editable: string[] = [];
    const mandatoryEditable: string[] = [];
    const transient: string[] = [];

    const propPattern = /<bo:properties\s([^/]*\/?>)/g;
    let m;
    while ((m = propPattern.exec(nodeBody)) !== null) {
        const p = m[1];
        const name = attr(p, 'bo:name');
        if (!name) continue;

        const isTransient = attr(p, 'bo:transientAttribute') === 'true';
        const isReadonly = attr(p, 'bo:readonly') === 'true';
        const isMandatory = attr(p, 'bo:mandatory') === 'true';

        if (isTransient) {
            transient.push(name);
        } else if (isReadonly) {
            readonly.push(name);
        } else if (isMandatory) {
            mandatoryEditable.push(name);
        } else {
            editable.push(name);
        }
    }

    const result: Record<string, string[]> = { readonly, editable };
    if (mandatoryEditable.length > 0) result.mandatoryEditable = mandatoryEditable;
    if (transient.length > 0) result.transient = transient;
    return result;
}

function parseAlternativeKeys(nodeBody: string) {
    const keys: any[] = [];
    const keyPattern = /<bo:alternativeKeys\s([^>]*)>([\s\S]*?)<\/bo:alternativeKeys>/g;
    let m;
    while ((m = keyPattern.exec(nodeBody)) !== null) {
        const keyAttrs = m[1];
        const keyBody = m[2];
        const elements: string[] = [];
        const elemPattern = /<bo:keyElements\s[^>]*bo:name="([^"]*)"/g;
        let em;
        while ((em = elemPattern.exec(keyBody)) !== null) {
            elements.push(em[1]);
        }
        const key: Record<string, any> = {
            name: attr(keyAttrs, 'bo:name'),
            uniqueness: attr(keyAttrs, 'bo:uniqueness'),
            keyElements: elements,
        };
        const xmlName = optionalAttr(keyAttrs, 'bo:xmlName');
        if (xmlName) key.xmlName = xmlName;
        keys.push(key);
    }
    return keys;
}

function parseAssociations(nodeBody: string) {
    const assocs: any[] = [];
    const assocPattern = /<bo:associations\s([^>]*)>([\s\S]*?)<\/bo:associations>/g;
    let m;
    while ((m = assocPattern.exec(nodeBody)) !== null) {
        const a = m[1];
        const body = m[2];
        const targetMatch = body.match(/<bo:targetNodeRef[^>]*adtcore:name="([^"]*)"/);
        const assoc: Record<string, any> = {
            name: attr(a, 'bo:name'),
            implementationType: attr(a, 'bo:implementationType'),
            multiplicity: attr(a, 'bo:multiplicity'),
            targetNode: targetMatch ? targetMatch[1] : null,
        };
        const xmlName = optionalAttr(a, 'bo:xmlName');
        if (xmlName) assoc.xmlName = xmlName;
        assocs.push(assoc);
    }
    return assocs;
}

function parseNamedElements(nodeBody: string, tag: string, withImpl: boolean) {
    const elements: any[] = [];
    const escapedTag = tag.replace(':', '\\:');
    const pattern = new RegExp(`<${escapedTag}\\s([^>]*)>([\\s\\S]*?)<\\/${escapedTag}>`, 'g');
    let m;
    while ((m = pattern.exec(nodeBody)) !== null) {
        const attrs = m[1];
        const body = m[2];

        const el: Record<string, any> = {
            name: attr(attrs, 'bo:name'),
            objectModelGenerated: attr(attrs, 'bo:objectModelGenerated') === 'true',
        };

        const xmlName = optionalAttr(attrs, 'bo:xmlName');
        if (xmlName) el.xmlName = xmlName;

        if (tag === 'bo:actions') {
            el.category = optionalAttr(attrs, 'bo:category') ?? '0';
            const annotation = optionalAttr(attrs, 'bo:annotation');
            if (annotation) el.annotation = annotation;
        }
        if (tag === 'bo:determinations') {
            el.category = attr(attrs, 'bo:category');
            el.triggers = parseTriggers(body);
            const relations = parseRelations(body);
            if (relations.length > 0) el.relations = relations;
        }
        if (tag === 'bo:validations') {
            el.category = attr(attrs, 'bo:category');
            el.checkBeforeSave = attr(attrs, 'bo:checkBeforeSave') === 'true';
            el.createNode = attr(attrs, 'bo:createNode') === 'true';
            el.updateNode = attr(attrs, 'bo:updateNode') === 'true';
            el.deleteNode = attr(attrs, 'bo:deleteNode') === 'true';
            el.triggers = parseTriggers(body);
        }
        if (tag === 'bo:queries') {
            const implMatch = body.match(/<bo:implementationClassRef[^>]*adtcore:name="([^"]*)"/);
            if (implMatch) el.implementationClass = implMatch[1];
        }

        if (withImpl) {
            const implMatch = body.match(/<bo:implementationClassRef[^>]*adtcore:name="([^"]*)"/);
            if (implMatch) el.implementationClass = implMatch[1];
        }

        elements.push(el);
    }
    return elements;
}

function extractNodeName(xpathRef: string): string {
    const m = xpathRef.match(/bo:nodes\[@bo:name='([^']+)'\]/);
    return m ? m[1] : xpathRef;
}

function extractDetName(xpathRef: string): string {
    const m = xpathRef.match(/bo:determinations\[@bo:name='([^']+)'\]/);
    return m ? m[1] : xpathRef;
}

function parseTriggers(body: string) {
    const triggers: any[] = [];
    const pattern = /<bo:triggers\s([^>]*\/?>)/g;
    let m;
    while ((m = pattern.exec(body)) !== null) {
        const a = m[1];
        const nodePath = attr(a, 'bo:node');
        // Skip empty triggers (actionCheck validations have structurally empty trigger entries)
        if (!nodePath) continue;
        const assocPath = attr(a, 'bo:association');
        const assocName = assocPath.match(/bo:associations\[@bo:name='([^']*)'\]/)?.[1] ?? '';
        const trigger: Record<string, any> = {
            node: extractNodeName(decodeURIComponent(nodePath)),
        };
        if (assocName) trigger.association = assocName;
        // Collect all boolean on-flags dynamically (create/update/delete/load/determine/check)
        const on: Record<string, boolean> = {};
        for (const flag of ['create', 'update', 'delete', 'load', 'determine', 'check']) {
            const v = optionalAttr(a, `bo:${flag}`);
            if (v !== null) on[flag] = v === 'true';
        }
        trigger.on = on;
        triggers.push(trigger);
    }
    return triggers;
}

function parseRelations(body: string) {
    const relations: any[] = [];
    const pattern = /<bo:relations\s([^>]*\/?>)/g;
    let m;
    while ((m = pattern.exec(body)) !== null) {
        const a = m[1];
        const nodePath = attr(a, 'bo:node');
        const detPath = attr(a, 'bo:determination');
        relations.push({
            node: extractNodeName(decodeURIComponent(nodePath)),
            determination: extractDetName(decodeURIComponent(detPath)),
            relationType: attr(a, 'bo:relationType'),
        });
    }
    return relations;
}
