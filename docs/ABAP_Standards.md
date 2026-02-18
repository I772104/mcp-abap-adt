# ABAP Development Standards

> **Purpose**: Comprehensive standards for ABAP development including naming conventions, formatting rules, and VDM CDS compliance  
> **Audience**: AI agents, developers, code reviewers  
> **Scope**: Naming, formatting, ABAP Cloud compliance, VDM CDS guidelines  
> **Last Updated**: 2026-02-18

---

## Table of Contents

1. [Naming Conventions](#1-naming-conventions)
2. [Code Formatting](#2-code-formatting)
3. [VDM CDS Naming Guidelines](#3-vdm-cds-naming-guidelines)
4. [ABAP Cloud Compliance](#4-abap-cloud-compliance)
5. [Best Practices](#5-best-practices)
6. [Validation Rules](#6-validation-rules)
7. [Common Mistakes](#7-common-mistakes)
8. [Quick Reference](#8-quick-reference)

---

## 1. Naming Conventions

### 1.1 Classes and Interfaces

| Object Type | Pattern | Example |
|-------------|---------|---------|
| Standard Class | `CL_<module>_<name>` | `CL_CPE_CREATE_PRASP` |
| Implementation Class | `CL_IM_<module>_<name>` | `CL_IM_APPL_CHECK` |
| Database Access Class | `CL_<module>_<name>_DB` | `CL_CAS_AGRP_DB` |
| UI Management Class | `CL_<module>_<name>_UI` | `CL_CAS_APPL_MWC_UI` |
| Business Logic Class | `CL_<module>_<name>_BL` | `CL_CAS_APPDATA_BL` |
| Interface | `IF_<module>_<name>` | `IF_CAS_APP_GROUP` |

**Rules**:
- ✅ Use uppercase for class/interface names in SE24
- ✅ Use CamelCase in CDS views (e.g., `I_SalesOrder`)
- ✅ Module should be 2-4 characters representing the application area
- ✅ Name should be descriptive and business-semantic

**Example from System**:
```abap
CLASS cl_abap_typedescr DEFINITION
  PUBLIC
  ABSTRACT
  CREATE PUBLIC.
  " Runtime Type Services
ENDCLASS.
```

---

### 1.2 Internal Declarations

#### Constants

| Type | Pattern | Example | Notes |
|------|---------|---------|-------|
| Global Constants | `GC_<NAME>` | `GC_MAX_ITEMS` | Declare via interface/constant class |

**Rules**:
- ❌ Do not declare constants directly in code
- ✅ Use interface or constant class
- ✅ Use UPPERCASE for constant names

#### Types

| Type | Pattern | Example | Description |
|------|---------|---------|-------------|
| Variable Type | `TV_<name>` | `tv_matnr` | Single field type |
| Structure Type | `TS_<name>` | `ts_header` | Structure definition |
| Table Type | `TT_<name>` | `tt_items` | Internal table type |

---

### 1.3 Instance Attributes

| Scope | Pattern | Example | Description |
|-------|---------|---------|-------------|
| Public/Private/Protected Variable | `MV_<name>` | `mv_matnr` | Member variable |
| Public/Private/Protected Structure | `MS_<name>` | `ms_mara` | Member structure |
| Public/Private/Protected Table | `MT_<name>` | `mt_mara` | Member table |
| Public/Private/Protected Reference | `MR_<name>` | `mr_header` | Member reference |
| Public/Private/Protected Object | `MO_<name>` | `mo_instance` | Member object |

**Example from System**:
```abap
CLASS cl_abap_typedescr DEFINITION.
  PUBLIC SECTION.
    DATA absolute_name TYPE abap_abstypename READ-ONLY.
    DATA decimals TYPE i READ-ONLY.
    DATA kind TYPE abap_typecategory READ-ONLY.
    DATA length TYPE i READ-ONLY.
    DATA type_kind TYPE abap_typekind READ-ONLY.
ENDCLASS.
```

---

### 1.4 Static Attributes

| Type | Pattern | Example | Notes |
|------|---------|---------|-------|
| Static Variable | `SV_<name>` | `sv_counter` | Avoid `S_<name>` (conflicts with select-options) |
| Static Structure | `SS_<name>` | `ss_config` | Static structure |
| Static Table | `ST_<name>` | `st_cache` | Static internal table |
| Static Object | `SO_<name>` | `so_singleton` | Static object instance |
| Static Reference | `SR_<name>` | `sr_factory` | Static object reference |

---

### 1.5 Method Local Declarations

| Type | Pattern | Example | Description |
|------|---------|---------|-------------|
| Local Variable | `LV_<name>` | `lv_result` | Local variable |
| Local Structure | `LS_<name>` | `ls_item` | Local structure |
| Local Table | `LT_<name>` | `lt_items` | Local internal table |
| Local Reference | `LR_<name>` | `lr_data` | Local reference |
| Field Symbol | `<FS_name>` | `<fs_item>` | Field symbol |

---

### 1.6 Class Definitions

| Type | Pattern | Example | Description |
|------|---------|---------|-------------|
| Local Class | `LCL_<name>` | `lcl_helper` | Local class definition |
| Global Class | `GCL_<name>` | `gcl_utility` | Global class (e.g., TOP-Include) |
| Local Interface | `LIF_<name>` | `lif_processor` | Local interface |
| Global Interface | `GIF_<name>` | `gif_handler` | Global interface (e.g., for ALV) |

---

### 1.7 Method Parameters

#### Import Parameters

| Type | Pattern | Example | Alternative |
|------|---------|---------|-------------|
| Variable | `IV_<name>` | `iv_matnr` | `PIV_MATNR` |
| Structure | `IS_<name>` | `is_header` | `PIS_HEADER` |
| Table | `IT_<name>` | `it_items` | `PIT_ITEM` |
| Reference | `IR_<name>` | `ir_data` | - |

**Note**: Use only one notation per project!

#### Export Parameters

| Type | Pattern | Example | Alternative |
|------|---------|---------|-------------|
| Variable | `EV_<name>` | `ev_subrc` | `PEV_SUBRC` |
| Structure | `ES_<name>` | `es_result` | - |
| Table | `ET_<name>` | `et_results` | - |
| Reference | `ER_<name>` | `er_object` | - |

#### Changing Parameters

| Type | Pattern | Example |
|------|---------|---------|
| Variable | `CV_<name>` | `cv_counter` |
| Structure | `CS_<name>` | `cs_data` |
| Table | `CT_<name>` | `ct_items` |
| Reference | `CR_<name>` | `cr_object` |

#### Returning Parameters

| Type | Pattern | Example |
|------|---------|---------|
| Variable | `RV_<name>` | `rv_result` |
| Structure | `RS_<name>` | `rs_data` |
| Table | `RT_<name>` | `rt_items` |
| Reference | `RR_<name>` | `rr_object` |

---

### 1.8 Method Names

| Pattern | Example | Description |
|---------|---------|-------------|
| `SET_<attribute>` | `set_status` | Setter method for attribute access |
| `GET_<attribute>` | `get_status` | Getter method for attribute access |
| `ON_<event_name>` | `on_button_pushed` | Event handler method |
| `AS_<new_type>` | `as_string` | Type conversion method |
| `IS_<adjective>` | `is_open`, `is_active` | Boolean method (returns true/false) |
| `CHECK_<objective>` | `check_authorization` | Validation/check method |

**Rules for Boolean Methods**:
- ❌ Must not return EXCEPTIONs
- ✅ Return SPACE (false) or 'X' (true)
- ✅ Use descriptive adjectives

**Example from System**:
```abap
CLASS cl_abap_typedescr DEFINITION.
  PUBLIC SECTION.
    METHODS is_ddic_type
      RETURNING VALUE(p_abap_bool) TYPE abap_bool.
    
    METHODS get_relative_name
      RETURNING VALUE(p_relative_name) TYPE string.
    
    METHODS has_property
      IMPORTING p_property_kind TYPE abap_typepropkind
      RETURNING VALUE(p_abap_bool) TYPE abap_bool.
ENDCLASS.
```

---

## 2. Code Formatting

### 2.1 Indentation Rules

**Line Indentation**:
- ✅ Use consistent indentation (2 or 4 spaces, project-defined)
- ✅ Indent code blocks (IF, LOOP, METHOD, etc.)
- ✅ Align related statements

**Functional Method Calls**:
- ✅ Format functional method calls with proper indentation
- ✅ One parameter per line for readability

```abap
" ✅ Good: Formatted functional method call
DATA(result) = object->method(
  iv_param1 = value1
  iv_param2 = value2
  iv_param3 = value3
).

" ❌ Bad: Unformatted
DATA(result) = object->method( iv_param1 = value1 iv_param2 = value2 iv_param3 = value3 ).
```

**One-Line Method Calls**:
- ✅ Condense unnecessary spaces
- ✅ Keep on single line if short

```abap
" ✅ Good: Condensed one-liner
DATA(result) = object->method( iv_param = value ).

" ❌ Bad: Unnecessary spaces
DATA(result) = object->method(    iv_param   =   value    ).
```

**VALUE Statements**:
- ✅ Format and align VALUE statements
- ✅ One entry per line for tables

```abap
" ✅ Good: Aligned VALUE statement
DATA(lt_items) = VALUE #(
  ( field1 = 'A' field2 = 'B' field3 = 'C' )
  ( field1 = 'D' field2 = 'E' field3 = 'F' )
  ( field1 = 'G' field2 = 'H' field3 = 'I' )
).

" ❌ Bad: Unaligned
DATA(lt_items) = VALUE #( ( field1 = 'A' field2 = 'B' ) ( field1 = 'D' field2 = 'E' ) ).
```

---

### 2.2 Case Conversion

**Options**:
1. **None**: No automatic case conversion
2. **Derived from First Statement**: Follow first statement's casing
3. **Custom**: Define specific rules for keywords and identifiers

**Keyword Casing**:
- ✅ **Recommended**: UPPERCASE for keywords (DATA, METHOD, IF, etc.)
- ✅ Alternative: lowercase (if project standard)

**Identifier Casing**:
- ✅ Follow naming convention prefixes (lv_, mv_, etc.)
- ✅ **Keep Camel Case Identifiers**: Preserve camelCase in identifiers

```abap
" ✅ Recommended: UPPERCASE keywords, lowercase identifiers
DATA lv_customer_name TYPE string.
METHOD get_customer_name.
  RETURN lv_customer_name.
ENDMETHOD.

" ✅ Alternative: Preserve camelCase
DATA lv_customerName TYPE string.
METHOD getCustomerName.
  RETURN lv_customerName.
ENDMETHOD.
```

**Best Practice**:
- ✅ Be consistent within a project
- ✅ UPPERCASE for ABAP keywords
- ✅ lowercase or camelCase for identifiers
- ✅ Preserve camelCase when used intentionally

---

## 3. VDM CDS Naming Guidelines

### 3.1 General Principles

**Business Semantic Based Names**:
- ✅ Names must cover precise semantic meaning
- ✅ Semantic meaning must be unique across S/4HANA
- ✅ Understandable via name alone without context
- ✅ "Same things have the same name"

**Formal Rules**:
- ✅ Only alphabetic characters, numbers, and underscore
- ❌ No special unicode characters
- ✅ Use Upper CamelCase notation (e.g., `SalesOrderItem`)
- ✅ Base spelling on American-English
- ❌ No prepositions except in regulated cases
- ✅ Generally use singular, not plural

**Example from System**:
```
I_SalesOrder          ✅ Correct: Singular, CamelCase
I_SalesOrders         ❌ Wrong: Plural
I_Sales_Order         ❌ Wrong: Underscore between words
```

---

### 3.2 CDS View Naming Pattern

**Standard Pattern**:
```
<Prefix>_(<Qualifier>)(<SONT Name>)(<Suffix>)(_<Version>)
```

**View Categories and Prefixes**:

| Category | Prefix | Example |
|----------|--------|---------|
| Interface View | `I_` | `I_SalesOrder` |
| Consumption View | `C_` | `C_SalesOrderManage` |
| External API View | `A_` | `A_BusinessPartner` |
| Restricted Reuse View | `R_` | `R_SalesOrderTP` |
| Private View | `P_` | `P_SalesOrderHelper` |
| Extension Include View | `E_` | `E_SalesOrderItem` |
| View Extension | `X_` | `X_OIL_I_SalesOrder` |
| Abstract Entity | `D_` | `D_SalesOrderCreateParameter` |
| Derivation Function | `F_` | `F_CalculateTax` |
| Auxiliary View | `N_` | `N_SalesOrderCache` |

**View Sub-Categories and Suffixes**:

| Sub-Category | Suffix | Example |
|--------------|--------|---------|
| Analytical Cube | `Cube`, `C` | `I_SalesOrderCube` |
| Analytical Query | `Query`, `Qry`, `Q` | `C_SalesOrderQuery` |
| Value Help | `VH`, `ValueHelp` | `I_CustomerVH` |
| Text | `Text`, `Txt`, `T` | `I_MaterialText` |
| Transactional Processing | `TP` | `R_SalesOrderTP` |
| Draft | `Draft`, `Drft`, `D` | `R_SalesOrderDraft` |
| Hierarchy Node | `HierNode`, `HN` | `I_CostCenterHierNode` |

**Examples from System**:
```
I_SALESORDER                    ✅ Interface view for Sales Order
I_SALESORDERAPPROVALREASON      ✅ Interface view with qualifier
I_SALESORDERBILLINGBLKD         ✅ Interface view with qualifier (Billing Blocked)
```

---

### 3.3 CDS View Labels

**Rules**:
- ✅ Written in Title Case
- ✅ Space between every word
- ❌ No dots at end of abbreviations
- ❌ No technical terms like "CDS View", "API", "PaaS"
- ✅ Reflect semantic view name in natural language
- ✅ Separate suffixes with hyphen and spaces

**Examples**:
```
View Name: I_SalesOrder
Label: Sales Order

View Name: I_SalesOrderText
Label: Sales Order - Text

View Name: I_SalesOrderCube
Label: Sales Order - Cube

View Name: C_SalesOrderManage
Label: Sales Order - Manage

View Name: I_BR_NFIssuer
Label: Brazil Nota Fiscal Issuer
```

---

### 3.4 Global Field Names (GFN)

**General Pattern**:
```
(<Qualifier>)(<Object>)(<Qualifier>)(<Property>)(<Qualifier>)(<Representation Term>)
```

**Representation Terms**:

| RT | Pattern | Example |
|----|---------|---------|
| Identifier | `<Object>` or `<Object>ID` | `SalesOrder`, `MaterialID` |
| Code | `<Object>Code` | `CurrencyCode`, `CountryCode` |
| Indicator | `<Object>Is<Property>` | `OrderIsReleased`, `ItemIsBlocked` |
| Amount | `<Property>Amt(In<Currency>)` | `NetAmtInTransCrcy` |
| Quantity | `<Property>Qty(In<Unit>)` | `OrderQtyInBaseUnit` |
| Date | `<Property>Date` | `CreationDate`, `ValidityStartDate` |
| Time | `<Property>Time` | `CreationTime` |
| DateTime | `<Property>DateTime` | `LastChangedDateTime` |
| Duration | `<Property>Duration(In<Unit>)` | `ProcessingDurationInDays` |
| Rate/Ratio | `<Property>Rate/Ratio` | `ExchangeRate`, `DiscountPercent` |

**Special Rules**:

**Identifiers**:
```
SalesOrder              ✅ Basic identifier
SalesOrderUUID          ✅ UUID identifier
SalesOrderInternalID    ✅ Internal identifier
SalesOrderExternalID    ✅ External identifier
```

**Codes**:
```
TransactionCurrency     ✅ Currency code (suffix optional)
CurrencyISOCode         ✅ ISO code (suffix required)
MaterialType            ✅ Code without suffix (unambiguous)
```

**Indicators**:
```
OrderIsReleased         ✅ Boolean indicator
ItemIsBlocked           ✅ Boolean indicator
CustomerHasCredit       ✅ Boolean indicator
DocumentsAreComplete    ✅ Plural form
```

**Amounts**:
```
NetAmountInTransactionCurrency      ✅ Full form
NetAmtInTransCrcy                   ✅ Abbreviated
PricePerQuantityUnitInDocumentCrcy  ✅ With reference entity
```

**Quantities**:
```
OrderQuantityInBaseUnit             ✅ Full form
OrderQtyInBaseUnit                  ✅ Abbreviated
DeliveredQtyInStockUnit             ✅ With qualifier
```

---

### 3.5 Abbreviations

**Rules**:
- ✅ Only use approved abbreviations from GTNC
- ❌ Do not abbreviate if name fits within length limit
- ✅ Start abbreviating least important terms first
- ✅ Abbreviation must begin with same letter as word

**Common Approved Abbreviations**:

| Term | Abbreviation | Term | Abbreviation |
|------|--------------|------|--------------|
| Amount | Amt | Quantity | Qty |
| Currency | Crcy | Document | Doc |
| Transaction | Trans | Material | Matl |
| Customer | Cust | Business | Bus |
| Management | Mgmt | Organization | Org |
| Description | Desc | Number | Nbr |
| Reference | Ref | Status | Sts |
| Category | Ctgy | Type | Typ |

---

### 3.6 Industry/Country/Product Specific Names

**Pattern**:
```
(<IndustrySolution>_)(<CountryCode>_)(<SAPProduct>_)<SemanticName>
```

**Examples**:
```
I_OIL_SalesOrderItem            ✅ Oil industry specific
I_BR_AccountingDocument         ✅ Brazil specific
C_OIL_US_SalesOrderItem         ✅ Oil industry in USA
X_OIL_I_ContrPnLValueCube       ✅ View extension for Oil
```

**Rules**:
- ✅ Industry: 3-letter code (e.g., OIL, UTL, BNK)
- ✅ Country: 2-letter ISO code (e.g., BR, US, DE)
- ✅ Product: 3-letter code (e.g., EWM, IBP, ACM)
- ✅ Underscore after each prefix

---

### 3.7 Versioning

**Pattern**:
```
<Name>_<VersionNumber>
```

**Rules**:
- ❌ Never create version _1 (first version has no suffix)
- ✅ Start versioning with _2
- ✅ Use when incompatible changes required
- ✅ Set original to deprecated

**Examples**:
```
I_SalesOrderItem        ✅ Original version
I_SalesOrderItem_2      ✅ Second version (incompatible change)
I_SalesOrderItem_3      ✅ Third version

API_PRODUCT             ✅ Original service
API_PRODUCT_2           ✅ Versioned service
```

---

## 4. ABAP Cloud Compliance

### 4.1 Released APIs Only

**Allowed**:
```abap
" ✅ Released CDS views
SELECT * FROM I_BusinessPartner INTO TABLE @DATA(lt_bp).

" ✅ Released classes
DATA(lo_uuid) = cl_system_uuid=>create_uuid_x16_static( ).

" ✅ RAP business object access
MODIFY ENTITIES OF I_SalesOrderTP
  ENTITY SalesOrder
  CREATE FIELDS ( ... )
  WITH VALUE #( ... ).
```

**Forbidden**:
```abap
" ❌ Direct database table access (use CDS views)
SELECT * FROM vbak INTO TABLE @DATA(lt_vbak).

" ❌ Unreleased function modules
CALL FUNCTION 'CONVERSION_EXIT_ALPHA_INPUT'.

" ❌ Classic dynpro processing
CALL SCREEN 100.

" ❌ Direct COMMIT/ROLLBACK (use RAP save sequence)
COMMIT WORK.

" ❌ Unreleased classes
DATA(lo_helper) = NEW cl_internal_helper( ).
```

---

### 4.2 RAP Development Patterns

**Behavior Definition**:
```cds
managed implementation in class zbp_r_salesordertp unique;
strict ( 2 );
with draft;

define behavior for R_SalesOrderTP alias SalesOrder
persistent table zsalesorder
draft table zsalesorder_d
etag master LocalLastChangedAt
lock master total etag LastChangedAt
authorization master ( global, instance )
{
  create;
  update;
  delete;

  field ( readonly ) SalesOrder, CreationDate;
  field ( mandatory ) SalesOrderType, SoldToParty;

  validation ValidateSoldToParty on save { create; field SoldToParty; }
  determination CalculateNetAmount on modify { field Quantity, Price; }

  side effects { field Quantity affects field NetAmount; }
}
```

**Key Principles**:
- ✅ Always use `strict ( 2 );`
- ✅ Use `CORRESPONDING #( )` for entity operations
- ✅ Implement proper authorization (global + instance)
- ✅ Add validations with `on save` timing
- ✅ Use determinations for calculated fields
- ✅ Declare side effects for UI refresh

---

## 5. Best Practices

### 5.1 Naming Best Practices

1. **Be Descriptive**: Names should clearly indicate purpose
   ```abap
   " ✅ Good
   lv_customer_credit_limit
   
   " ❌ Bad
   lv_limit
   ```

2. **Be Consistent**: Use same patterns throughout project
   ```abap
   " ✅ Good: Consistent prefixes
   mv_customer_id
   mv_customer_name
   mv_customer_type
   
   " ❌ Bad: Inconsistent
   customer_id
   mv_name
   m_type
   ```

3. **Avoid Abbreviations Unless Necessary**:
   ```abap
   " ✅ Good: Full words (if space allows)
   lv_material_description
   
   " ✅ Acceptable: Approved abbreviation (if needed)
   lv_matl_desc
   
   " ❌ Bad: Non-standard abbreviation
   lv_mat_dsc
   ```

4. **Use Business Terminology**:
   ```abap
   " ✅ Good: Business term
   lv_sales_order_number
   
   " ❌ Bad: Technical term
   lv_vbeln
   ```

---

### 5.2 Formatting Best Practices

1. **Consistent Indentation**:
   ```abap
   " ✅ Good
   IF lv_condition = abap_true.
     DATA(lv_result) = calculate_value( ).
     IF lv_result > 0.
       process_result( lv_result ).
     ENDIF.
   ENDIF.
   
   " ❌ Bad
   IF lv_condition = abap_true.
   DATA(lv_result) = calculate_value( ).
   IF lv_result > 0.
   process_result( lv_result ).
   ENDIF.
   ENDIF.
   ```

2. **Readable Method Calls**:
   ```abap
   " ✅ Good: Multi-line for clarity
   DATA(result) = object->complex_method(
     iv_parameter1 = value1
     iv_parameter2 = value2
     iv_parameter3 = value3
     iv_parameter4 = value4
   ).
   
   " ✅ Good: Single line if short
   DATA(result) = object->simple_method( iv_param = value ).
   ```

3. **Aligned Declarations**:
   ```abap
   " ✅ Good: Aligned
   DATA: lv_customer_id   TYPE kunnr,
         lv_customer_name TYPE name1,
         lv_customer_type TYPE ktokd.
   
   " ❌ Bad: Unaligned
   DATA: lv_customer_id TYPE kunnr,
   lv_customer_name TYPE name1,
   lv_customer_type TYPE ktokd.
   ```

---

### 5.3 VDM CDS Best Practices

1. **Use Resources Over Tools**:
   ```
   ✅ Prefer: access_mcp_resource uri=abap://cds/I_SalesOrder
   ❌ Avoid: use_mcp_tool GetCDSView
   ```

2. **Token-Efficient Package Discovery**:
   ```
   ✅ Lightest: abap://packages/top-level/names (~5K tokens)
   ✅ Filtered: abap://packages/top-level?prefix=FIN (~500 tokens)
   ❌ Heavy: abap://packages/top-level (~35K tokens)
   ```

3. **Proper View Type Selection**:
   ```
   I_ = Interface (reusable, stable)
   C_ = Consumption (UI-specific)
   A_ = API (external exposure)
   R_ = Restricted (with authorization)
   ```

---

## 6. Validation Rules

### 6.1 Naming Validation

**Class Names**:
- ✅ Must start with `CL_` or `ZCL_`/`YCL_`
- ✅ Must follow pattern: `CL_<module>_<name>(_<suffix>)`
- ❌ Must not exceed 30 characters

**Method Names**:
- ✅ Must follow patterns: `SET_`, `GET_`, `IS_`, `CHECK_`, `ON_`
- ✅ Boolean methods must start with `IS_` or `HAS_`
- ❌ Must not use generic names like `process`, `execute`

**Parameters**:
- ✅ Must use correct prefixes: `IV_`, `EV_`, `CV_`, `RV_`
- ✅ Must match parameter type (variable, structure, table)
- ❌ Must not mix prefix styles in same class

**CDS Views**:
- ✅ Must use CamelCase
- ✅ Must have valid prefix (`I_`, `C_`, `A_`, etc.)
- ✅ Must not exceed 30 characters
- ✅ DDLS name must be uppercase of view name

---

### 6.2 Formatting Validation

**Indentation**:
- ✅ Consistent indentation throughout file
- ✅ Proper nesting of code blocks
- ❌ No mixing of tabs and spaces

**Case Usage**:
- ✅ Consistent keyword casing (UPPERCASE recommended)
- ✅ Consistent identifier casing
- ❌ No mixed case keywords (Data, METHOD, if)

**VALUE Statements**:
- ✅ Proper alignment of entries
- ✅ One entry per line for tables
- ❌ No unaligned or compressed entries

---

## 7. Common Mistakes

### 7.1 Naming Mistakes

| ❌ Wrong | ✅ Correct | Reason |
|---------|-----------|--------|
| `class calculator` | `CL_UTIL_CALCULATOR` | Missing prefix |
| `method calculate` | `method calculate_total` | Too generic |
| `parameter name` | `iv_name` or `ev_result` | Missing prefix |
| `I_SalesOrders` | `I_SalesOrder` | Use singular |
| `I_Sales_Order` | `I_SalesOrder` | No underscores in words |
| `lv_cust_id` | `lv_customer_id` | Use approved abbreviations |

---

### 7.2 Formatting Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Inconsistent indentation | Consistent 2 or 4 spaces |
| Mixed case keywords (Data, METHOD) | UPPERCASE keywords |
| Unaligned VALUE statements | Properly aligned entries |
| No spaces in method calls | Proper spacing |
| Mixed tabs and spaces | Use spaces only |

---

### 7.3 VDM CDS Mistakes

| ❌ Wrong | ✅ Correct | Reason |
|---------|-----------|--------|
| `I_SALESORDER` (DDLS) with `i_salesorder` (view) | Both should match case | DDLS uppercase, view CamelCase |
| Using `GetCDSView` tool | Use `abap://cds/` resource | Resources are cacheable |
| `I_SalesOrderHeader` | `I_SalesOrder` | Avoid "Header" in name |
| Multiple country prefixes | Single prefix or "C/R-Specific" | Max one country code |

---

## 8. Quick Reference

### 8.1 Naming Quick Reference

**Classes**:
```
CL_<module>_<name>          Standard class
CL_<module>_<name>_DB       Database access
CL_<module>_<name>_UI       UI management
CL_<module>_<name>_BL       Business logic
IF_<module>_<name>          Interface
```

**Variables**:
```
MV_<name>    Instance variable
LV_<name>    Local variable
SV_<name>    Static variable
```

**Parameters**:
```
IV_<name>    Import variable
EV_<name>    Export variable
CV_<name>    Changing variable
RV_<name>    Returning variable
```

**Methods**:
```
SET_<attr>   Setter
GET_<attr>   Getter
IS_<adj>     Boolean
CHECK_<obj>  Validation
ON_<event>   Event handler
```

---

### 8.2 CDS View Quick Reference

**View Prefixes**:
```
I_    Interface view (reusable, stable)
C_    Consumption view (UI-specific)
A_    External API view (published)
R_    Restricted reuse view (with auth)
E_    Extension include view
X_    View extension
D_    Abstract entity
```

**View Suffixes**:
```
Cube, C       Analytical cube
Query, Q      Analytical query
VH            Value help
Text, T       Text view
TP            Transactional processing
Draft, D      Draft view
HierNode, HN  Hierarchy node
```

**Examples**:
```
I_SalesOrder              Basic interface view
I_SalesOrderText          Text view
I_SalesOrderCube          Analytical cube
C_SalesOrderManage        Consumption view
A_BusinessPartner         API view
R_SalesOrderTP            Transactional processing
```

---

### 8.3 Formatting Quick Reference

**Indentation**:
- Use 2 or 4 spaces consistently
- Indent code blocks (IF, LOOP, METHOD)
- Align related statements

**Method Calls**:
```abap
" Multi-line
DATA(result) = object->method(
  iv_param1 = value1
  iv_param2 = value2
).

" Single-line
DATA(result) = object->method( iv_param = value ).
```

**VALUE Statements**:
```abap
DATA(lt_items) = VALUE #(
  ( field1 = 'A' field2 = 'B' )
  ( field1 = 'C' field2 = 'D' )
).
```

**Case**:
- UPPERCASE for keywords (DATA, METHOD, IF)
- lowercase or camelCase for identifiers
- Be consistent within project

---

### 8.4 Validation Checklist

Before creating/modifying ABAP code, verify:

**Naming**:
- [ ] Class name starts with CL_ or ZCL_/YCL_
- [ ] Method names follow patterns (SET_, GET_, IS_, CHECK_)
- [ ] Parameters use correct prefixes (IV_, EV_, CV_, RV_)
- [ ] Variables use correct prefixes (LV_, MV_, SV_)
- [ ] CDS views use CamelCase with valid prefix

**Formatting**:
- [ ] Consistent indentation (2 or 4 spaces)
- [ ] UPPERCASE keywords
- [ ] Proper spacing in method calls
- [ ] Aligned VALUE statements
- [ ] No mixed tabs and spaces

**ABAP Cloud**:
- [ ] Only released APIs used
- [ ] No direct database table access
- [ ] No unreleased function modules
- [ ] RAP patterns for transactional processing
- [ ] Proper authorization checks

**VDM CDS**:
- [ ] Business semantic names
- [ ] Singular form (unless exception)
- [ ] No underscores between words
- [ ] Approved abbreviations only
- [ ] Proper view type prefix

---

## 9. For AI Agents

### 9.1 Agent-Specific Quick Reference

**Location**: See `agents/` directory for agent-specific files:
- `.clinerules` - Cline-specific quick reference
- `.cursorrules` - Cursor-specific quick reference
- `.opencoderules` - OpenCode-specific quick reference
- `CLAUDE.md` - Claude Desktop-specific guide

**MCP Resources**:
```
# Get agent-specific guide
access_mcp_resource: uri=agent-guide://auto

# Get ABAP standards (future)
access_mcp_resource: uri=abap://standards/naming
access_mcp_resource: uri=abap://standards/formatting
access_mcp_resource: uri=abap://standards/vdm-cds
```

---

### 9.2 Validation Integration

**CheckSyntax Tool**:
- Always validate syntax before CreateClass
- Validates both class and test code
- Catches naming and formatting issues early

**Workflow**:
1. CheckSyntax (validate naming + syntax)
2. CreateClass (with validated code)
3. CheckSyntax (validate test code)
4. CreateClassTests
5. RunClassTests
6. ActivateClasses

---

### 9.3 Common Agent Tasks

**Creating a Class**:
1. Verify naming conventions (CL_<module>_<name>)
2. Use proper method names (SET_, GET_, IS_, CHECK_)
3. Apply correct parameter prefixes (IV_, EV_, RV_)
4. Format code consistently
5. Validate with CheckSyntax
6. Create with auto_activate: false
7. Add unit tests
8. Run tests before activation

**Creating CDS Views**:
1. Use CamelCase for view name
2. Choose correct prefix (I_, C_, A_, R_)
3. Use business semantic names
4. Apply approved abbreviations if needed
5. Add proper suffix if applicable (Text, Cube, VH)
6. Create label in Title Case
7. Validate field names (GFN patterns)

**Refactoring Code**:
1. Check current naming conventions
2. Verify ABAP Cloud compliance
3. Update to follow standards
4. Maintain backward compatibility
5. Update tests accordingly
6. Validate with CheckSyntax
7. Run tests before activation

---

## 10. Additional Resources

### 10.1 Documentation Links

- **Universal Guide**: `AGENTS.md` - Complete MCP server guide
- **Resources Guide**: `docs/Resources.md` - MCP resource catalog
- **RAP Tools**: `docs/RAP_Tools.md` - RAP-specific development
- **Example Workflows**: `Example_AGENTS.md` - Practical examples

### 10.2 SAP References

- **SAP Terminology**: http://www.sapterm.com
- **VDM CDS Guidelines**: Internal SAP wiki (see wiki content above)
- **ABAP Cloud**: SAP documentation on released APIs
- **Global Technical Name Catalog (GTNC)**: For VDM name approval

### 10.3 Support

For questions or clarifications:
- Check `AGENTS.md` for universal guidance
- Review agent-specific files in `agents/` directory
- Access MCP resources via `agent-guide://auto`
- Consult SAP documentation for VDM CDS specifics

---

## Appendix: VDM CDS Extended Guidelines

### A.1 SAP Object Types (SOT) and SAP Object Node Types (SONT)

**Definition**:
- SOT: Business objects (e.g., SalesOrder, Material, Customer)
- SONT: Sub-nodes of business objects (e.g., SalesOrderItem, MaterialPlant)

**Naming Rules**:
- Use singular form
- Use business semantic names
- Follow CamelCase notation
- Must be unique across S/4HANA

**Examples**:
```
SalesOrder              ✅ SOT (root)
SalesOrderItem          ✅ SONT (sub-node)
Material                ✅ SOT (root)
MaterialPlant           ✅ SONT (sub-node)
```

---

### A.2 Representation Terms Reference

**Complete List**:

| RT | Description | Example |
|----|-------------|---------|
| Identifier | Unique identification | SalesOrder, MaterialID |
| Code | Enumerated values | CurrencyCode, StatusCode |
| Indicator | Boolean (true/false) | OrderIsReleased |
| Amount | Monetary value | NetAmountInTransCrcy |
| Quantity | Measured value | OrderQtyInBaseUnit |
| Date | Calendar date | CreationDate |
| Time | Time of day | CreationTime |
| DateTime | Timestamp | LastChangedDateTime |
| Duration | Time span | ProcessingDurationInDays |
| Rate | Speed/frequency | ExchangeRate |
| Ratio | Proportion | DiscountPercent |
| Text | Textual description | MaterialDescription |
| Name | Short identifier | CustomerName |
| Number | Numeric identifier | InvoiceNumber |
| Percent | Percentage value | TaxPercent |

---

### A.3 Forbidden Terms

**Never use these terms in names**:

| Term | Reason | Alternative |
|------|--------|-------------|
| Header | Redundant | Use entity name directly |
| Root | Redundant | Use entity name directly |
| Exposes | Technical | Describe business semantic |
| Provides | Technical | Describe business semantic |
| Released | Status info | Not in name |
| Deprecated | Status info | Not in name |
| CDS | Technical | Not in name |
| API | Technical | Use A_ prefix instead |
| PaaS | Technical | Not in name |
| ValueHelp | Technical | Use VH suffix |

---

### A.4 Length Restrictions

**Technical Limits**:

| Object | Max Length | Notes |
|--------|-----------|-------|
| CDS View Name | 30 chars | CamelCase |
| DDLS Name | 30 chars | UPPERCASE |
| SQL View Name (CDS 1.0) | 16 chars | UPPERCASE, no underscore |
| Global Field Name | 30 chars | CamelCase |
| Class Name | 30 chars | UPPERCASE |
| Method Name | 30 chars | lowercase |

**Strategies for Length Issues**:
1. Use approved abbreviations
2. Abbreviate least important terms first
3. Start from left to right
4. Maintain readability
5. Request new abbreviations if needed

---

*End of ABAP Development Standards*

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-18  
**Maintained By**: Development Team  
**For**: AI Agents, Developers, Code Reviewers
