#!/usr/bin/env node

/**
 * Issue Analyzer - Automated GitHub Issue Analysis Script
 *
 * This script helps trigger the issue analyzer agent to evaluate GitHub issues
 * for clarity, feasibility, and implementation planning.
 *
 * Usage:
 *   node .claude/agents/run-issue-analyzer.js [options]
 *
 * Options:
 *   --issue <number>       GitHub issue number to analyze
 *   --url <url>            Full GitHub issue URL
 *   --file <path>          Path to file containing issue content
 *   --text                 Read issue content from stdin
 *
 * Examples:
 *   node .claude/agents/run-issue-analyzer.js --issue 42
 *   node .claude/agents/run-issue-analyzer.js --url https://github.com/user/repo/issues/42
 *   node .claude/agents/run-issue-analyzer.js --file issue.txt
 *   cat issue.txt | node .claude/agents/run-issue-analyzer.js --text
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

// Get repository information
function getRepoInfo() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();

    // Parse GitHub URL (supports both HTTPS and SSH)
    let match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
    if (!match && remoteUrl.includes('github.tools.sap')) {
      match = remoteUrl.match(/github\.tools\.sap[:/](.+?)\/(.+?)(\.git)?$/);
    }

    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        host: remoteUrl.includes('github.tools.sap') ? 'github.tools.sap' : 'github.com'
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Parse options
const options = {
  issueNumber: null,
  url: null,
  file: null,
  stdin: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--issue' && args[i + 1]) {
    options.issueNumber = args[i + 1];
    i++;
  } else if (arg === '--url' && args[i + 1]) {
    options.url = args[i + 1];
    i++;
  } else if (arg === '--file' && args[i + 1]) {
    options.file = args[i + 1];
    i++;
  } else if (arg === '--text') {
    options.stdin = true;
  }
}

console.log('🔍 GitHub Issue Analyzer Agent');
console.log('================================\n');

// Main execution
async function main() {
  let issueContent = '';
  let issueSource = '';

  // Determine issue source
  if (options.url) {
    issueSource = `URL: ${options.url}`;
    console.log(`📌 Issue Source: ${issueSource}\n`);
    console.log('ℹ️  Issue will be fetched from URL by the agent\n');
  } else if (options.issueNumber) {
    const repoInfo = getRepoInfo();
    if (repoInfo) {
      const issueUrl = `https://${repoInfo.host}/${repoInfo.owner}/${repoInfo.repo}/issues/${options.issueNumber}`;
      issueSource = `Issue #${options.issueNumber}`;
      options.url = issueUrl;
      console.log(`📌 Issue: #${options.issueNumber}`);
      console.log(`📍 URL: ${issueUrl}\n`);
    } else {
      console.error('❌ Error: Could not determine repository information');
      console.error('   Use --url option to provide full issue URL\n');
      process.exit(1);
    }
  } else if (options.file) {
    const filePath = path.resolve(options.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Error: File not found: ${filePath}\n`);
      process.exit(1);
    }
    issueContent = fs.readFileSync(filePath, 'utf8');
    issueSource = `File: ${options.file}`;
    console.log(`📌 Issue Source: ${issueSource}`);
    console.log(`📄 Content Length: ${issueContent.length} characters\n`);
  } else if (options.stdin) {
    // Read from stdin
    try {
      issueContent = fs.readFileSync(0, 'utf-8');
      issueSource = 'stdin';
      console.log(`📌 Issue Source: ${issueSource}`);
      console.log(`📄 Content Length: ${issueContent.length} characters\n`);
    } catch (error) {
      console.error('❌ Error: Could not read from stdin\n');
      process.exit(1);
    }
  } else {
    // No input provided - show usage
    console.log('❌ Error: No issue specified\n');
    console.log('Usage:');
    console.log('  node .claude/agents/run-issue-analyzer.js --issue <number>');
    console.log('  node .claude/agents/run-issue-analyzer.js --url <url>');
    console.log('  node .claude/agents/run-issue-analyzer.js --file <path>');
    console.log('  cat issue.txt | node .claude/agents/run-issue-analyzer.js --text\n');
    console.log('Examples:');
    console.log('  node .claude/agents/run-issue-analyzer.js --issue 42');
    console.log('  node .claude/agents/run-issue-analyzer.js --url https://github.com/user/repo/issues/42');
    console.log('  node .claude/agents/run-issue-analyzer.js --file issue.txt\n');
    process.exit(1);
  }

  console.log('📋 Analysis Checklist\n');
  console.log('The issue analyzer agent will:\n');
  console.log('✓ Assess issue clarity and completeness');
  console.log('✓ Generate clarifying questions (if needed)');
  console.log('✓ Conduct feasibility analysis');
  console.log('✓ Propose alternative implementation approaches');
  console.log('✓ Draft detailed implementation plan');
  console.log('✓ Estimate effort and complexity\n');

  console.log('='.repeat(50) + '\n');

  // Instructions for using with Claude Code
  console.log('🤖 To run the analysis with Claude Code:\n');

  if (options.url) {
    console.log(`   claude "Analyze GitHub issue: ${options.url}"`);
  } else if (issueContent) {
    // Save content to temp file for easy reference
    const tempFile = path.join(__dirname, 'temp-issue.txt');
    fs.writeFileSync(tempFile, issueContent, 'utf8');
    console.log(`   Issue content saved to: ${tempFile}\n`);
    console.log(`   claude "Analyze the GitHub issue in ${tempFile} using the issue-analyzer agent"`);
  }

  console.log('\n   Or provide custom focus:\n');
  console.log('   claude "Analyze issue #42. Focus on ABAP ADT API availability and security considerations."\n');

  console.log('='.repeat(50) + '\n');

  // Display preview if content available
  if (issueContent && issueContent.length > 0) {
    console.log('📄 Issue Content Preview:\n');
    const lines = issueContent.split('\n');
    const preview = lines.slice(0, 15).join('\n');
    console.log(preview);
    if (lines.length > 15) {
      console.log(`\n... (${lines.length - 15} more lines) ...\n`);
    }
    console.log('\n' + '='.repeat(50) + '\n');
  }

  console.log('✨ Analysis preparation complete!\n');
  console.log('Next: Use Claude Code to perform the actual analysis using the issue-analyzer agent.\n');

  // Show expected output structure
  console.log('📊 Expected Output:\n');
  console.log('The agent will produce a structured report containing:');
  console.log('  • Issue summary and type classification');
  console.log('  • Clarity assessment (Clear/Needs Clarification/Unclear)');
  console.log('  • Clarifying questions (if applicable)');
  console.log('  • Feasibility analysis (complexity, affected files, risks)');
  console.log('  • Alternative solution proposals with trade-offs');
  console.log('  • Detailed implementation plan with checklist');
  console.log('  • Effort estimate and timeline');
  console.log('  • Next steps and recommendations\n');
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
