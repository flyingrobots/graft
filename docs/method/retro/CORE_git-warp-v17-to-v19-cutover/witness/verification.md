---
title: "git-warp v17 to v19 sequential cutover verification"
cycle: "CORE_git-warp-v17-to-v19-cutover"
---

# git-warp v17 to v19 sequential cutover verification

## Published checkpoints

| Checkpoint | Commit | Result |
| :--- | :--- | :--- |
| Prior v17 substrate pin | `49aa6a21` | Exact git-warp 17.0.0, git-cas 6.0.0, plumbing 3.0.3 |
| Sequential design | `4502cc28` | Defined 18.0.0 bridge, 18.2.1 compatibility, v19 migration/API gates, and safe stop |
| Exact v18 bridge dependency | `87eb0e33` | Advanced to exact git-warp 18.0.0 |
| Checkpoint bridge | `8e16e247` | Added the Graft-owned v17-to-v18 checkpoint migration wrapper |
| Bridge witness | `79e7ac83` | Proved archive, writer anchoring, dry run, migration, and idempotence |
| Final v18 dependency | `ab6ff5c9` | Advanced to exact git-warp 18.2.1 |
| Transaction witness | `d24d290c` | Proved atomic multi-op/content visibility and callback rollback |
| v19 blocker record | `27273e89` | Recorded migrator and public-API failures; filed two cards |
| Live reading repair | `b01f80c9` | Reused one v18 live reading basis and restored the durable state cache |
| Integration lifecycle | `9a5c623c` | Removed overlapping same-writer test startup and bounded the aggregate CLI witness |
| Migration guard | `ce4773a7` | Kept the v17 command executable only under exact 17.0.0 |
| Backlog graph | `2f8b4a68` | Regenerated DOT/SVG with both v19 blockers |
| Historical repair | `825e61eb` | Restored provenance and finite-ceiling historical truth under v18.2.1 |

Every listed commit was pushed to `origin/git-warp-v19.1.0`. Before this Retro,
local HEAD and the remote branch were equal at
`825e61eb7bc2aa11ae4afeff3e682cd8c2666697`, 20 commits ahead and zero behind
`origin/main`.

## Final package identity

The final frozen install resolves:

```text
@git-stunts/git-warp 18.2.1
@git-stunts/git-cas  6.0.0
@git-stunts/plumbing 3.0.3
```

`@git-stunts/git-warp` and plumbing are direct production dependencies;
git-cas 6.0.0 is the version resolved beneath git-warp. The package and
lockfile do not claim v19.1.0.

## v16 to v17 rehearsal

The package-owned v17 upgrader ran against a disposable copy of Graft's
retained graph before the branch left exact 17.0.0. It converted the retired
schema-4 checkpoint into schema 5 without changing visible state:

| Field | Result |
| :--- | :--- |
| Rehearsal repository | `/tmp/graft-warp17-rehearsal.Nofi3D/repo` |
| Schema-5 checkpoint | `8cd296915407125d673c2f2996828a4d1680020c` |
| Nodes | 8,101 |
| Edges | 23,652 |
| Writer patches | 2,563 |
| Visible-state SHA-256 | `1ac66436235e2b51c56fedb55b537410dca0d7a386e161d81ba88ed058d2fbe4` |

The v17 migration wrapper now has an exact-version guard. Under the final
18.2.1 install its test proves the command exits before creating any
`refs/warp/` or `refs/graft/` ref.

## v17 to v18 checkpoint bridge

The exact 18.0.0 rehearsal used
`/tmp/graft-warp18-stage.g96hRU/repo.git` and produced:

| Field | Result |
| :--- | :--- |
| Previous schema-5 checkpoint | `8cd296915407125d673c2f2996828a4d1680020c` |
| Current v18 checkpoint | `33294a8afa0f82c0c5c2df4c186705e4a9327004` |
| Writer parent/frontier | `b7dec8e776695185434f3fcf3977763324d71ce3` |
| Archive ref | `refs/graft/migrations/git-warp-v17-to-v18/graft-ast/checkpoint` |
| Nodes | 8,101 |
| Edges | 23,652 |
| Properties | 73,194 |
| Patches | 2,563 |
| Visible-state SHA-256 | `1ac66436235e2b51c56fedb55b537410dca0d7a386e161d81ba88ed058d2fbe4` |

The bridge's dry run did not create the archive ref or move the checkpoint.
The real disposable migration archived the prior checkpoint, published the
writer-anchored checkpoint, and an idempotence rerun returned
`already-current` without further ref movement.

## v18.2.1 append and restart

The final-v18 rehearsal used
`/tmp/graft-warp1821-stage.xotcuE/repo.git`. One Graft patch atomically added
two nodes, two status properties, one `contains` edge, and one attached content
payload. Its writer/patch commit was
`e9e183849796f58991c2acbb03a159827c03a98c` at Lamport 2,564.

After reopen:

- `migration:v18.2.1:source` and `migration:v18.2.1:content` were both visible;
- the `source -> content` `contains` edge and both properties were visible;
- all eight receipt outcomes were applied;
- content metadata reported 34 bytes and `text/plain`; and
- content bytes were exactly `git-warp v18.2.1 retained content\n`, SHA-256
  `e8becadd821dcba10d7c31fa4ec9a9d09635fd5e2cb8e6a8687b44372a8051d7`.

The adapter transaction test separately injects a callback failure and proves
that no node, edge, property, or content prefix becomes visible after reopen.

## v18.2.1 application compatibility

The first cumulative isolated run was intentionally treated as evidence, not
waived. It found 185 live core failures while the state cache was disabled,
then six historical/provenance failures after the live cache was restored.
The final adapter behavior is:

- core node and content reads establish one reusable live basis;
- the first `patchesFor()` call performs a receipt-producing replay so the
  entity-to-patch provenance index exists after reopen;
- finite Lamport ceilings open an isolated `stateCache: null` runtime,
  materialize the exact ceiling, and snapshot that state before reading; and
- current/live observers retain the durable v18.2.1 state-cache fast path.

The focused regressions prove a reopened entity returns its originating patch
and a latest cached property value cannot leak into an older bounded read.

## v19.1.0 migrator RED

The official `git-warp-v18-to-v19` dry run was exercised only on disposable
no-hardlink mirrors. A valid writer-anchored v18 checkpoint allowed all 2,563
writer commits to translate, but bounded checkpoint-index construction failed:

```text
Workspace staged a batch but could not establish retention
```

A seed-only diagnostic mirror at `/tmp/graft-v19-seed-diag.PcVq9o/repo.git`
exposed the nested cause:

```text
WORKSPACE_RETENTION_FAILED
  ROOT_SET_TARGET_UNREADABLE
    InvalidArgumentError: A cat-file batch may contain at most 1000 objects
    details: { count: 1026, maxObjects: 1000 }
```

git-cas 6.5.10 submits the 1,026 retained root-set targets to plumbing 3.3.0
in one `infoMany()` call. No released package version or supported option
repairs or bypasses that bound. No source ref moved during either failed dry
run.

## v19.1.0 public API RED

The published root exports `Runtime`; expert surfaces include advanced,
charts, diagnostics, and testing entrypoints. The audited public behavior does
not implement the existing Graft port:

- `Lane.write()` accepts one Intent;
- `entity.add` creates one node plus initial properties only;
- no public Intent or Observer attaches and retrieves content bytes/metadata;
- bounded exact property and neighborhood reads do not implement wildcard
  graph enumeration or arbitrary Lamport-ceiling history;
- public receipts do not provide Graft's entity-to-patch decoded provenance;
  and
- strand settlement promotes staged intents one at a time and explicitly
  retains partial-commit recovery evidence.

The committed adapter transaction witness is therefore a real v19 RED. It was
not weakened or replaced with independent Lane writes.

## Canonical validation

The final published code head passed:

| Gate | Command | Result |
| :--- | :--- | :--- |
| Types | `pnpm typecheck` | pass |
| Lint | `pnpm lint` | pass |
| Build | `pnpm build` | pass |
| Whitespace | `git diff --check` | pass |
| Adapter regressions | `pnpm exec vitest run test/unit/warp/open.test.ts` | pass; 6/6 |
| Historical cluster | `pnpm exec vitest run --maxWorkers 2 test/unit/warp/since.test.ts test/unit/mcp/structural-blame.test.ts tests/playback/WARP_symbol-history-timeline.test.ts` | pass; 6/6 |
| MCP performance slice | `pnpm exec vitest run test/unit/mcp/cache.test.ts test/unit/mcp/tools.test.ts test/unit/mcp/persisted-local-history.test.ts` | pass; 66/66 |
| Migration/backlog guards | `pnpm exec vitest run test/unit/scripts/git-warp-v17-migration.test.ts test/unit/method/backlog-dependency-dag.test.ts` | pass; 3 passed, 1 exact-version skip |
| Canonical isolated gate | `pnpm test` | pass; 261 files, 2,060 passed, 2 exact-version skips |

The first canonical run was RED with six historical/provenance failures and is
retained as the reason for the adapter repair. The second canonical run passed
without retry. Host-side historical integration fixtures were slower than the
container and received only scoped 15/20-second budgets; no global timeout was
raised.

The recurring local warning that `${NPM_TOKEN}` could not be substituted in
`.npmrc` did not affect any command's exit status.

## Live authority boundary

Read-only verification after the final gate showed the shared graph still at:

```text
refs/warp/graft-ast/checkpoints/head 714da101e689215e064d20f837b7d65be0fde9df
refs/warp/graft-ast/writers/graft   b7dec8e776695185434f3fcf3977763324d71ce3
```

No Graft migration archive ref exists in the authoritative shared repository
because the v16-to-v17 and v17-to-v18 migrations were rehearsals only. Active
user-owned daemons were never stopped. No backup, live migration, v19
promotion, merge, PR, or release is claimed by this witness.

## Resume gate

Do not advance the dependency or live refs until a released migrator completes
the same dry run and an exported v19 application surface passes the existing
atomic/content/history/provenance port tests. At that point, repeat the
no-hardlink rehearsal and request a separately authorized quiet maintenance
window with an independently verified mirror backup and external ref record.
