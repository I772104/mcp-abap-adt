/**
 * Unit Tests for handleListATCCheckVariants
 *
 * Tests the ListATCCheckVariants tool handler which lists available ATC check
 * variants on the SAP system.
 */

import { handleListATCCheckVariants } from '../../../../src/handlers/handleListATCCheckVariants';
import * as utils from '../../../../src/lib/utils';

jest.mock('../../../../src/lib/utils', () => ({
    ...jest.requireActual('../../../../src/lib/utils'),
    makeAdtRequest: jest.fn(),
    getBaseUrl: jest.fn(),
}));

describe('handleListATCCheckVariants', () => {
    let mockMakeAdtRequest: jest.MockedFunction<typeof utils.makeAdtRequest>;
    let mockGetBaseUrl: jest.MockedFunction<typeof utils.getBaseUrl>;

    const mockVariantsXml = `<?xml version="1.0" encoding="utf-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:name="DEFAULT" adtcore:description="Standard ATC Check Variant"/>
  <adtcore:objectReference adtcore:name="CUSTOM_DEV" adtcore:description="Custom Development Checks"/>
  <adtcore:objectReference adtcore:name="CLOUD_READY" adtcore:description="Cloud Readiness Checks"/>
</adtcore:objectReferences>`;

    const mockEmptyVariantsXml = `<?xml version="1.0" encoding="utf-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
</adtcore:objectReferences>`;

    const mockSingleVariantXml = `<?xml version="1.0" encoding="utf-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:name="DEFAULT" adtcore:description="Standard Variant"/>
</adtcore:objectReferences>`;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMakeAdtRequest = utils.makeAdtRequest as jest.MockedFunction<typeof utils.makeAdtRequest>;
        mockGetBaseUrl = utils.getBaseUrl as jest.MockedFunction<typeof utils.getBaseUrl>;
        mockGetBaseUrl.mockResolvedValue('https://mock-sap-system.com:443');
    });

    describe('Basic Functionality', () => {
        test('should list ATC check variants successfully', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('ATC Check Variants (3 available)');
            expect(result.content[0].text).toContain('DEFAULT');
            expect(result.content[0].text).toContain('CUSTOM_DEV');
            expect(result.content[0].text).toContain('CLOUD_READY');
        });

        test('should handle empty variants list', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockEmptyVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('No ATC check variants found');
        });

        test('should handle single variant', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockSingleVariantXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('ATC Check Variants (1 available)');
            expect(result.content[0].text).toContain('DEFAULT');
        });
    });

    describe('API Request', () => {
        test('should call correct ADT endpoint', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            await handleListATCCheckVariants({});

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('/sap/bc/adt/atc/variants'),
                'GET',
                30000,
                undefined,
                { Accept: 'application/vnd.sap.adt.nameditems.v1+xml, application/xml' }
            );
        });

        test('should include query parameters', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            await handleListATCCheckVariants({});

            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('maxItemCount=500'),
                'GET',
                30000,
                undefined,
                expect.any(Object)
            );
            expect(mockMakeAdtRequest).toHaveBeenCalledWith(
                expect.stringContaining('name=*'),
                'GET',
                30000,
                undefined,
                expect.any(Object)
            );
        });
    });

    describe('XML Parsing', () => {
        test('should extract variant names and descriptions', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.content[0].text).toContain('1. DEFAULT');
            expect(result.content[0].text).toContain('Standard ATC Check Variant');
            expect(result.content[0].text).toContain('2. CUSTOM_DEV');
            expect(result.content[0].text).toContain('Custom Development Checks');
        });

        test('should handle variants without descriptions', async () => {
            const xmlWithoutDesc = `<?xml version="1.0" encoding="utf-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:name="VARIANT1"/>
</adtcore:objectReferences>`;

            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: xmlWithoutDesc,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('VARIANT1');
        });

        test('should handle malformed XML gracefully', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: '<invalid-xml>',
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('Output Formatting', () => {
        test('should format variants with numbering', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.content[0].text).toMatch(/1\. DEFAULT/);
            expect(result.content[0].text).toMatch(/2\. CUSTOM_DEV/);
            expect(result.content[0].text).toMatch(/3\. CLOUD_READY/);
        });

        test('should include usage instructions', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.content[0].text).toContain('Usage:');
            expect(result.content[0].text).toContain('RunATC');
            expect(result.content[0].text).toContain('check_variant');
        });

        test('should show example with first variant', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.content[0].text).toContain('check_variant: "DEFAULT"');
        });

        test('should not show usage when no variants found', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockEmptyVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.content[0].text).not.toContain('Usage:');
        });
    });

    describe('Error Handling', () => {
        test('should handle HTTP errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('HTTP 500: Internal Server Error'));

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('500');
        });

        test('should handle empty response data', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: null,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Empty response');
        });

        test('should handle network errors', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('ECONNREFUSED'));

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBe(true);
        });

        test('should handle unauthorized access', async () => {
            mockMakeAdtRequest.mockRejectedValue(new Error('HTTP 403: Forbidden'));

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('403');
        });
    });

    describe('Namespace Handling', () => {
        test('should handle namespace prefixes in XML', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('DEFAULT');
        });

        test('should handle XML without namespace', async () => {
            const noNamespaceXml = mockVariantsXml.replace(/adtcore:/g, '');
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: noNamespaceXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.isError).toBeFalsy();
            expect(result.content[0].text).toContain('DEFAULT');
        });
    });

    describe('Integration with RunATC', () => {
        test('should return variant names usable by RunATC', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            // Variant names should be extractable from output
            expect(result.content[0].text).toContain('DEFAULT');
            expect(result.content[0].text).toContain('CUSTOM_DEV');
            expect(result.content[0].text).toContain('CLOUD_READY');
        });
    });

    describe('Count Display', () => {
        test('should show correct count for multiple variants', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.content[0].text).toContain('(3 available)');
        });

        test('should show correct count for single variant', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockSingleVariantXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.content[0].text).toContain('(1 available)');
        });

        test('should show 0 count for empty list', async () => {
            mockMakeAdtRequest.mockResolvedValue({
                status: 200,
                data: mockEmptyVariantsXml,
            } as any);

            const result = (await handleListATCCheckVariants({})) as any;

            expect(result.content[0].text).toContain('(0 available)');
        });
    });
});
