---
title: "Tests never run a stale dist"
legend: CLEAN
cycle: CLEAN_tests-fresh-dist
source_backlog: "operator report: a CLI integration test ran a month-old build"
---

# Tests never run a stale dist

Source: operator report. `test/integration/cli/git-graft-enhance-cli.test.ts`
executed a `dist/` build about a month old that still read the home directory,
after the source had stopped doing so. Operator decision: fix it so no test
ever runs a stale build.
Legend: CLEAN

## Sponsors

- Human: James Ross
- Agent: Claude

## Hill

Every Vitest run, on the host or in the Docker-isolated harness, executes a
`dist/` that was compiled from the current build inputs. A run whose `dist/`
is current pays only a file-stat scan; a run whose `dist/` is missing or older
than its inputs rebuilds it once before any test file starts.

## Evidence

`dist/` is git-ignored build output. Tests that load it:

| Test | What it does with `dist/` | Class |
| :--- | :--- | :--- |
| `test/unit/warp/sidecar.test.ts` | spawns `node` children that import `dist/warp/sidecar.js` ("installs the first complete sidecar atomically across processes") | executes built code |
| `test/integration/cli/git-graft-enhance-cli.test.ts` | runs `git graft` through `bin/graft.js`, which imports `dist/cli/entrypoint.js`; builds only when that one file is missing | executes built code |
| `test/unit/release/package-library-surface.test.ts` | reads `package.json` and the text of `bin/graft.js` | metadata only |
| `test/unit/release/package-files-exist.test.ts` | checks `package.json` `files` entries exist, skipping `dist/` | metadata only |
| `test/unit/release/echo-independence.test.ts`, `tests/playback/CORE_git-graft-enhance.test.ts` | read `main`/`bin` fields of `package.json` | metadata only |
| `test/unit/mcp/daemon-worker-pool.test.ts` | computes a worker path from a synthetic `file:///package/dist/...` URL | pure path logic, no disk |
| `test/unit/cli/init.test.ts`, `test/unit/policy/bans.test.ts`, `test/unit/operations/teaching-hints.test.ts`, `test/integration/safe-read.test.ts`, `tests/playback/SURFACE_agent-dx-governed-edit.test.ts`, `tests/playback/0083-public-api-contract-and-stability-policy.test.ts` | the string `dist/` appears as fixture data or document text | unrelated |

Observed on `origin/main` `19d84524` with `dist/` absent:
`pnpm exec vitest run test/unit/warp/sidecar.test.ts` fails 1 of 17 with
`ERR_MODULE_NOT_FOUND ... dist/warp/sidecar.js`. With `dist/` present but old,
both executing tests pass against whatever the old build contains.

The two executing tests therefore have two defects: the sidecar test has no
build step at all, and the enhance test's step is an existence check on one
file, which is exactly what let a month-old build through. Its build also runs
inside a test worker, so two workers could start `tsc` into the same directory.

## Decision

A Vitest `globalSetup` module, `test/global-setup-fresh-dist.ts`, calls
`ensureFreshDist` from `test/helpers/fresh-dist.ts` once per Vitest process,
before any worker starts.

`ensureFreshDist` decides freshness the way `make` does, by modification time:

- **Inputs**: every file and directory under `src/`, plus `tsconfig.json`,
  `tsconfig.build.json`, `package.json`, and `pnpm-lock.yaml`. Directories are
  inputs so that deleting a source file (which updates its directory's mtime)
  makes the build stale. `src/` and each listed config file are required: if
  one is missing the setup fails and names it, without building, because a
  missing input would otherwise drop out of the comparison and leave an old
  `dist/` looking fresh (added in review).
- **Outputs**: every file under `dist/`.
- `dist/` is fresh only when it contains at least one file and its **oldest**
  file is strictly newer than the **newest** input. Using the oldest output
  means an orphan left by a deleted source file, or a file left by an
  interrupted build, counts as stale.
- Two completeness checks, added in review, because a partial `dist/` whose
  surviving files are all new passes the time rule:
  - **Every module has its output.** Each `src/**/*.ts` other than a `.d.ts`
    must have its `dist/**/*.js`. A missing one (for example
    `dist/cli/entrypoint.js`, which `bin/graft.js` loads) is stale. This needs
    no list of required outputs to maintain.
  - **An unfinished build is stale.** Before removing `dist/` the setup writes
    `node_modules/.cache/graft/dist-build.pending`, outside the published
    package, and removes it only after the build has finished. If the process
    dies in between, or the build function throws, the marker survives and
    the next run rebuilds. `dist/` produced by `pnpm build` alone (Docker, CI)
    has no marker, so it is judged by the other rules and is not rebuilt.

  Residual: a `pnpm build` that is itself killed after emitting every `.js`
  but before its declaration files leaves no marker and passes both checks.
  Tests execute only the `.js`.

When stale it removes `dist/` and runs the repository's own build,
`tsc -p tsconfig.build.json` (what `pnpm build`, CI and the Docker image run),
so the tested output is the shipped output, not a look-alike.

- **Type errors do not block the run.** `tsc` exits 2 when it reports
  diagnostics but still emits every file; JavaScript emit does not depend on
  type checking, so that output is current. The setup prints the diagnostics
  as a warning and continues. `pnpm typecheck` remains the type gate.
- **Any other non-zero exit fails the run** with the compiler output and
  removes `dist/`, so the next run cannot mistake a partial emit for a fresh
  build.
- **Concurrency.** Workers are separate processes, but `globalSetup` runs once
  in the parent before they start, so workers never race each other. Two
  Vitest processes in one checkout (two agents, or a watcher plus a run) are
  serialized by a lock file, `node_modules/.cache/graft/dist-build.lock`,
  holding the owner's pid and a random token that names this lock instance.
  It is created by hard-linking a fully written staging file into place, so
  it never exists without its content and one of several racing creators
  wins. A waiter re-checks freshness after acquiring the lock, so the second
  process does not rebuild. A lock whose pid is no longer alive is taken over,
  but only the instance the waiter saw (changed in review): whoever removes an
  instance, its owner releasing it or a waiter taking it over, first creates
  `dist-build.lock.retire.<token>.<n>` exclusively, then removes the lock only
  if it still carries that token. So two waiters that both saw the same dead
  owner cannot both acquire: one wins the claim, and the other either loses
  it or finds a newer lock and leaves it alone. A claim whose holder died is
  superseded by claim n+1, so a crash while retiring does not wedge the lock.
- **Docker harness.** The image's `build` stage runs `pnpm build` after
  `COPY . .`, so inside the container every `dist/` file is newer than every
  input and the setup does nothing. `.dockerignore` already keeps the host's
  `dist/` out of the image.
- **CI** runs `pnpm build` and then the Docker harness; the same reasoning
  applies.
- The enhance test's own `ensurePackageBinBuild` is deleted; the sidecar test
  needs no change.

### Alternatives rejected

- **Always build before every run.** Correct, but charges every run, including
  a one-file run that never touches `dist/`, the full compile (about 3.5 s
  measured on this checkout). The mtime scan gives the same guarantee for the
  common case at a few milliseconds.
- **Per-test build in each consuming file.** Only the two executing files would
  pay, but each future test that loads `dist/` must remember to call it, and
  forgetting reproduces the silent-stale failure this cycle exists to remove.
  It also moves the build into parallel workers, which then need the lock for
  every run instead of only across processes.
- **Fail loudly instead of building.** Honest, but turns every source edit into
  a manual `pnpm build` step before tests, and developers will learn to reach
  for a stale build to get green again.
- **Content hash stamp instead of mtimes.** Exact under mtime-preserving copies,
  but it needs a stamp file somewhere: inside `dist/` it would ship in the npm
  package, outside it the Docker image has no stamp and would rebuild on every
  container run. The mtime rule needs no state and matches the `make` model
  contributors already expect.
- **`tsc --noCheck`** (about 1 s faster). Its JavaScript was byte-identical to
  the full build on this checkout, but 9 declaration files differed, so the
  `dist/` a test run leaves behind would not be what `pnpm build` produces.

## Acceptance Criteria

- A Vitest run with `dist/` missing builds it once before tests start.
- A Vitest run whose `dist/` is older than any `src/` file, any `src/`
  directory, or any listed build-config file rebuilds it from a clean
  directory, so orphaned outputs disappear.
- A Vitest run with `src/` or a listed build-config file missing fails before
  any test starts, names the missing input, and does not invoke the compiler.
- A Vitest run whose `dist/` is newer than every input does not invoke the
  compiler.
- A `dist/` missing the `.js` of any `src/` module, or left by a build that did
  not finish, is rebuilt even when every file it holds is new.
- A compiler exit of 2 (diagnostics, output emitted) warns and continues; any
  other failure aborts the run and leaves no `dist/`.
- Two concurrent `ensureFreshDist` calls on one checkout build once.
- `test/unit/warp/sidecar.test.ts` and
  `test/integration/cli/git-graft-enhance-cli.test.ts` pass from a checkout
  with no `dist/`.
- The Docker-isolated `pnpm test` path is unchanged: its image already builds
  `dist/`, and the setup finds it fresh.

## Playback Questions

### Human

- [ ] If I edit a file under `src/` and run a test that executes `dist/`, does
      it run my edit?
- [ ] If I run a test and nothing changed, does the run avoid a rebuild?
- [ ] Does a type error in `src/` still let me run unrelated tests?

### Agent

- [ ] Does any test that executes `dist/` still rely on its own build step?
- [ ] Does a failed build leave something a later run would take as fresh?
- [ ] Do two concurrent Vitest processes in one checkout build once?

## Non-goals

- Do not change `pnpm build`, the Dockerfile, CI, or the isolated runner.
- Do not change the metadata-only tests; they do not execute built code.
- Do not make `dist/` exactness depend on content hashes.
- Do not fix the playback tests that time out locally on `main`
  (`SURFACE_opened-workspace-paths`, `WARP_dead-symbol-detection`,
  `WARP_symbol-history-timeline`, sometimes `SURFACE_agent-dx-governed-edit`).
- Do not protect a Vitest run from another process rebuilding `dist/` while
  the first run's tests are already executing it; that race needs two runs in
  one checkout with changing source, and is out of scope.

## Expected Test Strategy

- Unit tests for `ensureFreshDist` in `test/unit/helpers/fresh-dist.test.ts`
  against a temporary fake package root, with mtimes set by `fs.utimesSync`
  (no sleeps) and an injected build function standing in for `tsc`. The oracle
  is the rule above: build exactly when an input is not older than the oldest
  output. RED first: with today's policy (build only when `dist/` is absent),
  the stale-dist case must fail because the stale output is kept.
- Size: medium (Rule 9), owner @flyingrobots. Every case does application
  filesystem I/O in its own temp directory, and the dead-owner cases spawn one
  short `node` child to obtain an exited pid, so the suite is not small.
  Ceiling: 2000 ms per case, enforced by the `describe` timeout; at most one
  child process at a time; no network. Measured at 4 to 141 ms per case.
  (Corrected in review: the first version declared the suite small.)
- The concurrency case is two calls in one process against a build the test
  holds open. It synchronizes on the build having started, not on a timer:
  the second call starts only once the first holds the lock and is building.
  Cross-process locking is the same code path through the filesystem but is
  not separately exercised (model limit).
- Run the two executing consumers from a checkout with no `dist/`, then lint,
  typecheck, and one full host Vitest run.
