# Verification Witness: CLEAN tests never run a stale dist

All runs are host Vitest (`pnpm exec vitest run`) on macOS, Node 26.0.0, TypeScript 6.0.2, from
branch `cycle/tests-fresh-dist` based on `origin/main` `19d84524`. The Docker-isolated `pnpm test`
was not run in this cycle.

## Baseline on main's behaviour

With `dist/` absent, `test/unit/warp/sidecar.test.ts` failed 1 of 17:

```text
× installs the first complete sidecar atomically across processes
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../dist/warp/sidecar.js'
```

With a planted stale build (a real build whose `dist/cli/entrypoint.js` was replaced by
`throw new Error("STALE BUILD MARKER")`, every `dist/` file dated 2026-08-01) and main's
`vitest.config.ts` (no global setup), the enhance CLI test ran the planted file:

```text
[graft] Failed to load CLI entrypoint from dist.
× supports Git external-command invocation through git graft in a temp repo
Tests  1 failed | 2 passed (3)
```

That run used this branch's copy of the test file, whose own build step had already been removed.
The step on main checks only that `dist/cli/entrypoint.js` exists, so it would also have kept the
planted file.

## RED

`test/unit/helpers/fresh-dist.test.ts` was run against a baseline `ensureFreshDist` that used main's
policy (build only when `dist/` is absent): 11 failed, 2 passed of 13. Each stale case failed
because the stale output was kept:

```text
× rebuilds when a source file is newer than the build
AssertionError: expected 'fresh' to be 'built'
```

The config-file (4), deleted-source, and predating-output cases failed the same way. The exit-2 case
failed on the missing warning, the hard-failure case because the promise resolved, the race case
with `[ 'built', 'built' ]`, and the dead-owner case because the lock was left in place.
The two cases that passed (dist missing, dist fresh) are ones main's policy already handles.

## GREEN

Same file against the implementation: 13 passed of 13.

Calibration by deliberate fault, each reverted:

| Fault | Result |
| :--- | :--- |
| `src/` directories not counted as inputs | 1 failed: the deleted-source case |
| newest output used instead of oldest | 1 failed: the predating-output case |
| no clean before rebuilding | 2 failed: deleted-source and predating-output |

Planted stale build again, with the global setup: enhance CLI test 3 of 3 passed, and the marker
was gone from `dist/cli/entrypoint.js` afterwards.

A real `tsc` exit 2 (a type error appended to `src/index.ts`, then restored): the setup printed the
warning with `error TS2322`, returned `built`, and `dist/index.js` contained the new export.

## Gates

- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- Tests that execute or inspect `dist/` or package metadata, together with the new tests: 8 files,
  58 of 58 passed.
- `dist/` removed, then the sidecar and enhance CLI tests: 2 files, 20 of 20 passed, 15.0 s
  wall clock including the build.
- Full host run with `dist/` stale (`src/index.ts` touched): 277 files, 2476 tests;
  2470 passed, 6 failed; 164.7 s.
  - Known local timeouts on main, not investigated here: `SURFACE_opened-workspace-paths`,
    `WARP_dead-symbol-detection`, `WARP_symbol-history-timeline`, `SURFACE_agent-dx-governed-edit`.
  - Not on that list: `test/unit/git/diff.test.ts` "lists deleted files" (`ENOTEMPTY` in
    `cleanupTestRepo` removing its temp repo) and `test/unit/mcp/structural-blame.test.ts`
    (5000 ms timeout). Neither loads `dist/`. Both files passed 19 of 19 twice when run on their own.
    Whether they also fail on main under full-suite load was not checked. (Checked in review:
    see the retro's "Rule 10 follow-up" for three parent-revision runs.)

## Review follow-up gates

After the review fixes (`1d318219`): the fresh-dist helper suite 22 of 22; the helper suite with
the dist-executing and package-metadata tests, 7 files, 60 of 60; `pnpm lint` exit 0;
`pnpm typecheck` exit 0. Full host run with `src/index.ts` touched first: 277 files, 2485 tests,
2481 passed, 4 failed (the four known local timeouts), 146.7 s. Afterwards
`node_modules/.cache/graft/` held no lock, retirement claim or pending marker.

## Cost

`ensureFreshDist` timed directly with the real build, three runs each:

| State | Result |
| :--- | :--- |
| stale (`src/index.ts` touched) | built in 3276, 3391, 3324 ms |
| fresh | 9.8, 8.9, 15.8 ms |

For comparison, `tsc -p tsconfig.build.json` alone took 3.5 s wall clock, and `--noCheck` 2.4 s.
