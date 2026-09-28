# Retro: CLEAN tests never run a stale dist

## Status

Met locally on host Vitest. The Docker-isolated `pnpm test` and CI have not run this branch.

## What Shipped

- `test/helpers/fresh-dist.ts`: `ensureFreshDist` treats `dist/` as fresh only when its oldest file
  is newer than the newest build input (every file and directory under `src/`, plus
  `tsconfig.json`, `tsconfig.build.json`, `package.json`, `pnpm-lock.yaml`). Otherwise it removes
  `dist/` and runs the repository's own build, under a lock in `node_modules/.cache/graft/` that
  serializes Vitest processes sharing one checkout.
- `test/global-setup-fresh-dist.ts`, registered as Vitest `globalSetup`, runs it once per Vitest
  process before any worker starts, and (second review) again before every watch-mode rerun.
- The enhance CLI test's own build step, which checked for one file, is deleted.
- `test/unit/helpers/fresh-dist.test.ts`: 13 cases on a temporary fake package with mtimes set
  explicitly.

## Outcome Against the Packet

| Acceptance criterion | Evidence |
| :--- | :--- |
| missing `dist/` builds once | unit case, and the consumer run from a checkout with no `dist/` |
| stale `dist/` rebuilds clean, dropping orphans | source, config (4 files), deleted-source and predating-output cases |
| fresh `dist/` does not compile | unit case; about 9 to 16 ms measured |
| exit 2 warns and continues; other failures abort with no `dist/` | unit cases and one real type-error build |
| two concurrent calls build once | unit case, in one process |
| executing consumers pass from no `dist/` | 20 of 20 |
| Docker path unchanged | by construction only; not run (see Drift) |

## Drift

- **Location.** The packet first named `test/support/`. It was changed to the existing
  `test/helpers/` before the packet was committed.
- **Post-build check.** Added during GREEN: if `dist/` is still stale after a successful build,
  the setup throws, naming the input that is not older than the oldest output. As first written this
  claimed to cover an input edited during the build. It covered only an edit made after the build's
  first write: `tsc` reads every input before writing, so an edit saved in between is older than
  every output and passed (second review, finding 1). The setup now snapshots the newest input mtime
  before each build and rebuilds when any input is newer afterwards; see "Second review" below.
- **Docker not exercised.** The claim that the image's `dist/` is fresh rests on the Dockerfile
  running `pnpm build` after `COPY . .`. No container run in this cycle confirmed it.
- **Partial `dist/`.** A `dist/` whose surviving files were all new passed the time rule even when
  modules were missing (for example `dist/cli/entrypoint.js`) or when the build that wrote it never
  finished. Review added two checks: every non-declaration `src/` module must have its `.js`, and
  a `node_modules/.cache/graft/dist-build.pending` marker, written before `dist/` is removed and
  deleted only after the build finishes, marks an unfinished build as stale. RED: both new cases
  failed with `expected 'fresh' to be 'built'`. Calibration: disabling either check fails exactly
  its own case.
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
  dead-claim case exceed its 2000 ms ceiling.

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

## Non-Goals Held

- `pnpm build`, the Dockerfile, CI and the isolated runner are unchanged.
- The metadata-only tests are unchanged, except a corrected comment in `package-files-exist.test.ts`.
- The known playback timeouts were not touched.

## Verification

See `witness/verification.md`.

## Follow-Ons

- Run `pnpm test` (Docker) on this branch before merge to confirm the setup reports `fresh` there.
- @flyingrobots to triage both failures above: `structural-blame.test.ts` (reproduced on main, a
  5000 ms ceiling under load) and `diff.test.ts` (unexplained, not reproduced), and decide
  remediation or an owned quarantine with an expiry.
