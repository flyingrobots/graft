---
title: "WARP lazy index guardrails"
cycle: "WARP_lazy-index-guardrails"
source_backlog: "docs/method/backlog/bad-code/warp-index-default-heap-oom.md"
outcome: hill-met
drift_check: yes
---

# WARP lazy index guardrails Retro

## Summary

The blocker was repaired. The local `graft-ast` writer ref no longer points at
the nearly 1 GB patch, the oversized CAS object was pruned, and `graft index`
now follows a bounded lazy-index policy instead of trying to emit the whole
repository as one graph payload.

This closes the WARP index OOM bad-code card by retro/witness. The remaining
latency issue is tracked separately as residual debt.

## What Shipped

- Reset `refs/warp/graft-ast/writers/graft` from the oversized patch to the
  previous usable patch and ran Git GC/prune.
- Changed full AST graph emission to one compact root anchor plus an attached
  AST snapshot blob.
- Changed `indexHead` to write one bounded patch per file and refuse unbounded
  whole-repo calls.
- Added `graft index --path <path>` for explicit lazy indexing.
- Wired MCP read surfaces to opportunistically index read paths when the repo is
  clean.
- Fixed per-file lazy index time semantics so one Git commit can span multiple
  WARP Lamport ticks without breaking timeline, dead-symbol, blame, churn, or
  refactor-difficulty queries.
- Added tests for bounded index refusal, AST snapshot attachment, and affected
  WARP temporal query behavior.

## Validation

- `pnpm graft index --json` refuses the current repo's `457` parseable files
  before writing a patch.
- `pnpm graft index --path src/warp/context.ts --json` writes one bounded
  per-file patch and returns `filesIndexed: 1`.
- `pnpm graft symbol difficulty observeGraph --path src/warp/context.ts --json`
  completes on the repaired graph.
- The old oversized blob `ff56d7c723d2ab9f1ac4420eb8cdba18c750ca0d` is no
  longer reachable.

See `witness/verification.md` for command output and counts.

## Follow-On Pressure

WARP materialization/query latency is still too high for a graph with only a
small number of indexed slices. That is not the same failure mode as the OOM
blocker, so it is tracked as a separate bad-code card.
