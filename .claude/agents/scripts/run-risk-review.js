#!/usr/bin/env node

/**
 * Risk Reviewer - Operational and Business Risk Assessment Script
 *
 * This script helps trigger the risk reviewer agent to analyze proposals,
 * pull requests, or configuration changes for operational and business risks.
 *
 * Usage:
 *   node .claude/agents/scripts/run-risk-review.js [options]
 *
 * Options:
 *   --pr <number>          Review a specific pull request
 *   --file <path>          Review a proposal file (markdown, doc, etc.)
 *   --current              Review current uncommitted changes
 *   --branch <name>        Review changes in a branch (vs main)
 *   --base <name>          Base branch to compare against (default: main)
 *   --category <name>      Focus on specific risk category (technical, data, security, etc.)
 *
 * Examples:
 *   node .claude/agents/scripts/run-risk-review.js --pr 68
 *   node .claude/agents/scripts/run-risk-review.js --file docs/proposals/transport-tools.md
 *   node .claude/agents/scripts/run-risk-review.js --current
 *   node .claude/agents/scripts/run-risk-review.js --branch feature/create-transport
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  pr: null,
  file: null,
  current: args.includes('--current'),
  branch: null,
  base: 'main',
  category: null,
};

// Parse PR number
const prIndex = args.indexOf('--pr');
if (prIndex !== -1 && args[prIndex + 1]) {
  options.pr = args[prIndex + 1];
}

// Parse file path
const fileIndex = args.indexOf('--file');
if (fileIndex !== -1 && args[fileIndex + 1]) {
  options.file = args[fileIndex + 1];
}

// Parse branch
const branchIndex = args.indexOf('--branch');
if (branchIndex !== -1 && args[branchIndex + 1]) {
  options.branch = args[branchIndex + 1];
}

// Parse base
const baseIndex = args.indexOf('--base');
if (baseIndex !== -1 && args[baseIndex + 1]) {
  options.base = args[baseIndex + 1];
}

// Parse category
const categoryIndex = args.indexOf('--category');
if (categoryIndex !== -1 && args[categoryIndex + 1]) {
  options.category = args[categoryIndex + 1];
}

console.log('🔍 Risk Review Agent');
console.log('===================\n');

// Get current branch
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('Error: Not in a git repository');
    process.exit(1);
  }
}

// Get PR information
function getPRInfo(prNumber) {
  try {
    // Try to get PR info using gh CLI
    const prInfo = execSync(`gh pr view ${prNumber} --json title,body,headRefName`, { encoding: 'utf8' });
    return JSON.parse(prInfo);
  } catch (error) {
    console.log(`⚠️  Could not fetch PR #${prNumber} using gh CLI`);
    console.log('   Make sure gh CLI is installed and authenticated\n');
    return null;
  }
}

// Get changed files for PR or branch
function getChangedFiles(prNumber = null, branch = null) {
  try {
    if (prNumber) {
      // Get files changed in PR
      const files = execSync(`gh pr view ${prNumber} --json files --jq '.files[].path'`, { encoding: 'utf8' });
      return files.trim().split('\n').filter(f => f.length > 0);
    } else if (branch) {
      // Get files changed in branch
      const files = execSync(`git diff ${options.base}...${branch} --name-only`, { encoding: 'utf8' });
      return files.trim().split('\n').filter(f => f.length > 0);
    } else if (options.current) {
      // Get uncommitted changes
      const files = execSync('git diff HEAD --name-only', { encoding: 'utf8' });
      return files.trim().split('\n').filter(f => f.length > 0);
    }
    return [];
  } catch (error) {
    return [];
  }
}

// Load risk categories from config
function getRiskCategories() {
  const configPath = path.join(__dirname, '..', 'config', 'risk-reviewer-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.risk_categories || {};
    }
  } catch (error) {
    console.log('⚠️  Could not load risk reviewer configuration\n');
  }
  return {};
}

// Display risk categories
function displayRiskCategories(categories) {
  console.log('📋 Risk Assessment Categories\n');

  Object.entries(categories).forEach(([name, details]) => {
    if (details.enabled) {
      console.log(`• ${name.replace(/_/g, ' ').toUpperCase()}`);
      if (details.description) {
        console.log(`  ${details.description}`);
      }
      if (details.checks && details.checks.length > 0) {
        console.log(`  Checks: ${details.checks.slice(0, 3).join(', ')}${details.checks.length > 3 ? '...' : ''}`);
      }
      console.log('');
    }
  });
}

// Main execution
async function main() {
  // Determine what we're reviewing
  let reviewTarget = null;
  let reviewType = null;

  if (options.pr) {
    reviewType = 'Pull Request';
    reviewTarget = `PR #${options.pr}`;

    console.log(`Target: Pull Request #${options.pr}\n`);

    // Get PR info
    const prInfo = getPRInfo(options.pr);
    if (prInfo) {
      console.log(`Title: ${prInfo.title}`);
      console.log(`Branch: ${prInfo.headRefName}\n`);

      if (prInfo.body) {
        console.log('Description:');
        console.log(prInfo.body.split('\n').slice(0, 5).map(line => `  ${line}`).join('\n'));
        if (prInfo.body.split('\n').length > 5) {
          console.log('  ...\n');
        } else {
          console.log('');
        }
      }
    }

    // Get changed files
    const changedFiles = getChangedFiles(options.pr);
    if (changedFiles.length > 0) {
      console.log(`📁 Changed Files: ${changedFiles.length}`);
      changedFiles.slice(0, 10).forEach(file => {
        console.log(`  - ${file}`);
      });
      if (changedFiles.length > 10) {
        console.log(`  ... and ${changedFiles.length - 10} more`);
      }
      console.log('');
    }

  } else if (options.file) {
    reviewType = 'Proposal File';
    reviewTarget = options.file;

    console.log(`Target: ${options.file}\n`);

    // Check if file exists
    if (fs.existsSync(options.file)) {
      const stats = fs.statSync(options.file);
      console.log(`File size: ${stats.size} bytes`);
      console.log(`Last modified: ${stats.mtime.toISOString()}\n`);

      // Show first few lines
      const content = fs.readFileSync(options.file, 'utf8');
      const lines = content.split('\n').slice(0, 10);
      console.log('Preview:');
      console.log(lines.map(line => `  ${line}`).join('\n'));
      if (content.split('\n').length > 10) {
        console.log('  ...\n');
      } else {
        console.log('');
      }
    } else {
      console.log(`⚠️  File not found: ${options.file}\n`);
      process.exit(1);
    }

  } else if (options.branch) {
    reviewType = 'Branch Changes';
    reviewTarget = options.branch;

    console.log(`Target: Branch ${options.branch} (vs ${options.base})\n`);

    // Get changed files
    const changedFiles = getChangedFiles(null, options.branch);
    if (changedFiles.length > 0) {
      console.log(`📁 Changed Files: ${changedFiles.length}`);
      changedFiles.slice(0, 10).forEach(file => {
        console.log(`  - ${file}`);
      });
      if (changedFiles.length > 10) {
        console.log(`  ... and ${changedFiles.length - 10} more`);
      }
      console.log('');
    } else {
      console.log('ℹ️  No changes detected between', options.base, 'and', options.branch);
      console.log('   Nothing to review.\n');
      process.exit(0);
    }

  } else if (options.current) {
    reviewType = 'Current Changes';
    reviewTarget = 'uncommitted changes';

    console.log('Target: Current uncommitted changes\n');

    // Get changed files
    const changedFiles = getChangedFiles();
    if (changedFiles.length > 0) {
      console.log(`📁 Changed Files: ${changedFiles.length}`);
      changedFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
      console.log('');
    } else {
      console.log('ℹ️  No uncommitted changes detected');
      console.log('   Nothing to review.\n');
      process.exit(0);
    }

  } else {
    // No target specified, show usage
    console.log('❌ No review target specified\n');
    console.log('Usage:');
    console.log('  node .claude/agents/scripts/run-risk-review.js --pr <number>');
    console.log('  node .claude/agents/scripts/run-risk-review.js --file <path>');
    console.log('  node .claude/agents/scripts/run-risk-review.js --current');
    console.log('  node .claude/agents/scripts/run-risk-review.js --branch <name>\n');
    console.log('Examples:');
    console.log('  node .claude/agents/scripts/run-risk-review.js --pr 68');
    console.log('  node .claude/agents/scripts/run-risk-review.js --file docs/proposals/transport-tools.md');
    console.log('  node .claude/agents/scripts/run-risk-review.js --current\n');
    process.exit(1);
  }

  console.log('='.repeat(50) + '\n');

  // Load and display risk categories
  const categories = getRiskCategories();
  if (options.category) {
    console.log(`Focus: ${options.category.toUpperCase()} risk assessment\n`);
  } else {
    displayRiskCategories(categories);
  }

  console.log('='.repeat(50) + '\n');

  // Generate instructions for Claude Code
  console.log('🤖 To perform the risk assessment with Claude Code:\n');
  console.log('1. Ensure Claude Code is running');
  console.log('2. Execute the following command:\n');

  if (options.pr) {
    console.log(`   claude "Use the risk-reviewer agent to analyze PR #${options.pr}. Focus on operational and business risks, especially for any write operations or system-level changes."`);
  } else if (options.file) {
    console.log(`   claude "Use the risk-reviewer agent to analyze the proposal in ${options.file}. Provide a comprehensive risk assessment covering all 7 risk categories."`);
  } else if (options.branch) {
    console.log(`   claude "Use the risk-reviewer agent to analyze changes in branch ${options.branch}. Focus on technical, data, and operational risks."`);
  } else if (options.current) {
    console.log(`   claude "Use the risk-reviewer agent to analyze the current uncommitted changes. Assess risks before committing."`);
  }

  console.log('\n   Or be more specific:\n');
  console.log(`   claude "Use the risk-reviewer agent at .claude/agents/risk-reviewer.md to perform a deep risk analysis of ${reviewTarget}."`);

  if (options.category) {
    console.log(`\n   Focusing on ${options.category}:\n`);
    console.log(`   claude "Use the risk-reviewer agent to analyze ${reviewTarget}, focusing specifically on ${options.category} risks."`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Display severity levels
  console.log('📊 Risk Severity Levels\n');
  console.log('🔴 CRITICAL - Must block until mitigated');
  console.log('   Could cause production outage, data loss, or security breach\n');
  console.log('🟡 HIGH - Requires multiple safeguards');
  console.log('   Could disrupt operations or require emergency rollback\n');
  console.log('🟠 MEDIUM - Should implement safeguards');
  console.log('   Could cause minor issues or manual intervention\n');
  console.log('🟢 LOW - Optional improvements');
  console.log('   Minimal impact, easily recoverable\n');

  console.log('='.repeat(50) + '\n');

  // Display expected output sections
  console.log('📝 The risk assessment will include:\n');
  console.log('• Executive Summary (overall risk rating, key concerns)');
  console.log('• Detailed Risk Analysis (7 categories)');
  console.log('• Attack Vectors & Failure Scenarios');
  console.log('• Recommended Safeguards (preventive, detective, corrective)');
  console.log('• Risk Mitigation Summary (checklist)');
  console.log('• Implementation Recommendations (phased approach)');
  console.log('• Conclusion (proceed/defer/block decision)\n');

  console.log('='.repeat(50) + '\n');

  console.log('✨ Risk review preparation complete!\n');
  console.log('Next: Use Claude Code to perform the actual risk assessment using the risk-reviewer agent.\n');
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
