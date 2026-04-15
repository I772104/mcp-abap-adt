# GetDomain

Retrieve ABAP domain definition including data type, length, fixed values, and conversion exit.

## Description

This tool retrieves complete domain metadata from the SAP system via ADT. Domains define the technical attributes of data elements, including data type, length, allowed values, and conversion routines.

## Usage

```json
{
  "domain_name": "MATNR"
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| domain_name | string | Yes | Name of the ABAP domain (e.g., MATNR, BUKRS, LIFNR) |

## Response

The tool returns XML data from the ADT endpoint containing:
- Domain name and description
- Data type (CHAR, NUMC, DATS, etc.)
- Length and decimal places
- Fixed values (if defined)
- Conversion exit routine
- Value table reference
- Case sensitivity settings

## Example Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<domain:domain xmlns:domain="http://www.sap.com/adt/ddic/domains">
  <domain:name>MATNR</domain:name>
  <domain:description>Material Number</domain:description>
  <domain:dataType>CHAR</domain:dataType>
  <domain:length>40</domain:length>
  <domain:conversionExit>MATN1</domain:conversionExit>
  <domain:valueTable>MARA</domain:valueTable>
</domain:domain>
```

## Use Cases

### Understanding Field Properties
```
Developer: "What is the data type and length of the MATNR domain?"
AI: Uses GetDomain('MATNR') to retrieve:
  - Data Type: CHAR
  - Length: 40
  - Conversion Exit: MATN1
```

### Checking Fixed Values
```
Developer: "What are the allowed values for material type?"
AI: GetDomain('MTART') returns fixed values:
  - FERT: Finished Product
  - HALB: Semi-Finished Product
  - ROH: Raw Material
```

### Domain Hierarchy
```
Developer: "What domain does the LIFNR data element use?"
AI: GetDataElement('LIFNR') → shows domain = LIFNR
    GetDomain('LIFNR') → retrieves complete domain definition
```

## ADT Endpoint

```http
GET /sap/bc/adt/ddic/domains/{domain_name}
```

## Related Tools

- **GetDataElement** - Retrieves data element that references a domain
- **GetTable** - Retrieves table structure with field definitions
- **GetStructure** - Retrieves structure with fields based on domains
- **GetTypeInfo** - Retrieves general type information

## Error Handling

The tool will return an error if:
- Domain name is not provided
- Domain does not exist in the system
- User lacks authorization to view the domain
- Network/connection issues occur

## Notes

- Domain names are automatically converted to lowercase for the API call
- Domains are part of the ABAP Dictionary (DDIC) foundation
- Multiple data elements can reference the same domain
- Fixed values defined in domains are enforced at the data element level
