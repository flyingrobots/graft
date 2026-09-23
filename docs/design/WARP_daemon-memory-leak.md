---
title: "Bound daemon heap under indexing churn"
legend: "WARP"
cycle: "WARP_daemon-memory-leak"
source_backlog: "docs/method/backlog/bad-code/WARP_resident-count-is-not-a-memory-budget.md"
---

# Bound daemon heap under indexing churn

Source backlog item: `docs/method/backlog/bad-code/WARP_resident-count-is-not-a-memory-budget.md`
Legend: WARP

## Hill

A Graft daemon left running against a repository an agent is actively
editing holds steady resident memory. Re-indexing the same file a
thousand times costs no more retained heap than re-indexing it twice.

The incident this answers: a daemon up since 2026-09-12 reached 11 GB
resident on a 16 GB machine, drove 12.88 GB of swap, and triggered an
OOM. Killing the process tree returned ~6.4 GB of RAM and ~8 GB of swap
at once, so every byte was live process heap — not mapped files, not
kernel cache, not a child process.

This slice is complete when the ratchets are closed:

- a retired graph's memory is actually released, not held as a warm
  cache forever
- WARP compaction runs at all in the daemon
- compaction reclaims removed elements' property registers

A fourth suspected cause — a tree-sitter parser constructed per parse —
was measured and found not to ratchet. See cause 4 below.

## Evidence

Four suspected causes, each checked against the installed
`@git-stunts/git-warp@16.0.0` rather than inferred from the v19 source.
Three hold; the fourth does not.

1. **Property registers are never reclaimed.** `executeGC`
   (`GCPolicy.js:105` in v16, `src/domain/services/executeGC.ts` in
   v19) compacts `nodeAlive` and `edgeAlive` and never touches
   `state.prop`. No `prop.delete` existed anywhere in git-warp. The
   indexer retires every prior AST anchor on each edit
   (`src/warp/index-head.ts:608`) and emits fresh ones carrying seven
   properties each (`src/warp/ast-emitter.ts:26`), so `prop` grows by
   one generation per edit and never shrinks. Reproduced directly: 25
   generations of one file's anchors leave 175 registers where 7 are
   live.

2. **Auto-GC is off and Graft never turns it on.** `GCPolicy.DEFAULT`
   is `enabled: false`; `openWarp()` (`src/warp/open.ts:60`) passes no
   `gcPolicy`, so it inherits the default. Even the ORSet tombstone
   compaction that does exist never runs in the daemon.

3. **Pool residents are bounded by count but not by time.**
   `InMemoryWarpPool` caps how many residents exist and evicts the least
   recently used under pressure, but nothing ages one out: release only
   marks an entry idle, so on a daemon serving few repositories a graph
   that grew for a week stays warm for as long as the process runs.
   Eviction also only unlinks the map entry — there is no disposal hook
   at all.

   Note that the warm-cache behavior itself is deliberate (PR #251), so
   the repair is a TTL, not a tighter idle cap. Lowering
   `maxIdleResidents` below capacity would trade away the LRU reuse
   design that 152 oracle tests pin, to fix a lifetime problem that the
   TTL already fixes.

4. **A tree-sitter `Parser` is constructed per parse** —
   `parseStructuredTreeWithRuntime` (`src/parser/runtime.ts:161`) does
   `new Parser()` on every call. **This was measured and is not a leak.**
   The reasoning that made it look like one — `WebAssembly.Memory` linear
   pages only ever grow and are never returned to the OS — is true but
   does not apply: web-tree-sitter shares one WASM module across every
   `Parser` instance, so `parser.delete()` returns the structs to that
   allocator's free list. The heap grows to a high-water mark set by peak
   concurrent use, not by parse count.

   A soak parsing a 200-function file repeatedly, sampling RSS after a
   forced collection, shows the two versions as indistinguishable:

   | generations | `new Parser()` per parse | one parser per language |
   | --- | --- | --- |
   | 400 | 8.3 MiB RSS delta | 8.3 MiB |
   | 2000 | 25.0 MiB RSS delta | 24.9 MiB |

   The reuse change is kept as an efficiency tidy — it stops allocating
   and freeing parser structs on a hot path — but it closes no ratchet,
   and nothing here should be cited as if it did. The ~25 MiB both
   versions drift over 2000 generations is identical across them, so
   whatever causes it is not the parser; it remains unexplained and is
   the honest residual of this investigation.

The handoff that opened this work estimated causes 3 and 4 at ~85% of
the leak. That estimate is inverted twice over: cause 4 is not a leak at
all, and cause 3 is bounded well below the observed growth. The
correction matters for where effort goes. The prior probe recorded in the source backlog item
measured ~102.51 MiB for one retained handle and ~180.19 MiB for two,
dropping to 18.62 MiB when the pool was released — so four residents
bound roughly 360 MiB, two orders of magnitude short of 11 GB. Residency
bounds *cross-session* accumulation; only cause 1 explains a monotonic
climb across ten days of uptime. Cause 3 is real and worth closing, but
it is not the ratchet.

## Playback Questions

### Human

- [ ] If I leave the daemon running overnight against a repo I'm
      editing, is its RSS in the morning close to what it was at
      bedtime?
- [ ] When I stop touching a repository, does the daemon give that
      memory back within a few minutes rather than holding it?
- [ ] Can I tune how long an idle graph is kept, without editing code?

### Agent

- [ ] Does re-indexing one file N times leave retained property
      registers proportional to the file, not to N?
- [ ] Does an idle resident get evicted after its TTL, and does the
      eviction release the graph rather than only unlinking it?
- [ ] Does a second parse of the same language reuse the first
      parse's `Parser`, and does deleting a `ParsedTree` leave that
      shared parser usable? (Efficiency, not a leak fix.)
- [ ] Is auto-GC observably enabled on a graph the daemon opened?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - One knob per ratchet, each with a stated default and unit
  - Memory posture is reported as counts and ages, never as an RSS promise
- Non-visual or alternate-reading expectations:
  - Eviction and GC evidence must be readable as structured fields,
    not inferred from log prose

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - Durations configured in milliseconds, reported with explicit units
- Logical direction / layout assumptions:
  - Idle ordering is least-recently-used first

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - Whether a resident was evicted for capacity or for idleness
  - That the configured TTL and idle cap are the ones in force
- What must be attributable, evidenced, or governed:
  - Any claim that heap is bounded must cite a measured plateau, not a
    changed default

## Non-goals

- [ ] Promising a byte ceiling or RSS budget. The source backlog item
      is explicit that a count limit is not an RSS promise, and that
      boundary holds here: this slice removes unbounded growth, it does
      not introduce an admission estimate.
- [ ] Forcing garbage collection in production.
- [ ] Migrating graft from git-warp 16 to 19. The fix reaches graft as
      a 16.x maintenance patch instead, because `docs/BEARING.md`
      demotes git-warp in favor of Echo.
- [ ] Bounding a single graph's materialized size, or worker-process
      memory. Both remain open in the source backlog item.
- [ ] Resident owner inventory (`WARP_resident-owner-inventory`).

## Acceptance Criteria

1. `InMemoryWarpPool` evicts a resident that has been idle beyond a
   configurable TTL, independently of capacity pressure.
2. Eviction disposes the resident's `WarpApp` so the graph becomes
   collectable, and a disposal failure never breaks eviction.
3. The idle TTL and the idle cap are both configurable from the
   environment alongside `GRAFT_WARP_MAX_RESIDENTS`, rejecting invalid
   values rather than silently defaulting. `maxIdleResidents` keeps
   defaulting to the full capacity: recency-based reuse is the pool's
   intended behavior and the TTL is what bounds lifetime.
4. `ParserRuntime` holds one `Parser` per language and reuses it across
   parses; `ParsedTree.delete()` deletes the tree only, leaving the
   shared parser usable for the next parse. Claimed as an efficiency
   improvement only — the measurement above shows it closes no ratchet.
5. `openWarp()` passes an enabled `gcPolicy` using the field names the
   installed git-warp major actually accepts.
6. graft depends on a git-warp release carrying the property sweep, so
   in-session property growth is bounded rather than merely evicted.
7. A soak against an actively-edited repository shows RSS reaching a
   plateau rather than climbing monotonically. Partially met: the parse
   path is measured flat in JS heap (+0.4% over 2000 generations), but a
   full-daemon soak driving real indexing through the pool and WARP is
   still outstanding, and the ~25 MiB RSS drift seen in the parse soak is
   unexplained.
