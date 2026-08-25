---
title: "git-warp v17 to v19 sequential cutover"
cycle: "CORE_git-warp-v17-to-v19-cutover"
design_doc: "docs/design/CORE_git-warp-v17-to-v19-cutover.md"
outcome: stopped-at-safe-boundary
drift_check: yes
---

# git-warp v17 to v19 sequential cutover Retro

## Outcome

The cycle reached its designed safe stop at exact `@git-stunts/git-warp`
18.2.1. Graft crossed the v17-to-v18 data boundary in order on disposable
copies, retained the schema-5 checkpoint under an additive archive ref,
published a writer-anchored v18 checkpoint, reopened it through 18.2.1, and
proved one atomic multi-operation append with attached content and restart.

The application remains cleanly isolated from git-warp. `src/warp/open.ts` is
the sole production runtime importer and now owns the v18 reading-basis,
provenance, state-cache, historical-ceiling, patch, receipt, and content
compatibility behavior. The final Docker-isolated gate passes 261 test files
and 2,060 tests; the only two skips are exact-version migration bodies that are
supposed to run only under 17.0.0 and 18.0.0.

The cycle did not pretend that v19.1.0 was safe. The official v19 migrator
translates all 2,563 retained writer commits and then fails because git-cas
6.5.10 asks plumbing 3.3.0 to inspect 1,026 objects in one batch, above the
public 1,000-object bound. Independently, v19.1.0's public application API
cannot preserve Graft's atomic multi-operation/content patch, wildcard graph
enumeration, arbitrary historical ceiling, and entity-to-patch provenance
contracts. The branch therefore keeps the last green dependency state instead
of making a manifest-only v19 claim.

No authoritative shared WARP ref moved. The live graph still points at
checkpoint `714da101e689215e064d20f837b7d65be0fde9df` and writer
`b7dec8e776695185434f3fcf3977763324d71ce3`. User-owned daemons were not
stopped, and no live maintenance window or ref promotion was attempted.

## Playback

1. **Did the upgrade follow each major boundary?** Yes in disposable state.
   The package-owned v16-to-v17 checkpoint upgrader produced schema 5 before
   exact 18.0.0 rewrote the checkpoint through current git-cas storage. Only
   then did the branch advance to 18.2.1 and attempt the official v19.1.0
   migrator.
2. **Was v18 a manifest-only hop?** No. The exact 18.0.0 bridge archived the
   v17 checkpoint, published checkpoint `33294a8a...` parented by the retained
   writer head, and preserved 8,101 nodes, 23,652 edges, 73,194 properties,
   2,563 patches, and state hash `1ac66436...`.
3. **Can Graft safely use the installed v18.2.1 runtime?** Yes. The adapter
   proves reusable live core reads, full provenance after reopen, isolated
   finite-ceiling history, atomic patch visibility, rollback on callback
   failure, attached-content bytes and metadata, and restart behavior.
4. **Did the official v19 migration dry run leave its source untouched?** Yes.
   Both the checkpointed and no-checkpoint diagnostic runs failed only in
   disposable scratch state. Source checkpoint, writer, and archive refs were
   unchanged.
5. **Does v19.1.0 expose enough public application capability?** No. A Lane
   writes one Intent, `entity.add` covers one node plus properties, content
   attachment/read is absent, and strand settlement can retain a partially
   promoted prefix. Those are behavioral contract gaps, not import renames.
6. **Was the live graph migrated?** No. That remains forbidden until a quiet
   maintenance window, independent backup, repaired released migrator, and a
   v19 adapter that passes the existing port witnesses all exist.

## Drift

The cycle intentionally exercised the design's stop boundary. Its hill named
v19.1.0 as the desired endpoint, but also required the adapter to preserve one
atomic durable Graft patch and required the official migrator to finish before
any promotion. Both requirements are RED in the released v19 stack, so stopping
at exact 18.2.1 is conformance to the design rather than scope abandonment.

There was one implementation drift inside the v18 compatibility slice. The
initial 18.2.1 configuration disabled the new state cache to retain older core
read behavior. The full suite proved that posture wrong with 185 missing-state
failures. Re-enabling the cache restored live performance, but then exposed a
package bug that allowed a cached latest snapshot to satisfy an older finite
ceiling and exposed provenance restoration without a usable entity index.
The adapter now separates these concerns:

- live node/content reads establish one reusable cached basis;
- provenance establishes one full replay basis and keeps it current across
  local patches;
- finite-ceiling reads use an isolated no-state-cache runtime materialized at
  the requested ceiling; and
- two deliberately integration-heavy host fixtures have scoped 15/20-second
  budgets, while the canonical isolated suite remains fast and green.

This correction stayed inside the existing port/adapter boundary and added
behavioral regressions. No caller learned a git-warp type or workaround.

## Findings

- Exact transitive substrate pins matter at migration boundaries. An
  unpinned 18.0.0 install selected later plumbing/git-cas versions and failed
  before it could serve as the legacy checkpoint bridge.
- The v18 golden graph-model tooling is application-mapping infrastructure,
  not a universal retained-substrate upgrader. Graft needed the exact 18.0.0
  checkpoint rewrite, not fabricated operations from the package's golden
  fixture.
- A green append/content smoke is insufficient. The cumulative suite found
  v18-specific live-state, provenance, and historical-coordinate failures
  that the migration rehearsal alone could not expose.
- State-cache correctness and performance are separate claims. Keeping the
  cache for live reads while refusing it for finite ceilings preserves both
  the fast path and historical truth at this compatibility release.
- Public strand staging in v19.1.0 is not an atomic transaction. Its documented
  partial-commit recovery evidence confirms that it cannot directly implement
  `WarpGraphPort.patch()`.
- A normalized graph projection is not a substitute for retained content.
  The v19 cutover still needs a public content capability or a separately
  designed Graft representation with explicit migration and failure proofs.

## Backlog items filed

- [`WARP_git-warp-v19-migrator-exceeds-plumbing-batch-bound`](../../backlog/bad-code/WARP_git-warp-v19-migrator-exceeds-plumbing-batch-bound.md)
  owns the released v19 migrator's 1,026-versus-1,000 root-set inspection
  failure.
- [`WARP_git-warp-v19-public-api-cannot-preserve-graft-port`](../../backlog/bad-code/WARP_git-warp-v19-public-api-cannot-preserve-graft-port.md)
  owns the public atomicity, content, discovery, history, and provenance gaps.

The previously open
[`CLEAN_host-integration-timeout-obscures-warp-stage`](../../backlog/bad-code/CLEAN_host-integration-timeout-obscures-warp-stage.md)
continues to own phase-specific host timing diagnostics. No duplicate timeout
card was filed.

## Next boundary

Resume only when both independent blockers have a reviewable resolution:

1. npm publishes a git-warp 19.1.0-or-newer migration stack whose root-set
   inspection is chunked within plumbing's documented bound, and the official
   dry run completes against a fresh no-hardlink mirror without source-ref
   movement; and
2. either git-warp publishes a public atomic composite/content/discovery/
   history capability sufficient for `WarpGraphPort`, or Graft completes a
   separate design packet for a new representation and proves migration,
   concurrency, rollback, restart, and retained-content equivalence.

After those are true, repeat the entire disposable rehearsal before asking for
the live quiet window. The live sequence still requires stopping every graph
writer with explicit operator authority, creating and verifying an independent
mirror backup, recording refs externally, running every migration in order,
requiring an idempotent v19 rerun, and only then starting the already-tested
v19 application. Do not merge, migrate live refs, or release from this Retro.

## Playback witness

- [verification.md](./witness/verification.md)
