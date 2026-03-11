# Issue Analyzer Agent - Quick Guide

Analyzes GitHub issues for clarity, feasibility, and implementation planning.

## Quick Start

```bash
# Analyze issue by number (auto-detects repo)
npm run analyze-issue -- --issue 42

# Analyze issue by URL
npm run analyze-issue -- --url https://github.com/user/repo/issues/42

# Analyze issue from file
npm run analyze-issue -- --file issue.txt

# Analyze from stdin
cat issue.txt | npm run analyze-issue -- --text
```

Then follow the instructions to invoke with Claude Code.

## What It Does

1. **Assesses Clarity** - Evaluates if the issue is clear and complete
2. **Generates Questions** - Creates specific clarifying questions if needed
3. **Analyzes Feasibility** - Determines complexity and technical approach
4. **Proposes Solutions** - Suggests multiple implementation options
5. **Creates Plan** - Drafts detailed step-by-step implementation guide

## Output

The agent produces a structured analysis report containing:
- Issue summary and classification
- Clarity rating (Clear/Needs Clarification/Unclear)
- Specific questions to ask (if unclear)
- Feasibility assessment with complexity rating
- Alternative implementation approaches with pros/cons
- Detailed implementation plan with file-level changes
- Effort estimate and confidence level
- Next steps

## When to Use

- **Before starting work** - Understand scope and approach
- **During planning** - Evaluate feasibility and options
- **For triage** - Assess if issue needs more information
- **For estimation** - Get complexity and effort estimates

## Example

```bash
# Analyze a feature request
npm run analyze-issue -- --issue 45

# Claude Code then produces:
# ✓ Clarity Assessment: Needs Clarification
# ✓ 6 specific questions to ask
# ✓ Preliminary feasibility: Medium complexity
# ✓ 3 alternative approaches with trade-offs
# ✓ Next steps: Post questions to issue
```

## Options

- `--issue <number>` - Issue number (e.g., 42)
- `--url <url>` - Full issue URL
- `--file <path>` - Path to file with issue content
- `--text` - Read from stdin

## Tips

- Clear issues → Full feasibility analysis + implementation plan
- Unclear issues → Focused questions to clarify requirements
- Agent checks ABAP ADT API availability automatically
- References specific files that would need changes
- Considers project patterns and architecture

## See Also

- Full documentation: `.claude/agents/ISSUE_ANALYZER_GUIDE.md`
- Agent definition: `.claude/agents/issue-analyzer.md`
- Example analyses: See ISSUE_ANALYZER_GUIDE.md
