---
title: WARP materialization and query latency remains too high after lazy indexing
feature: warp-query
kind: trunk
legend: BAD_CODE
effort: M
requirements:
  - "WARP lazy index guardrails"
acceptance_criteria:
  - "A single-symbol difficulty query over a small indexed graph completes in an interactive budget"
  - "Materialization work is scoped to the queried slice where possible"
  - "Latency is visible in verification output so regressions are caught before release"
---

## What

After repairing the oversized WARP ref and switching indexing to bounded
per-file patches, the graph no longer crashes on the nearly 1 GB CAS object.
However, a small live query is still too slow:

```bash
pnpm graft symbol difficulty observeGraph --path src/warp/context.ts --json
```

The command completed successfully but reported:

```text
latencyMs: 40695
```

That is acceptable as proof that the OOM blocker is gone, but it is not an
acceptable steady-state query budget.

## Why it matters

Lazy indexing makes WARP survivable again, but slow materialization still keeps
truth surfaces from feeling like normal interactive tools. Agents need these
queries to be cheap enough to run during ordinary pull/read/green cycles.

## Notes

- This is residual debt from `WARP_lazy-index-guardrails`.
- It should be handled separately from release ceremony and separately from the
  already-fixed oversized patch/object failure mode.
