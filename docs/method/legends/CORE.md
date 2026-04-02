# Legend: CORE

The governor itself. Policy, enforcement, extraction, UX,
observability — everything that makes graft useful as a context
governor for agents, independent of structural memory.

## What it covers

- **Policy engine**: thresholds, bans, .graftignore, session-depth
  caps, context budgets
- **Extraction**: outlines, jump tables, symbol-level tools,
  structural diffs
- **Enforcement**: MCP server, Claude Code hooks, policy profiles
- **UX**: onboarding (graft init), help (graft explain), teaching
  (hints in responses), auto-focus
- **Observability**: metrics, receipts, self-tuning, token usage
  measurement
- **Distribution**: npm, Docker

## What success looks like

An agent using graft never accidentally blows its context window.
The governor is easy to install, easy to configure, and gets
smarter over time. Every decision is logged and explainable.

## How you know

Blacklight-measurable: context burden per session drops by 75%+
compared to ungoverned reads. Zero accidental full-file reads of
banned content.
