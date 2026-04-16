---
title: Repo-tool worker adapter mixes tool selection, context emulation, and receipt shaping
lane: graveyard
legend: CLEAN
---

# Repo-tool worker adapter mixes tool selection, context emulation, and receipt shaping

## Disposition

Retired because the exact claim is stale after the worker-context split. `repo-tool-job.ts` no longer owns the same worker-side context emulation and receipt-shaping bundle described by this note.

## Original Proposal

`src/mcp/repo-tool-job.ts` currently owns:

- the allowlist of offloaded daemon repo tools
- worker-side tool-context construction
- policy-check wrapping for worker-run tools
- receipt shaping for off-process tool execution
- metrics-delta packaging back to the daemon

Why this is debt:

- adding cache-aware bounded-read offload will put more pressure on the
  job envelope and result-delta contract
- WARP-aware precision offload will likely need a different execution
  posture from the current live/structural adapter
- keeping tool selection and execution-context emulation in one file
  will make it harder to reason about what is truly worker-safe

Desired end state:

- separate worker-safe tool registry from job-envelope shaping
- isolate worker-side receipt/context glue from tool selection policy
- keep metrics and cache delta protocols explicit and independently testable

Effort: M
