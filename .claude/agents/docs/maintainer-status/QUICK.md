# Maintainer Status Agent - Quick Reference

## What It Does

The **Maintainer Status Agent** checks your GitHub repository and provides:

✅ **Quick Overview (Default)** - Actionable next steps in just a few lines
✅ **Open Pull Requests** - Ready to merge, awaiting review, needing changes
✅ **Open Issues** - Bugs, features, prioritization
✅ **Repository Health** - CI status, recent activity, dependencies
✅ **Recommendations** - What to work on next with priorities

## Quick Start

### 1. Quick Overview (Default - Recommended)

```bash
# Shows actionable next steps in just a few lines
npm run status
```

**Output:**
- Summary: PRs, issues, recent activity
- Top 3 priorities with specific items to work on
- Options for more detailed analysis

This is perfect for:
- Daily check-ins
- Quick status updates
- Deciding what to work on next

### 2. Run the Status Check Script

```bash
# Brief summary with categories
npm run status:quick

# Full detailed report with metadata
npm run status:detailed

# Focus on specific area
node .claude/agents/run-maintainer-status.js --focus prs
node .claude/agents/run-maintainer-status.js --focus issues
node .claude/agents/run-maintainer-status.js --focus health
```

### 3. Use with Claude Code for Analysis

```bash
# Get comprehensive analysis and recommendations
claude "Check the repository status using the maintainer-status agent"

# Focus on specific areas
claude "Check PRs and give recommendations on what to review first"
claude "Analyze open issues and suggest which ones to tackle next"
claude "Give me a complete repository health report with priorities"
```

## What You Get

### Default Mode (Quick Overview)
Perfect for daily use - shows you exactly what to do next:
- **Summary Line** - PRs, issues, activity at a glance
- **Top 3 Priorities** - Specific items ranked by importance
- **Next Steps** - Clear actions with item numbers
- **Options** - How to get more details if needed

Example output:
```
📊 Repository Status

📋 Quick Overview

   PRs: 2 open (0 ready, 2 need review)
   Issues: 5 open (1 bugs, 4 features)
   Activity: 8 commits in last 7 days

🎯 What to do next:

1. 🟡 Review 2 PR(s)
      #59: fix: Enable unit tests...
      #58: fix: Address critical security...

2. 🔴 Fix 1 bug(s)
      #55: Unit tests fail...
```

### Quick Mode
Brief summary with categories but no details:
- PRs grouped by status
- Issues grouped by type
- Recent activity stats
- Key recommendations

### Detailed Mode
Full information with all metadata:
- All items with author, dates, comments
- Stale items highlighted
- Complete recommendation set
- Best for planning sessions

### Actionable Recommendations
All modes provide recommendations:
- **Immediate Actions** - Do today (critical bugs, ready PRs)
- **Short-term** - This week (important features, reviews)
- **Medium-term** - This month (enhancements, refactoring)
- **Quick Wins** - Tasks completable in < 1 hour

## Common Use Cases

### Daily Standup
```bash
npm run status
```
**Quick overview shows exactly what to work on today.**

### Need More Details?
```bash
npm run status:quick    # See categories
npm run status:detailed # See everything
```

### Weekly Planning
```bash
npm run status:detailed
```
See detailed breakdown to plan the week's priorities.

### Before Starting Work
```bash
claude "Check repository status and tell me what I should work on next"
```
Get AI-powered recommendations on the most impactful tasks.

### After Merging PRs
```bash
npm run status
```
See updated status and what to tackle next.

## Prerequisites

- **GitHub CLI (gh)** must be installed and authenticated
  ```bash
  # Install
  winget install --id GitHub.cli

  # Authenticate
  gh auth login
  ```

- Must be in a git repository with a GitHub remote

## Output Modes

### Default Mode (Recommended)
**Command:** `npm run status`

**Best for:** Daily use, quick decisions

**Shows:**
- One-line summary (PRs, issues, commits)
- Top 3 actionable priorities
- Specific items to work on
- Options for more details

**Use when:** You want to know what to do next right now

### Quick Mode
**Command:** `npm run status:quick`

**Best for:** Category overview, brief checks

**Shows:**
- PRs grouped by status (ready, needs review, changes requested)
- Issues grouped by type (bugs, features)
- Activity metrics
- Brief recommendations

**Use when:** You want to see what's happening across categories

### Detailed Mode
**Command:** `npm run status:detailed`

**Best for:** Planning, comprehensive review

**Shows:**
- All items with full metadata
- Author names and dates
- Comment counts
- Stale items highlighted
- Complete recommendations

**Use when:** Planning sprints or need full context

### Focus Mode
**Command:** `node .claude/agents/run-maintainer-status.js --focus <area>`

**Areas:** `prs`, `issues`, `health`

**Use when:** You want to drill into one specific area

### JSON Mode
**Command:** `node .claude/agents/run-maintainer-status.js --json`

**Use when:** Automation, custom processing, data export

## Tips

1. **Start with default mode** - `npm run status` gives you exactly what you need
2. **Use daily** to stay on top of community contributions
3. **Merge ready PRs first** to keep contributors engaged
4. **Respond to new issues quickly** to show the project is active
5. **Drill down when needed** - Use detailed/focus modes for deep dives
6. **Let Claude analyze** - Ask for strategic recommendations

## Workflow Examples

### Morning Routine
```bash
# Quick check - what do I need to do today?
npm run status

# Output shows: "1. Review 2 PR(s)" - let's do it!
npm run review
```

### Need More Context?
```bash
# What were those PRs about again?
npm run status:quick

# Who opened them and when?
npm run status:detailed
```

## Examples

### Check if there are PRs ready to merge
```bash
npm run status | grep "Ready to Merge"
```

### Get AI recommendations
```bash
claude "Review the maintainer status and tell me the top 3 things I should do today"
```

### Focus on issues only
```bash
node .claude/agents/run-maintainer-status.js --focus issues --detailed
```

### Export data for processing
```bash
node .claude/agents/run-maintainer-status.js --json > status.json
```

## Integration with Other Agents

The maintainer status agent works well with:

- **PR Reviewer Agent** - After identifying PRs to review
  ```bash
  npm run status        # Find PRs needing review
  npm run review        # Review a specific PR
  ```

- **Issue Analyzer Agent** - After identifying issues to work on
  ```bash
  npm run status                    # Find issues
  npm run analyze-issue -- --issue 42  # Analyze specific issue
  ```

## Troubleshooting

### "gh: command not found"
Install GitHub CLI: `winget install --id GitHub.cli`

### "Could not determine repository information"
Make sure you're in a git repository with a GitHub remote configured.

### "authentication required"
Run `gh auth login` to authenticate with GitHub.

### No PRs or issues shown
Verify you have read access to the repository and the data exists on GitHub.

## Related Files

- **Agent Definition**: `.claude/agents/maintainer-status.md`
- **Runner Script**: `.claude/agents/run-maintainer-status.js`
- **Package Scripts**: `package.json` (status, status:detailed, status:quick)

## See Also

- [PR Reviewer Guide](../pr-reviewer/GUIDE.md)
- [Issue Analyzer Guide](../issue-analyzer/GUIDE.md)
- [Agents README](../../README.md)
