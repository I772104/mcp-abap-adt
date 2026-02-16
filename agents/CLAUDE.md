# Claude Desktop Guide for MCP ABAP ADT Server

> **📚 UNIVERSAL GUIDE**: All universal guidance is in [AGENTS.md](AGENTS.md)
> 
> This file contains **only Claude Desktop-specific quick references**. For complete documentation:
> - **Universal patterns**: See [AGENTS.md](AGENTS.md)
> - **Detailed workflows**: Invoke MCP workflow prompts
> - **Agent-specific optimizations**: Access `agent-guide://claude` resource

---

## Quick Access

### Get Claude-Specific Guide
```
access_mcp_resource:
  server_name: mcp-abap-adt-1
  uri: agent-guide://claude
```

### Get Universal Guide
See [AGENTS.md](AGENTS.md) in repository root for:
- Complete resource and tool catalog
- Token-efficient workflow patterns
- Best practices for ABAP Cloud development
- RAP Business Object guidelines
- Common mistakes to avoid

---

## Claude Desktop-Specific Features

### Large Context Window
Claude can handle large codebases effectively:
- Load multiple resources at once
- Analyze complete RAP BO structures
- Process comprehensive documentation

### Complex Structure Understanding
Claude excels at understanding complex RAP structures:
- Use rap-bo-analysis:/// resources
- Request detailed explanations
- Analyze multi-layer architectures

### Comprehensive Test Generation
Claude is strong at generating test suites:
- Request full test coverage
- Include positive and negative scenarios
- Generate test doubles for dependencies

---

## Workflow Prompts (Use These!)

Instead of manually following workflows, **invoke MCP prompts** for step-by-step guidance:

### Available Prompts
1. **create-class-workflow** - Create and test ABAP classes
2. **package-discovery-workflow** - Token-efficient package navigation
3. **rap-bo-analysis-workflow** - Analyze RAP Business Objects
4. **refactor-class-workflow** - Safe class refactoring
5. **table-analysis-workflow** - Analyze database tables

### How to Invoke
```
User: "Create a calculator class"
→ Invoke prompt: create-class-workflow
→ Arguments: {class_name: "ZCL_CALCULATOR", description: "Calculator class"}
→ Follow the step-by-step guidance provided
```

---

## Essential Resources (PREFER OVER TOOLS!)

### Package Discovery (Token-Efficient)
```
# Lightest: Names only (~5K tokens)
abap://packages/top-level/names

# Filtered: Specific packages (~500 tokens)
abap://packages/top-level?prefix=FIN&fields=name,description

# Detailed: Single package (~2K tokens)
abap://package/FINANCIAL_BASIS
```

### RAP Business Object Analysis
```
# Complete BO structure in one call
rap-bo-analysis:///I_SalesOrder

# Claude can handle comprehensive analysis
rap-bo-analysis:///I_SalesOrder?depth=comprehensive
```

### ABAP Objects
```
# CDS View
abap://cds/I_SalesOrder

# Class
abap://class/CL_ABAP_TYPEDESCR

# Table
abap://table/MARA
```

---

## Critical Rules (NEVER Skip!)

1. **CheckSyntax First** - Always validate before CreateClass or CreateClassTests
2. **Test Before Activation** - Never use `auto_activate: true` during development
3. **Use Resources** - Prefer resources over tools (cacheable, token-efficient)
4. **Follow Workflows** - Use MCP prompts for guided workflows
5. **Comprehensive Testing** - Generate complete test suites

---

## Quick Reference

### Most Common Workflow
```
User asks to create a class:
→ Invoke prompt: create-class-workflow
→ Request comprehensive test coverage
→ Generate test doubles if needed
```

### Most Common Analysis
```
User asks to analyze a RAP BO:
→ Invoke prompt: rap-bo-analysis-workflow
→ Use comprehensive depth
→ Request detailed explanations
```

### Most Common Pattern Explanation
```
User asks to explain ABAP pattern:
→ Load relevant resources
→ Provide detailed explanation
→ Include best practices and examples
```

---

## Documentation Links

- **Universal Guide**: [AGENTS.md](AGENTS.md) - Complete documentation
- **Resources Guide**: [docs/Resources.md](docs/Resources.md) - Resource catalog
- **RAP Tools**: [docs/RAP_Tools.md](docs/RAP_Tools.md) - RAP-specific tools
- **Example Workflows**: [Example_AGENTS.md](Example_AGENTS.md) - ABAP project examples

---

*For complete universal guidance, workflows, and best practices, always refer to [AGENTS.md](AGENTS.md)*