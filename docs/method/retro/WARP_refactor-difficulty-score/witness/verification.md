---
title: "Verification witness"
---

# Verification witness

Cycle: `WARP_refactor-difficulty-score`
Date: `2026-04-26`
Branch: `release/v0.7.0`

## Commands

```bash
pnpm exec vitest run test/unit/cli/main.test.ts test/unit/warp/refactor-difficulty.test.ts test/unit/contracts/output-schemas.test.ts test/unit/contracts/capabilities.test.ts tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts test/unit/release/three-surface-capability-posture.test.ts test/unit/mcp/tools.test.ts
pnpm exec vitest run test/unit/mcp/runtime-observability.test.ts test/unit/cli/main.test.ts
git diff --check
pnpm guard:agent-worktrees
pnpm typecheck
pnpm lint
pnpm test
```

## Results

- focused WARP/contracts/CLI/MCP slice: `8` files, `76` tests passed
- timeout-sensitive CLI/runtime-observability slice: `2` files, `29` tests passed
- whitespace check passed
- agent worktree hygiene check passed
- typecheck passed
- lint passed
- full test suite passed: `174` files, `1352` tests

## Notes

- Refactor difficulty is scored from WARP graph data as churn curvature multiplied by reference friction.
- The operation tests cover aggregate churn, signature instability, reference friction, duplicate-symbol sorting, path disambiguation, and unindexed symbols.
- The grouped CLI test indexes a fixture repo and runs `graft symbol difficulty greet --path app.ts --json` end to end.
- The CLI, MCP, capability registry, and output-schema surfaces were updated and covered by contract tests.

## Runtime trial

Trying the new command against the current graft repo exposed WARP graph
storage pressure first. The oversized local WARP ref was repaired in the
`WARP_lazy-index-guardrails` cycle, after which the difficulty command completed
against the current repo:

```bash
pnpm graft index --json
pnpm graft index --path src/warp/context.ts --json
pnpm graft symbol difficulty observeGraph --path src/warp/context.ts --json
git ls-tree -r -l refs/warp/graft-ast/writers/graft
```

Results:

- `pnpm graft index --json` returns structured JSON and refuses the repo's
  `457` parseable files before writing a patch.
- `pnpm graft index --path src/warp/context.ts --json` succeeds with
  `filesIndexed: 1`.
- `pnpm graft symbol difficulty observeGraph --path src/warp/context.ts --json`
  completes and reports one low-risk `observeGraph` entry.
- The latest WARP `patch.cbor` is `10057` bytes, not hundreds of megabytes.
- Residual latency debt was filed in
  `docs/method/backlog/bad-code/warp-materialization-query-latency.md`.
