---
title: "Verification witness"
---

# Verification witness

Cycle: `WARP_materialization-query-latency`
Date: `2026-04-26`
Branch: `release/v0.7.0`

## Baseline

The backlog card was filed after this command completed without OOM but was too
slow for an interactive truth surface:

```bash
pnpm graft symbol difficulty observeGraph --path src/warp/context.ts --json
```

Baseline result:

```text
latencyMs: 40695
```

Investigation found:

```text
ctx.app.core().materialize(): 25401ms
symbolTimeline(...):          40277ms
visible patch commits:        1678
```

The materialized graph also contained legacy `commit:*` nodes without numeric
`tick` properties, which the old timeline treated as `tick = 0`.

## Checkpoint Ref

Before enabling a checkpoint policy, the graph had no checkpoint ref:

```bash
git show-ref refs/warp/graft-ast/checkpoints/head
```

Result:

```text
<no output>
```

After enabling `checkpointPolicy` and running the live query once:

```bash
git show-ref refs/warp/graft-ast/checkpoints/head
```

Result:

```text
8d03e7912fc16926b7c77788ca18132fb4c21e1d refs/warp/graft-ast/checkpoints/head
```

Checkpointing alone was not sufficient, because git-warp ceiling reads bypass
checkpoints by design:

```text
first checkpointing run latencyMs: 29726
post-checkpoint ceiling run:      latencyMs: 28465
```

## Final Runtime Trial

After switching symbol timeline reads to WARP provenance for exact/live
symbols:

```bash
time pnpm graft symbol difficulty observeGraph --path src/warp/context.ts --json
```

Result:

```text
latencyMs: 349
wall time:  3.219s
```

The command returned one low-risk `observeGraph` entry from
`src/warp/context.ts`.

## Focused Tests

```bash
pnpm exec vitest run test/unit/warp/open.test.ts test/unit/warp/symbol-timeline.test.ts test/unit/warp/refactor-difficulty.test.ts test/unit/warp/warp-structural-blame.test.ts
```

Result:

```text
Test Files  4 passed (4)
Tests       16 passed (16)
```

## Full Validation

```bash
pnpm typecheck
pnpm lint
git diff --check
pnpm guard:agent-worktrees
pnpm test
```

Results:

```text
typecheck: pass
lint: pass
diff whitespace: pass
agent worktree hygiene: pass
pnpm test: 175 files passed, 1355 tests passed
```
