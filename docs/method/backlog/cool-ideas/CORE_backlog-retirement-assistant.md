---
title: "Backlog retirement assistant"
feature: method
kind: cool-idea
legend: CORE
lane: cool-ideas
priority: 2
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/74
---

# Backlog retirement assistant

## Idea

Add a deterministic helper that retires a shipped backlog card during retro
closure.

## Why

PR #66 showed that card retirement is easy to miss. A helper can make the correct
closure path obvious and repeatable without requiring the full Method close tool
to be perfect.

## Possible Shape

```bash
pnpm method:retire-card CORE_graft-structural-history-echo-package-descriptor --outcome shipped
```

## Desired Behavior

- Find the active backlog card by slug.
- Move it to `docs/method/graveyard/`.
- Add or update disposition text.
- Update active cards that still point at the shipped card through `blocked_by`.
- Regenerate the backlog DAG.
- Print unresolved refs and follow-up work.

## Acceptance Criteria

- The helper can retire one card without touching unrelated backlog files.
- It fails safely when multiple cards match.
- It updates generated DAG artifacts.
- It can be tested with fixture backlog directories.
