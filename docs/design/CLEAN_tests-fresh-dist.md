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

In watch mode Vitest runs a global setup once for the project's lifetime, not
once per rerun, so the first version kept executing the `dist/` it found at
start-up after `src/` changed. The setup now goes through `keepDistFresh`,
which also registers `ensureFreshDist` with the project's `onTestsRerun` hook
(Vitest 5.0.0: `TestProject.onTestsRerun`, awaited before a rerun's tests
start), so every rerun rechecks and rebuilds when needed (changed in the
second review).

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
  means an orphan left by a deleted source file counts as stale. It does not
  catch a partial `dist/` whose surviving files are all new; the
  missing-module check below and, since the third review, building in a
  private staging directory cover that (corrected in the second review; the
  first version of this packet credited the oldest-output rule with it).
- Two completeness checks, added in review, because a partial `dist/` whose
  surviving files are all new passes the time rule:
  - **Every module has its output.** Each `src/**/*.ts` other than a `.d.ts`
    must have its `dist/**/*.js`. A missing one (for example
    `dist/cli/entrypoint.js`, which `bin/graft.js` loads) is stale. This needs
    no list of required outputs to maintain.
  - **An unfinished build never reaches `dist/`** (third review; this
    replaces the pending marker). The setup's build writes only a private
    staging directory, so a build that dies or throws leaves `dist/` as it
    was, which is stale because it was stale before the build started.
  - **Inputs must not change under the build** (added in the second
    review). `tsc` reads every input before it writes anything, so a source
    saved during a build gets an mtime older than every output and would pass
    the time rule from then on while holding the output from before the
    edit. Before each build the setup records the newest input mtime, the
    moment the build reads its inputs from; after the build it rescans, and
    if any input is now newer than that snapshot it discards the output and
    builds again. After three builds that each saw a change it fails the run
    and leaves `dist/` as it was. An edit saved after the rescan is newer
    than every output of that build, so the time rule catches it on the next
    check.

  Residual: a `pnpm build` that is itself killed after emitting every `.js`
  but before its declaration files passes both checks. Tests execute only the
  `.js`. Likewise a source saved during a `pnpm build` run outside the setup
  is not caught, because only the setup's own builds take the snapshot.

When stale it runs the repository's own build, `tsc -p tsconfig.build.json`
(what `pnpm build`, CI and the Docker image run) with only `--outDir` changed,
so the tested output is the shipped output, not a look-alike.

- **Build privately, publish by rename** (third review). The build writes
  `dist.staging.<pid>.<uuid>/` beside `dist/`: the same depth, so source-map
  paths match `pnpm build` byte for byte (checked: 1304 files identical), and
  the same filesystem, so publishing is a rename. After the build, and only
  if its inputs did not change under it and its output passes the freshness
  rules, the setup renames `dist/` aside to `dist.retired.<pid>.<uuid>/`,
  renames its staging directory to `dist/`, and deletes the retired one. A
  reader therefore finds `dist/` absent (stale, so it builds) or one build's
  complete output, never a mixture. If another process publishes between the
  two renames, the second rename fails because `dist/` is not empty; the
  setup keeps that build if it is current and otherwise builds again. Build
  directories whose creating process has exited are deleted at the start of
  the next build.

- **An input dated in the future fails the run before anything is
  built** (added in the second review). No build can write outputs newer
  than it, so building would fail the same way on every run until the clock
  caught up. The setup names the file and its time
  and says to fix the clock or reset the file's time. It is checked only when
  `dist/` is already stale.
- **Type errors do not block the run.** `tsc` exits 2 when it reports
  diagnostics but still emits every file; JavaScript emit does not depend on
  type checking, so that output is current. The setup prints the diagnostics
  as a warning and continues. `pnpm typecheck` remains the type gate.
- **Any other non-zero exit fails the run** with the compiler output,
  discards the staging directory and leaves `dist/` as it was (stale), so the
  next run builds again.
- **Concurrency: no lock** (third review). Workers are separate processes,
  but `globalSetup` runs once in the parent before they start, so workers
  never race each other. Two Vitest processes in one checkout (two agents, or
  a watcher plus a run) that both find `dist/` stale each build into their own
  staging directory and each publish by rename. Nothing but a publish writes
  `dist/`, every publish is one build's complete, verified output, and the
  freshness rule reads only mtimes, so whichever build lands last is judged
  correctly on the next check. The cost is a second build (about 3.5 s) when
  two processes start on a stale `dist/` at once. A check that scans `dist/`
  while another process is moving it aside sees entries vanish; a vanished
  file or directory counts as absent, which makes `dist/` stale and the
  process builds (changed in the second review: it used to throw `ENOENT`).

  Removed in the third review, and why. The earlier revisions serialized
  builds with a lock file in `node_modules/.cache/graft/` (pid and token,
  exclusive-create retirement claims for takeover, a two-minute age after
  which a live pid was presumed dead, a wait timeout, handling for the first
  version's lock directory, and cleanup of the lock's staging files), plus a
  pending marker for builds that died mid-write. The builds wrote `dist/`
  directly, so the lock was what kept two builds apart, and it could not: a
  build older than the age bound lost the lock but its compiler kept writing
  `dist/` after the taker had built and vouched for it, and the next check
  returned fresh with the pre-edit output (reproduced in review). With
  private staging and rename publication, overlapping builds cannot corrupt
  `dist/`, so the lock, the takeover protocol, the wall-clock age and the
  timeout protected nothing that is still at risk; they were deleted rather
  than made monotonic. The marker is replaced by staging, since a build that
  dies never touches `dist/`. What was given up: "two concurrent calls build
  once" (they now build twice), and nothing waits on another process.
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
  It also moves the build into parallel workers, so every run would build
  once per worker instead of once per process.
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
- A `dist/` missing the `.js` of any `src/` module is rebuilt even when every
  file it holds is new.
- A stale `dist/` with an input dated in the future fails the run, names the
  file, and neither changes `dist/` nor invokes the compiler.
- An input saved while the setup's build is running is never accepted as
  built: the setup rebuilds, and fails leaving `dist/` as it was if the
  inputs change under three builds in a row. A build whose output is no
  newer than its inputs is also rebuilt, because a coarse file system clock
  can give an output the same mtime as an input; three such builds in a row
  fail the run the same way, naming the stale output.
- A compiler exit of 2 (diagnostics, output emitted) warns and continues; any
  other failure, or a build that throws, aborts the run and leaves `dist/` as
  it was and no build directory beside it.
- `dist/` is only ever absent or one build's complete output: a build that
  read an input edited before it finished never ends up in `dist/`, whatever
  the wall clock does, and two concurrent calls each publish a complete build.
  (Third review; replaces "two concurrent calls build once".)
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
- [ ] Can two concurrent Vitest processes in one checkout leave a `dist/`
      that mixes two builds, or one built from inputs edited mid-build?

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
  (no sleeps) and an injected build function standing in for `tsc`. Each case
  owns its root and removes it through its own context's `onTestFinished`, so
  the file passes alone, shuffled and with `--sequence.concurrent` (changed in
  the second review: a shared cleanup list broke concurrent runs). The oracle
  is the Decision above: build exactly when an input is not older than the
  oldest output or a module's `.js` is missing; publish only a complete build
  whose inputs did not change under it, by rename; fail without
  building on a missing or future-dated input. RED first: with today's policy (build only when `dist/` is absent),
  the stale-dist case must fail because the stale output is kept.
- Size: medium (Rule 9), owner @flyingrobots. Every case does application
  filesystem I/O in its own temp directory, and the abandoned-build-directory
  case spawns one short `node` child to obtain an exited pid, so the suite is
  not small.
  Ceiling: 2000 ms per case, enforced by the `describe` timeout; at most one
  child process at a time; no network; suite budget 2 s for the file.
  Measured on a macOS host, Node 26.0.0, 10 cores: 2 to 70 ms per case and
  about 0.47 s for the file over three runs at 34 cases (fourth review; 2 to
  64 ms and about 0.39 s at 28 cases in the third; 2 to 120 ms and about
  0.5 s at 33 cases in the second; 4 to 141 ms at 22).
  (Corrected in review: the first version declared the suite small.)
- CI stage: pre-merge, as Rule 9 places medium tests. The CI workflow's
  `test` job runs `pnpm test` (the Docker-isolated full Vitest run, whose
  include pattern covers this file) in its Node 22 leg, on every pull request
  to `main` and every push to `main`. Added in the second review.
- Deletion criterion (Rule 18): delete the suite together with
  `test/helpers/fresh-dist.ts` when no test executes `dist/` any more, or
  when `dist/` freshness moves to a mechanism with its own tests covering
  these claims (for example building before every run). Displaced risk if it
  is deleted without either: a test executing a stale or partial `dist/`,
  the failure this cycle exists to prevent. Added in the second review.
- The concurrency cases are calls in one process against builds the test
  holds open. They synchronize on a build having started, not on a timer.
  The slow-build case also passes the helper a clock three minutes forward
  (its `now` option; until the fourth review it faked the global `Date`,
  a change concurrent cases could see), past the age
  at which the removed lock presumed a build dead, so an age-based design
  cannot return unnoticed. Two processes run the same filesystem path, but
  cross-process schedules are not separately exercised (model limit).
- Races with another process are staged without production hooks: a
  pass-through `node:fs` mock runs a callback before `readdirSync` of a
  registered directory (a directory deleted mid-scan) and before
  `renameSync` (another process publishing between this one's two renames,
  and an observer that records what `dist/` holds at every rename). The
  helper exports only `ensureFreshDist`, `keepDistFresh` and `tscBuild`.
- Run the two executing consumers from a checkout with no `dist/`, then lint,
  typecheck, and one full host Vitest run.
