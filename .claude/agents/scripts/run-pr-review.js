#!/usr/bin/env node

/**
 * PR Reviewer - Automated Pull Request Review Script
 *
 * This script helps trigger the PR reviewer agent to analyze pull requests
 * before submitting them for review.
 *
 * Usage:
 *   node .claude/agents/run-pr-review.js [options]
 *
 * Options:
 *   --branch <name>    Branch to review (default: current branch)
 *   --base <name>      Base branch to compare against (default: main)
 *   --full             Run full review including test coverage
 *   --quick            Quick review (skip tests and coverage)
 *
 * Example:
 *   node .claude/agents/run-pr-review.js --full
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  branch: getCurrentBranch(),
  base: 'main',
  full: args.includes('--full'),
  quick: args.includes('--quick'),
};

// Override branch if specified
const branchIndex = args.indexOf('--branch');
if (branchIndex !== -1 && args[branchIndex + 1]) {
  options.branch = args[branchIndex + 1];
}

// Override base if specified
const baseIndex = args.indexOf('--base');
if (baseIndex !== -1 && args[baseIndex + 1]) {
  options.base = args[baseIndex + 1];
}

console.log('🔍 PR Reviewer Agent');
console.log('===================\n');
console.log(`Branch: ${options.branch}`);
console.log(`Base: ${options.base}`);
console.log(`Mode: ${options.full ? 'Full Review' : options.quick ? 'Quick Review' : 'Standard Review'}\n`);

// Get current branch
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('Error: Not in a git repository');
    process.exit(1);
  }
}

// Check if there are changes to review
function hasChanges() {
  try {
    const diff = execSync(`git diff ${options.base}...${options.branch} --name-only`, { encoding: 'utf8' });
    return diff.trim().length > 0;
  } catch (error) {
    console.error(`Error: Could not compare ${options.branch} with ${options.base}`);
    process.exit(1);
  }
}

// Get changed files
function getChangedFiles() {
  try {
    const files = execSync(`git diff ${options.base}...${options.branch} --name-only`, { encoding: 'utf8' });
    return files.trim().split('\n').filter(f => f.length > 0);
  } catch (error) {
    return [];
  }
}

// Get commit messages
function getCommitMessages() {
  try {
    const messages = execSync(`git log ${options.base}..${options.branch} --pretty=format:"%s"`, { encoding: 'utf8' });
    return messages.trim().split('\n').filter(m => m.length > 0);
  } catch (error) {
    return [];
  }
}

// Main execution
async function main() {
  // Check if on main branch
  if (options.branch === 'main' || options.branch === 'master') {
    console.log('⚠️  Warning: You are on the main branch. Usually you should review feature branches.\n');
  }

  // Check if there are changes
  if (!hasChanges()) {
    console.log('ℹ️  No changes detected between', options.base, 'and', options.branch);
    console.log('   Nothing to review.\n');
    process.exit(0);
  }

  // Get changed files and commits
  const changedFiles = getChangedFiles();
  const commits = getCommitMessages();

  console.log(`📁 Changed Files: ${changedFiles.length}`);
  console.log(`📝 Commits: ${commits.length}\n`);

  // Display files
  console.log('Changed Files:');
  changedFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
  console.log('');

  // Display commits
  console.log('Commit Messages:');
  commits.forEach((msg, idx) => {
    console.log(`  ${idx + 1}. ${msg}`);
  });
  console.log('\n' + '='.repeat(50) + '\n');

  // Load agent configuration
  const configPath = path.join(__dirname, 'pr-reviewer-config.json');
  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Generate review instructions
  console.log('📋 Review Checklist\n');
  console.log('The PR reviewer agent will check:\n');

  if (config.checks) {
    Object.entries(config.checks).forEach(([check, settings]) => {
      if (settings.enabled) {
        const emoji = config.output?.severity_emoji?.[settings.severity] || '•';
        console.log(`${emoji} ${check.replace(/_/g, ' ')} (${settings.severity})`);
      }
    });
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Instructions for using with Claude Code
  console.log('🤖 To run the PR review with Claude Code:\n');
  console.log('1. Ensure Claude Code is running');
  console.log('2. Execute the following command:\n');
  console.log('   claude "Review the current PR using the pr-reviewer agent"');
  console.log('\n   Or provide more context:\n');
  console.log(`   claude "Review PR on branch ${options.branch} against ${options.base}. Focus on TypeScript types, test coverage, and commit messages."`);
  console.log('\n' + '='.repeat(50) + '\n');

  // If full review requested, run tests
  if (options.full) {
    console.log('🧪 Running tests and coverage...\n');
    try {
      execSync('npm test -- --coverage', { stdio: 'inherit' });
      console.log('\n✅ Tests completed\n');
    } catch (error) {
      console.log('\n❌ Tests failed - this will be noted in the review\n');
    }
  }

  console.log('✨ Review preparation complete!\n');
  console.log('Next: Use Claude Code to perform the actual review using the pr-reviewer agent.\n');
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
