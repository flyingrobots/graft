---
title: "Cycle 0021 — Stream/Port Invariant"
---

# Cycle 0021 — Stream/Port Invariant

**Hill:** Enforce the stream/port boundary invariant at runtime.

**Outcome:** Hill met.

## What shipped

- Runtime guards: assertNotStream, assertStream, guardPortReturn, isAsyncIterable
- ToolDefinition registry pattern (OCP compliance)
- PROJECTION_METRICS + CACHEABLE_PROJECTIONS constants (P3 fix)
- Invariant doc: streams-traversal-ports-truth.md
- Design doc
- First all-green SSJS scorecard in project history

## Playback

- Agent: do stream guards throw on violations? **Yes** — 156 test assertions.
- Human: is the invariant documented and enforceable? **Yes** — invariant doc + runtime guards.

## Drift

None.

## CodeRabbit review

4 rounds, 25 issues resolved. All addressed.

## Also shipped (PR #20 — bad-code cleanup)

- Centralized args validation via z.object(def.schema).parse()
- All node:fs removed from tool handlers → ctx.fs port
- run-capture refactored to async writes
- Strict Zod validation (.strict()) at MCP edge
- Cache-hit policy re-check (defense-in-depth)
- run_capture log-write isolation

## Lessons

- All SSJS dimensions can be green — it just takes grinding the yellows.
- ToolDefinition pattern is the right level of OCP for this codebase.
