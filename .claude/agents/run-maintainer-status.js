#!/usr/bin/env node

/**
 * Maintainer Status - Repository Status Checker Script
 *
 * This script helps trigger the maintainer status agent to check the GitHub
 * repository for open pull requests, issues, and discussions, then provides
 * a comprehensive status report with recommendations.
 *
 * Usage:
 *   node .claude/agents/run-maintainer-status.js [options]
 *
 * Options:
 *   --detailed         Include detailed information for each item
 *   --focus <area>     Focus on specific area: prs, issues, discussions, health
 *   --json             Output raw JSON data for further processing
 *   --quick            Quick summary only (less detail)
 *
 * Examples:
 *   node .claude/agents/run-maintainer-status.js
 *   node .claude/agents/run-maintainer-status.js --detailed
 *   node .claude/agents/run-maintainer-status.js --focus prs
 *   node .claude/agents/run-maintainer-status.js --quick
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  detailed: args.includes('--detailed'),
  quick: args.includes('--quick'),
  json: args.includes('--json'),
  focus: null,
};

// Parse focus option
const focusIndex = args.indexOf('--focus');
if (focusIndex !== -1 && args[focusIndex + 1]) {
  options.focus = args[focusIndex + 1];
}

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
        host: remoteUrl.includes('github.tools.sap') ? 'github.tools.sap' : 'github.com',
        fullName: `${match[1]}/${match[2]}`,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Check if gh CLI is installed
function checkGhCli() {
  try {
    execSync('gh --version', { encoding: 'utf8', stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Get PR summary
function getPrSummary() {
  try {
    const output = execSync('gh pr list --state open --json number,title,author,isDraft,reviewDecision,updatedAt --limit 50', {
      encoding: 'utf8',
    });
    return JSON.parse(output);
  } catch (error) {
    console.error('⚠️  Could not fetch PR data:', error.message);
    return [];
  }
}

// Get issue summary
function getIssueSummary() {
  try {
    const output = execSync('gh issue list --state open --json number,title,labels,updatedAt,comments --limit 50', {
      encoding: 'utf8',
    });
    return JSON.parse(output);
  } catch (error) {
    console.error('⚠️  Could not fetch issue data:', error.message);
    return [];
  }
}

// Get workflow runs
function getWorkflowRuns() {
  try {
    const output = execSync('gh run list --limit 5 --json status,conclusion,name,createdAt', {
      encoding: 'utf8',
    });
    return JSON.parse(output);
  } catch (error) {
    console.error('⚠️  Could not fetch workflow data:', error.message);
    return [];
  }
}

// Get recent commits
function getRecentCommits() {
  try {
    const output = execSync('git log --since="7 days ago" --oneline --no-merges', {
      encoding: 'utf8',
    });
    return output.trim().split('\n').filter(line => line.length > 0);
  } catch (error) {
    return [];
  }
}

// Calculate days since update
function daysSince(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Main execution
async function main() {
  // Check for gh CLI
  if (!checkGhCli()) {
    console.error('❌ Error: GitHub CLI (gh) is not installed');
    console.error('   Install it from: https://cli.github.com/');
    console.error('   Or use: winget install --id GitHub.cli\n');
    process.exit(1);
  }

  // Get repository info
  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    console.error('❌ Error: Could not determine repository information');
    console.error('   Make sure you are in a git repository with a GitHub remote\n');
    process.exit(1);
  }

  // Show minimal header for default mode
  if (!options.quick && !options.detailed && !options.json && !options.focus) {
    console.log('📊 Repository Status\n');
  } else {
    console.log('📊 Repository Maintainer Status');
    console.log('================================\n');
    console.log(`📦 Repository: ${repoInfo.fullName}`);
    console.log(`🌐 Host: ${repoInfo.host}`);
    console.log(`🕐 Generated: ${new Date().toISOString()}\n`);

    if (options.focus) {
      console.log(`🎯 Focus Area: ${options.focus}\n`);
    }
    console.log('='.repeat(50) + '\n');
  }

  // Gather data (silent for default mode)
  if (options.quick || options.detailed || options.json || options.focus) {
    console.log('🔍 Gathering repository data...\n');
  }

  const prs = getPrSummary();
  const issues = getIssueSummary();
  const workflows = getWorkflowRuns();
  const commits = getRecentCommits();

  // Analyze PR data upfront
  const readyToMerge = prs.filter(pr => !pr.isDraft && pr.reviewDecision === 'APPROVED');
  const needsReview = prs.filter(pr => !pr.isDraft && (!pr.reviewDecision || pr.reviewDecision === 'REVIEW_REQUIRED'));
  const changesRequested = prs.filter(pr => pr.reviewDecision === 'CHANGES_REQUESTED');
  const drafts = prs.filter(pr => pr.isDraft);
  const stalePrs = prs.filter(pr => daysSince(pr.updatedAt) > 14);

  // Analyze issue data upfront
  const bugs = issues.filter(i => i.labels.some(l => l.name === 'bug'));
  const features = issues.filter(i => i.labels.some(l => l.name === 'enhancement' || l.name === 'feature'));
  const needsClarification = issues.filter(i => i.labels.some(l => l.name === 'needs clarification'));
  const goodFirstIssue = issues.filter(i => i.labels.some(l => l.name === 'good first issue'));
  const staleIssues = issues.filter(i => daysSince(i.updatedAt) > 30);

  if (options.json) {
    // Output raw JSON
    const data = {
      repository: repoInfo,
      timestamp: new Date().toISOString(),
      pullRequests: prs,
      issues: issues,
      workflows: workflows,
      recentCommits: commits.length,
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Default mode: Show quick overview with actionable next steps
  if (!options.quick && !options.detailed && !options.focus) {
    console.log('📋 Quick Overview\n');
    console.log(`   PRs: ${prs.length} open (${readyToMerge.length} ready, ${needsReview.length} need review)`);
    console.log(`   Issues: ${issues.length} open (${bugs.length} bugs, ${features.length} features)`);
    console.log(`   Activity: ${commits.length} commits in last 7 days\n`);

    // Build priority list
    const priorities = [];

    if (readyToMerge.length > 0) {
      priorities.push({
        icon: '🟢',
        action: `Merge ${readyToMerge.length} approved PR(s)`,
        items: readyToMerge.slice(0, 3).map(pr => `#${pr.number}: ${pr.title}`)
      });
    }

    if (needsReview.length > 0) {
      priorities.push({
        icon: '🟡',
        action: `Review ${needsReview.length} PR(s)`,
        items: needsReview.slice(0, 3).map(pr => `#${pr.number}: ${pr.title}`)
      });
    }

    if (bugs.length > 0) {
      priorities.push({
        icon: '🔴',
        action: `Fix ${bugs.length} bug(s)`,
        items: bugs.slice(0, 3).map(issue => `#${issue.number}: ${issue.title}`)
      });
    }

    if (changesRequested.length > 0) {
      priorities.push({
        icon: '📝',
        action: `Follow up on ${changesRequested.length} PR(s) with changes requested`,
        items: changesRequested.slice(0, 2).map(pr => `#${pr.number}: ${pr.title}`)
      });
    }

    if (needsClarification.length > 0) {
      priorities.push({
        icon: '❓',
        action: `Clarify ${needsClarification.length} issue(s)`,
        items: needsClarification.slice(0, 2).map(issue => `#${issue.number}: ${issue.title}`)
      });
    }

    // Show top priorities
    if (priorities.length > 0) {
      console.log('🎯 What to do next:\n');
      priorities.slice(0, 3).forEach((priority, index) => {
        console.log(`${index + 1}. ${priority.icon} ${priority.action}`);
        priority.items.forEach(item => {
          console.log(`      ${item}`);
        });
        console.log('');
      });
    } else {
      console.log('✅ All caught up! No urgent actions needed.\n');
    }

    console.log('─'.repeat(50) + '\n');
    console.log('💡 For detailed analysis, run:\n');
    console.log('   npm run status:detailed    - Full breakdown with all details');
    console.log('   npm run status:quick       - Brief summary only');
    console.log('   --focus prs               - Focus on pull requests');
    console.log('   --focus issues            - Focus on issues\n');
    console.log('🤖 Or ask Claude for strategic recommendations:\n');
    console.log('   claude "Analyze the repository status and recommend priorities"\n');
    return;
  }

  // Analyze PRs (for quick/detailed/focus modes)
  if (!options.focus || options.focus === 'prs') {
    console.log(`## Pull Requests (${prs.length} open)\n`);

    if (readyToMerge.length > 0) {
      console.log(`🟢 Ready to Merge (${readyToMerge.length}):`);
      readyToMerge.forEach(pr => {
        const age = daysSince(pr.updatedAt);
        console.log(`   #${pr.number}: ${pr.title}`);
        if (options.detailed) {
          console.log(`          Author: @${pr.author.login}, Updated: ${age} days ago`);
        }
      });
      console.log('');
    }

    if (needsReview.length > 0) {
      console.log(`🟡 Awaiting Review (${needsReview.length}):`);
      needsReview.forEach(pr => {
        const age = daysSince(pr.updatedAt);
        console.log(`   #${pr.number}: ${pr.title}`);
        if (options.detailed) {
          console.log(`          Author: @${pr.author.login}, Opened: ${age} days ago`);
        }
      });
      console.log('');
    }

    if (changesRequested.length > 0) {
      console.log(`🔴 Changes Requested (${changesRequested.length}):`);
      changesRequested.forEach(pr => {
        const age = daysSince(pr.updatedAt);
        console.log(`   #${pr.number}: ${pr.title}`);
        if (options.detailed) {
          console.log(`          Author: @${pr.author.login}, Last updated: ${age} days ago`);
        }
      });
      console.log('');
    }

    if (drafts.length > 0) {
      console.log(`📝 Draft PRs (${drafts.length}):`);
      drafts.forEach(pr => {
        console.log(`   #${pr.number}: ${pr.title}`);
      });
      console.log('');
    }

    if (stalePrs.length > 0 && options.detailed) {
      console.log(`💤 Stale PRs (${stalePrs.length}):`);
      stalePrs.forEach(pr => {
        const age = daysSince(pr.updatedAt);
        console.log(`   #${pr.number}: ${pr.title} (${age} days)`);
      });
      console.log('');
    }

    console.log('='.repeat(50) + '\n');
  }

  // Analyze Issues
  if (!options.focus || options.focus === 'issues') {
    console.log(`## Issues (${issues.length} open)\n`);

    if (bugs.length > 0) {
      console.log(`🐛 Bugs (${bugs.length}):`);
      bugs.slice(0, options.quick ? 3 : 10).forEach(issue => {
        const age = daysSince(issue.updatedAt);
        console.log(`   #${issue.number}: ${issue.title}`);
        if (options.detailed) {
          const commentCount = Array.isArray(issue.comments) ? issue.comments.length : issue.comments;
          console.log(`          Updated: ${age} days ago, Comments: ${commentCount}`);
        }
      });
      console.log('');
    }

    if (features.length > 0) {
      console.log(`✨ Features & Enhancements (${features.length}):`);
      features.slice(0, options.quick ? 3 : 10).forEach(issue => {
        console.log(`   #${issue.number}: ${issue.title}`);
      });
      console.log('');
    }

    if (needsClarification.length > 0) {
      console.log(`❓ Needs Clarification (${needsClarification.length}):`);
      needsClarification.forEach(issue => {
        console.log(`   #${issue.number}: ${issue.title}`);
      });
      console.log('');
    }

    if (goodFirstIssue.length > 0) {
      console.log(`🟢 Good First Issues (${goodFirstIssue.length}):`);
      goodFirstIssue.forEach(issue => {
        console.log(`   #${issue.number}: ${issue.title}`);
      });
      console.log('');
    }

    if (staleIssues.length > 0 && options.detailed) {
      console.log(`💤 Stale Issues (${staleIssues.length}):`);
      staleIssues.slice(0, 5).forEach(issue => {
        const age = daysSince(issue.updatedAt);
        console.log(`   #${issue.number}: ${issue.title} (${age} days)`);
      });
      console.log('');
    }

    console.log('='.repeat(50) + '\n');
  }

  // Repository Health
  if (!options.focus || options.focus === 'health') {
    console.log('## Repository Health\n');

    console.log('📈 Activity (Last 7 Days):');
    console.log(`   Commits: ${commits.length}`);
    console.log('');

    if (workflows.length > 0) {
      console.log('🔧 Recent CI/CD Runs:');
      workflows.forEach(run => {
        const status = run.conclusion === 'success' ? '✅' : run.conclusion === 'failure' ? '❌' : '🟡';
        console.log(`   ${status} ${run.name}: ${run.conclusion || run.status}`);
      });
      console.log('');
    }

    console.log('='.repeat(50) + '\n');
  }

  // Quick Recommendations
  if (!options.quick) {
    console.log('## Quick Recommendations\n');

    const priorities = [];

    if (readyToMerge.length > 0) {
      priorities.push(`🚀 Merge ${readyToMerge.length} approved PR(s)`);
    }

    if (needsReview.length > 0) {
      priorities.push(`👀 Review ${needsReview.length} PR(s) awaiting feedback`);
    }

    if (bugs.length > 0) {
      priorities.push(`🐛 Address ${bugs.length} open bug(s)`);
    }

    if (changesRequested.length > 0) {
      priorities.push(`📝 Follow up on ${changesRequested.length} PR(s) with requested changes`);
    }

    if (needsClarification.length > 0) {
      priorities.push(`❓ Clarify ${needsClarification.length} issue(s) needing more info`);
    }

    if (priorities.length > 0) {
      console.log('Top Priorities:');
      priorities.forEach(p => console.log(`   ${p}`));
      console.log('');
    } else {
      console.log('✅ Repository is in good shape! No urgent actions needed.\n');
    }

    console.log('='.repeat(50) + '\n');
  }

  // Instructions
  console.log('🤖 To get detailed analysis with Claude Code:\n');
  console.log('Run the maintainer status agent for comprehensive analysis and recommendations:\n');
  console.log('   claude "Check the repository status using the maintainer-status agent"\n');
  console.log('Or with specific focus:\n');
  console.log('   claude "Check PRs and give recommendations on what to review first"\n');
  console.log('   claude "Analyze open issues and suggest which ones to tackle next"\n');
  console.log('   claude "Give me a complete repository health report with priorities"\n');
  console.log('');
  console.log('='.repeat(50) + '\n');

  console.log('✨ Status check complete!\n');
  console.log('Summary:');
  console.log(`   📋 ${prs.length} open PRs (${readyToMerge.length} ready to merge)`);
  console.log(`   🎫 ${issues.length} open issues (${bugs.length} bugs, ${features.length} enhancements)`);
  console.log(`   ⚡ ${commits.length} commits in last 7 days\n`);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
