---
title: "git-warp v16 to v17 migration"
legend: "CORE"
cycle: "CORE_git-warp-v16-to-v17-migration"
source_backlog: "operator-directed sequential git-warp major upgrade"
---

# git-warp v16 to v17 migration

## Sponsors

- Human: repository operator
- Agent: implementation agent

## Hill

Move Graft from `@git-stunts/git-warp` 16.0.0 to exactly 17.0.0 and execute
the package-owned v16-to-v17 migration against Graft's `graft-ast` graph.
The migration must preserve the retired checkpoint as history, verify the new
checkpoint before moving the authoritative ref, and leave a reproducible
receipt that binds the old and new checkpoint identities.

This is the first of three sequential major-version cycles. It does not begin
the v17-to-v18 migration or the v19 public-API cutover.

## Discovery evidence

The published `@git-stunts/git-warp@17.0.0` package contains the dedicated
operator entrypoint `dist/scripts/upgrade-v16-to-v17.js` and the checkpoint
implementation under
`dist/scripts/migrations/v17.0.0/checkpoint-schema-upgrade.js`. The package's
own migration guide requires a dry run before the real upgrade. The package
also raises the consumer runtime floor to Node.js 22.

The upgrader performs two graph-level operations:

1. Retired checkpoint schemas 2, 3, and 4 are decoded, rewritten as current
   schema 5 checkpoints, reloaded for verification, and only then installed by
   moving `refs/warp/<graph>/checkpoints/head`. The new checkpoint names the
   retired checkpoint as its parent.
2. Legacy `coverage/head` and `seek-cache` refs are deleted because they are
   rebuildable caches.

Graft's live graph discovery found one relevant graph:

- graph: `graft-ast`;
- checkpoint ref: `refs/warp/graft-ast/checkpoints/head`;
- current checkpoint: `714da101e689215e064d20f837b7d65be0fde9df`;
- current schema: 4;
- rebuildable cache refs: absent.

The published v17 upgrader has already been run in `--dry-run --json` mode
against the live repository. It reported `would-upgrade`, schema 4 to schema
5, and left the checkpoint ref unchanged. Therefore Graft requires the data
migration; changing only `package.json` is insufficient.

## Authority and blast radius

All Graft worktrees share `/Users/james/git/graft/.git`, including the
`refs/warp/graft-ast/*` namespace. Moving the checkpoint ref in this worktree
therefore moves it for every Graft worktree. A v16 process cannot be assumed to
understand the resulting schema-5 checkpoint.

The live migration is permitted only after:

1. v17 installation and adapter compatibility are green;
2. a disposable copy of the actual graph has completed the real migration and
   reopened successfully through Graft;
3. the original checkpoint is anchored by an immutable, cycle-specific backup
   ref whose target is verified before the authoritative ref moves; and
4. no process rooted in a Graft worktree is actively reading or writing the
   shared graph during the cutover.

The existing repository-rooted Graft daemon is user-owned state. This cycle
must not terminate it implicitly. If it remains active at cutover time, the
live migration stops at that explicit boundary until the operator authorizes
or performs the quieting step.

## Package and API boundary

The preceding cycle established `WarpGraphPort` and confined the concrete
git-warp runtime to `src/warp/open.ts`. v17 retains the legacy `WarpApp` and
`WarpCore` construction API for compatibility, so this cycle preserves the
Graft-facing port and changes only the adapter or substrate initialization
that v17 actually requires.

git-warp 17.0.0 upgrades its substrate to `@git-stunts/plumbing` 3.x, whose
default factory is asynchronous. Graft also depends on plumbing directly. The
dependency tree and both Graft composition sites must resolve one coherent
contract; if plumbing 3.x is adopted directly, `src/warp/open.ts` and
`src/adapters/node-git.ts` must await initialization without leaking package
types through the port.

The v17.0.0 release lock resolves `@git-stunts/git-cas` 6.0.0 and
`@git-stunts/plumbing` 3.0.3. The published package declares caret ranges, and
the current registry resolution advances those dependencies to versions whose
duplex-session requirement is not wired by v17's migration launcher. Graft
must pin the release-tested substrate for this migration cycle; a green dry
run alone does not exercise the affected write path.

## Migration command boundary

Graft will expose a repository-owned command that delegates to the migration
entrypoint shipped in the installed v17 package. The command exists to make
package-manager symlink resolution deterministic and to give operators one
repeatable invocation for dry runs and real cutovers. It must not reimplement
the package's schema transformation.

The command must:

- execute the installed package's exact v16-to-v17 upgrader;
- forward `--repo`, repeatable `--graph`, `--dry-run`, and `--json` arguments;
- fail if the expected v17 migration entrypoint is absent; and
- preserve the upgrader's exit status and structured output.

## Acceptance criteria

- [ ] `package.json` and `pnpm-lock.yaml` resolve
      `@git-stunts/git-warp` 17.0.0, not v16, v18, or v19.
- [ ] Direct plumbing dependencies and initialization sites are compatible
      with the substrate used by git-warp 17.0.0.
- [ ] The lockfile pins the v17 release-tested git-cas 6.0.0 and plumbing
      3.0.3 substrate so the real migration write path is reproducible.
- [ ] `package.json`, CI, and current architecture documentation agree on the
      required Node.js 22 runtime floor.
- [ ] The repository-owned migration command delegates to the installed
      package-owned v16-to-v17 upgrader and has an executable command-boundary
      test.
- [ ] Consumer source migration checks report no actionable v16 imports or
      public-name renames outside the existing Graft port/adapter.
- [ ] A disposable copy of the actual schema-4 `graft-ast` graph upgrades to
      schema 5, retains the old checkpoint as the new checkpoint's parent, and
      reopens through Graft 17.0.0.
- [ ] The live checkpoint has a verified backup ref before cutover.
- [ ] The live upgrader reports schema 4 to schema 5 and the authoritative ref
      points to its verified new checkpoint.
- [ ] A second dry run is idempotent and reports the checkpoint as already
      current with no cache work.
- [ ] Existing graph reads, writes, materialization, observation, traversal,
      queries, provenance, attached content, CLI, API, and MCP behavior pass.
- [ ] Lint, typecheck, build, the focused migration/adapter slice, and the full
      isolated test gate pass.
- [ ] A local Retro records the dependency identities, migration before/after
      SHAs, backup ref, commands, process boundary, and validation results.

## Playback questions

### Human

- [ ] Is there inspectable proof that Graft needed a migration rather than a
      dependency-only update?
- [ ] Can an operator identify the exact pre-migration checkpoint and recover
      it without guessing?
- [ ] Did the package-owned script, rather than a Graft reimplementation,
      perform the schema transformation?
- [ ] Did this cycle stop cleanly at v17 without adopting v18 or v19 behavior?

### Agent

- [ ] Does the command-boundary test fail under v16 and pass only when the v17
      migration entrypoint is installed?
- [ ] Does the disposable rehearsal preserve graph facts across the schema
      transition and prove the parent link?
- [ ] Does `openWarp()` reopen the migrated graph through `WarpGraphPort`?
- [ ] Does the post-cutover dry run prove idempotence without moving refs?
- [ ] Does the final dependency and production-import census preserve the
      single adapter boundary?

## RED strategy

1. Add a command-boundary test that invokes the Graft migration command in an
   empty disposable Git repository and requires structured v17 dry-run output.
2. Run it while v16 is installed and capture the expected failure: the v17
   package migration entrypoint does not exist.
3. Keep the existing port-boundary and adapter integration tests in the
   focused slice so the major bump cannot bypass the isolation seam.

## GREEN strategy

1. Add the thin repository command that resolves and executes the installed
   package-owned upgrader.
2. Upgrade git-warp to 17.0.0 and align direct plumbing initialization if the
   resolved substrate requires it.
3. Run the package's consumer fix/verify tools in dry-run mode and make only
   semantically required source changes.
4. Rehearse the real migration on a disposable copy of the actual graph and
   validate it with Graft's adapter.
5. Establish and verify the live backup ref, quiet repo-rooted graph users,
   execute the package migration once, and prove the second run is a no-op.

## Non-goals

- [x] Upgrading to git-warp 18.x or 19.x.
- [x] Running the v17-to-v18 or v18-to-v19 migration.
- [x] Adopting the v19 `openWarpGraph` public API.
- [x] Changing the Graft-owned `WarpGraphPort` contract without a demonstrated
      v17 compatibility need.
- [x] Translating git-warp persistence into Echo.
- [x] Deleting retired checkpoint objects or rewriting Git history.
- [x] Killing, restarting, or reconfiguring user-owned daemons without
      explicit operator authority.
- [x] Treating a dry run or green package install as proof that live data was
      migrated.

## Completion boundary

The cycle is complete only when Graft resolves git-warp 17.0.0, the package's
own v16-to-v17 script has migrated the authoritative `graft-ast` checkpoint to
schema 5 under a verified backup/ref receipt, the migrated graph reopens
through the Graft port, all validation is green, and the local Retro is
committed. If a repository-rooted v16 daemon prevents a quiet cutover, the
implementation may be made migration-ready, but the cycle remains open at the
live-data boundary.
