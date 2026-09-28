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
  process before any worker starts.
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
  the setup throws, naming the input that is not older than the oldest output. This covers an input
  edited during the build, or an input dated in the future.
- **Docker not exercised.** The claim that the image's `dist/` is fresh rests on the Dockerfile
  running `pnpm build` after `COPY . .`. No container run in this cycle confirmed it.
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
  the in-process race was tested. Residual race, not tested: two waiters both see a dead owner.
  The rename-to-tombstone lets only one of them remove it, but the second can then take over a lock
  that the first has just created.

## Full-Suite Findings

One full host run: 2470 of 2476 passed. Four failures are the known local timeouts on main. Two are
not on that list: `test/unit/git/diff.test.ts` "lists deleted files" (`ENOTEMPTY` while cleaning its
temp repo) and `test/unit/mcp/structural-blame.test.ts` (5 s timeout). Neither loads `dist/`, both
passed twice in isolation, and the global setup finished before any of them started. They are
recorded as full-suite nondeterminism, not dismissed. Whether main shows them under the same load
has not been checked.

## Non-Goals Held

- `pnpm build`, the Dockerfile, CI and the isolated runner are unchanged.
- The metadata-only tests are unchanged, except a corrected comment in `package-files-exist.test.ts`.
- The known playback timeouts were not touched.

## Verification

See `witness/verification.md`.

## Follow-Ons

- Run `pnpm test` (Docker) on this branch before merge to confirm the setup reports `fresh` there.
- If `diff.test.ts` or `structural-blame.test.ts` fail again under full-suite load, file them against
  the full-suite nondeterminism work with the first-failure output above.
