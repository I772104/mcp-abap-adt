# Example Analysis Output

This shows what the issue-analyzer agent would produce for the test issue.

---

# GitHub Issue Analysis Report

## Issue Summary
**Title:** Add support for retrieving method signatures
**Type:** Feature Request
**Labels:** enhancement, feature

## Clarity Assessment
**Overall Rating:** Needs Clarification (65%)

### Problem Statement
✅ **Clear** - Wants to retrieve ABAP method signatures including parameters, return types, and exceptions.

### Context & Scope
⚠️ **Partially Clear** - Use case is described, but some details missing:
- Should this work for all methods in a class or specific methods?
- What about inherited methods from parent classes?
- Should this include private/protected methods?

### Acceptance Criteria
⚠️ **Implicit** - Clear what data is needed, but format not specified

---

## Clarifying Questions

### Technical Details
1. **Output Format**: Should the signature be returned as structured JSON, formatted text, or ABAP syntax?
2. **Method Selection**: Do you want signatures for:
   - A specific method by name?
   - All methods in a class?
   - Only public methods, or include private/protected?
3. **Inheritance**: Should inherited methods from parent classes be included?
4. **Interface Methods**: Should methods from implemented interfaces be included?

### Scope & Boundaries
1. **Method Types**: Should this include:
   - Instance methods?
   - Static methods?
   - Constructor methods?
   - Event handler methods?
2. **Documentation**: Should ABAP Doc comments be included in the signature?
3. **Depth**: For parameters with structured types, should we show:
   - Just the type name (e.g., `TY_STRUCTURE`)?
   - The full structure definition?

### Expected Behavior
1. **Tool Design**: Should this be:
   - A new tool `GetMethodSignature` with class and method parameters?
   - An enhancement to `GetClass` with a parameter like `include_signatures: true`?
   - A new tool `GetMethodSignatures` that returns all method signatures?
2. **Parameter Details**: For each parameter, what information is needed:
   - Name, type, passing mode (importing/exporting/changing)?
   - Optional vs required?
   - Default values?

---

## Preliminary Feasibility Analysis
(Full analysis pending clarifications)

### Complexity Assessment
**Overall Complexity:** Medium

**Justification:**
The ABAP ADT API provides class metadata including method signatures through
the `/sap/bc/adt/oo/classes/{className}` endpoint. The XML response includes
method definitions with parameters, but parsing and formatting will require work.

### Affected Components
- `src/handlers/handleGetClass.ts` - Could extend this, OR
- `src/handlers/handleGetMethodSignature.ts` - New handler
- `src/lib/abapParser.ts` - May need XML parsing utilities
- `docs/` - New documentation
- Tests

### ABAP ADT API Considerations
- **Required Endpoint:** `/sap/bc/adt/oo/classes/{className}`
- **Data Available:** Method definitions are in the XML response
- **Format:** XML parsing required to extract method metadata
- **Limitation:** May need separate call for ABAP Doc comments

### Potential Approaches

**Option A: Extend GetClass**
Add optional parameter `include_method_signatures: boolean`

**Option B: New GetMethodSignature Tool**
Create dedicated tool with parameters:
- `class_name`: Required
- `method_name`: Optional (if omitted, return all)
- `include_inherited`: Boolean
- `include_private`: Boolean

**Option C: New GetClassMetadata Tool**
Comprehensive metadata tool that includes:
- Method signatures
- Attributes
- Types
- Interfaces implemented

**Recommendation:** Wait for clarifications before selecting approach

---

## Next Steps

1. **Post Clarifying Questions**: Add the questions above to the issue
2. **Wait for Response**: Let issue author provide missing details
3. **Re-Analyze**: Run analysis again once requirements are clearer
4. **Choose Approach**: Select best implementation option based on clarified scope
5. **Proceed with Implementation**: Follow generated implementation plan

## Additional Notes

**Why Clarification Needed:**
- Multiple valid interpretations exist
- Implementation complexity varies significantly based on scope
- Tool design depends on intended use case
- Output format affects usability

**Estimated Effort (Post-Clarification):**
- **Simple Scope** (single method, basic format): 3-4 hours
- **Medium Scope** (all methods, structured JSON): 6-8 hours
- **Complex Scope** (with inheritance, interfaces, full metadata): 12-16 hours

**Confidence Level:** Medium (pending clarifications)

---

This demonstrates the agent's ability to:
✓ Identify what's clear and unclear
✓ Generate specific, actionable questions
✓ Provide preliminary technical assessment
✓ Outline multiple solution approaches
✓ Give realistic effort estimates with ranges
