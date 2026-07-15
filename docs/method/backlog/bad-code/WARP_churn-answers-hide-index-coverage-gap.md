---
title: "graft_churn answers hide index coverage gap and interactive-latency breach"
feature: warp
kind: bad-code
legend: WARP
lane: bad-code
priority: 1
effort: M
status: open
reported: 2026-07-15
---

# graft_churn answers hide index coverage gap and interactive-latency breach

## Problem

On this repository (1,114 commits; `git log --numstat` shows files with
70-134 touches), a live `graft_churn` call on 2026-07-15 returned:

- `latencyMs: 423165` — 7.05 minutes for a churn summary
- `"331 symbols across 236 commits. Hottest: stateLoad (2 changes)"`

The structural index answered from roughly 21% of the repo's actual
history and reported a maximum symbol churn of 2, while git-level truth
shows two orders of magnitude more change. Nothing in the tool output
tells the caller the answer is under-indexed: there is no coverage
field, no warning, no receipt annotation. An agent consuming this
output would confidently rank hotspots from a fraction of reality.

The latency half is a known tension (BEARING: "git-warp Substrate
Strain") with the Echo migration as the fix. The honesty half is not
tracked anywhere and is independent of the substrate swap.

## Expected

- Churn (and other WARP history tools) include an explicit coverage
  block: `indexedCommits`, `totalCommits`, `coverageRatio`.
- Receipts carry a warning when coverage falls below a threshold or
  latency exceeds an interactive bound.
- Tests assert the coverage field against a partially-indexed fixture.

## Evidence

- Live receipt from the 2026-07-15 audit session, seq 7, traceId
  `c75b313d-5945-4d16-8af0-94f394f8a2d3`
  (`blog/Graft/audits/2026-07-15-graft-deep-dive.md`, claims 40-41).
