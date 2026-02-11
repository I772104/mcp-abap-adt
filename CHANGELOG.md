# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New RAP (RESTful ABAP Programming) tools support:
  - `GetCDSView` tool to retrieve CDS view source code and metadata
  - `GetBehaviorDefinition` tool to retrieve RAP behavior definition source code
  - `GetServiceDefinition` tool to retrieve RAP service definition source code
  - `GetServiceBinding` tool to retrieve RAP service binding details
  - `GetMetadataExtension` tool to retrieve metadata extension (UI annotations) source code
  - `GetAccessControl` tool to retrieve access control (DCL) definition source code
  - `GetBehaviorForRapBo` tool to retrieve interface behavior definition for RAP Business Objects
  - `SearchRapBo` tool for RAP Business Object discovery by description
- New RAP BO Analysis resources for comprehensive analysis of RAP Business Objects
- Enhanced `GetTableContents` tool with comprehensive batch query support:
  - Advanced filtering with WHERE conditions
  - Pagination support with offset parameter
  - Column selection and metadata inclusion
  - Batch mode for executing multiple queries in one call
  - Improved error handling and validation
- New class management tools:
  - `CreateClass` tool for creating new ABAP classes in local packages
  - `CreateClassTests` tool for creating or replacing test classes within existing classes
  - `DeleteLocalClass` tool for deleting local ABAP classes
  - `ActivateClasses` tool for activating ABAP classes after creation or modification
  - `CheckSyntax` tool for comprehensive ABAP syntax validation
  - `RunClassTests` tool for running unit tests and retrieving results
  - `GetClassCoverage` tool for test coverage analysis
  - `GetClassTests` tool for retrieving local test classes
  - `GetClassUsages` tool for retrieving class usage information

### Changed
- Simplified CDS view retrieval to use single ADT endpoint
- Enhanced behavior definition endpoint to include source/main path
- Improved error handling and cleanup in syntax check handler
- Enhanced ADT response parsing with temporary class validation
- Streamlined ABAP unit testing prompt for better usability

### Removed
- `GetCDSViewDependencies` tool and related functionality (simplified approach)

### Fixed
- Local test class creation validation error
- Behavior definition endpoint path handling
- Comprehensive integration test coverage for new handler functions

## [1.1.0] - 2025-02-19

### Added
- New `GetTransaction` tool to retrieve ABAP transaction details.
  - Allows fetching transaction details using the ADT endpoint `/sap/bc/adt/repository/informationsystem/objectproperties/values`.
  - Added documentation in README.md.

## [0.1.2] - 2025-02-18

### Changed
- Added Jest Test Script `index.test.ts` available through `npm test`
- Enhanced `makeAdtRequest` method to support:
  - Custom headers through an optional parameter
  - Query parameters through an optional `params` parameter
- Improved `handleGetPackage` method to use ADT's nodeContent API
  - Now uses POST request with proper XML payload
  - Added specific content type headers for nodeContent endpoint
  - Added filtering to return only objects with URI 
- Improved CSRF token handling in utils.ts
  - Added automatic CSRF token fetching for POST/PUT requests
  - Enhanced token extraction to work with error responses
  - Added cookie management for better session handling
  - Implemented singleton axios instance for consistent state
  - Added proper cleanup for test environments

## [0.1.1] - 2025-02-13

### Added
- New `GetInterface` tool to retrieve ABAP interface source code
  - Allows fetching source code of ABAP interfaces using the ADT endpoint `/sap/bc/adt/oo/interfaces/`
  - Similar functionality to GetClass but for interfaces
  - Added documentation in README.md

## [0.1.0] - Initial Release

### Added
- Initial release of the MCP ABAP ADT server
- Basic ABAP object retrieval functionality
- Support for programs, classes, function modules, and more
- Documentation and setup instructions
