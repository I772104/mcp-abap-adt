# Handler Coverage Report

> Generated: 2026-03-04  
> Test Suite: 38 passed, 856 tests passed  
> Overall Coverage: 60.33% statements, 46.04% branches

---

## 📊 Handler Coverage Summary

### ✅ EXCELLENT Coverage (≥90% Branch)

| Handler | Statements | Branch | Status |
|---------|-----------|--------|--------|
| handleGetCDSView.ts | 100% | **100%** | ✅ Perfect |
| handleGetClass.ts | 100% | **100%** | ✅ Perfect |
| handleGetClassTests.ts | 100% | **100%** | ✅ Perfect |
| handleGetClassUsages.ts | 100% | **100%** | ✅ Perfect |
| handleGetFunction.ts | 100% | **100%** | ✅ Perfect |
| handleGetFunctionGroup.ts | 100% | **100%** | ✅ Perfect |
| handleGetInclude.ts | 100% | **100%** | ✅ Perfect |
| handleGetInterface.ts | 100% | **100%** | ✅ Perfect |
| handleGetProgram.ts | 100% | **100%** | ✅ Perfect |
| handleGetStructure.ts | 100% | **100%** | ✅ Perfect |
| handleGetTable.ts | 100% | **100%** | ✅ Perfect |
| handleGetTransaction.ts | 100% | **100%** | ✅ Perfect |
| handleGetTypeInfo.ts | 100% | **100%** | ✅ Perfect |
| handleRunClassTests.ts | 100% | **100%** | ✅ Perfect |
| handleRunPackageTests.ts | 100% | **100%** | ✅ Perfect |
| handleSearchObject.ts | 100% | **94.73%** | ✅ Excellent |
| handleCreateClassTests.ts | 96.87% | **93.93%** | ✅ Excellent |
| handleGetAccessControl.ts | 97.29% | **92.85%** | ✅ Excellent |
| handleGetPackageContents.ts | 92% | **91.3%** | ✅ Excellent |

**Count: 19 handlers (44.2%)**

---

### ⚠️ GOOD Coverage (70-89% Branch)

| Handler | Statements | Branch | Status |
|---------|-----------|--------|--------|
| handleActivateClasses.ts | 94.38% | **86.53%** | ⚠️ Good |
| handleCheckSyntax.ts | 95.17% | **82.92%** | ⚠️ Good |
| handleGetCDSViewContents.ts | 94.33% | **81.63%** | ⚠️ Good |
| handleDeleteLocalClass.ts | 92.18% | **80.64%** | ⚠️ Good |
| handleGetTableContents.ts | 95.48% | **80.26%** | ⚠️ Good |
| handleGetPackage.ts | 84.61% | **80%** | ⚠️ Good |
| handleCreateClass.ts | 93.8% | **77.77%** | ⚠️ Good |
| handleGetBehaviorForRapBo.ts | 95.65% | **75%** | ⚠️ Good |
| handleGetObjectUsages.ts | 87.32% | **70%** | ⚠️ Good |

**Count: 9 handlers (20.9%)**

---

### ❌ NEEDS IMPROVEMENT (<70% Branch)

| Handler | Statements | Branch | Priority |
|---------|-----------|--------|----------|
| handleGetBehaviorDefinition.ts | 81.88% | **51.21%** | 🔴 High |
| handleGetMetadataExtension.ts | 67.85% | **43.75%** | 🔴 High |
| handleSearchRapBo.ts | 83.33% | **42.85%** | 🔴 High |
| handleGetCDSViewDependencies.ts | 66.01% | **28.57%** | 🔴 High |
| handleGetClassCoverage.ts | 65.46% | **27.65%** | 🔴 High |
| handleGetServiceBinding.ts | 58.33% | **27.65%** | 🔴 High |
| handleGetServiceDefinition.ts | 71.79% | **25.92%** | 🔴 High |
| handleRapBoAnalysisResource.ts | 66.66% | **25%** | 🔴 High |
| handleListTopLevelPackages.ts | 34.54% | **19.56%** | 🔴 Critical |
| handleCompareObjectVersions.ts | 2.29% | **0%** | 🔴 Critical |
| handleGetTransportRequest.ts | 4.68% | **0%** | 🔴 Critical |
| handleGetTransportVersions.ts | 4.13% | **0%** | 🔴 Critical |
| handleGetVersionHistory.ts | 3.22% | **0%** | 🔴 Critical |
| handleListUserTransports.ts | 2.97% | **0%** | 🔴 Critical |

**Count: 14 handlers (32.6%)**

---

## 📈 Summary Statistics

- **Total Handlers**: 43
- **Perfect Coverage (100%)**: 15 handlers (34.9%)
- **Excellent (≥90%)**: 19 handlers (44.2%)
- **Good (70-89%)**: 9 handlers (20.9%)
- **Needs Improvement (<70%)**: 14 handlers (32.6%)
- **Critical (0%)**: 5 handlers (11.6%)

---

## 🎯 Recommended Action Plan

### Priority 1 - Critical (0% branch coverage)
These handlers have no test coverage for their branching logic and should be addressed first:

1. **handleListUserTransports.ts** (2.97% statements, 0% branches)
2. **handleGetVersionHistory.ts** (3.22% statements, 0% branches)
3. **handleGetTransportVersions.ts** (4.13% statements, 0% branches)
4. **handleGetTransportRequest.ts** (4.68% statements, 0% branches)
5. **handleCompareObjectVersions.ts** (2.29% statements, 0% branches)

### Priority 2 - High Impact (20-50% branch coverage)
These handlers have some coverage but significant gaps in branch testing:

1. **handleListTopLevelPackages.ts** (34.54% statements, 19.56% branches)
2. **handleGetServiceDefinition.ts** (71.79% statements, 25.92% branches)
3. **handleGetServiceBinding.ts** (58.33% statements, 27.65% branches)
4. **handleGetClassCoverage.ts** (65.46% statements, 27.65% branches)
5. **handleGetCDSViewDependencies.ts** (66.01% statements, 28.57% branches)

### Priority 3 - Moderate Improvement (40-60% branch coverage)
These handlers need additional test cases for edge cases and error paths:

1. **handleSearchRapBo.ts** (83.33% statements, 42.85% branches)
2. **handleGetMetadataExtension.ts** (67.85% statements, 43.75% branches)
3. **handleGetBehaviorDefinition.ts** (81.88% statements, 51.21% branches)

---

## 📝 How to Check Coverage for a Specific Handler

### Option 1: View HTML Report
```bash
# Open in browser
coverage/lcov-report/src/handlers/index.html
```

### Option 2: Run Coverage for Specific File
```bash
npm test -- --coverage --collectCoverageFrom="src/handlers/handleGetClass.ts"
```

### Option 3: View in VS Code
Install the "Coverage Gutters" extension and open the coverage report to see line-by-line coverage indicators.

---

## 🔍 Understanding Coverage Metrics

- **Statements**: Percentage of code statements executed during tests
- **Branches**: Percentage of conditional branches (if/else, switch, ternary) tested
- **Functions**: Percentage of functions called during tests
- **Lines**: Percentage of lines executed during tests

**Branch coverage is the most important metric** as it ensures all code paths (success, error, edge cases) are tested.

---

## 📚 Next Steps

1. **Review Priority 1 handlers** - Add basic test coverage for transport-related handlers
2. **Improve Priority 2 handlers** - Focus on error handling and edge cases
3. **Maintain excellent coverage** - Keep the 19 handlers with ≥90% coverage at their current level
4. **Set coverage thresholds** - Consider adding Jest coverage thresholds to prevent regression

### Suggested Coverage Thresholds
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

---

*Last Updated: 2026-03-04*