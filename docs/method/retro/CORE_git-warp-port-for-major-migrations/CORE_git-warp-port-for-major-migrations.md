---
title: "git-warp port for sequential major migrations"
cycle: "CORE_git-warp-port-for-major-migrations"
design_doc: "docs/design/CORE_git-warp-port-for-major-migrations.md"
outcome: hill-met
drift_check: yes
---

# git-warp port for sequential major migrations Retro

## Outcome

Every production git-warp graph read and write now crosses the Graft-owned
`WarpGraphPort`. `src/warp/open.ts` is the sole runtime adapter: it constructs
git-warp 16.0.0 and wraps its patch, observer, query, traversal, core,
worldline, provenance, receipt, and attached-content capabilities. The only
other production package reference is the declaration-only plumbing bridge in
`src/warp/plumbing.d.ts`.

`WarpContext` and `WarpPool` now expose the Graft port rather than `WarpApp`.
Indexing, structural reads, precision reads, local history, churn, reference,
and timeline code depend only on Graft-owned types. No dependency, lockfile,
graph schema, public product surface, or stored data changed.

## Playback

1. **Is there one Graft-owned graph contract?** Yes. `src/ports/warp.ts`
   contains the complete capability used by current consumers without naming
   any package-owned type.
2. **Is the future v19 public-API cutover localized?** Yes. Production package
   construction and calls are confined to `src/warp/open.ts`; the executable
   boundary test rejects static, type-only, re-export, import-type, dynamic,
   and `require()` escapes.
3. **Do consumers work without package objects?** Yes. `WarpContext`, the pool,
   and their test doubles are typed as `WarpGraphPort` and can be exercised
   without constructing git-warp.
4. **Was behavior preserved?** Yes. The full Docker-isolated suite passed 258
   files and 2,052 tests, including real disposable-repository graph writes,
   observation, traversal, aggregation, point-in-time reads, provenance, and
   attached content.
5. **Did migration begin early?** No. `package.json` and `pnpm-lock.yaml` are
   unchanged and still resolve `@git-stunts/git-warp` 16.0.0. No package
   migration script ran.

## Drift

The implementation matches the design packet. The old v0.7.0 decision to let
package types flow directly was superseded only where the new sequential-major
migration constraint invalidated its stability assumption. This cycle did not
restore the earlier lossy five-method `WarpHandle`; it defined the complete
capability Graft actually consumes and kept behavior intact.

One exploratory host-side parallel batch hit the already-known generic
five-second timeout in three integration tests. Both implicated files passed
immediately in isolation, and the canonical Docker-isolated full suite passed
without retries or failures. The existing
`CLEAN_host-integration-timeout-obscures-warp-stage` card already owns that
test-infrastructure concern.

## Findings

- The repository had 17 production modules importing git-warp directly; the
  final census has zero unauthorized imports.
- A non-lossy boundary required adapting returned capabilities as well as
  `openWarp()`. Returning a wrapped root while leaking raw observers, queries,
  patches, or worldlines would not isolate the v19 API change.
- Replacing a package-internal `QueryBuilder` spy with a graph-behavior
  assertion made the churn test both more architectural and more stable.
- The package remains persistence authority for the current graph; this port
  isolates API dependency and does not claim that the later data migrations
  are optional.

## Debt and Ideas

No new backlog cards were filed. The observed host timeout class is already
tracked by
[`CLEAN_host-integration-timeout-obscures-warp-stage`](../../backlog/bad-code/CLEAN_host-integration-timeout-obscures-warp-stage.md).

## Next Boundary

The next cycle may begin the v16-to-v17 upgrade only after designing how to
discover, rehearse, witness, and execute git-warp's v17 migration. It must not
skip directly to v18 or v19. The v17-to-v18 and v18-to-v19 migrations remain
separate later boundaries, and the v19 public-API adaptation belongs in
`src/warp/open.ts`.

## Playback Witness

- [verification.md](./witness/verification.md)
