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

## Second review gates

One commit per finding, from `6123a249` to `119a0c15`. After each code commit: the helper
directory's six files (the fresh-dist suite plus five unrelated helper suites), the two
dist-executing suites (`sidecar`, enhance CLI; 20 of 20 each time), `pnpm lint` exit 0,
`pnpm typecheck` exit 0, `git diff --check` clean, and `node_modules/.cache/graft/` empty afterwards.
The fresh-dist suite ended at 33 of 33, and also passed 33 of 33 on three runs with
`--sequence.concurrent --sequence.shuffle` (seeds 1 to 3).

Full host run after the last commit, `src/index.ts` touched first
(`NPM_CONFIG_USERCONFIG=/dev/null pnpm exec vitest run`, macOS, Node 26.0.0): 277 files, 2496 tests,
2493 passed, 3 failed, 137.4 s. All three failures are 5000 ms timeouts on the known local-timeout
list (`SURFACE_opened-workspace-paths`, `WARP_dead-symbol-detection`,
`WARP_symbol-history-timeline`). `test/unit/git/diff.test.ts` and
`test/unit/mcp/structural-blame.test.ts` passed. The setup rebuilt `dist/` (`dist/index.js` 4 s
newer than the touched `src/index.ts`), and `node_modules/.cache/graft/` was empty afterwards.

The Docker-isolated run was not attempted: `docker info` did not return within 20 s.

## Cost

`ensureFreshDist` timed directly with the real build, three runs each:

| State | Result |
| :--- | :--- |
| stale (`src/index.ts` touched) | built in 3276, 3391, 3324 ms |
| fresh | 9.8, 8.9, 15.8 ms |

For comparison, `tsc -p tsconfig.build.json` alone took 3.5 s wall clock, and `--noCheck` 2.4 s.

## Third review: Docker path

- Local: `timeout 20 docker info` at 2026-09-28T11:54:23Z exited 124; the client section printed
  and the server section stopped at its heading, so the Docker daemon on the development host did
  not answer and the Docker-isolated run was not attempted here (third attempt this cycle).
- CI: on `6123a249` the CI workflow's `test (22)` job, whose step "Tests" runs `pnpm test` (the
  Docker-isolated full Vitest run), succeeded at 2026-09-28T10:59:40Z: 277 files passed, 2485 tests
  passed, `test/unit/helpers/fresh-dist.test.ts` 22 of 22 (run 36412440364, job 108895576573).
  `test (20)` also succeeded. That is Docker-path evidence for `6123a249`, not for the staging
  design that replaced the lock after it; the setup prints nothing when it finds `dist/` fresh, so
  the log does not show whether it built inside the container.

## Third review gates

One commit per item from `c9b6ccd1`: `a0ff5500` (staging and rename publication; lock removed),
`bed5bc0c` (Docker evidence), `7871b506` (cleanup retry), `b2c70f69` (retro corrections). After
each code commit: the helper directory's suites plus the two dist-executing suites (`sidecar`,
enhance CLI), 8 files, 62 of 62 after `a0ff5500` and 65 of 65 after `7871b506`; `pnpm lint` exit 0;
`pnpm typecheck` exit 0; `git diff --check` clean. The fresh-dist suite is 28 of 28, and 28 of 28 on
three runs with `--sequence.concurrent --sequence.shuffle` (seeds 1 to 3), with no
`graft-fresh-dist-*` directory left in the temp directory.

Full host run on `b2c70f69`, `src/index.ts` touched first
(`NPM_CONFIG_USERCONFIG=/dev/null pnpm exec vitest run`, macOS, Node 26.0.0): 277 files, 2495 tests,
2492 passed, 3 failed, 141.1 s. All three failures are 5000 ms timeouts on the known local-timeout
list (`SURFACE_opened-workspace-paths`, `WARP_dead-symbol-detection`,
`WARP_symbol-history-timeline`), the same three as the second review's full run.
`test/unit/git/diff.test.ts` and `test/unit/mcp/structural-blame.test.ts` passed. The setup
rebuilt `dist/` through a staging directory (`dist/index.js` 3 s newer than the touched
`src/index.ts`), no `dist.staging.*` or `dist.retired.*` directory was left beside it, and the run
printed no `[graft test cleanup]` retry warning. The same run on `7871b506` (before the retro-only
commit) gave the same counts and the same three timeouts.
