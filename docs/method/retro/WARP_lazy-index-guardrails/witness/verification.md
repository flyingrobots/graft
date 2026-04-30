---
title: "Verification witness"
---

# Verification witness

Cycle: `WARP_lazy-index-guardrails`
Date: `2026-04-26`
Branch: `release/v0.7.0`

## Ref Repair

The oversized local WARP writer ref was:

```text
refs/warp/graft-ast/writers/graft -> 9a86eb7475df4728b0dfe4fb0b807f95d77fbdbb
patch.cbor blob -> ff56d7c723d2ab9f1ac4420eb8cdba18c750ca0d
patch.cbor logical size -> 838361609 bytes
```

Repair commands:

```bash
git update-ref refs/warp/graft-ast/writers/graft 1edc3492d43b9fb0ed7c5bda44fab58a8726c952 9a86eb7475df4728b0dfe4fb0b807f95d77fbdbb
git reflog expire --expire=now --expire-unreachable=now --all
git prune --expire now
git gc --prune=now
```

Post-repair checks:

```bash
git cat-file -e ff56d7c723d2ab9f1ac4420eb8cdba18c750ca0d
git count-objects -vH
```

Results:

- `git cat-file -e ff56d7c723d2ab9f1ac4420eb8cdba18c750ca0d` exits `1`.
- Pack size is about `5.08 MiB`, with no garbage reported.

## Runtime Trial

```bash
pnpm graft index --json
pnpm graft index --path src/warp/context.ts --json
pnpm graft symbol difficulty observeGraph --path src/warp/context.ts --json
git ls-tree -r -l refs/warp/graft-ast/writers/graft
git count-objects -vH
```

Results:

- `pnpm graft index --json` returns structured JSON and refuses `457`
  parseable files before writing a patch.
- `pnpm graft index --path src/warp/context.ts --json` returns
  `filesIndexed: 1` and `ok: true`.
- The current WARP writer tip is small; latest `patch.cbor` logical size is
  `10057` bytes.
- `pnpm graft symbol difficulty observeGraph --path src/warp/context.ts --json`
  completes with one low-risk result for `observeGraph`.
- The difficulty command reports `latencyMs: 40695`, which is residual
  materialization/query debt rather than an OOM failure.

## Focused Tests

```bash
pnpm typecheck
pnpm lint
git diff --check
pnpm guard:agent-worktrees
pnpm exec vitest run test/unit/warp/symbol-timeline.test.ts test/unit/warp/refactor-difficulty.test.ts test/unit/warp/dead-symbols.test.ts test/unit/warp/warp-structural-blame.test.ts test/unit/operations/structural-log.test.ts test/unit/operations/structural-churn.test.ts
pnpm exec vitest run test/unit/warp test/unit/operations/structural-churn.test.ts test/unit/operations/structural-blame.test.ts test/unit/operations/structural-log.test.ts test/unit/mcp/precision.test.ts test/unit/mcp/precision-warp-slice-first.test.ts
pnpm test
```

Results:

- typecheck passed.
- lint passed.
- whitespace check passed.
- agent worktree hygiene check passed.
- targeted temporal-query slice: `6` files, `31` tests passed.
- wider affected WARP/structural slice: `27` files, `150` tests passed.
- full test suite passed: `174` files, `1352` tests passed.
