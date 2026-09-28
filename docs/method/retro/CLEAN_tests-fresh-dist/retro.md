# Retro: CLEAN tests never run a stale dist

## Status

Met locally on host Vitest. CI ran this branch at `6123a249`: `test (20)` and `test (22)` passed,
and `test (22)` runs the Docker-isolated `pnpm test` (277 files, 2485 tests passed). The latest CI
run recorded here is at `6c7b6a83` (GitHub Actions run 36426014584): both jobs passed, and
`test (22)` passed 277 files and 2,499 tests. CI then passed on `d61f014e` (GitHub Actions run
36436746759): `test (20)` and `test (22)` both succeeded. The fourth review's fixes (`b79a6926` to
`5cdc9ed9`) have not been through CI yet. The Docker-isolated run has not been done locally:
the Docker daemon on the development host did not answer on three attempts (see the witness).

## What Shipped

- `test/helpers/fresh-dist.ts`: `ensureFreshDist` treats `dist/` as fresh only when its oldest file
  is newer than the newest build input (every file and directory under `src/`, plus
  `tsconfig.json`, `tsconfig.build.json`, `package.json`, `pnpm-lock.yaml`). Otherwise it runs the
  repository's own build into a private staging directory beside `dist/` and publishes it by
  rename (third review; earlier revisions removed `dist/` and built into it under a lock, which
  the third review deleted).
- `test/global-setup-fresh-dist.ts`, registered as Vitest `globalSetup`, runs it once per Vitest
  process before any worker starts, and (second review) again before every watch-mode rerun.
- The enhance CLI test's own build step, which checked for one file, is deleted.
- `test/unit/helpers/fresh-dist.test.ts`: 13 cases when this retro was first written, 22 after the
  first review, 33 after the second (32 for `ensureFreshDist`, 1 for the watch-mode hook), 28 after
  the third (10 lock and marker cases deleted with the lock, 5 publication cases added), 33 at
  `d61f014e`, and 34 after the fourth review (one give-up case added), on a temporary fake package
  with mtimes set explicitly. `vitest list` shows 27 entries at `5cdc9ed9`, because it lists each of
  the two `it.for` tables once; they run as 4 and 5 cases.
- `test/helpers/git.ts`: temp repos turn off automatic maintenance and gc, and `cleanupTestRepo`
  retries a removal that fails with `ENOTEMPTY` or `EBUSY`, warning on every retry (third review).

## Outcome Against the Packet

| Acceptance criterion | Evidence |
| :--- | :--- |
| missing `dist/` builds once | unit case, and the consumer run from a checkout with no `dist/` |
| stale `dist/` rebuilds clean, dropping orphans | source, config (4 files), deleted-source and predating-output cases |
| fresh `dist/` does not compile | unit case; about 9 to 16 ms measured |
| exit 2 warns and continues; other failures abort with no `dist/` | unit cases and one real type-error build |
| two concurrent calls build once | superseded in the third review: two concurrent calls each publish a complete build (unit case, in one process) |
| executing consumers pass from no `dist/` | 20 of 20 |
| Docker path unchanged | CI, isolated Docker runner on `a416ed84`: the image ran `pnpm build`, then 277 of 277 files and 2,498 of 2,498 tests passed (see Drift) |

## Drift

- **Location.** The packet first named `test/support/`. It was changed to the existing
  `test/helpers/` before the packet was committed.
- **Post-build check.** Added during GREEN: if `dist/` is still stale after a successful build,
  the setup throws, naming the input that is not older than the oldest output. As first written this
  claimed to cover an input edited during the build. It covered only an edit made after the build's
  first write: `tsc` reads every input before writing, so an edit saved in between is older than
  every output and passed (second review, finding 1). The setup now snapshots the newest input mtime
  before each build and rebuilds when any input is newer afterwards; see "Second review" below.
  After the third review the throw is gone: CI's `test (22)` on `b528260e` failed "rebuilds,
  instead of failing, when a source is saved after the post-build recheck but before the output
  check" with "The dist/ build finished but its output is not current". The test's edit used the
  real clock, and the second build's output most likely shared its mtime (inferred: Linux stamps
  file times from a coarse clock; the log shows the error, not the mtimes), which the setup then
  treated as a build defect. Stale staged output now always rebuilds, three stale builds in a row
  give up naming the stale output, and the test stamps its edit at a fixed time. Stamping it showed
  one more gap: an input saved during the output check with an mtime older than the outputs passed
  that check, so the setup now rechecks the inputs once more just before publishing ("expected 1
  to be 2" build calls on the stamped test before the recheck).
- **Docker not exercised locally.** The claim that the image's `dist/` is fresh rests on the Dockerfile
  running `pnpm build` after `COPY . .`. No run observed whether the setup found it fresh. Second
  review: attempted and not run. On 2026-09-28 `docker info` on the development host did not
  return within 20 s (`timeout 20 docker info` exit 124; the client section printed, the server
  section never did), so the Docker daemon was not reachable and the Docker-isolated helper-suite
  run was not attempted. Third review: CI ran the full suite in the isolated Docker runner on
  `a416ed84` (GitHub Actions run 36422725410, job `test (22)`): the image built with
  `RUN --network=none pnpm build` and the suite, with this setup, passed 2,498 of 2,498 tests. The
  setup prints nothing when it finds `dist/` fresh, so the log does not show whether it rebuilt.
- **Partial `dist/`.** A `dist/` whose surviving files were all new passed the time rule even when
  modules were missing (for example `dist/cli/entrypoint.js`) or when the build that wrote it never
  finished. Review added two checks: every non-declaration `src/` module must have its `.js`, and
  a `node_modules/.cache/graft/dist-build.pending` marker, written before `dist/` is removed and
  deleted only after the build finishes, marks an unfinished build as stale. RED: both new cases
  failed with `expected 'fresh' to be 'built'`. Calibration: disabling either check fails exactly
  its own case. (Superseded in the third review: staging and rename replaced the marker; see
  "Third review". The `.js` check remains.)
- **Missing inputs.** A deleted `src/` or config file was skipped by the input scan, so an old
  `dist/` stayed fresh. Review made each one required: the setup now fails naming it, without
  building. RED: the five new cases failed with `promise resolved "'fresh'" instead of rejecting`.
- **Test size.** The helper suite was first declared small although every case does filesystem
  I/O, one case spawns a child process, and the race case waited on a 50 ms timer. Review
  corrected it to medium with an owner and a 2000 ms per-case ceiling enforced by the `describe`
  timeout, and the race case now starts its second call once the first call's build has started.
  Calibration: with lock creation forced to succeed, that case fails with
  `[ 'built', 'built' ]`.
- **Cross-process locking** runs the same filesystem path as the in-process race case, but only
  in-process schedules were tested. The first version's stale-lock takeover renamed whatever lock
  was at the path, so a waiter acting on an old observation of a dead owner could move aside a live
  lock another waiter had just created, and both would build. Review made takeover conditional on
  the observed instance: the lock is a file carrying the owner's pid and a random token, and
  removal (release or takeover) goes through an exclusively created
  `dist-build.lock.retire.<token>.<n>` claim and removes the lock only if it still carries that
  token. RED, with a seam that replaces the dead lock by a live one between observation and
  takeover: `promise resolved "'built'" instead of rejecting`. Calibration: dropping the token
  check fails that case the same way; treating a dead claim holder as live makes the
  dead-claim case exceed its 2000 ms ceiling. (Superseded in the third review: staging and rename
  replaced the lock and its takeover; see "Third review".)

## Full-Suite Findings

One full host run: 2470 of 2476 passed. Four failures are the known local timeouts on main. Two are
not on that list: `test/unit/git/diff.test.ts` "lists deleted files" (`ENOTEMPTY` while cleaning its
temp repo) and `test/unit/mcp/structural-blame.test.ts` (5 s timeout). Neither loads `dist/`, both
passed twice in isolation, and the global setup finished before any of them started. They are
recorded as full-suite nondeterminism, not dismissed. Whether main shows them under the same load
has not been checked.

### Rule 10 follow-up (review)

The first-failure record above stands; nothing below turns it green. To separate "introduced here"
from "already on main", the parent revision `origin/main` `19d84524` was checked out in a separate
worktree outside this checkout, with `dist/` built by `pnpm build`, and run with the same command
(`pnpm exec vitest run`, host, macOS, Node 26.0.0, 10 cores) three times:

| Parent run | Load beside it | Result | `mcp/structural-blame.test.ts` | `git/diff.test.ts` |
| :--- | :--- | :--- | :--- | :--- |
| 1 | a git create/commit/remove loop | 46 failed / 2463, 277 s | both cases, 5000 ms timeout | passed |
| 2 | a few one-file Vitest runs | 11 failed / 2463, 195 s | passed (file 9.7 s) | passed |
| 3 | a few one-file Vitest runs | 11 failed / 2463, 188 s | 1 case, 5000 ms timeout | passed |

One more full run of this branch after the review fixes (`1d318219`, `dist/` made stale first):
4 failed / 2485, 147 s, all four on the known-timeout list; both files passed.

- **`test/unit/mcp/structural-blame.test.ts`: reproduced on the parent, 2 of 3 runs.** Not
  introduced by this change. Each case runs two WARP index passes and a tool call under Vitest's
  default 5000 ms per-test timeout, and in the passing parent run the file took 9.7 s for its two
  cases, so it sits at its ceiling under full-suite load (the timeout is on the ceiling, not a
  hang; inferred from these durations, not from a profile).
- **`test/unit/git/diff.test.ts` "lists deleted files" (`ENOTEMPTY`): not reproduced.** 0 of 3
  parent runs, 0 in the branch run above, and 0 of 600 iterations of a standalone loop that
  creates a repo, commits twice and removes it immediately. A candidate mechanism was observed but
  not confirmed: `GIT_TRACE` shows `git commit` (git 2.54.0) starting
  `git maintenance run --auto --quiet --detach`, a background process that could write under
  `.git` while the test removes it. Unexplained.
- **Owner and decision.** Both are unowned full-suite failures outside `dist/`, so under Rule 10
  they fall to the repository maintainer, @flyingrobots, for triage. No quarantine is claimed: that
  needs his explicit decision, a defect link, compensating checks and an expiry, and none has been
  given. Until then neither is evidence against this change, and neither is cleared.

### Rule 10 decision for `diff.test.ts`: resolved by a change

Decided by @flyingrobots on 2026-09-28: remove the plausible cause rather than grant an exception.
`test/helpers/git.ts` now sets `maintenance.auto false` and `gc.auto 0` in every temp repo it
creates, so no detached `git maintenance` is started to write under `.git` while cleanup deletes
the repo, and `test/unit/helpers/git.test.ts` checks both settings. On the parent `git.ts` the case
failed at its first assertion (`maintenance.auto`), so the `gc.auto` assertion was not evaluated
then; in the third review it was shown separately, by removing only the `gc.auto 0` line from the
helper (one line, restored byte for byte): the case then failed at the `gc.auto` assertion
(`git config --get gc.auto failed`, the key being unset).
The cause stays unconfirmed: the harness below reproduced ENOTEMPTY only when a background
maintenance run was forced. The test stays in the normal gate, unquarantined. The draft below is
kept as the record of what was considered.

Cleanup retry (third review, asked for by @flyingrobots on 2026-09-28). `cleanupTestRepo` is now
async and removes the graph root and the repo with `fs.promises.rm` inside `@git-stunts/alfred`'s
`retry`: only `ENOTEMPTY` and `EBUSY` are retried, up to 4 times after 25, 50, 100 and 200 ms, and
every retry prints a `[graft test cleanup]` warning naming the path and the code, so a recurrence
is visible in the run's output instead of silent. Any other error rejects at once, and a removal
that still fails after the last retry rejects with the error it threw. A recurrence therefore
shows up as a warning when a retry clears it and as a failed test when none does; either is a new
first observation under Rule 10, and a warning means the maintenance change did not remove the
cause. All 255 existing call sites under `test/` and `tests/` await it; the lint configuration's
`@typescript-eslint/no-floating-promises` reports a call site that does not (it reported all 254
flagged sites before the change and reports one again if an `await` is removed).

#### Draft considered (superseded by the decision above)

Second review, finding 6. No maintainer decision has been given, and none is recorded or implied
here. What follows is a draft for @flyingrobots to approve, amend or reject; until he does, the
record above stands and the failure is neither quarantined nor cleared.

New evidence (second review). A targeted repro harness is committed at
`scripts/repro-git-cleanup-enotempty.ts`. It replays the test's git sequence and removes the repo at
once, as `cleanupTestRepo` does. Results on this host (macOS, git 2.54.0, Node 26.0.0, 10 cores):

| Variant | Load | Iterations | `ENOTEMPTY` |
| :--- | :--- | :--- | :--- |
| `default` (the test's own sequence) | none | 200 | 0 |
| `default` | 8 copies at once | 1200 | 0 |
| `forced` (adds a detached `git maintenance run --task=gc --detach` before removal) | none | 200 | 0 |
| `forced` | 8 copies at once | 1200 | 1 |
| `default`, committed harness | 8 copies at once | 1200 | 0 |
| `forced`, committed harness | 8 copies at once | 1200 | 2 |

The first four rows ran from a scratch copy of the harness with the same steps; the last two ran
the committed file. So a background git writing under `.git` can make `fs.rmSync` fail with `ENOTEMPTY`
under load, and each directory left behind held only an empty `.git`, consistent with a writer that
finished after the removal gave up. The test's own sequence has not reproduced it (0 of 2600 here,
plus the earlier 0 of 600). The mechanism is therefore plausible and shown possible, not confirmed as
the cause of the recorded failure (inferred; what would settle it is a failing run of the `default`
variant or of the test itself with `GIT_TRACE` output showing a detached maintenance process alive
during the removal).

Draft decision text, in the fields `docs/testing/adoption.md` requires:

```text
Status: PENDING DECISION (drafted 2026-09-28, not approved)
Exception ID / policy version / rule: CLEAN_tests-fresh-dist-R10-1 / graft.testing/1.0.3 / Rule 10
Affected claim, tests, revision or delivery scope: test/unit/git/diff.test.ts "lists deleted files";
  its cleanup (cleanupTestRepo, test/helpers/git.ts) failed once with ENOTEMPTY in the first full
  host run of branch cycle/tests-fresh-dist. The failure is in test cleanup, not in the asserted
  behaviour (getChangedFiles listing a deleted file). The branch changes neither diff.test.ts nor
  test/helpers/git.ts; it adds a global setup that finishes before any test starts.
Missing evidence/control and attempts made: root cause unconfirmed. Attempts: 3 parent-revision
  full runs (0 failures of this test), 2 later branch full runs (0), a standalone loop (0 of 600),
  the harness's default variant (0 of 2600, 1400 of them from a scratch copy with the same steps). Its forced variant reproduces ENOTEMPTY
  (3 of 2400 under 8-way load; 0 of 200 without load).
Residual product and test risk: product risk none identified (the failing step is test-only temp
  cleanup). Test risk: an intermittent red full run that is not a product defect, which invites
  retry-to-green.
Compensating checks and available evidence: the test stays in the normal gate, unquarantined and
  visible, in every local and CI full run; any recurrence is recorded as a new first failure with
  the run's command and log. scripts/repro-git-cleanup-enotempty.ts replays the candidate mechanism
  on demand (default and forced variants).
Owner and remediation backlog path: @flyingrobots. Remediation candidates for his choice: disable
  automatic maintenance in test repos (maintenance.auto false, gc.auto 0 in ensureGitRepo), or
  retry the removal (fs.rmSync maxRetries); backlog path to be filed with the decision.
Explicit approver and approval reference: @flyingrobots; reference: ______ (none yet)
Expiry date and review trigger: proposed 2026-10-12, or at once on any recurrence of this failure
  in any run, whichever comes first.
Resolution or newly approved decision: ______ (none yet)
```

`test/unit/mcp/structural-blame.test.ts` is not part of this draft: it reproduced on the parent
revision (above) and its triage decision is also still his.

## Second review

A self-audit of `6123a249` raised eleven findings. Each fix below was shown RED against the code
before it, on the helper suite, unless stated.

- **Edit saved during a build (finding 1).** Before each build the setup records the newest input
  mtime in the pending marker; after the build, an input newer than that snapshot means the build
  may have read the old text, so it rebuilds, and after three such builds it fails and leaves the
  marker. RED on the previous helper: the new case failed with
  `expected 'export const a = 1;\n' to be 'export const a = 2;\n'` (the edit was accepted), and the
  repeated-edit case with `promise resolved "'built'" instead of rejecting`.
- **`dist/` deleted during the unlocked check (finding 2).** The scan now treats `ENOENT` from
  `readdir` as absent, as it already did from `lstat`. The case uses a pass-through `node:fs` mock
  that removes `dist/nested` after its lstat and before its readdir. RED: `promise rejected
  "Error: ENOENT: ... scandir '.../dist/nested'" instead of resolving`. The audit's probe (a child
  process repeatedly creating and removing `dist/` while the parent loops over the check) went from
  52 `ENOENT scandir` errors in 3821 iterations to 0 in 3754, run on a scratch copy of the fixed
  helper.
- **`.d.ts` exemption untested (finding 3).** A case with `src/nested/types.d.ts` now requires the
  second call to find `dist/` fresh; the fake build, like `tsc`, emits nothing for a declaration
  file. RED with the exemption deleted from the helper (one line, restored byte for byte, run under
  a scratch config with no global setup so the mutant could not touch the real `dist/`):
  `dist/ is still stale after rebuilding it: dist/nested/types.d.js is missing for
  src/nested/types.d.ts`. The real checkout depends on this: `src/warp/plumbing.d.ts`.
- **Watch mode (finding 4).** Vitest 5.0.0 runs a global setup once per project lifetime
  (`_initializeGlobalSetup` returns early once loaded), so watch reruns executed the start-up
  `dist/`. The setup now calls `keepDistFresh`, which registers `ensureFreshDist` with
  `project.onTestsRerun`; Vitest awaits those handlers in `rerunTestSpecifications` before the
  rerun's tests start. Unit case with a fake project: RED against a `keepDistFresh` that did what the
  old setup did (check once, register nothing): `expected [] to have a length of 1 but got +0`. Live
  probe (a scratch script, not committed): `startVitest` in watch mode on this checkout, then
  `src/index.ts` touched and `rerunTestSpecifications` called. With the new setup `dist/index.js` was
  rewritten after the touch (`rebuiltOnRerun: true`); with the old setup file restored for one run,
  it was not (`false`), and the new file was then restored byte for byte.
- **Input dated in the future (finding 5).** The first version's post-build check named this case
  but only after deleting `dist/` and paying the build, on every run. The setup now checks the newest
  input against the clock before removing anything and fails naming the file. RED on the previous
  helper: `expected [Function] to throw error matching /.../a\.ts has a modification time in the
  future but got 'dist/ is still stale after rebuilding...'`.
- **Shared cleanup list (finding 7).** `afterEach` removed every root in a module-level list, so
  under `--sequence.concurrent` one case deleted another's live root. Each case now registers the
  removal of its own root through its context's `onTestFinished` (the module-level hook cannot tell
  concurrent cases apart: using it failed 5 cases with `Hook onTestFinished() can only be called
  inside a test`). RED on the previous file (28 cases by then): `--sequence.concurrent` failed
  `11 failed | 17 passed (28)` on 3 of 3 runs, with `ENOENT` inside other cases' roots. GREEN:
  28 of 28 on 5 concurrent runs, 5 shuffled runs (seeds 1 to 5) and 3 concurrent shuffled runs
  (seeds 11 to 13), and no `graft-fresh-dist-*` directory left in the temp directory afterwards.
- **Pid-only lock liveness, and the first version's directory lock (finding 8).** A lock or claim
  now records its creation time and is presumed dead past two minutes; an owner whose lock was taken
  over fails after its build without touching `dist/` or the marker; a timeout names the holder; the
  first version's lock directory is taken over when its owner is dead or it is past the bound, and
  otherwise waited on. RED, four new cases on the previous helper: an hour-old lock held by a live
  pid, `promise rejected "Error: Timed out after 200 ms ..." instead of resolving`; a dead owner's
  lock directory, `promise rejected "Error: EISDIR: illegal operation on a directory, read" instead
  of resolving`; a live owner's young lock directory, `expected [Function] to throw error matching
  /Timed out/u but got 'EISDIR: ...'`; a lock taken over mid-build, `promise resolved "'built'"
  instead of rejecting`. Residual: a build that genuinely runs past two minutes loses its lock to a
  waiter, and the two can both be writing `dist/` until the first one fails; a process still running
  the first version could recreate its lock directory while a new-version waiter is removing a dead
  one. (Superseded: the third review found that residual was a defect, not a bounded risk, and
  deleted the lock; see "Third review".)
- **Case count and interrupted builds (finding 9).** Corrected above: the case count, and the
  design's claim that the oldest-output rule catches an interrupted rebuild (only the pending marker
  does). Documentation only; no RED applies.
- **Rule 9 CI stage and Rule 18 deletion criterion (finding 10).** A search of `test/`, `tests/`,
  `docs/testing/`, `docs/design/` and `docs/method/retro/` found no earlier CI-stage declaration and
  one deletion criterion, written as prose in `docs/method/retro/CORE_graft-root-path/retro.md`. So
  both follow the form this suite already used for size and owner: a line in the test file's header
  and a bullet in the design packet's test strategy, with the criterion also recorded here. CI stage: pre-merge, the `test`
  job's `pnpm test` step. Deletion criterion: when no test executes `dist/`, or a replacement
  mechanism's tests cover these claims. Documentation only; no RED applies.
- **Rule 10 and Docker (finding 6).** A draft decision for `diff.test.ts`, marked PENDING
  DECISION, and a committed repro harness are under "Rule 10 decision" above; nothing is quarantined
  or cleared. The Docker-isolated run was attempted and not run: the daemon did not answer within
  20 s (see Drift).
- **Test-only surface and staging leftovers (finding 11).** `distStaleness` and
  `DIST_CONFIG_INPUTS` are no longer exported (nothing outside the helper used them; typecheck
  confirms). The `beforeDeadLockTakeover` option is gone: the replaced-lock case now makes the
  replacement inside a `process.kill` spy, which is the liveness probe the helper runs between
  reading the lock and acting on it. Calibration: with the token check removed from `retireLock`
  that case fails with `promise resolved "'built'" instead of rejecting`, as it did with the old
  option. `buildLockPath`, `writeBuildLock` and `buildLockHolder` stay, marked `@internal` test
  seams, so tests do not copy the lock format. The owner of a newly acquired lock now removes
  staging files (`*.tmp`) whose writer is dead or which are past the lock age bound, and leaves a
  live, young writer's alone. RED: `expected [ ...(2) ] to deeply equal []`, both dead writers' files
  still present.

## Third review

- **A build past the lock age could leave its output in a vouched-for `dist/` (major).** The
  second review's lock presumed a two-minute-old build dead; the taker built and published, but
  the slow build's compiler, which the lock could not stop, kept writing `dist/` and the next check
  returned `fresh` with the pre-edit output (reproduced in review: third call `fresh`, `src`
  `a = 2`, `dist` `a = 1`). Fixed by removing the cause rather than the symptom: every build writes
  a private `dist.staging.<pid>.<uuid>/` beside `dist/`, and publishes it only when its inputs did
  not change under it and its output passes the freshness rules, by renaming `dist/` aside and the
  staging directory into place. Nothing else writes `dist/`, so overlapping builds cannot mix, and
  the lock, its takeover claims, the two-minute age, the wait timeout, the first version's lock
  directory handling and the pending marker were deleted as redundant (design packet,
  "Concurrency: no lock"). Given up: two concurrent calls now build twice. RED, five new cases on
  the previous helper: the slow-build case `expected 'export const a = 1;\n' to be 'export const a
  = 2;\n'` at the check after the slow build finished (the defect found in review); a build that throws
  after emitting `expected 'export const a = 2;\n' to be 'export const a = 1;\n'` (it had removed
  the previous `dist/`); the peer-publishes-between-renames case `expected false to be true` (no
  rename existed); the two-calls case `expected [ 'built', 'fresh' ] to deeply equal [ 'built',
  'built' ]` (the old contract); the abandoned-directory case `expected [ …(3) ] to deeply equal [
  Array(1) ]`. Calibration: with the input-change recheck disabled (one line, restored byte for
  byte, run under a scratch config with no global setup), the slow-build case fails again at the
  same check, with two older cases. The review's reproduction, adapted only to write into the
  directory it is given, now ends `third call: fresh`, `src` and `dist` both `a = 2`. The setup's
  staged build is byte-identical to `pnpm build` (1304 files, `diff -r`), because the staging
  directory sits at `dist/`'s depth and source maps stay `../src/...`.

## Fourth review

An audit of `d61f014e` raised eight findings, fixed one commit each from `b79a6926`.

- **Concurrent isolation (P2).** The same-millisecond case replaced the global `Date.now`, and under
  `--sequence.concurrent` the mock reached the mid-check edit case, which then failed as a
  future-dated input. `ensureFreshDist` now takes an optional `now()` clock (`Date.now` by
  default), and that case and the slow-build case pass it instead of changing the global `Date`.
  RED on `d61f014e`: `Tests  1 failed | 32 passed (33)` under `--sequence.concurrent`.
- **Cleanup retry contract.** The exhausted-retry case now asserts five attempts and four warnings,
  and `cleanupTestRepo` takes an optional `sleep` so a case can assert the default waits of 25, 50,
  100 and 200 ms.
- **Git helper test metadata.** `test/unit/helpers/git.test.ts` now declares size, resources,
  owner, per-case ceilings enforced by `describe` timeouts, CI stage and deletion criterion.
- **Untested give-up cause.** A case now reaches "another process kept replacing dist/" and its
  rerun advice, and the slow-build case asserts that its first call resolves to `built`.
- **Cleanup after a failed graph-root removal.** `cleanupTestRepo` attempts both removals and then
  rejects with the first failure, so a failed graph-root removal no longer leaves the repo behind.
- **Documentation.** Case counts, the CI status, the witness gates, two Drift items and the
  CHANGELOG entry are brought up to date in the three documentation commits that close this review.

## Non-Goals Held

- `pnpm build`, the Dockerfile, CI and the isolated runner are unchanged.
- The metadata-only tests are unchanged, except a corrected comment in `package-files-exist.test.ts`.
- The known playback timeouts were not touched.

## Verification

See `witness/verification.md`.

## Follow-Ons

- Make the setup report its outcome, so a Docker run can show whether it found `dist/` fresh or rebuilt it.
- @flyingrobots to triage `structural-blame.test.ts` (reproduced on main, a 5000 ms ceiling under
  load) and decide remediation or an owned quarantine with an expiry.
