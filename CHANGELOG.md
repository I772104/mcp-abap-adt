# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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