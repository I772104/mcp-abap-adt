# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Shared Validation Utilities** in fileUtils.ts for code reuse across handlers
  - `validateLocalClassName()` - Validates Z/Y class names with ABAP rules
  - `validateLocalPackage()` - Validates local packages ($TMP, $LOCAL, $*)
  - `isLocalClassName()` - Checks if class name starts with Z or Y
  - `isSapStandardObject()` - Checks if object is SAP standard (not Z/Y)
  - `isLocalPackage()` - Checks if package is local
  - `ABAP_CLASS_NAME_MAX_LENGTH` constant (30) for consistent validation
- **GetSystemInfo tool**: Display current SAP system connection information
  - Shows system URL, client, authentication method, and connection status
  - No file access required - queries active authentication provider directly
  - Helps prevent accidental production changes by verifying connected system
- **ExportClassToFile tool**: Export ABAP class to local file in tmp folder
  - Automatic Z-prefix conversion (CL_* → ZCL_*, IF_* → ZIF_*)
  - Handles 30-character name truncation automatically
  - Creates tmp folder if it doesn't exist
- **ImportClassFromFile tool**: Import ABAP class from local file to SAP system
  - Reads class from tmp folder and creates in system
  - Automatic Z-prefix conversion for standard class names
  - Supports both active and inactive import modes
- Enhanced export-modify-import-workflow with mandatory ABAP standards compliance
- Standards-compliant workflow with 6 phases (review, export, analysis, modification, import, documentation)
- Mandatory standards review phase before any code modifications
- Standards-referenced documentation with specific section references
- **CheckSyntax file_path parameter**: Check syntax directly from files in tmp folder
  - Auto-detects class name from filename
  - Supports both relative (defaults to tmp/) and absolute paths
  - Includes file metadata in response (size, lines, modified date)
  - Priority: file_path > source_code > object_name

### Changed
- **Test Execution:** `npm test` now runs only unit tests by default (no SAP credentials required)
  - Use `npm run test:integration` for integration tests (requires `.env` credentials)
  - Use `npm run test:all` to run all tests including integration tests
  - Updated test scripts for better developer experience and CI/CD compatibility
- **Export-Modify-Import Workflow**: Major safety and quality improvements
  - Changed `auto_activate` default from `true` to `false` for safer deployment
  - Added mandatory ABAP standards review (Phase 1) before modifications
  - Added code analysis phase (Phase 3) to guide improvements
  - Enhanced modification phase (Phase 4) with standards-driven approach
  - Enhanced documentation phase (Phase 6) with comprehensive standards compliance reporting
  - Workflow now stops at import with inactive class (user controls activation)
  - Removed CheckSyntax validation step (user handles in SE24 if needed)
  - Removed automatic testing phase (user decides when to test)
  - Removed automatic activation step (manual activation via Ctrl+F3)
  - Improved time estimate: 15-30 minutes for production-ready quality
- GetObjectUsages tool for enhanced where-used analysis across all object types
- Object usages resource handlers for cacheable where-used queries
- GetCDSViewContents tool for querying CDS view data with filtering and pagination
- CDS view data querying capability with batch support
- RunPackageTests tool for package-level unit test execution
- Token-efficient package navigation with MCP resources
- Comprehensive RAP tools suite (GetCDSView, GetBehaviorDefinition, GetServiceDefinition, GetServiceBinding, GetMetadataExtension, GetAccessControl)
- SearchRapBo tool for RAP Business Object discovery
- Enhanced class management tools (CreateClass, CreateClassTests, ActivateClasses, DeleteLocalClass, CheckSyntax)
- ABAP development standards documentation (ABAP_Standards.md, CDS_View_Performance.md)
- Cline rules and workflow integration
- MCP Prompts format with agent-specific guides
- Claude Code CLI integration guide for SAP users
- npm script "updated" for convenient update workflow (npm i && build)

### Changed
- Restructured README for better organization and usability
- Simplified Enhancement Proposal to simple list format
- Migrated agent rules to universal AGENTS.md format
- Enhanced package details retrieval with comprehensive metadata
- Improved behavior definition endpoint to include source/main path
- Improved create-class-workflow validation steps

### Fixed
- Dockerfile npm install command (removed invalid -r flag)
- Resources malfunction from merge conflict
- Behavior definition endpoint path handling
- Local test class creation validation error

### Removed
- Smithery references and configuration
- GetCDSViewDependencies tool (simplified approach)

### Documentation
- Added comprehensive documentation for 13 missing handler tools
- Added CDS view data querying documentation and examples
- Updated repository URL to SAP internal GitHub

## [1.1.0] - 2025-02-19

### Added
- GetTransaction tool to retrieve ABAP transaction details

## [0.1.2] - 2025-02-18

### Added
- Jest test script available through npm test

### Changed
- Enhanced makeAdtRequest method with custom headers and query parameters support
- Improved handleGetPackage to use ADT's nodeContent API
- Improved CSRF token handling with automatic fetching and cookie management

## [0.1.1] - 2025-02-13

### Added
- GetInterface tool to retrieve ABAP interface source code

## [0.1.0] - Initial Release

### Added
- Initial release of MCP ABAP ADT server
- Basic ABAP object retrieval functionality
- Support for programs, classes, function modules, and more
- Documentation and setup instructions