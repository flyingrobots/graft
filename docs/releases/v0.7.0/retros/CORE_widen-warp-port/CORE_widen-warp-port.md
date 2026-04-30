---
title: "Retro: CORE_widen-warp-port"
cycle: "CORE_widen-warp-port"
release: "v0.7.0"
design_doc: "docs/releases/v0.7.0/design/CORE_widen-warp-port.md"
outcome: "hill-met"
drift_check: yes
---

# Retro: CORE_widen-warp-port

## Conclusion: PASS

Killed `WarpHandle` port. git-warp types flow directly through
application code. `WarpContext` DI bag carries `strandId` for future
multi-agent strand isolation. All routing helpers fail-closed on strand
path until git-warp strand merging lands.

## What went well

- **Design discussion surfaced the real constraint.** Initial instinct
  was "widen the port" or "kill the port, use WarpApp directly." The
  human pointed out strands as the native multi-agent primitive and that
  reads diverge too — which produced the correct uniform-routing design.
- **Mechanical migration was clean.** 27 source files + 18 test files
  migrated. Zero regressions across 1188 tests.
- **The anti-sludge exception is well-reasoned.** git-warp is domain
  infrastructure, not external I/O. The port was a capability bottleneck
  masquerading as architecture.

## What drifted

- Design showed `patchGraph`/`observeGraph` as sync functions. Built
  them `async` so `assertNoStrand` throws become rejections. No semantic
  difference but playback test assertions needed `async` in the string
  match.

## What to watch

- When git-warp strand merging stabilizes, remove the `assertNoStrand`
  guards and activate strand routing. The hooks are in place — each
  helper has a comment showing the future one-line change.
- `persisted-local-history-graph.ts` and `persisted-local-history.ts`
  call `app.core().hasNode()` and `app.observer()` directly instead of
  through `observeGraph`. These are always-live reads today. When
  strands arrive, they may need routing if local-history should be
  strand-scoped.

## Follow-on backlog items

None added. The dependency chain continues:
```
CORE_deprecate-index-commits
  └── CORE_rewrite-structural-queries
        └── CORE_rewrite-operations-for-warp-queries
```
