---
title: "v0.7.0 structural history"
legend: CORE
cycle: CORE_v070-structural-history
---

# v0.7.0 structural history

## Sponsors

- Human: James (direction, review)
- Agent: Claude (decomposition, parallel execution, integration)

## Hill

Ship structural history tools that let humans and agents see code
evolution at the symbol level — not line diffs, not commit messages,
but what structurally changed, who changed it, and what it impacts.

This slice is complete when:

- `graft log` shows per-commit symbol changes
- `graft blame` traces a symbol's lifecycle across commits
- `graft review` separates structural signal from formatting noise in PRs
- `graft churn` ranks symbols by change frequency
- `graft exports` diffs the public API surface with semver classification
- all five tools ship as operation + CLI + MCP with tests

## Playback Questions

### Human

- [ ] Can I run graft log and see which symbols changed per commit?
- [ ] Can I run graft blame on a function and see who last changed its signature?
- [ ] Can I run graft review on a PR and see structural vs formatting files?

### Agent

- [ ] Does graft_log return structured symbol changes per commit?
- [ ] Does graft_blame return creation commit, last signature change, and reference count?
- [ ] Does graft_review categorize files and detect breaking changes?
- [ ] Does graft_churn rank symbols by change frequency?
- [ ] Does graft_exports classify semver impact of API surface changes?
- [ ] Do all five tools respect hexagonal architecture (no WARP imports in operations)?
- [ ] Are all five registered in capabilities, schemas, burden, and tool-registry?
