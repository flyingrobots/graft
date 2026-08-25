---
title: "git-warp v17 to v19 sequential cutover"
legend: "CORE"
cycle: "CORE_git-warp-v17-to-v19-cutover"
source_backlog: "operator-directed sequential git-warp major upgrade"
---

# git-warp v17 to v19 sequential cutover

## Sponsors

- Human: repository operator
- Agent: implementation agent

## Hill

Advance Graft from the migration-ready git-warp 17.0.0 checkpoint through the
18.0.0 legacy-reader bridge, the final 18.2.1 compatibility release, and then
to exactly 19.1.0. The retained `graft-ast` graph must cross each supported
substrate boundary in order, and Graft must adopt v19's public `Runtime`/`Lane`
API only through the existing `WarpGraphPort` secondary adapter.

The cutover is successful only if the v19 adapter preserves Graft's actual
graph contract. In particular, one Graft patch callback is one atomic durable
claim today. It may contain node, property, edge, removal, and content
operations. Replacing that operation with a sequence of independently visible
`Lane.write()` calls would create a partial-commit failure mode and is not an
adapter-compatible implementation.

## Starting evidence

The branch starts at git-warp 17.0.0 with the release-tested git-cas 6.0.0 and
plumbing 3.0.3 substrate pinned. The package-owned v16-to-v17 migration has
been rehearsed against a disposable copy of Graft's actual graph:

- graph: `graft-ast`;
- source checkpoint schema: 4;
- rehearsed checkpoint schema: 5;
- writer count: 1;
- writer patch count: 2,563;
- visible node count after reopening: 8,101;
- visible edge count after reopening: 23,652;
- source and migrated visible-state hashes: equal.

The authoritative shared ref has not moved. Multiple Graft daemons are active
against the shared Git common directory, so neither the v17 checkpoint update
nor the later v19 promotion may run live during implementation and rehearsal.

## The v17 to v18 boundary

The v18 crossing has two required dependency points. Version 18.0.0 is the
bridge: its runtime can still read legacy Git-blob patches while its default
write route and new checkpoints use git-cas. Beginning in 18.1.0, production
runtime readers fail closed on that legacy storage unless a migration-only
compatibility policy is injected. The final v18 release, 18.2.1, retains that
gate. Both releases were built against git-cas 6.0.0 and plumbing 3.0.3, the
same exact substrate versions pinned for Graft's v17 migration.

The sequential data bridge is therefore:

1. resolve exactly 18.0.0, git-cas 6.0.0, and plumbing 3.0.3;
2. reopen and materialize the schema-5 graph through Graft's existing adapter;
3. preserve the v17 checkpoint under an additive Graft migration archive ref;
4. publish a fresh 18.0.0 checkpoint whose parent and frontier are in the
   writer history and whose payload uses current git-cas storage;
5. resolve exactly 18.2.1 with the same substrate pins; and
6. prove that 18.2.1 reopens from that checkpoint, reads retained content,
   appends one current-format atomic patch, and restarts cleanly.

This is a migration, not a manifest-only hop. A direct 17.0.0-to-18.2.1
rehearsal failed with `E_LEGACY_SUBSTRATE_DISABLED` because the retained writer
patches use `legacy-git-blob` storage. An unpinned standalone 18.0.0 rehearsal
also selected plumbing 3.3.0 and git-cas 6.5.10 through dependency ranges and
failed with `Runner does not support duplex command sessions`; the exact v18
release substrate pins are consequently part of the migration contract.

v18 retains `WarpApp`, `WarpCore`, `openWarpGraph()`, and
`openWarpWorldline()` as supported compatibility and migration surfaces.
Graft's current adapter can cross both v18 dependency points without leaking
package-owned objects through the port.

The v18 source tree does contain `scripts/v18.0.0/migrations/graph-model/`, but
that command is not a general package upgrade comparable to the v17 checkpoint
upgrader:

- it is not installed as an npm binary;
- the package's `upgrade` script still owns only v16-to-v17;
- its command requires an explicit application mapping request and a v17
  golden-fixture manifest;
- its legacy and scratch equivalence readers are wired to that golden fixture;
  and
- finalization promotes one explicitly reviewed ref to an operation-plan
  scratch chain.

Running the golden-fixture command against Graft without a Graft-owned mapping
would manufacture migration operations rather than preserve the application
graph. Graft does not change its domain graph model at the v18 boundary, so the
repository's v17-to-v18 migration is the 18.0.0 checkpoint rewrite above, not
the golden-fixture graph-model command. If executable equivalence shows that
claim to be false, this cycle must design and prove a Graft-specific mapping
before continuing.

### v18.2.1 application compatibility

The full Graft gate exposed two v18.2.1 reading-basis changes after the data
bridge itself was green. Direct core reads no longer establish hidden state,
and the new durable state cache can restore visible state without reconstructing
the entity-to-patch provenance index. Graft's adapter consequently establishes
and reuses one live reading basis for core node/content reads and performs one
receipt-producing replay when a provenance caller first needs the full index.

The state cache also has a bounded-history incompatibility in 18.2.1. Its
coordinate compatibility rule treats a live snapshot with `ceiling: null` as a
valid predecessor of an older finite Lamport ceiling. A historical observer can
therefore receive latest properties after a live snapshot has been cached. The
secondary adapter keeps the fast state cache for live reads, but answers finite
ceiling observers and worldlines through an isolated raw runtime with
`stateCache: null`, materializes exactly that ceiling, and snapshots the
already-materialized state. Regression tests prove that a cached latest value
does not leak into the older observation and that reopened provenance still
returns the patch that touched an entity.

The first cumulative isolated run found six failures in historical `since`,
symbol timeline, and structural-blame behavior. After the adapter repair, the
second isolated run passed 261 test files and 2,060 tests with two intentional
exact-version migration skips. This v18 compatibility logic remains confined
to `src/warp/open.ts`; no consumer reacquired a package-owned type.

## The v18 to v19 retained-substrate boundary

git-warp 19.1.0 ships the supported `git-warp-v18-to-v19` executable. It
inventories all selected graph refs and writer commits, rewrites legacy Git
objects in a disposable repository, builds bounded v19 checkpoint/index
artifacts and the exact v19 substrate marker, proves a public reopen/read/write
receipt, rechecks the source inventory, and promotes every verified ref in one
compare-and-swap transaction. Original refs and state-cache payload roots stay
reachable under additive recovery refs.

The command classifies Graft's rehearsed schema-5 copy as:

```text
graft-ast — upgrade required (legacy unmarked substrate); 1 writer; 2 refs
```

That is the expected retained-substrate posture, but the checkpoint lineage is
not yet acceptable to the v19 seeder. The v17 upgrader creates schema 5 with
the retired checkpoint as its Git parent. The v19 migrator requires every
seed checkpoint parent and frontier commit to occur in the rewritten writer
map, so the first official dry run translated all 2,563 writer commits and then
failed with:

```text
legacy checkpoint commit 714da101... is outside rewritten writer history
```

Removing the unusable checkpoint on a disposable copy proved that v19 selects
its documented full-writer-replay path. That path translated all 2,563 commits
but then failed while publishing the full-replay checkpoint with
`TrieFlusher ... could not establish retention`. It is therefore evidence of
fallback selection, not an accepted migration route for Graft.

The intended route is the writer-anchored, git-cas-backed checkpoint created by
exact 18.0.0 and reopened by 18.2.1. That checkpoint has now been proven on a
disposable copy:

- checkpoint `33294a8a...` is parented by writer frontier `b7dec8e7...`;
- it retains 8,101 nodes, 23,652 edges, 73,194 properties, and all 2,563
  writer patches;
- its state hash is the same `1ac66436...` observed before the bridge; and
- the archived v17 checkpoint remains reachable at the additive Graft
  migration ref.

The full published 19.1.0 `--dry-run` nevertheless fails after translating all
2,563 writer commits. The failure occurs while the migrator builds bounded
checkpoint indexes in its disposable scratch repository:

```text
Workspace staged a batch but could not establish retention
```

A checkpoint-seed-only reproduction on another no-hardlink disposable mirror
exposed the nested dependency error without repeating the writer rewrite:

```text
WORKSPACE_RETENTION_FAILED
  ROOT_SET_TARGET_UNREADABLE
    A cat-file batch may contain at most 1000 objects
    details: { count: 1026, maxObjects: 1000 }
```

The released git-cas 6.5.10 root-set validator sends all 1,026 retained
workspace targets to plumbing 3.3.0's `GitCatFileSession.infoMany()` call;
plumbing correctly rejects a batch larger than its documented 1,000-object
bound. npm currently publishes no git-warp release newer than 19.1.0, no
git-cas release newer than 6.5.10, and no plumbing release newer than 3.3.0.
There is no supported migrator or runtime option that disables this path.

Both official dry-run failures occurred entirely in disposable scratch state.
The source checkpoint, writer, and Graft archive refs remained byte-for-byte
unchanged. A later normal run must use a v19.1.0-or-newer release containing a
bounded root-set inspection repair, never a private package edit or the retired
19.0.0 migrator.

## The v19 application API boundary

v19 removes the graph-first package root. Its sole root runtime value is
`Runtime`; application code opens a named `Lane`, writes validated `Intent`
values, and performs bounded `Observer` reads. Expert public subpaths expose
generic intent and reading builders, coordinates/optics, charts, receipt
inspection, and a disposable runtime harness.

The current Graft port promises more than those public surfaces directly
provide:

- one callback can commit many node, edge, property, removal, and content
  operations atomically;
- content bytes and metadata can be attached and reopened;
- lens patterns can enumerate matching node sets;
- callers can query and traverse those sets;
- historical Lamport ceilings support removed-symbol analysis; and
- materialization receipts and patch provenance support structural history.

The adapter may translate these capabilities to a new Graft-owned persistence
shape, but it may not silently weaken them. In particular:

1. independent `Lane.write()` calls are not an atomic replacement for one
   `WarpPatchPort` callback;
2. inline property bytes are not automatically a supported replacement for
   content attachments at Graft's current payload sizes;
3. current bounded node/property/neighborhood observations do not by
   themselves implement wildcard enumeration or an arbitrary historical
   ceiling; and
4. private `dist/` imports or package-export-map bypasses are not adoption of
   the new public API.

The public strand settlement surface does not close the transaction gap.
`Runtime.strand()` can stage several single-Intent writes and
`Runtime.settle()` can classify their promotion, but v19.1.0 promotes those
intents to the parent lane one at a time. Its implementation explicitly
retains partial-commit recovery evidence when a later promotion fails. That is
useful settlement behavior, but it is not the all-or-nothing publication
required by `WarpGraphPort.patch()`.

The other gaps are also executable contract gaps rather than naming changes:

- the widest public Intent, `entity.add`, atomically creates one node plus its
  initial properties, but cannot also create an edge, remove an entity, or
  attach content;
- no public Intent or Observer attaches or retrieves git-warp content bytes
  and metadata;
- public readings address exact node/property subjects or bounded one-hop
  neighborhoods, and do not enumerate a wildcard lens over the retained
  graph; and
- public receipts can expose their own substrate object IDs, but do not
  replace Graft's entity-to-patch provenance and decoded-patch reads.

If the published API cannot implement the port honestly, the safe outcome is
a clean, validated v18.2.1 compatibility checkpoint plus an executable v19
RED and a precise upstream/application-design blocker. The authoritative graph
must remain pre-v19 until that blocker is resolved.

## Authority and maintenance window

All Graft worktrees share `/Users/james/git/graft/.git` and the
`refs/warp/graft-ast/*` namespace. The live sequence must therefore be one
quiet, rollback-capable maintenance window:

1. build and validate the final application without opening the live graph;
2. stop every process that can write any graph in the repository;
3. create and verify an independent `--mirror --no-hardlinks` backup;
4. record all starting WARP refs outside the repository;
5. run the v16-to-v17 checkpoint migration and verify schema 5;
6. archive the schema-5 checkpoint and run the exact 18.0.0 checkpoint bridge;
7. reopen and append through exact 18.2.1;
8. run the v19.1.0 retained-substrate migration;
9. rerun the v19 migrator and require `already-current` without ref movement;
10. start only the already-tested v19 application; and
11. verify bounded reads, one representative atomic Graft write, its receipt,
    content, restart behavior, and backup behavior.

No implementation turn may terminate user-owned daemons implicitly. No live
ref may move while the v19 application contract is RED.

## Acceptance criteria

- [x] `package.json` and `pnpm-lock.yaml` first resolve exactly git-warp
      18.0.0 with its release-tested git-cas 6.0.0 and plumbing 3.0.3.
- [x] Exact 18.0.0 reopens a disposable schema-5 copy, preserves its visible
      state and content, archives the v17 checkpoint, and publishes a current
      git-cas checkpoint parented by the writer frontier.
- [x] The dependency then resolves exactly git-warp 18.2.1 with git-cas 6.0.0
      and plumbing 3.0.3.
- [x] Graft reopens the migrated copy through 18.2.1, preserves its visible
      state, performs a representative atomic append including content,
      reopens again, and returns inspectable receipts.
- [x] The v18 graph-model tooling is either proven unnecessary for Graft's
      retained ref families or invoked only through a reviewed Graft-specific
      mapping and equivalence witness.
- [ ] The official 19.1.0 migrator completes a dry run against the disposable
      Graft graph without moving source refs.
- [ ] `package.json` and `pnpm-lock.yaml` finally resolve exactly git-warp
      19.1.0, git-cas 6.5.10, and plumbing 3.3.0.
- [ ] `src/warp/open.ts` is the only production module that imports git-warp
      runtime values, including expert subpaths.
- [ ] A representative multi-operation Graft patch has atomic visibility and
      one durable application receipt after restart; no partial prefix is
      observable after an injected failure.
- [ ] Existing attached AST content survives migration and new content can be
      written and read without unbounded inline-property substitution.
- [ ] Exact, wildcard, traversal, query, historical, and provenance behaviors
      required by `WarpGraphPort` have executable v19 witnesses.
- [ ] The migrated disposable graph passes representative CLI, API, and MCP
      sanity checks before the live maintenance window.
- [ ] The live repository has a verified independent backup and external ref
      snapshot before any WARP ref moves.
- [ ] The live v19 promotion reports `migrated`, retains recovery refs, and an
      idempotence rerun reports `already-current` without ref movement.
- [ ] Lint, typecheck, build, focused adapter/migration tests, and the full
      isolated test gate pass on the final dependency state.
- [ ] A local Retro records exact package identities, migration reports,
      before/after refs, recovery paths, timings, and validation results.

## Playback questions

### Human

- [ ] Did Graft actually cross 18.2.1, or merely jump its manifest from v17
      to v19?
- [ ] Is the difference between the v18 golden graph-model framework and the
      supported v19 one-shot migrator explicit and inspectable?
- [ ] Can one failed Graft write ever expose only a prefix of the requested
      nodes, edges, properties, or content?
- [ ] Can the live graph be restored without guessing which refs changed?
- [ ] Were user-owned graph writers quiet before the shared refs moved?

### Agent

- [ ] Does the v18 disposable proof include a real write, receipt, content
      read, restart, and state comparison rather than an import smoke test?
- [ ] Does the v19 RED exercise Graft's public port behavior rather than test
      package declaration text?
- [ ] Does the v19 implementation use only exported package entrypoints?
- [ ] Does the migration rehearsal prove source refs remained byte-for-byte
      unchanged in dry-run mode?
- [ ] Does the final sanity suite run against a migrated copy of the real
      graph, not only an empty test repository?

## RED strategy

1. Preserve the existing port-boundary census test.
2. Add a behavioral adapter witness that builds a node, properties, an edge,
   and content in one Graft patch and verifies all-or-nothing visibility,
   receipt identity, content bytes, and restart behavior.
3. Add bounded read witnesses for exact property, neighborhood/traversal,
   wildcard enumeration, and a historical removal case used by Graft.
4. Run those witnesses against 18.2.1 as the compatibility baseline, then
   against the v19 public adapter. Any unsupported capability remains a real
   RED; it is not erased by weakening the port or test.

## GREEN strategy

1. Advance through exact 18.0.0 and 18.2.1, proving the checkpoint bridge and
   compatibility baseline on a copied schema-5 graph.
2. Complete and retain the official v19 migration dry-run report.
3. Replace the concrete adapter with `Runtime.open()`, one named Lane, and only
   documented expert subpaths.
4. Introduce a Graft-owned transactional/indexing representation only if it
   preserves the port's atomicity, content, bounded-read, history, and restart
   invariants under executable failure tests.
5. Rehearse the complete data and application sequence on another disposable
   copy before requesting the quiet live window.

## Non-goals

- [x] Importing git-warp private source or `dist/` implementation paths.
- [x] Splitting one atomic patch into independently visible writes without an
      application-level publication/rollback protocol.
- [x] Treating the v18 golden fixture migration request as a universal Graft
      data migration.
- [x] Moving authoritative refs merely because a substrate dry run passes.
- [x] Making a v17 checkpoint unreachable; the live checkpoint ref may advance
      only after the prior object is retained under an additive archive ref.
- [x] Deleting v18 objects, v19 recovery refs, or other retained evidence.
- [x] Running Git garbage collection as part of the cutover.
- [x] Killing or reconfiguring user-owned daemons without explicit authority.
- [x] Expanding the upgrade into the planned Echo replacement of git-warp.

## Completion and stop boundaries

The cycle is complete only when the dependency, application adapter, retained
graph, and live sanity checks all reach v19.1.0 with rollback evidence and the
full gate green.

If v19.1.0's public API cannot preserve an existing Graft port invariant, stop
with the branch clean and pushed at the last green compatibility checkpoint.
Record the behavioral RED, the missing public capability, and the narrowest
honest resolution. Do not promote the live graph into a format that the
application cannot safely read and extend.

## Playback result

The cycle reached its defined stop boundary at exact git-warp 18.2.1. Graft's
package and lockfile remain on the last green compatibility state, all
production git-warp runtime access remains isolated in `src/warp/open.ts`, and
the adapter's atomic write/content/restart, live-reading, provenance, and
historical-ceiling contracts are executable. The final Docker-isolated gate
passes 261 files and 2,060 tests with only the exact-17.0.0 and exact-18.0.0
migration bodies skipped under the installed 18.2.1 package. The
authoritative shared graph remains on its original pre-v17 refs because active
daemons were never stopped and no maintenance window was authorized.

The v19 hill remains open on two independently necessary repairs:

1. a released migrator whose root-set inspection respects plumbing's bounded
   `cat-file` batch size; and
2. either a public atomic composite/content/discovery surface or a separately
   designed Graft representation that preserves every existing port invariant
   under concurrency, failure, restart, and retained-data migration.

Until both repairs exist, changing only the dependency declaration to 19.1.0
would make the branch less correct than the validated 18.2.1 checkpoint.
