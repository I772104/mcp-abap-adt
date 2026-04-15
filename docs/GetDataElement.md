# GetDataElement

Retrieve ABAP data element definition including domain reference, field labels, and documentation.

## Description

This tool retrieves complete data element metadata from the SAP system via ADT. Data elements provide semantic information for fields, including descriptive labels, domain references, search helps, and documentation.

## Usage

```json
{
  "dataelement_name": "MATNR"
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| dataelement_name | string | Yes | Name of the ABAP data element (e.g., MATNR, BUKRS, NETWR) |

## Response

The tool returns XML data from the ADT endpoint containing:
- Data element name and description
- Domain reference (technical properties)
- Field labels (short, medium, long, heading)
- Search help assignment
- Documentation text
- Parameter ID

## Example Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<dataElement:dataElement xmlns:dataElement="http://www.sap.com/adt/ddic/dataelements">
  <dataElement:name>MATNR</dataElement:name>
  <dataElement:description>Material Number</dataElement:description>
  <dataElement:domain>MATNR</dataElement:domain>
  <dataElement:fieldLabels>
    <short>Material</short>
    <medium>Material</medium>
    <long>Material Number</long>
    <heading>Material Number</heading>
  </dataElement:fieldLabels>
  <dataElement:searchHelp>MAT1</dataElement:searchHelp>
</dataElement:dataElement>
```

## Use Cases

### Understanding Field Semantics
```
Developer: "What does the LIFNR field represent?"
AI: Uses GetDataElement('LIFNR') to find:
  - Description: Vendor Number
  - Domain: LIFNR (CHAR 10)
  - Labels: "Vendor", "Vendor", "Vendor Number"
```

### Finding Field Labels
```
Developer: "What label should I use for the BUKRS field?"
AI: GetDataElement('BUKRS') returns:
  - Short: "Co.Cd"
  - Medium: "Company Code"
  - Long: "Company Code"
  - Use context-appropriate label
```

### Complete Field Analysis
```
Developer: "Tell me everything about the NETWR field"
AI: 
  1. GetDataElement('NETWR') → semantic info + domain reference
  2. GetDomain(domain_from_step1) → technical properties
  Result: Complete field definition with labels, type, length, decimals
```

## ADT Endpoint

```http
GET /sap/bc/adt/ddic/dataelements/{dataelement_name}
```

## Related Tools

- **GetDomain** - Retrieves the domain referenced by a data element
- **GetTable** - Retrieves table structure with data element assignments
- **GetStructure** - Retrieves structure with data element assignments
- **GetTypeInfo** - Retrieves general type information

## Error Handling

The tool will return an error if:
- Data element name is not provided
- Data element does not exist in the system
- User lacks authorization to view the data element
- Network/connection issues occur

## Notes

- Data element names are automatically converted to lowercase for the API call
- Data elements provide semantic meaning (labels, documentation)
- Domains provide technical attributes (type, length, values)
- Multiple fields across different tables can share the same data element
- Data elements enable consistent field labeling across the system
- Search help assignment guides input value selection
