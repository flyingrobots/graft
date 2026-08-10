# v0.12.0 Release Security Gate

## Hill

Restore the existing release invariant that Graft publishes with zero known
high- or critical-severity npm advisories, without expanding the release into a
general dependency migration.

The current `origin/main` graph is held below patched transitive versions by
explicit `pnpm.overrides`. The release gate therefore fails even though patched
versions exist within the affected dependency families.

## Acceptance Criteria

- The resolved dependency graph contains patched versions of `tar`,
  `brace-expansion`, `fast-uri`, `hono`, `ip-address`, `postcss`, and `nanoid`.
- `pnpm security:check` reports `critical=0` and `high=0`.
- `pnpm install --frozen-lockfile` accepts the committed manifest and lockfile.
- `pnpm lint`, `pnpm typecheck`, and the release surface gate pass.
- The complete release gate passes before v0.12.0 is tagged.

## Playback Questions

1. Does the repository-owned security gate pass without muting an advisory?
2. Does `pnpm why` prove that every previously vulnerable package resolves to
   the intended patched version?
3. Did the repair avoid unrelated direct-dependency major upgrades?
4. Can the final release package still build and pass its public surface gate?

## Non-Goals

- Upgrading Graft to git-warp v19.
- Migrating Bijou, TypeScript, web-tree-sitter, or plumbing major versions.
- Eliminating moderate or low advisories that require unrelated architecture
  changes.
- Changing Graft runtime behavior or public contracts.

## Test Strategy

Capture the current failing `pnpm security:check` as RED. Advance only the
repository's explicit transitive overrides, regenerate `pnpm-lock.yaml`, and
rerun the security gate as GREEN. Verify the resolved versions with `pnpm why`,
then run lint, typecheck, the release surface gate, and the complete release
gate on the final v0.12.0 release-prep head.
