# CDS View Performance Best Practices

> **Purpose**: Performance guidelines and anti-patterns for CDS view development  
> **Audience**: CDS creator agents, performance analysts, developers  
> **Scope**: Performance optimization, anti-patterns, testing strategies  
> **Last Updated**: 2026-02-18

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Golden Rules](#2-golden-rules)
3. [Performance Annotations](#3-performance-annotations)
4. [Best Practices](#4-best-practices)
5. [Anti-Patterns](#5-anti-patterns)
6. [Join Optimization](#6-join-optimization)
7. [Testing & Analysis](#7-testing--analysis)
8. [Quick Reference](#8-quick-reference)

---

## 1. Core Principles

### 1.1 Fundamental Understanding

**CDS Views are SQL Views**:
- Every CDS view is represented as an SQL view on SAP HANA
- Complex models can contain hundreds of views with multiple joins
- Performance depends on SAP HANA optimizer finding optimal execution plan

**Key Performance Factors**:
1. **Data Volume Reduction**: Must reduce data early in query processing
2. **Optimizer Efficiency**: HANA must find best algorithm for specific query
3. **Supported Transformations**: HANA must support required optimizations

**Performance Challenges**:
- Number of possible plan variants raises with **5th power** of table count
- For **4-5+ underlying tables**, optimizer might fail to find optimal plan
- Very large tables (>500K rows) require careful optimization

---

### 1.2 The Principle of ONE

**VDM Promise**: Model once – use everywhere
- Same model for transactional apps, analytics, APIs, extensions

**Reality Check**:
- Legacy transactional data models often cannot deliver acceptable performance for analytical queries on big data
- May require:
  - New de-normalized data models
  - Persisted calculated fields
  - Central fact tables (e.g., ACDOCA for FIN, MATDOC for MM)
  - Separate redundant storage for analytical queries

---

## 2. Golden Rules

### 2.1 SAP Product Standard

**PERF-13**: Access times for frequent accesses to persistence shall be **independent of data volume**

**Critical Requirements**:
- Response time must not degrade as data grows
- Applies to all transactional processing
- Must be verified with realistic data volumes

---

### 2.2 Essential Rules

✅ **Start Small, Keep Simple**:
```
- Begin with small projects not affecting critical transactions
- Prefer "tailor-made" views for specific purposes
- Avoid "all in one" views
- Expose only required fields
```

✅ **Use as Few Tables as Possible**:
```
- Keep CDS views simple for faster execution
- Smaller memory footprint at runtime
- Simpler preparation
```

✅ **Reduce Stack Depth**:
```
- Minimize amount of views in underlying model
- Build on smallest possible view with sufficient functionality
- No need for special view per join or calculation
- Reuse access to same tables
```

❌ **Don't Rebuild ABAP Logic in CDS**:
```
- CDS is declarative, not imperative
- Don't try to replicate ABAP control flow
```

---

### 2.3 Complexity Limits

❌ **Never create CDS views with more than 100 underlying tables**

✅ **Follow stricter recommendations**:
- Service Quality A: Maximum complexity for high-volume transactions
- Service Quality B: Moderate complexity for transactional apps
- Service Quality C: Higher complexity for analytical queries

✅ **Track complexity in ADT**:
- Use 'Dependency Analyzer' tool
- Monitor number of underlying tables
- Check view stack depth

---

## 3. Performance Annotations

### 3.1 Required Annotations

**Mandatory for All CDS Views**:
```cds
@ObjectModel.usageType: {
  serviceQuality: #A,        // A, B, C, D, X, P
  sizeCategory: #L,          // S, M, L, XL, XXL
  dataClass: #TRANSACTIONAL  // MASTER, TRANSACTIONAL, ORGANIZATIONAL, CUSTOMIZING
}
```

---

### 3.2 Service Quality Levels

| Quality | Description | Use Case | Max Tables |
|---------|-------------|----------|------------|
| **A** | Excellent | High-volume transactions, frequent access | ~10 |
| **B** | Good | Transactional Fiori apps, moderate volume | ~20 |
| **C** | Acceptable | Analytical queries, lower volume | ~50 |
| **D** | Poor | Avoid in production | - |
| **X** | Experimental | Development only | - |
| **P** | Deprecated | Legacy, to be replaced | - |

---

### 3.3 Size Categories

| Category | Description | Typical Row Count |
|----------|-------------|-------------------|
| **S** | Small | < 1,000 |
| **M** | Medium | 1,000 - 100,000 |
| **L** | Large | 100,000 - 10,000,000 |
| **XL** | Extra Large | 10,000,000 - 100,000,000 |
| **XXL** | Huge | > 100,000,000 |

---

### 3.4 Data Classes

| Class | Description | Examples |
|-------|-------------|----------|
| **MASTER** | Master data | Customer, Material, Vendor |
| **TRANSACTIONAL** | Transaction data | Sales Orders, Invoices |
| **ORGANIZATIONAL** | Org structures | Company Code, Plant |
| **CUSTOMIZING** | Configuration | Settings, Parameters |

---

### 3.5 ATC Checks

**BC_CDS_PF1**: Reports missing or wrong performance annotations
- Checks @ObjectModel.usageType annotations
- Validates consistency with CDS view properties

**PFCDS_QLTY - 3**: Reports Service Quality C/D/X/P/- in top-100 transactions
- Only Quality A or B allowed in high-volume transactions

**PFCDS_QLTY - 4**: Reports Service Quality C/D/X/P/- in transactional Fiori apps
- Only Quality A or B allowed in transactional apps

---

## 4. Best Practices

### 4.1 View Structure

✅ **Build Result Set First, Then Join Auxiliary Data**:
```cds
// 1. Read data 'skeleton' from fact table
// 2. Join entities that influence record count (INNER JOINS)
// 3. On highest level, join/follow associations for additional fields
// 4. Execute expensive operations after data reduction
```

**Example**:
```cds
define view I_SalesOrderCore as select from vbak
{
  key vbeln as SalesOrder,
  erdat as CreationDate,
  netwr as NetAmount
}
where auart = 'OR';  // Filter early

define view I_SalesOrder as select from I_SalesOrderCore
  association [0..1] to I_Customer as _Customer
    on $projection.SoldToParty = _Customer.Customer
{
  key SalesOrder,
  CreationDate,
  NetAmount,
  _Customer.CustomerName  // Join auxiliary data last
}
```

---

### 4.2 Field Exposure

✅ **Expose Only Required Fields**:
```cds
// ❌ Bad: Exposing all fields
define view I_Material as select from mara
{
  *  // Exposes all fields, causes unnecessary joins
}

// ✅ Good: Expose only needed fields
define view I_Material as select from mara
{
  key matnr as Material,
  mtart as MaterialType,
  matkl as MaterialGroup
  // Only fields actually needed
}
```

---

### 4.3 Calculated Fields

❌ **Avoid Calculated Fields in**:
- Key fields
- Filter conditions (WHERE clauses)
- Join conditions (ON clauses)
- GROUP BY clauses
- ORDER BY clauses

✅ **Use Calculated Fields Only**:
- As projected fields
- After data reduction
- On well-filtered data sets

**Example**:
```cds
// ❌ Bad: Calculated field in WHERE
define view I_BadExample as select from table1
{
  key field1,
  case
    when field2 = 'X' then 'Active'
    else 'Inactive'
  end as Status
}
where Status = 'Active';  // ❌ Filter on calculated field

// ✅ Good: Filter on base field
define view I_GoodExample as select from table1
{
  key field1,
  case
    when field2 = 'X' then 'Active'
    else 'Inactive'
  end as Status
}
where field2 = 'X';  // ✅ Filter on base field
```

---

### 4.4 Associations

✅ **Use Associations for Optional Fields**:
```cds
define view I_SalesOrder as select from vbak
  association [0..1] to I_Customer as _Customer
    on $projection.kunnr = _Customer.Customer
  association [0..1] to I_Material as _Material
    on $projection.matnr = _Material.Material
{
  key vbeln as SalesOrder,
  kunnr as SoldToParty,
  matnr as Material,
  // Associations only executed if fields requested
  _Customer,
  _Material
}
```

✅ **Always Specify Cardinality**:
- Prefer `[0..1]` over `[0..*]`
- `[0..*]` is default but less optimal
- Precise cardinality enables better optimization

✅ **Put All Shared Fields in ON-Clause**:
```cds
// ❌ Bad: Only key fields
association [0..1] to I_Customer as _Customer
  on $projection.Customer = _Customer.Customer

// ✅ Good: All shared fields
association [0..1] to I_Customer as _Customer
  on $projection.Customer = _Customer.Customer
  and $projection.SalesOrg = _Customer.SalesOrg
```

---

### 4.5 Testing Requirements

✅ **Test with Realistic Data Volumes**:
- Create production-like test data
- Test from takt 1 (early in development)
- Execute realistic queries (e.g., from Fiori apps)
- Measure response times (ST05, SUPA)

✅ **Monitor Automated Tests**:
- Use PFCDS reporting
- Check KPI thresholds
- Analyze with HANA PlanViz

❌ **Never Deploy Without Performance Testing**:
- Testing with small data is insufficient
- Performance issues only appear with realistic volumes
- Response time must be independent of data volume

---

## 5. Anti-Patterns

### 5.1 NOT NULL Preserving Left Outer Join (NNPLOJ)

**Problem**: Column calculation without filter condition occurs to preserve nulls

**Example**:
```cds
// View A with calculated field
define view A as select from tbl1
{
  key col1,
  key col2,
  case
    when col3 = 'x' then 'y'
    else 'z'  // ❌ ELSE clause prevents null preservation
  end as col3_calc
}

// View B with LEFT OUTER JOIN
define view B as select from tbl2
  association [0..1] to A on tbl2.col1 = A.col1
                         and tbl2.col2 = A.col2
{
  key tbl2.col1,
  key tbl2.col2,
  A.col3_calc,  // ❌ Forces join execution
  tbl2.col4
}
```

**Solution**:
```cds
// Remove ELSE clause or use NULL
define view A as select from tbl1
{
  key col1,
  key col2,
  case
    when col3 = 'x' then 'y'
    // ✅ No ELSE - allows null preservation
  end as col3_calc
}
```

---

### 5.2 Union ALL in Left Outer Join (UALOJ)

**Problem**: No data reduction in left outer join with multiple unions

**Example**:
```cds
// View A with UNION
define view A as select from tbl1
{
  col1, col2, col3
}
union all select from tbl2  // ❌ UNION in joined view
{
  col1, col2, col3
}

// View B joins to union
define view B as select from tbl3
  association [0..1] to A on tbl3.col2 = A.col2  // ❌ Join to UNION
{
  tbl3.col1,
  A.col3
}
```

**Solution**:
- Avoid UNION in views used in LEFT OUTER JOINs
- Apply filters before UNION
- Consider restructuring the model

---

### 5.3 Cyclic Joins

**Problem**: HANA column engine doesn't natively support cyclic outer joins

**Example**:
```cds
define view A as select from tbl1
  left outer join tbl2 on tbl2.col2 = tbl1.col2  // ❌
  inner join tbl3 on tbl3.col3 = tbl1.col3       // ❌
                 and tbl3.col4 = tbl2.col4       // ❌ Creates cycle
{
  tbl1.col1
}
```

**Solutions**:
```cds
// Option 1: Use query hint
@Consumption.dbHints: ['NO_CYCLIC_JOIN']

// Option 2: Use HEX engine
@Consumption.dbHints: ['USE_HEX_PLAN']

// Option 3: Restructure joins to avoid cycle
```

---

### 5.4 Non-Equi Left Outer Joins (NELOJ)

**Problem**: Join engine doesn't natively support non-equi conditions in LEFT OUTER JOINs

**Example**:
```cds
define view HelloWorld as select from Foo as a
  left outer join Bar as b
    on a.col2 = b.col2
    and a.col3 > b.col3  // ❌ Non-equi condition
{
  *
}
```

**Solution**:
- Use HEX engine: `@Consumption.dbHints: ['USE_HEX_PLAN']`
- Or restructure to use only equi-joins
- Or materialize intermediate results

---

### 5.5 Disjoint Left Outer Join (DLOJ)

**Problem**: OR conditions in LEFT OUTER JOIN

**Example**:
```cds
define view C as select from A
  left outer join B on A.col2 = B.col2
                    or A.col3 > B.col3  // ❌ OR condition
{
  *
}
```

**Solution**:
- Use HEX engine
- Split into separate views and UNION
- Restructure logic

---

### 5.6 Missing Join Conditions

**Problem**: Filter conditions cannot be pushed down

**Example**:
```cds
define view A as select from tbl1 as _t1
  association to tbl2 as _t2 on $projection.col1 = _t2.col1
  // ❌ Missing: and $projection.col2 = _t2.col2
{
  _t1.col1,
  _t1.col2
}
```

**Solution**:
```cds
// ✅ Include all shared fields in join condition
association to tbl2 as _t2 on $projection.col1 = _t2.col1
                          and $projection.col2 = _t2.col2
```

---

### 5.7 Wrong Association Cardinality

**Problem**: Using `[0..*]` when `[0..1]` is correct

**Example**:
```cds
// ❌ Bad: Wrong cardinality
association [0..*] to I_Customer as _Customer
  on $projection.Customer = _Customer.Customer

// ✅ Good: Correct cardinality
association [0..1] to I_Customer as _Customer
  on $projection.Customer = _Customer.Customer
```

**Impact**:
- `[0..*]` forces join execution even if fields not requested
- `[0..1]` allows join optimization

---

## 6. Join Optimization

### 6.1 Join Types

**INNER JOIN**:
- ✅ Always executed, even if fields not requested
- ✅ Allows more optimizations
- ✅ Better for filters and execution order
- ❌ Don't use only for data correctness

**LEFT OUTER TO ONE JOIN**:
- ✅ Can be omitted if no fields requested
- ✅ Must execute if fields used in calculations or joins
- ✅ Specify cardinality precisely

**LEFT OUTER TO MANY JOIN**:
- ❌ Default version of OUTER JOIN
- ❌ Must be executed due to cardinality change
- ❌ Avoid if possible

---

### 6.2 Join Best Practices

✅ **Specify Cardinality**:
```cds
// ✅ Explicit cardinality
association [0..1] to I_Customer
association [1..1] to I_Material
association [0..*] to I_Items
```

✅ **Put Shared Fields in ON-Clause**:
```cds
// ✅ All shared fields
on $projection.Customer = _Customer.Customer
and $projection.SalesOrg = _Customer.SalesOrg
and $projection.DistChannel = _Customer.DistChannel
```

❌ **Avoid Constants in ON-Clause**:
```cds
// ❌ Bad
on $projection.Type = 'FIXED'

// ✅ Good
where Type = 'FIXED'
```

❌ **Avoid Cyclic Outer Joins**:
- Use hints to break cycle
- Restructure model
- Use HEX engine

---

## 7. Testing & Analysis

### 7.1 Testing Strategy

✅ **Test Early and Often**:
1. Test performance from takt 1
2. Create realistic test data for all underlying tables
3. Execute realistic queries (from Fiori apps)
4. Measure response times (ST05, SUPA)
5. Monitor automated test results

✅ **Realistic Test Data**:
- Production-like volumes
- Representative data distribution
- All underlying tables populated
- Realistic filter selectivity

---

### 7.2 Analysis Tools

**ST05 - SQL Trace**:
- Trace SQL statements
- Analyze execution times
- Identify slow queries
- Export to PlanViz

**SUPA - SQL Performance Analysis**:
- Automated performance analysis
- Identifies expensive statements
- Provides optimization recommendations

**PlanViz - Plan Visualizer**:
- Visualize execution plans
- Analyze filter push-down
- Identify materialization points
- Compare plan alternatives

**CDS Model Analyzer**:
- Detect anti-patterns
- Analyze view complexity
- Check performance annotations
- Validate best practices

**Dependency Analyzer (ADT)**:
- Track CDS view complexity
- Count underlying tables
- Analyze view stack depth

---

### 7.3 Performance Thresholds

**Response Time Targets**:
| Use Case | Target | Maximum |
|----------|--------|---------|
| High-volume transaction | < 100ms | < 500ms |
| Transactional Fiori app | < 500ms | < 2s |
| Analytical query | < 2s | < 10s |

**Memory Consumption**:
- Single query: < 5 GB
- Avoid queries > 40 GB (quota management)

**Test Coverage**:
- All CDS views with Service Quality A/B
- All views in top-100 transactions
- All views in transactional Fiori apps

---

## 8. Quick Reference

### 8.1 Performance Checklist

**Before Creating CDS View**:
- [ ] Service Quality annotation defined
- [ ] Size Category annotation defined
- [ ] Data Class annotation defined
- [ ] Complexity < 100 tables
- [ ] Only required fields exposed
- [ ] Associations used for optional fields
- [ ] No calculated fields in keys/filters/joins

**During Development**:
- [ ] Test with realistic data volumes
- [ ] Measure response times
- [ ] Check for anti-patterns
- [ ] Validate with ATC checks
- [ ] Analyze with PlanViz

**Before Production**:
- [ ] All tests passing
- [ ] Performance thresholds met
- [ ] No anti-patterns detected
- [ ] Documentation complete

---

### 8.2 Common Patterns

**Good Patterns**:
```cds
// ✅ Filter early
where field = 'value'

// ✅ Use associations
association [0..1] to View

// ✅ Specify cardinality
[0..1], [1..1], [0..*]

// ✅ Expose only needed fields
{ key field1, field2 }

// ✅ Join auxiliary data last
```

**Anti-Patterns to Avoid**:
```cds
// ❌ Calculated field in WHERE
where case ... end = 'value'

// ❌ UNION in LEFT OUTER JOIN
union all ... left outer join

// ❌ Cyclic joins
// ❌ Non-equi LEFT OUTER JOIN
// ❌ Missing join conditions
// ❌ Wrong cardinality [0..*]
```

---

### 8.3 Performance Annotations Template

```cds
@AbapCatalog.viewEnhancementCategory: [#NONE]
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Your View Label'
@Metadata.ignorePropagatedAnnotations: true
@ObjectModel.usageType:{
  serviceQuality: #A,        // A, B, C based on use case
  sizeCategory: #L,          // S, M, L, XL, XXL based on data volume
  dataClass: #TRANSACTIONAL  // MASTER, TRANSACTIONAL, ORGANIZATIONAL, CUSTOMIZING
}
define view entity I_YourView
  as select from your_table
{
  key field1,
  field2,
  field3
}
```

---

### 8.4 Key Metrics

**Complexity Limits**:
- Service Quality A: ~10 tables
- Service Quality B: ~20 tables
- Service Quality C: ~50 tables
- Maximum: 100 tables

**Response Times**:
- High-volume: < 100ms
- Transactional: < 500ms
- Analytical: < 2s

**Memory**:
- Target: < 5 GB per query
- Maximum: < 40 GB (quota limit)

---

## 9. Additional Resources

### 9.1 SAP Documentation

- **CDS View Performance Best Practices** (SAP Blog Series)
- **HANA SQL Query Tuning Tips**
- **Golden Rules for SQL Performance**
- **VDM CDS Naming Guidelines**

### 9.2 Tools

- **ST05**: SQL Trace
- **SUPA**: SQL Performance Analysis
- **PlanViz**: Plan Visualizer
- **CDS Model Analyzer**: Anti-pattern detection
- **ADT Dependency Analyzer**: Complexity tracking

### 9.3 ATC Checks

- **BC_CDS_PF1**: Performance annotations
- **PFCDS_QLTY**: Service quality validation
- **BC_SCI_TAB**: Secondary index proposals

---

## 10. For AI Agents

### 10.1 Agent Guidelines

**When Creating CDS Views**:
1. Always add performance annotations
2. Start with simple structure
3. Expose only required fields
4. Use associations for optional data
5. Avoid anti-patterns
6. Test with realistic data
7. Measure and validate performance

**Validation Workflow**:
1. Check performance annotations
2. Validate complexity (< 100 tables)
3. Scan for anti-patterns
4. Verify join conditions
5. Check calculated field usage
6. Validate cardinality specifications

**Performance Testing**:
1. Create test data (realistic volumes)
2. Execute representative queries
3. Measure response times
4. Analyze with PlanViz
5. Check memory consumption
6. Validate against thresholds

---

*End of CDS View Performance Best Practices*

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-18  
**Maintained By**: Development Team  
**For**: CDS Creator Agents, Performance Analysts, Developers

**Related Documents**:
- `ABAP_Standards.md` - Complete ABAP development standards
- `RAP_Tools.md` - RAP development guidelines
- `Resources.md` - MCP resource catalog