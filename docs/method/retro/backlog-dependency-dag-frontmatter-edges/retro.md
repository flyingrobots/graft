# Retro: backlog dependency DAG frontmatter edges

## What shipped

The active backlog dependency graph now renders dependency edges from card
frontmatter instead of only rendering active nodes.

Implemented:

- `scripts/generate-backlog-dependency-dag.ts`
- `test/unit/method/backlog-dependency-dag.test.ts`
- regenerated `docs/method/backlog/dependency-dag.dot`
- regenerated `docs/method/backlog/dependency-dag.svg`

## Playback

The v0.7.0 dependency chains now render from card metadata:

- `SURFACE_agent-dx-governed-edit` -> `CORE_agent-drift-warning`
- `SURFACE_agent-dx-governed-edit` -> `SURFACE_governed-write-tools`
- `CORE_daemon-aware-stdio-bridge-for-mcp-clients` ->
  `CORE_opt-in-daemon-mode-mcp-bootstrap` ->
  `SURFACE_bijou-tui-for-graft-daemon-control-plane`
- `CORE_rewrite-structural-blame-to-use-warp-worldline-provenance` ->
  `CORE_git-graft-enhance`
- `git-warp observer geometry ladder (Rung 2-4)` ->
  `CORE_migrate-to-slice-first-reads`

The graph also reports two unresolved internal references in cool-ideas cards:

- `WARP_auto-breaking-change-detection` blocked by
  `CLEAN_CODE_export-diff-semver-signature-as-patch`
- `WARP_semantic-merge-conflict-prediction` blocked by
  `CLEAN_CODE_export-diff-semver-signature-as-patch`

Those references were reported but not rewritten in this cycle.

## Verification

- `pnpm exec tsx scripts/generate-backlog-dependency-dag.ts`
- `pnpm exec vitest run test/unit/method/backlog-dependency-dag.test.ts`
- `git diff --check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
