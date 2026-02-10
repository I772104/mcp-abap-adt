# AGENTS.md - ABAP Development Guidelines for AI Assistants

> **Scope**: SAP Standard Development for S/4HANA Cloud  
> **Target**: Large legacy codebase with SAPGUI and Fiori apps (Classic to Fiori V4/RAP)  
> **Language**: English for all documentation and comments

---

## Table of Contents

1. [Overview & Purpose](#1-overview--purpose)
2. [ABAP Cloud Development Model](#2-abap-cloud-development-model)
3. [Code Analysis & Understanding](#3-code-analysis--understanding)
4. [RAP Development Patterns](#4-rap-development-patterns)
5. [UI Development & Migration](#5-ui-development--migration)
6. [Integration Patterns](#6-integration-patterns)
7. [Testing Strategies](#7-testing-strategies)
8. [Bug Fixing & Debugging](#8-bug-fixing--debugging)
9. [Performance Optimization](#9-performance-optimization)
10. [Security Considerations](#10-security-considerations)
11. [Coding Conventions & Standards](#11-coding-conventions--standards)
12. [AI Assistant Collaboration](#12-ai-assistant-collaboration)

---

## 1. Overview & Purpose

### 1.1 Document Purpose

This document provides guidelines for AI coding assistants working with ABAP code in SAP standard development. It covers:

- **Legacy code maintenance**: Understanding and safely modifying existing SAPGUI/classic code
- **Modernization**: Migrating to RAP-based Fiori applications
- **New development**: Building cloud-ready applications following S/4HANA Cloud standards

### 1.2 Key References

| Resource | Purpose |
|----------|---------|
| [Clean ABAP](https://github.com/SAP/styleguides/blob/main/clean-abap/CleanABAP.md) | Code style and best practices |
| [RAP Documentation](https://help.sap.com/docs/abap-cloud/abap-rap/abap-restful-application-programming-model) | Official RAP guidelines |
| [ABAP Cloud Development](https://help.sap.com/docs/abap-cloud) | Cloud development model |
| [S/4HANA Simplification List](https://help.sap.com/docs/SAP_S4HANA_CLOUD/ee6ff9b281d8448f96b4fe6c89f2bdc8) | Compatibility and migration |

### 1.3 Development Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT HIERARCHY                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Cloud-Ready First    → Use released APIs only               │
│  2. RAP-Based Design     → Business objects over procedures     │
│  3. Test-Driven          → ABAP Unit for all new code           │
│  4. Performance-Aware    → CDS-first, minimize round trips      │
│  5. Security by Design   → Authorization at BO level            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. ABAP Cloud Development Model

### 2.1 Tier 1 (ABAP Cloud) Compliance

**MANDATORY**: All new development must comply with ABAP Cloud (Tier 1) restrictions.

#### Allowed

```abap
" ✅ Released APIs and CDS views
SELECT * FROM I_BusinessPartner INTO TABLE @DATA(lt_bp).

" ✅ Released classes and interfaces
DATA(lo_uuid) = cl_system_uuid=>create_uuid_x16_static( ).

" ✅ RAP business object access
MODIFY ENTITIES OF I_SalesOrderTP
  ENTITY SalesOrder
  UPDATE SET FIELDS WITH VALUE #( ( %key = ls_key NetAmount = 100 ) ).
```

#### Forbidden

```abap
" ❌ Direct database table access (use CDS views instead)
SELECT * FROM vbak INTO TABLE @DATA(lt_vbak).

" ❌ Unreleased function modules
CALL FUNCTION 'CONVERSION_EXIT_ALPHA_INPUT'.

" ❌ Classic dynpro processing
CALL SCREEN 100.

" ❌ Direct COMMIT/ROLLBACK (use RAP save sequence)
COMMIT WORK.
```

### 2.2 Identifying Released Objects

```abap
" Check if an object is released for cloud development:
" 1. In ADT: Right-click → Properties → API State
" 2. Look for: "Released" with contract C1 (use in cloud development)

" Released object indicators:
" - CDS views starting with I_ (interface views) or C_ (consumption views)
" - Classes with @EndUserText.label and released API state
" - BAPIs wrapped in released RAP facades
```

### 2.3 S/4HANA Readiness Checks

Before modifying any code, verify S/4HANA compatibility:

| Check | Tool | Action |
|-------|------|--------|
| Simplification Items | Custom Code Migration App | Review deprecated objects |
| Released API Usage | ATC Check (Cloud Readiness) | Run `ABAP_CLOUD_READINESS` |
| Syntax Check | ADT Quick Fix | Enable cloud-compatible mode |

### 2.4 Key CDS Interface Views by Domain

| Domain | Key Interface Views |
|--------|---------------------|
| Sales | `I_SalesOrder`, `I_SalesOrderItem`, `I_SalesOrderTP` |
| Purchasing | `I_PurchaseOrder`, `I_PurchaseOrderItem`, `I_PurchaseOrderTP` |
| Finance | `I_JournalEntry`, `I_GLAccountLineItem`, `I_OperationalAcctgDocItem` |
| Business Partner | `I_BusinessPartner`, `I_Customer`, `I_Supplier` |
| Material | `I_Product`, `I_ProductDescription`, `I_ProductPlant` |

---

## 3. Code Analysis & Understanding

### 3.1 Legacy Code Navigation Strategy

When analyzing unfamiliar ABAP code:

```
┌─────────────────────────────────────────────────────────────────┐
│                 CODE ANALYSIS WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Entry Point    → Find main program/class/function module    │
│  2. Data Model     → Identify key database tables/CDS views     │
│  3. Call Hierarchy → Trace execution flow (F3 in ADT)           │
│  4. Dependencies   → Check where-used list (Ctrl+Shift+G)       │
│  5. Customizing    → Review related configuration tables        │
│  6. Documentation  → Check class/method documentation           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Key Analysis Tools

| Tool | Purpose | How to Access |
|------|---------|---------------|
| Where-Used List | Find all usages of an object | `Ctrl+Shift+G` in ADT |
| Call Hierarchy | Trace method calls | `Ctrl+Alt+H` in ADT |
| Data Flow Analysis | Track variable assignments | ADT → Source Code → Data Flow |
| CDS Dependency Analysis | View CDS associations | ADT → Dependency Analyzer |
| ABAP Cross Reference | Legacy usage analysis | Transaction `SE84` |

### 3.3 Understanding Legacy Patterns

#### Classic Report Structure

```abap
" Legacy report pattern - understand before modernizing
REPORT z_legacy_report.

" 1. Global declarations (often problematic - encapsulate in classes)
DATA: gv_carrid TYPE s_carr_id,
      gt_flights TYPE TABLE OF sflight.

" 2. Selection screen (migrate to Fiori parameters)
SELECTION-SCREEN BEGIN OF BLOCK b1.
  PARAMETERS: p_carrid TYPE s_carr_id.
SELECTION-SCREEN END OF BLOCK b1.

" 3. Initialization (move to constructor/factory)
INITIALIZATION.
  gv_carrid = 'LH'.

" 4. Main processing (encapsulate in methods)
START-OF-SELECTION.
  SELECT * FROM sflight INTO TABLE gt_flights WHERE carrid = p_carrid.

" 5. Output (replace with Fiori UI)
END-OF-SELECTION.
  LOOP AT gt_flights INTO DATA(ls_flight).
    WRITE: / ls_flight-carrid, ls_flight-connid.
  ENDLOOP.
```

#### Function Module Pattern

```abap
" Legacy FM pattern - wrap in class method for modernization
FUNCTION z_get_customer_data.
  " Importing: IV_CUSTOMER_ID TYPE KUNNR
  " Exporting: ES_CUSTOMER TYPE KNA1
  " Exceptions: CUSTOMER_NOT_FOUND

  SELECT SINGLE * FROM kna1 INTO es_customer
    WHERE kunnr = iv_customer_id.

  IF sy-subrc <> 0.
    RAISE customer_not_found.
  ENDIF.
ENDFUNCTION.
```

### 3.4 Data Model Analysis

```abap
" When analyzing data models, identify:

" 1. Primary tables and their relationships
"    - Header/Item patterns (VBAK/VBAP, EKKO/EKPO)
"    - Master data vs transactional data

" 2. Key fields and foreign keys
"    - Client field (MANDT) - always implicit in cloud
"    - Document numbers (VBELN, EBELN)
"    - Organizational keys (BUKRS, WERKS, VKORG)

" 3. Corresponding CDS views
"    - I_* views for reading
"    - *TP views for transactional processing
```

---

## 4. RAP Development Patterns

### 4.1 RAP Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAP LAYER ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │   Service   │   │   Service   │   │   Service   │           │
│  │  Binding    │   │  Binding    │   │  Binding    │  UI/API   │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘           │
│         │                 │                 │                   │
│  ┌──────┴─────────────────┴─────────────────┴──────┐           │
│  │              Projection Layer (C_*)              │  BO       │
│  │         (UI-specific, role-based views)          │  Projection│
│  └──────────────────────┬───────────────────────────┘           │
│                         │                                       │
│  ┌──────────────────────┴───────────────────────────┐           │
│  │            Business Object Layer (R_*)            │  BO       │
│  │    Behavior Definition + Implementation           │  Interface│
│  └──────────────────────┬───────────────────────────┘           │
│                         │                                       │
│  ┌──────────────────────┴───────────────────────────┐           │
│  │              Interface Views (I_*)                │  Data     │
│  │         (Reusable, stable contracts)              │  Model    │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 CDS View Patterns

#### Basic Interface View

```cds
@AbapCatalog.viewEnhancementCategory: [#NONE]
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Sales Order Basic View'
@Metadata.ignorePropagatedAnnotations: true
@ObjectModel.usageType:{
  serviceQuality: #A,
  sizeCategory: #L,
  dataClass: #TRANSACTIONAL
}
define view entity I_SalesOrderBasic
  as select from vbak
  association [0..*] to I_SalesOrderItemBasic as _Item
    on $projection.SalesOrder = _Item.SalesOrder
{
  key vbeln as SalesOrder,
      erdat as CreationDate,
      erzet as CreationTime,
      ernam as CreatedByUser,
      auart as SalesOrderType,
      vkorg as SalesOrganization,
      vtweg as DistributionChannel,
      spart as Division,
      kunnr as SoldToParty,
      netwr as NetAmount,
      waerk as TransactionCurrency,

      // Associations
      _Item
}
```

#### Composite View (Business Object Interface)

```cds
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Sales Order BO Interface'
define root view entity R_SalesOrderTP
  as select from I_SalesOrderBasic
  composition [0..*] of R_SalesOrderItemTP as _Item
  association [0..1] to I_BusinessPartner   as _SoldToParty
    on $projection.SoldToParty = _SoldToParty.BusinessPartner
{
  key SalesOrder,
      SalesOrderType,
      SalesOrganization,
      DistributionChannel,
      Division,
      SoldToParty,
      @Semantics.amount.currencyCode: 'TransactionCurrency'
      NetAmount,
      TransactionCurrency,
      CreationDate,
      CreatedByUser,

      // Associations
      _Item,
      _SoldToParty
}
```

#### Projection View (UI-Specific)

```cds
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Sales Order for Fiori App'
@Metadata.allowExtensions: true
define root view entity C_SalesOrderTP
  provider contract transactional_query
  as projection on R_SalesOrderTP
{
  key SalesOrder,
      @Consumption.valueHelpDefinition: [{ entity: { name: 'I_SalesOrderType', element: 'SalesOrderType' }}]
      SalesOrderType,
      @Consumption.valueHelpDefinition: [{ entity: { name: 'I_SalesOrganization', element: 'SalesOrganization' }}]
      SalesOrganization,
      DistributionChannel,
      Division,
      @Consumption.valueHelpDefinition: [{ entity: { name: 'I_Customer', element: 'Customer' }}]
      SoldToParty,
      @Semantics.amount.currencyCode: 'TransactionCurrency'
      NetAmount,
      TransactionCurrency,
      CreationDate,
      CreatedByUser,

      // Associations for navigation
      _Item : redirected to composition child C_SalesOrderItemTP,
      _SoldToParty
}
```

### 4.3 Behavior Definition Patterns

#### Root Entity Behavior

```cds
managed implementation in class zbp_r_salesordertp unique;
strict ( 2 );  // Enable strict mode level 2
with draft;

define behavior for R_SalesOrderTP alias SalesOrder
persistent table zsalesorder
draft table zsalesorder_d
etag master LocalLastChangedAt
lock master total etag LastChangedAt
authorization master ( global, instance )
{
  // Standard operations
  create;
  update;
  delete;

  // Field controls
  field ( readonly ) SalesOrder, CreationDate, CreatedByUser;
  field ( mandatory ) SalesOrderType, SalesOrganization, SoldToParty;

  // Draft actions
  draft action Edit;
  draft action Activate optimized;
  draft action Discard;
  draft action Resume;
  draft determine action Prepare
  {
    validation ValidateSoldToParty;
    validation ValidateAmounts;
  }

  // Business actions
  action ( features : instance ) Release result [1] $self;
  action ( features : instance ) SetToDelivered result [1] $self;

  // Determinations
  determination CalculateNetAmount on modify { field Quantity, Price; }
  determination SetCreationFields on modify { create; }

  // Validations
  validation ValidateSoldToParty on save { create; field SoldToParty; }
  validation ValidateAmounts on save { field NetAmount; }

  // Side effects for UI refresh
  side effects
  {
    field Quantity affects field NetAmount;
    field Price affects field NetAmount;
  }

  // Composition
  association _Item { create; with draft; }

  // Mapping to persistent table
  mapping for zsalesorder corresponding
  {
    SalesOrder = sales_order;
    SalesOrderType = order_type;
    NetAmount = net_amount;
  }
}
```

### 4.4 Behavior Implementation Patterns

```abap
CLASS lhc_salesorder DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    " Constants for status values
    CONSTANTS:
      BEGIN OF gc_status,
        initial   TYPE c LENGTH 1 VALUE 'I',
        released  TYPE c LENGTH 1 VALUE 'R',
        delivered TYPE c LENGTH 1 VALUE 'D',
      END OF gc_status.

    " Handler methods
    METHODS get_global_authorizations FOR GLOBAL AUTHORIZATION
      IMPORTING REQUEST requested_authorizations FOR SalesOrder
      RESULT result.

    METHODS get_instance_authorizations FOR INSTANCE AUTHORIZATION
      IMPORTING keys REQUEST requested_authorizations FOR SalesOrder
      RESULT result.

    METHODS release FOR MODIFY
      IMPORTING keys FOR ACTION SalesOrder~Release
      RESULT result.

    METHODS get_instance_features FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features FOR SalesOrder
      RESULT result.

    METHODS validateSoldToParty FOR VALIDATE ON SAVE
      IMPORTING keys FOR SalesOrder~ValidateSoldToParty.

    METHODS calculateNetAmount FOR DETERMINE ON MODIFY
      IMPORTING keys FOR SalesOrder~CalculateNetAmount.

    METHODS setCreationFields FOR DETERMINE ON MODIFY
      IMPORTING keys FOR SalesOrder~SetCreationFields.
ENDCLASS.

CLASS lhc_salesorder IMPLEMENTATION.

  METHOD get_global_authorizations.
    " Check global create authorization
    IF requested_authorizations-%create = if_abap_behv=>mk-on.
      " Use released authorization API
      AUTHORITY-CHECK OBJECT 'S_TABU_DIS'
        ID 'DICBERCLS' FIELD 'ZSALES'
        ID 'ACTVT' FIELD '01'.
      result-%create = COND #( WHEN sy-subrc = 0
                               THEN if_abap_behv=>auth-allowed
                               ELSE if_abap_behv=>auth-unauthorized ).
    ENDIF.
  ENDMETHOD.

  METHOD get_instance_authorizations.
    " Read required data for authorization check
    READ ENTITIES OF R_SalesOrderTP IN LOCAL MODE
      ENTITY SalesOrder
      FIELDS ( SalesOrganization ) WITH CORRESPONDING #( keys )
      RESULT DATA(lt_orders)
      FAILED failed.

    LOOP AT lt_orders INTO DATA(ls_order).
      " Instance-based authorization
      AUTHORITY-CHECK OBJECT 'V_VBAK_VKO'
        ID 'VKORG' FIELD ls_order-SalesOrganization
        ID 'ACTVT' FIELD '02'.

      APPEND VALUE #(
        %tky = ls_order-%tky
        %update = COND #( WHEN sy-subrc = 0
                          THEN if_abap_behv=>auth-allowed
                          ELSE if_abap_behv=>auth-unauthorized )
        %delete = COND #( WHEN sy-subrc = 0
                          THEN if_abap_behv=>auth-allowed
                          ELSE if_abap_behv=>auth-unauthorized )
      ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD release.
    " Read current state
    READ ENTITIES OF R_SalesOrderTP IN LOCAL MODE
      ENTITY SalesOrder
      ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_orders)
      FAILED failed.

    " Process release
    LOOP AT lt_orders ASSIGNING FIELD-SYMBOL(<ls_order>).
      " Business logic: validate before release
      IF <ls_order>-NetAmount <= 0.
        APPEND VALUE #(
          %tky = <ls_order>-%tky
          %msg = new_message_with_text(
            severity = if_abap_behv_message=>severity-error
            text = 'Cannot release order with zero amount' )
        ) TO reported-salesorder.
        APPEND VALUE #( %tky = <ls_order>-%tky ) TO failed-salesorder.
        CONTINUE.
      ENDIF.

      " Update status
      MODIFY ENTITIES OF R_SalesOrderTP IN LOCAL MODE
        ENTITY SalesOrder
        UPDATE FIELDS ( Status )
        WITH VALUE #( ( %tky = <ls_order>-%tky
                        Status = gc_status-released ) )
        FAILED DATA(lt_failed_modify)
        REPORTED DATA(lt_reported_modify).

      " Return result
      APPEND VALUE #( %tky = <ls_order>-%tky
                      %param = <ls_order> ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD get_instance_features.
    " Read current state for feature control
    READ ENTITIES OF R_SalesOrderTP IN LOCAL MODE
      ENTITY SalesOrder
      FIELDS ( Status ) WITH CORRESPONDING #( keys )
      RESULT DATA(lt_orders)
      FAILED failed.

    " Determine available features based on status
    result = VALUE #( FOR ls_order IN lt_orders
      ( %tky = ls_order-%tky
        " Release only available for initial status
        %action-Release = COND #(
          WHEN ls_order-Status = gc_status-initial
          THEN if_abap_behv=>fc-o-enabled
          ELSE if_abap_behv=>fc-o-disabled )
        " SetToDelivered only for released orders
        %action-SetToDelivered = COND #(
          WHEN ls_order-Status = gc_status-released
          THEN if_abap_behv=>fc-o-enabled
          ELSE if_abap_behv=>fc-o-disabled )
      ) ).
  ENDMETHOD.

  METHOD validateSoldToParty.
    " Read relevant fields
    READ ENTITIES OF R_SalesOrderTP IN LOCAL MODE
      ENTITY SalesOrder
      FIELDS ( SoldToParty ) WITH CORRESPONDING #( keys )
      RESULT DATA(lt_orders).

    " Validate each entry
    LOOP AT lt_orders INTO DATA(ls_order).
      " Check if business partner exists
      SELECT SINGLE @abap_true FROM I_BusinessPartner
        WHERE BusinessPartner = @ls_order-SoldToParty
        INTO @DATA(lv_exists).

      IF lv_exists = abap_false.
        APPEND VALUE #( %tky = ls_order-%tky ) TO failed-salesorder.
        APPEND VALUE #(
          %tky = ls_order-%tky
          %element-SoldToParty = if_abap_behv=>mk-on
          %msg = new_message_with_text(
            severity = if_abap_behv_message=>severity-error
            text = |Business partner { ls_order-SoldToParty } does not exist| )
        ) TO reported-salesorder.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.

  METHOD calculateNetAmount.
    " Read items to calculate total
    READ ENTITIES OF R_SalesOrderTP IN LOCAL MODE
      ENTITY SalesOrder BY \_Item
      ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_items).

    " Group by parent key and sum
    LOOP AT keys INTO DATA(ls_key).
      DATA(lv_total) = REDUCE #( INIT sum = CONV netwr_ak( 0 )
        FOR ls_item IN lt_items WHERE ( SalesOrder = ls_key-SalesOrder )
        NEXT sum = sum + ls_item-NetAmount ).

      " Update parent
      MODIFY ENTITIES OF R_SalesOrderTP IN LOCAL MODE
        ENTITY SalesOrder
        UPDATE FIELDS ( NetAmount )
        WITH VALUE #( ( %tky = ls_key-%tky
                        NetAmount = lv_total ) ).
    ENDLOOP.
  ENDMETHOD.

  METHOD setCreationFields.
    " Get current timestamp
    GET TIME STAMP FIELD DATA(lv_timestamp).

    " Set creation fields
    MODIFY ENTITIES OF R_SalesOrderTP IN LOCAL MODE
      ENTITY SalesOrder
      UPDATE FIELDS ( CreationDate CreatedByUser LocalLastChangedAt )
      WITH VALUE #( FOR key IN keys
        ( %tky = key-%tky
          CreationDate = cl_abap_context_info=>get_system_date( )
          CreatedByUser = cl_abap_context_info=>get_user_technical_name( )
          LocalLastChangedAt = lv_timestamp ) ).
  ENDMETHOD.

ENDCLASS.
```

### 4.5 RAP Business Events

```cds
" Define event in behavior definition
define behavior for R_SalesOrderTP alias SalesOrder
{
  // ... other definitions ...

  // Business events
  event OrderCreated parameter D_SalesOrderCreatedEvent;
  event OrderReleased parameter D_SalesOrderReleasedEvent;
}
```

```abap
" Raise event in behavior implementation
METHOD release.
  " ... release logic ...

  " Raise business event
  RAISE ENTITY EVENT R_SalesOrderTP~OrderReleased
    FROM VALUE #( FOR <ls_order> IN lt_orders
      ( %key = <ls_order>-%key
        %param = VALUE #( SalesOrder = <ls_order>-SalesOrder
                          ReleaseDate = cl_abap_context_info=>get_system_date( ) ) ) ).
ENDMETHOD.
```

### 4.6 Strict Mode Guidelines

```cds
" Always use strict mode level 2 for new developments
strict ( 2 );

" Strict mode enforces:
" - No implicit COMMIT
" - Proper %tky usage (no mixing of %key and %tky)
" - Mandatory CORRESPONDING # usage
" - No CREATE with uninitialized keys
" - Proper ETag handling
```

---

## 5. UI Development & Migration

### 5.1 UI Technology Decision Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                   UI TECHNOLOGY SELECTION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  New Development:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Standard CRUD/Analytics → Fiori Elements (RAP-based)   │   │
│  │  Complex Custom UI       → SAPUI5 Freestyle + RAP       │   │
│  │  Simple Extensions       → Fiori Elements + Adaptations │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Migration Priority:                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. Classic Dynpro (SE80)    → High priority migration  │   │
│  │  2. WebDynpro ABAP           → Medium priority          │   │
│  │  3. BSP Applications         → Medium priority          │   │
│  │  4. Fiori V2 (Smart Templates) → Low priority (working) │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Fiori Elements Floor Plans

| Floor Plan | Use Case | CDS Annotation |
|------------|----------|----------------|
| List Report | Search and display list | `@UI.lineItem` |
| Object Page | Display/edit single object | `@UI.identification`, `@UI.facet` |
| Worklist | Task-based list | `@UI.lineItem` + filter |
| Overview Page | Dashboard with cards | `@UI.chart`, `@UI.dataPoint` |
| Analytical List Page | Analytics with filters | `@Analytics.query: true` |

### 5.3 UI Annotations Pattern

```cds
@Metadata.layer: #CORE
@UI.headerInfo: {
  typeName: 'Sales Order',
  typeNamePlural: 'Sales Orders',
  title: { type: #STANDARD, value: 'SalesOrder' },
  description: { type: #STANDARD, value: 'SoldToPartyName' }
}
annotate view C_SalesOrderTP with
{
  // Selection fields for List Report filter bar
  @UI.selectionField: [{ position: 10 }]
  @UI.lineItem: [{ position: 10, importance: #HIGH }]
  SalesOrder;

  @UI.selectionField: [{ position: 20 }]
  @UI.lineItem: [{ position: 20, importance: #HIGH }]
  @Consumption.valueHelpDefinition: [{ entity: { name: 'I_SalesOrderType', element: 'SalesOrderType' }}]
  SalesOrderType;

  @UI.selectionField: [{ position: 30 }]
  @UI.lineItem: [{ position: 30 }]
  SalesOrganization;

  @UI.lineItem: [{ position: 40, importance: #HIGH }]
  @UI.identification: [{ position: 10 }]
  SoldToParty;

  @UI.lineItem: [{ position: 50, importance: #MEDIUM, label: 'Net Amount' }]
  @UI.identification: [{ position: 20 }]
  @UI.dataPoint: { title: 'Net Amount', criticalityCalculation: {
    improvementDirection: #MAXIMIZE,
    toleranceRangeLowValue: 1000,
    deviationRangeLowValue: 500 }}
  NetAmount;

  // Facets for Object Page
  @UI.facet: [
    { id: 'GeneralInfo', type: #IDENTIFICATION_REFERENCE, label: 'General Information', position: 10 },
    { id: 'Items', type: #LINEITEM_REFERENCE, label: 'Items', position: 20, targetElement: '_Item' }
  ]
  SalesOrder;

  // Actions in header and line item
  @UI.lineItem: [{ type: #FOR_ACTION, dataAction: 'Release', label: 'Release' }]
  @UI.identification: [{ type: #FOR_ACTION, dataAction: 'Release', label: 'Release' }]
  SalesOrder;
}
```

### 5.4 Migration from Classic Dynpro

```
┌─────────────────────────────────────────────────────────────────┐
│             DYNPRO TO FIORI MIGRATION STEPS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ANALYZE existing dynpro                                     │
│     ├── Document screen flow and navigation                     │
│     ├── Map PBO/PAI modules to RAP operations                   │
│     ├── Identify validations → RAP validations                  │
│     └── Identify business logic → RAP determinations/actions    │
│                                                                 │
│  2. DESIGN RAP business object                                  │
│     ├── Create CDS data model (I_, R_, C_ views)                │
│     ├── Define behavior with draft support                      │
│     └── Map dynpro fields to CDS elements                       │
│                                                                 │
│  3. IMPLEMENT behavior                                          │
│     ├── Migrate FORM routines to handler methods                │
│     ├── Replace AUTHORITY-CHECK with RAP authorization          │
│     └── Replace MESSAGE with behavior messages                  │
│                                                                 │
│  4. CREATE Fiori Elements UI                                    │
│     ├── Add UI annotations to projection view                   │
│     ├── Create service definition and binding                   │
│     └── Configure Fiori Launchpad tile                          │
│                                                                 │
│  5. TEST AND VALIDATE                                           │
│     ├── Functional testing (same business scenarios)            │
│     ├── Authorization testing                                   │
│     └── Performance comparison                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 OData V2 vs V4 Considerations

| Aspect | OData V2 | OData V4 (RAP) |
|--------|----------|----------------|
| Protocol | SEGW-based | RAP Service Binding |
| Draft | Custom implementation | Native draft support |
| Actions | Function imports | Bound/unbound actions |
| Deep Insert | Limited | Full support |
| Batch | Changeset-based | $batch with atomicity |
| **Recommendation** | Legacy only | **All new development** |

---

## 6. Integration Patterns

### 6.1 OData Service Design

```cds
" Service Definition - expose business objects
@EndUserText.label: 'Sales Order Service'
define service ZSalesOrderService {
  expose C_SalesOrderTP as SalesOrder;
  expose C_SalesOrderItemTP as SalesOrderItem;
  expose I_SalesOrderType as SalesOrderType;
  expose I_SalesOrganization as SalesOrganization;
  expose I_Customer as Customer;
}
```

### 6.2 Wrapping Legacy RFCs/BAPIs

```abap
" Pattern: Wrap legacy BAPI in RAP-compatible class
CLASS zcl_bapi_salesorder_wrapper DEFINITION
  PUBLIC FINAL
  CREATE PRIVATE.

  PUBLIC SECTION.
    INTERFACES if_rap_query_provider.

    " Factory method
    CLASS-METHODS get_instance
      RETURNING VALUE(ro_instance) TYPE REF TO zcl_bapi_salesorder_wrapper.

    " Wrapped BAPI calls
    METHODS create_sales_order
      IMPORTING
        is_header       TYPE bapisdhead
        it_items        TYPE bapiitemin_t
      EXPORTING
        ev_sales_order  TYPE vbeln
        et_return       TYPE bapiret2_t
      RAISING
        cx_rap_query_provider.

  PRIVATE SECTION.
    CLASS-DATA go_instance TYPE REF TO zcl_bapi_salesorder_wrapper.
ENDCLASS.

CLASS zcl_bapi_salesorder_wrapper IMPLEMENTATION.

  METHOD get_instance.
    IF go_instance IS NOT BOUND.
      go_instance = NEW #( ).
    ENDIF.
    ro_instance = go_instance.
  ENDMETHOD.

  METHOD create_sales_order.
    " Call legacy BAPI (only if released or in compatibility layer)
    CALL FUNCTION 'BAPI_SALESORDER_CREATEFROMDAT2'
      EXPORTING
        order_header_in  = is_header
      IMPORTING
        salesdocument    = ev_sales_order
      TABLES
        return           = et_return
        order_items_in   = it_items.

    " Check for errors
    LOOP AT et_return INTO DATA(ls_return) WHERE type CA 'AEX'.
      RAISE EXCEPTION TYPE cx_rap_query_provider
        MESSAGE ID ls_return-id
        NUMBER ls_return-number
        WITH ls_return-message_v1 ls_return-message_v2
             ls_return-message_v3 ls_return-message_v4.
    ENDLOOP.

    " Commit if successful (only in non-RAP context)
    " In RAP, the framework handles COMMIT
    IF ev_sales_order IS NOT INITIAL.
      CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'
        EXPORTING
          wait = abap_true.
    ENDIF.
  ENDMETHOD.

  METHOD if_rap_query_provider~select.
    " Implement for custom query scenarios
  ENDMETHOD.

ENDCLASS.
```

### 6.3 Event-Driven Integration

```abap
" RAP Event Consumer Implementation
CLASS zcl_order_event_handler DEFINITION
  PUBLIC FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_rap_event_handler.
ENDCLASS.

CLASS zcl_order_event_handler IMPLEMENTATION.

  METHOD if_rap_event_handler~handle_event.
    " Handle OrderCreated event
    DATA lt_events TYPE TABLE FOR EVENT R_SalesOrderTP~OrderCreated.

    lt_events = CORRESPONDING #( events ).

    LOOP AT lt_events INTO DATA(ls_event).
      " Process event - e.g., trigger follow-up document
      " Integration with external systems via enterprise events
      TRY.
          cl_ble_event_handler=>raise_event(
            iv_event_type = 'ZSALESORDER_CREATED'
            is_event_data = ls_event-%param ).
        CATCH cx_ble_event_handler.
          " Log error
      ENDTRY.
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.
```

---

## 7. Testing Strategies

### 7.1 ABAP Unit Framework

```abap
" Test class structure for RAP business objects
CLASS ltc_salesorder_tests DEFINITION FINAL
  FOR TESTING RISK LEVEL HARMLESS DURATION SHORT.

  PRIVATE SECTION.
    CLASS-DATA:
      environment TYPE REF TO if_cds_test_environment,
      sql_environment TYPE REF TO if_osql_test_environment.

    CLASS-METHODS:
      class_setup,
      class_teardown.

    METHODS:
      setup,
      teardown,
      " Test methods - naming: <method>_<scenario>_<expected>
      create_order_valid_data_succeeds FOR TESTING,
      create_order_missing_party_fails FOR TESTING,
      release_order_zero_amount_fails FOR TESTING,
      calculate_net_amount_sums_items FOR TESTING.
ENDCLASS.

CLASS ltc_salesorder_tests IMPLEMENTATION.

  METHOD class_setup.
    " Create CDS test environment for dependent views
    environment = cl_cds_test_environment=>create(
      i_for_entity = 'R_SalesOrderTP'
      i_dependency_list = VALUE #(
        ( name = 'I_BusinessPartner' type = 'CDS_VIEW' )
        ( name = 'I_SalesOrganization' type = 'CDS_VIEW' )
      )
    ).

    " Create SQL test environment for direct table access
    sql_environment = cl_osql_test_environment=>create(
      i_dependency_list = VALUE #(
        ( 'ZSALESORDER' )
        ( 'ZSALESORDER_ITEM' )
      )
    ).
  ENDMETHOD.

  METHOD class_teardown.
    environment->destroy( ).
    sql_environment->destroy( ).
  ENDMETHOD.

  METHOD setup.
    " Clear test doubles before each test
    environment->clear_doubles( ).
    sql_environment->clear_doubles( ).

    " Insert test data for business partner
    environment->insert_test_data( VALUE t_businesspartner(
      ( businesspartner = '0000001000' businesspartnername = 'Test Customer' )
    ) ).
  ENDMETHOD.

  METHOD teardown.
    " Rollback any changes
    ROLLBACK ENTITIES.
  ENDMETHOD.

  METHOD create_order_valid_data_succeeds.
    " Given: Valid input data
    DATA(ls_create_data) = VALUE #(
      SalesOrderType = 'OR'
      SalesOrganization = '1000'
      SoldToParty = '0000001000'
    ).

    " When: Creating sales order
    MODIFY ENTITIES OF R_SalesOrderTP
      ENTITY SalesOrder
      CREATE SET FIELDS WITH VALUE #( ( %cid = 'CID1'
                                        SalesOrderType = ls_create_data-SalesOrderType
                                        SalesOrganization = ls_create_data-SalesOrganization
                                        SoldToParty = ls_create_data-SoldToParty ) )
      MAPPED DATA(mapped)
      FAILED DATA(failed)
      REPORTED DATA(reported).

    " Then: Creation succeeds
    cl_abap_unit_assert=>assert_initial(
      act = failed-salesorder
      msg = 'Order creation should succeed'
    ).

    cl_abap_unit_assert=>assert_not_initial(
      act = mapped-salesorder
      msg = 'Mapped keys should be returned'
    ).
  ENDMETHOD.

  METHOD create_order_missing_party_fails.
    " Given: Missing sold-to party
    " When: Creating sales order without SoldToParty
    MODIFY ENTITIES OF R_SalesOrderTP
      ENTITY SalesOrder
      CREATE SET FIELDS WITH VALUE #( ( %cid = 'CID1'
                                        SalesOrderType = 'OR'
                                        SalesOrganization = '1000' ) )
      MAPPED DATA(mapped)
      FAILED DATA(failed)
      REPORTED DATA(reported).

    " Then: Validation fails
    cl_abap_unit_assert=>assert_not_initial(
      act = failed-salesorder
      msg = 'Missing mandatory field should cause failure'
    ).
  ENDMETHOD.

  METHOD release_order_zero_amount_fails.
    " Given: Order with zero amount
    sql_environment->insert_test_data( VALUE zsalesorder(
      ( sales_order = '0000000001'
        order_type = 'OR'
        net_amount = 0
        status = 'I' )
    ) ).

    " When: Executing release action
    MODIFY ENTITIES OF R_SalesOrderTP
      ENTITY SalesOrder
      EXECUTE Release FROM VALUE #( ( SalesOrder = '0000000001' ) )
      FAILED DATA(failed)
      REPORTED DATA(reported).

    " Then: Release fails with error
    cl_abap_unit_assert=>assert_not_initial(
      act = failed-salesorder
      msg = 'Release should fail for zero amount'
    ).

    " Verify error message
    cl_abap_unit_assert=>assert_not_initial(
      act = reported-salesorder
      msg = 'Error should be reported'
    ).
  ENDMETHOD.

  METHOD calculate_net_amount_sums_items.
    " Given: Order with multiple items
    sql_environment->insert_test_data( VALUE zsalesorder(
      ( sales_order = '0000000002' order_type = 'OR' net_amount = 0 )
    ) ).
    sql_environment->insert_test_data( VALUE zsalesorder_item(
      ( sales_order = '0000000002' item_no = '000010' net_amount = '100.00' )
      ( sales_order = '0000000002' item_no = '000020' net_amount = '250.00' )
    ) ).

    " When: Triggering determination
    MODIFY ENTITIES OF R_SalesOrderTP
      ENTITY SalesOrder
      UPDATE SET FIELDS WITH VALUE #( ( SalesOrder = '0000000002' ) )
      FAILED DATA(failed)
      REPORTED DATA(reported).

    " Then: Net amount is calculated
    READ ENTITIES OF R_SalesOrderTP
      ENTITY SalesOrder
      FIELDS ( NetAmount ) WITH VALUE #( ( SalesOrder = '0000000002' ) )
      RESULT DATA(lt_result).

    cl_abap_unit_assert=>assert_equals(
      exp = '350.00'
      act = lt_result[ 1 ]-NetAmount
      msg = 'Net amount should be sum of items'
    ).
  ENDMETHOD.

ENDCLASS.
```

### 7.2 Test Isolation Patterns

```abap
" Test double for external dependencies
CLASS ltd_business_partner_double DEFINITION FOR TESTING.
  PUBLIC SECTION.
    INTERFACES if_business_partner_reader.
    DATA mt_partners TYPE TABLE OF I_BusinessPartner.
ENDCLASS.

CLASS ltd_business_partner_double IMPLEMENTATION.
  METHOD if_business_partner_reader~get_partner.
    READ TABLE mt_partners INTO rs_partner
      WITH KEY BusinessPartner = iv_partner_id.
  ENDMETHOD.
ENDCLASS.

" Using test seams for legacy code
CLASS zcl_legacy_processor DEFINITION.
  PUBLIC SECTION.
    METHODS process_data
      IMPORTING iv_id TYPE sysuuid_c36
      RETURNING VALUE(rv_result) TYPE string.
  PROTECTED SECTION.
    METHODS get_external_data  " Can be redefined in test
      IMPORTING iv_id TYPE sysuuid_c36
      RETURNING VALUE(rs_data) TYPE zsdata.
ENDCLASS.

" Test subclass
CLASS ltc_legacy_processor DEFINITION FOR TESTING
  INHERITING FROM zcl_legacy_processor.
  PROTECTED SECTION.
    METHODS get_external_data REDEFINITION.
ENDCLASS.
```

### 7.3 Test Coverage Requirements

| Code Type | Minimum Coverage | Target Coverage |
|-----------|------------------|-----------------|
| RAP Behavior Implementation | 80% | 90% |
| Business Logic Classes | 70% | 85% |
| Utility/Helper Classes | 60% | 75% |
| CDS Views (functional) | N/A | Integration tested |

---

## 8. Bug Fixing & Debugging

### 8.1 Systematic Debugging Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                 BUG FIXING WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. REPRODUCE                                                   │
│     ├── Document exact steps to reproduce                       │
│     ├── Identify affected users/roles                           │
│     ├── Note system/client where issue occurs                   │
│     └── Capture relevant error messages/dumps                   │
│                                                                 │
│  2. ANALYZE                                                     │
│     ├── Check ST22 for dumps                                    │
│     ├── Review SLG1 application logs                            │
│     ├── Analyze SM21 system logs                                │
│     ├── Check STAD for performance context                      │
│     └── Review /SDF/SMON for monitoring data                    │
│                                                                 │
│  3. ISOLATE                                                     │
│     ├── Set breakpoints in ADT debugger                         │
│     ├── Use watchpoints for value changes                       │
│     ├── Trace execution with SAT                                │
│     └── Enable SQL trace (ST05) if DB-related                   │
│                                                                 │
│  4. FIX                                                         │
│     ├── Implement minimal change                                │
│     ├── Add/update unit tests                                   │
│     ├── Document fix rationale                                  │
│     └── Consider regression impact                              │
│                                                                 │
│  5. VERIFY                                                      │
│     ├── Test original scenario                                  │
│     ├── Run related unit tests                                  │
│     ├── Check for side effects                                  │
│     └── Performance validation if relevant                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Common RAP Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| ETag mismatch | "Entity has been modified" | Ensure `LocalLastChangedAt` is updated |
| Draft inconsistency | Draft data lost | Check `draft determine action Prepare` |
| Authorization failure | 403 Forbidden | Verify DCL and behavior authorization |
| Determination not triggered | Field not calculated | Check `on modify` trigger conditions |
| Validation timing | Error after save | Move to `on save` validation |

### 8.3 Legacy Code Safe Modification

```abap
" Pattern: Safely extend legacy code without breaking existing behavior

" BEFORE modification - document existing behavior
" Original code in FORM routine:
FORM calculate_price USING iv_material TYPE matnr
                     CHANGING cv_price TYPE netpr.
  " Legacy logic here
  SELECT SINGLE verpr FROM mbew INTO cv_price
    WHERE matnr = iv_material.
ENDFORM.

" AFTER modification - preserve behavior, add enhancement
FORM calculate_price USING iv_material TYPE matnr
                     CHANGING cv_price TYPE netpr.

  " Delegate to new class-based implementation
  TRY.
      cv_price = zcl_price_calculator=>calculate(
        iv_material = iv_material
        iv_use_legacy = abap_true  " Preserve legacy behavior
      ).
    CATCH cx_price_calculation INTO DATA(lx_error).
      " Fallback to legacy on error
      SELECT SINGLE verpr FROM mbew INTO cv_price
        WHERE matnr = iv_material.
  ENDTRY.
ENDFORM.

" New class implementation with testability
CLASS zcl_price_calculator DEFINITION.
  PUBLIC SECTION.
    CLASS-METHODS calculate
      IMPORTING iv_material TYPE matnr
                iv_use_legacy TYPE abap_bool DEFAULT abap_false
      RETURNING VALUE(rv_price) TYPE netpr
      RAISING cx_price_calculation.
ENDCLASS.
```

---

## 9. Performance Optimization

### 9.1 CDS View Optimization

```cds
" ❌ Avoid: Nested subqueries and complex calculations in SELECT
define view entity Z_BadPerformance as select from vbak {
  key vbeln,
  // Bad: Scalar subquery for each row
  ( select sum( netwr ) from vbap where vbeln = vbak.vbeln ) as TotalAmount
}

" ✅ Better: Use associations and aggregations
define view entity Z_GoodPerformance as select from vbak
  association [0..*] to vbap as _Item on $projection.SalesDocument = _Item.vbeln
{
  key vbeln as SalesDocument,
  // Use association for on-demand loading
  _Item
}

" ✅ For aggregation: Create dedicated analytical view
@Analytics.dataCategory: #CUBE
define view entity Z_SalesAnalytics as select from vbap {
  vbeln,
  @Aggregation.default: #SUM
  netwr as NetAmount,
  @Aggregation.default: #SUM
  cast( 1 as abap.int4 ) as ItemCount
}
```

### 9.2 ABAP SQL Best Practices

```abap
" ❌ Avoid: SELECT in loops
LOOP AT lt_materials INTO DATA(ls_material).
  SELECT SINGLE maktx FROM makt INTO ls_material-description
    WHERE matnr = ls_material-matnr AND spras = sy-langu.
ENDLOOP.

" ✅ Better: Bulk SELECT with FOR ALL ENTRIES
IF lt_materials IS NOT INITIAL.
  SELECT matnr, maktx FROM makt
    FOR ALL ENTRIES IN @lt_materials
    WHERE matnr = @lt_materials-matnr AND spras = @sy-langu
    INTO TABLE @DATA(lt_descriptions).

  " Match results
  LOOP AT lt_materials ASSIGNING FIELD-SYMBOL(<ls_material>).
    <ls_material>-description = VALUE #( lt_descriptions[
      matnr = <ls_material>-matnr ]-maktx OPTIONAL ).
  ENDLOOP.
ENDIF.

" ✅ Even better: Use CDS associations (single DB roundtrip)
SELECT FROM I_Product
  FIELDS Product, _Text[ Language = @sy-langu ].ProductName
  WHERE Product IN @lt_material_range
  INTO TABLE @DATA(lt_products).
```

### 9.3 Performance Anti-Patterns

| Anti-Pattern | Impact | Solution |
|--------------|--------|----------|
| SELECT * | Unnecessary data transfer | Select only needed fields |
| SELECT in loop | N+1 queries | FOR ALL ENTRIES or JOIN |
| Missing indexes | Full table scans | Ensure secondary indexes |
| Unnecessary DISTINCT | Sorting overhead | Remove if data is unique |
| Deep nested associations | Multiple DB calls | Use path expressions |
| CORRESPONDING without # | Runtime type check | Always use CORRESPONDING # |

### 9.4 Buffering Strategy

```abap
" Use singleton pattern with buffering for frequently accessed data
CLASS zcl_config_buffer DEFINITION
  PUBLIC FINAL
  CREATE PRIVATE.

  PUBLIC SECTION.
    CLASS-METHODS get_instance
      RETURNING VALUE(ro_instance) TYPE REF TO zcl_config_buffer.

    METHODS get_config
      IMPORTING iv_config_key TYPE string
      RETURNING VALUE(rv_value) TYPE string.

  PRIVATE SECTION.
    CLASS-DATA go_instance TYPE REF TO zcl_config_buffer.
    DATA mt_buffer TYPE HASHED TABLE OF zconfig WITH UNIQUE KEY config_key.
    DATA mv_loaded TYPE abap_bool.

    METHODS load_config.
ENDCLASS.

CLASS zcl_config_buffer IMPLEMENTATION.

  METHOD get_instance.
    IF go_instance IS NOT BOUND.
      go_instance = NEW #( ).
    ENDIF.
    ro_instance = go_instance.
  ENDMETHOD.

  METHOD get_config.
    IF mv_loaded = abap_false.
      load_config( ).
    ENDIF.
    rv_value = VALUE #( mt_buffer[ config_key = iv_config_key ]-config_value OPTIONAL ).
  ENDMETHOD.

  METHOD load_config.
    SELECT * FROM zconfig INTO TABLE @mt_buffer.
    mv_loaded = abap_true.
  ENDMETHOD.

ENDCLASS.
```

---

## 10. Security Considerations

### 10.1 RAP Authorization Pattern

```cds
" Authorization in behavior definition
define behavior for R_SalesOrderTP alias SalesOrder
authorization master ( global, instance )
{
  // Global: checked once per operation type
  // Instance: checked for each entity instance
}
```

```abap
" Implementation of authorization checks
METHOD get_global_authorizations.
  " Standard authorization object check
  IF requested_authorizations-%create = if_abap_behv=>mk-on.
    AUTHORITY-CHECK OBJECT 'V_VBAK_AAT'
      ID 'AUART' DUMMY
      ID 'ACTVT' FIELD '01'.  " Create
    result-%create = COND #( WHEN sy-subrc = 0
                             THEN if_abap_behv=>auth-allowed
                             ELSE if_abap_behv=>auth-unauthorized ).
  ENDIF.

  IF requested_authorizations-%update = if_abap_behv=>mk-on.
    AUTHORITY-CHECK OBJECT 'V_VBAK_AAT'
      ID 'AUART' DUMMY
      ID 'ACTVT' FIELD '02'.  " Change
    result-%update = COND #( WHEN sy-subrc = 0
                             THEN if_abap_behv=>auth-allowed
                             ELSE if_abap_behv=>auth-unauthorized ).
  ENDIF.
ENDMETHOD.

METHOD get_instance_authorizations.
  " Read entity data for instance check
  READ ENTITIES OF R_SalesOrderTP IN LOCAL MODE
    ENTITY SalesOrder
    FIELDS ( SalesOrganization SalesOrderType ) WITH CORRESPONDING #( keys )
    RESULT DATA(lt_orders).

  LOOP AT lt_orders INTO DATA(ls_order).
    " Check against organizational data
    AUTHORITY-CHECK OBJECT 'V_VBAK_VKO'
      ID 'VKORG' FIELD ls_order-SalesOrganization
      ID 'VTWEG' DUMMY
      ID 'SPART' DUMMY
      ID 'ACTVT' FIELD '02'.

    DATA(lv_auth) = COND #( WHEN sy-subrc = 0
                            THEN if_abap_behv=>auth-allowed
                            ELSE if_abap_behv=>auth-unauthorized ).

    APPEND VALUE #( %tky = ls_order-%tky
                    %update = lv_auth
                    %delete = lv_auth
                    %action-Release = lv_auth ) TO result.
  ENDLOOP.
ENDMETHOD.
```

### 10.2 CDS Access Control (DCL)

```dcl
@EndUserText.label: 'Access Control for Sales Orders'
@MappingRole: true
define role Z_SalesOrder_Access {
  grant select on R_SalesOrderTP
  where ( SalesOrganization ) =
    aspect pfcg_auth ( V_VBAK_VKO, VKORG, ACTVT = '03' );
}
```

### 10.3 Input Validation

```abap
" Always validate input in RAP validations
METHOD validate_input.
  " Read input data
  READ ENTITIES OF R_SalesOrderTP IN LOCAL MODE
    ENTITY SalesOrder
    FIELDS ( SoldToParty NetAmount TransactionCurrency ) WITH CORRESPONDING #( keys )
    RESULT DATA(lt_orders).

  LOOP AT lt_orders INTO DATA(ls_order).
    " Validate business partner format
    IF NOT matches( val = ls_order-SoldToParty regex = '^\d{10}$' ).
      APPEND VALUE #( %tky = ls_order-%tky ) TO failed-salesorder.
      APPEND VALUE #( %tky = ls_order-%tky
                      %element-SoldToParty = if_abap_behv=>mk-on
                      %msg = new_message_with_text(
                        severity = if_abap_behv_message=>severity-error
                        text = 'Invalid business partner format' )
      ) TO reported-salesorder.
    ENDIF.

    " Validate amount is positive
    IF ls_order-NetAmount < 0.
      APPEND VALUE #( %tky = ls_order-%tky ) TO failed-salesorder.
      APPEND VALUE #( %tky = ls_order-%tky
                      %element-NetAmount = if_abap_behv=>mk-on
                      %msg = new_message_with_text(
                        severity = if_abap_behv_message=>severity-error
                        text = 'Net amount cannot be negative' )
      ) TO reported-salesorder.
    ENDIF.

    " Validate currency exists
    SELECT SINGLE @abap_true FROM I_Currency
      WHERE Currency = @ls_order-TransactionCurrency
      INTO @DATA(lv_currency_exists).

    IF lv_currency_exists = abap_false.
      APPEND VALUE #( %tky = ls_order-%tky ) TO failed-salesorder.
      APPEND VALUE #( %tky = ls_order-%tky
                      %element-TransactionCurrency = if_abap_behv=>mk-on
                      %msg = new_message_with_text(
                        severity = if_abap_behv_message=>severity-error
                        text = |Currency { ls_order-TransactionCurrency } is invalid| )
      ) TO reported-salesorder.
    ENDIF.
  ENDLOOP.
ENDMETHOD.
```

---

## 11. Coding Conventions & Standards

### 11.1 Naming Conventions

#### CDS Artifacts

| Artifact | Pattern | Example |
|----------|---------|---------|
| Interface View | `I_<DomainObject>` | `I_SalesOrder` |
| BO Interface View | `R_<DomainObject>TP` | `R_SalesOrderTP` |
| Projection View | `C_<DomainObject>TP` | `C_SalesOrderTP` |
| Abstract Entity | `A_<DomainObject>` | `A_SalesOrderInput` |
| Metadata Extension | `C_<DomainObject>TP` | Same as projection |
| Access Control | `<ViewName>` | `R_SalesOrderTP` |
| Service Definition | `<Service>_<Version>` | `ZSALESORDER_V1` |

#### ABAP Objects

| Artifact | Pattern | Example |
|----------|---------|---------|
| Class | `zcl_<domain>_<purpose>` | `zcl_sales_order_handler` |
| Interface | `zif_<domain>_<purpose>` | `zif_sales_order_reader` |
| Exception Class | `zcx_<domain>_<error>` | `zcx_sales_invalid_partner` |
| Behavior Pool | `zbp_<cds_view_name>` | `zbp_r_salesordertp` |
| Test Class | `ltc_<tested_class>` | `ltc_sales_order_handler` |

#### Variables and Parameters

```abap
" Local variables: lv_ (value), ls_ (structure), lt_ (table), lo_ (object)
DATA: lv_counter TYPE i,
      ls_order   TYPE zsalesorder,
      lt_items   TYPE TABLE OF zsalesorder_item,
      lo_handler TYPE REF TO zcl_order_handler.

" Global variables (avoid when possible): gv_, gs_, gt_, go_
" Class attributes: mv_, ms_, mt_, mo_ (instance) or cv_, cs_, ct_, co_ (static)

" Parameters: iv_ (importing), ev_ (exporting), cv_ (changing), rv_ (returning)
METHODS process
  IMPORTING iv_order_id TYPE vbeln
  EXPORTING ev_status   TYPE char1
  CHANGING  cv_amount   TYPE netwr
  RETURNING VALUE(rv_success) TYPE abap_bool.

" Constants: gc_ (global), lc_ (local), mc_ (class attribute)
CONSTANTS: gc_status_active TYPE char1 VALUE 'A',
           gc_status_closed TYPE char1 VALUE 'C'.
```

### 11.2 Code Style Guidelines

```abap
" Follow Clean ABAP principles

" ✅ Use meaningful names
DATA(lo_sales_order_validator) = NEW zcl_sales_order_validator( ).

" ❌ Avoid abbreviations
DATA(lo_so_val) = NEW zcl_so_val( ).  " Bad

" ✅ One statement per line
DATA lv_name TYPE string.
DATA lv_age TYPE i.

" ❌ Avoid chained declarations
DATA: lv_name TYPE string, lv_age TYPE i.  " Harder to read

" ✅ Use inline declarations where appropriate
LOOP AT lt_orders INTO DATA(ls_order).
  DATA(lv_total) = ls_order-net_amount + ls_order-tax_amount.
ENDLOOP.

" ✅ Prefer functional style
DATA(lt_valid_orders) = FILTER #( lt_orders WHERE status = 'A' ).

" ✅ Use NEW instead of CREATE OBJECT
DATA(lo_instance) = NEW zcl_my_class( ).

" ❌ Avoid CREATE OBJECT
CREATE OBJECT lo_instance TYPE zcl_my_class.  " Legacy style
```

### 11.3 Documentation Standards

```abap
"! <p class="shorttext synchronized">Sales Order Processor</p>
"! This class handles sales order processing including validation,
"! calculation, and persistence.
"!
"! @raising zcx_sales_order | Raised when processing fails
CLASS zcl_sales_order_processor DEFINITION
  PUBLIC FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    "! <p class="shorttext synchronized">Process sales order</p>
    "! Validates and processes a sales order for the given ID.
    "!
    "! @parameter iv_order_id | Sales order document number
    "! @parameter rv_success  | True if processing succeeded
    "! @raising zcx_sales_order | Raised for invalid orders
    METHODS process
      IMPORTING iv_order_id TYPE vbeln
      RETURNING VALUE(rv_success) TYPE abap_bool
      RAISING zcx_sales_order.
ENDCLASS.
```

---

## 12. AI Assistant Collaboration

### 12.1 Effective Prompting for ABAP Context

When requesting AI assistance for ABAP development, provide:

#### Essential Context

```markdown
## Required Information for ABAP Requests

1. **SAP Version**: S/4HANA Cloud 2402 / On-Premise 2023 / ECC 6.0
2. **Development Type**: RAP / Classic ABAP / Enhancement
3. **Object Type**: Class / CDS View / Behavior / Function Module
4. **Related Objects**: Existing classes, CDS views, tables involved
5. **Business Context**: What business process does this support?
6. **Constraints**: Performance requirements, authorization needs
```

#### Example Prompt Structure

```markdown
## Good Prompt Example

**Context**: S/4HANA Cloud, RAP development
**Task**: Create validation for sales order creation
**Business Rule**: Orders over 10,000 EUR require manager approval
**Related Objects**:
- BO: R_SalesOrderTP
- Table: ZSALESORDER
- Behavior: Already has ValidateSoldToParty

**Requirements**:
- Add validation `ValidateApprovalRequired`
- Set approval flag when amount > 10,000
- Return error if approval flag not set for high-value orders
```

### 12.2 AI-Generated Code Review Checklist

Before accepting AI-generated ABAP code, verify:

```markdown
## Code Review Checklist for AI-Generated ABAP

### Cloud Compliance
- [ ] Uses only released APIs (check C1 contract)
- [ ] No direct table access (uses CDS views)
- [ ] No unreleased function modules
- [ ] Compatible with ABAP Cloud restrictions

### RAP Compliance
- [ ] Correct %tky / %key usage
- [ ] Proper CORRESPONDING # syntax
- [ ] ETag fields updated correctly
- [ ] Draft handling implemented if needed
- [ ] Side effects declared for UI refresh

### Best Practices
- [ ] Follows naming conventions
- [ ] Uses inline declarations appropriately
- [ ] No SELECT in loops
- [ ] Proper exception handling
- [ ] Methods are focused and testable

### Security
- [ ] Authorization checks implemented
- [ ] Input validation present
- [ ] No hard-coded credentials
- [ ] Sensitive data properly handled

### Testing
- [ ] Unit tests provided or updated
- [ ] Test doubles used for dependencies
- [ ] Edge cases covered
```

### 12.3 Common AI Mistakes in ABAP

| Mistake | Example | Correction |
|---------|---------|------------|
| Wrong CDS syntax | `as select from @table` | Remove @ before table |
| Missing strict mode | `managed implementation...` | Add `strict ( 2 );` |
| Legacy syntax | `CREATE OBJECT lo_ref` | Use `NEW #( )` |
| Direct table access | `SELECT FROM vbak` | Use `I_SalesOrder` |
| Missing CORRESPONDING | `MODIFY ENTITIES ... WITH keys` | `WITH CORRESPONDING #( keys )` |
| Wrong %tky usage | `%key-SalesOrder` | Use `%tky` composite |
| Unreleased API | `cl_gui_frontend_services` | Use cloud-ready alternative |
| Missing authorization | No `authorization master` | Add to behavior definition |

### 12.4 Iterative Development with AI

```
┌─────────────────────────────────────────────────────────────────┐
│           AI-ASSISTED DEVELOPMENT WORKFLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SPECIFY requirements clearly                                │
│     └── Include context, constraints, related objects           │
│                                                                 │
│  2. GENERATE initial code with AI                               │
│     └── Request explanation of key decisions                    │
│                                                                 │
│  3. REVIEW against checklist                                    │
│     └── Check cloud compliance, RAP patterns, security          │
│                                                                 │
│  4. REFINE with specific feedback                               │
│     └── "Change X to use released API Y"                        │
│                                                                 │
│  5. TEST with unit tests                                        │
│     └── Request AI to generate test cases                       │
│                                                                 │
│  6. INTEGRATE into codebase                                     │
│     └── Run ATC checks, verify syntax                           │
│                                                                 │
│  7. DOCUMENT decisions and rationale                            │
│     └── AI can help generate documentation                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 12.5 Prompting Templates

#### For New RAP Development

```markdown
Create a RAP business object for [DOMAIN]:

**Business Context**: [Describe the business process]
**Entities**: [List entities with key fields]
**Operations**: [CRUD, actions, determinations, validations]
**Draft**: [Yes/No and rationale]
**Authorization**: [Required auth objects]

Please provide:
1. CDS data model (I_, R_, C_ views)
2. Behavior definition with strict mode 2
3. Behavior implementation skeleton
4. Service definition
```

#### For Bug Analysis

```markdown
Analyze this ABAP issue:

**Symptom**: [What's happening]
**Expected**: [What should happen]
**Code Location**: [Class/method or CDS view]
**Error Message**: [Exact message or dump]
**Reproduction Steps**: [How to reproduce]

Please:
1. Identify potential root causes
2. Suggest debugging approach
3. Propose fix with explanation
```

#### For Code Review

```markdown
Review this ABAP code for:

**Context**: [S/4HANA Cloud RAP / Classic / etc.]
**Purpose**: [What the code does]

```abap
[CODE HERE]
```

Check for:
- Cloud compliance issues
- Performance problems
- Security concerns
- RAP best practice violations
- Testing gaps
```

---

## Appendix A: Quick Reference

### Essential Transactions/Apps (Cloud)

| Purpose | App/Transaction |
|---------|-----------------|
| Development | ABAP Development Tools (ADT) |
| ATC Checks | Custom Code Migration |
| Transport | Manage Software Components |
| Monitoring | Technical Monitoring Cockpit |
| Logs | Application Logs (SLG1 equivalent) |

### Essential CDS Annotations

```cds
" Data Model
@AbapCatalog.viewEnhancementCategory: [#NONE]
@AccessControl.authorizationCheck: #CHECK
@ObjectModel.usageType: { serviceQuality: #A, sizeCategory: #L, dataClass: #TRANSACTIONAL }

" Semantics
@Semantics.amount.currencyCode: 'CurrencyField'
@Semantics.quantity.unitOfMeasure: 'UnitField'
@Semantics.user.createdBy: true
@Semantics.systemDateTime.createdAt: true

" UI
@UI.lineItem: [{ position: 10 }]
@UI.identification: [{ position: 10 }]
@UI.selectionField: [{ position: 10 }]
@UI.facet: [{ type: #IDENTIFICATION_REFERENCE }]
@Consumption.valueHelpDefinition: [{ entity: { name: 'ValueHelpView' }}]
```

### Behavior Definition Keywords

```cds
managed | unmanaged              " Implementation type
strict ( 2 )                     " Strict mode level
with draft                       " Enable draft handling
persistent table                 " Database table
draft table                      " Draft table
etag master                      " Concurrency control
lock master | dependent          " Lock handling
authorization master | dependent " Authorization scope
field ( readonly | mandatory )   " Field properties
determination | validation       " Business logic hooks
action | function               " Custom operations
side effects                    " UI refresh triggers
mapping for                     " Field mapping
```

---

## Appendix B: Migration Cheat Sheet

### From Classic to RAP

| Classic Pattern | RAP Equivalent |
|-----------------|----------------|
| `AUTHORITY-CHECK` in FM | `authorization master` + handler |
| `MESSAGE` statement | `%msg` in reported structure |
| `COMMIT WORK` | Implicit in RAP save sequence |
| `CALL FUNCTION ... UPDATE` | `MODIFY ENTITIES ... UPDATE` |
| Selection screen | Fiori filter bar + `@UI.selectionField` |
| ALV Grid | List Report Fiori Elements |
| Dynpro screen | Object Page Fiori Elements |
| PAI validation | RAP `validation on save` |
| PBO initialization | RAP `determination on modify { create; }` |

---

*Last Updated: 2025*
*Maintained by: AI-Assisted Development Team*
