# v0.9.0 Release Verification Witness

## Discovery Facts

- Repository type: JS/TS monorepo (pnpm); lockfile `pnpm-lock.yaml`
- Publishable unit: `@flyingrobots/graft` (npm)
- Version-bearing manifest: `package.json` (0.8.0 → 0.9.0)
- Previous tag: `v0.8.0`; target tag `v0.9.0` absent locally and on
  origin before tagging
- Release branch: `release/v0.9.0`; guards passed with clean worktree
  on `main` exactly synced to `origin/main` (`fc0c40ad` at discovery)

## Validation (runbook Phase 3, in order)

| Step | Command | Result |
| :--- | :--- | :--- |
| Lockfile | `pnpm install` | current, no changes |
| Worktree guard | `pnpm guard:agent-worktrees` | pass |
| Schema gate | `WESLEY_BIN=… pnpm schema:structural-history:check` | verified; wesley=0.0.5, l1=48651fa1…, byte-identical regen; descriptor in sync |
| Lint | `pnpm lint` | zero errors, zero warnings |
| Surface gate | `pnpm release:surface-gate` | pass |
| Tests | `pnpm test` | 232 files, 1677/1677 pass |
| Security | `pnpm security:check` | pass (4 moderate Dependabot findings triaged; below blocking threshold per policy) |
| Pack | `pnpm pack:check` | `flyingrobots-graft-0.9.0.tgz` |
| Registry | `npm info @flyingrobots/graft` | reachable (0.8.0 prior) |

Note: the first `pnpm test` pass surfaced a stale descriptor
(`sourcePackageVersion` 0.8.0 after the version bump); the descriptor
was regenerated deterministically and the full suite re-run clean.

## Dogfood (Phase 3.5)

Fresh MCP session `55afdf07-e257-428f-ba06-9979327e4451`:

- `doctor`: parser healthy, thresholds 150 lines / 12288 bytes
- `safe_read src/parser/lang.ts`: `projection: "content"`
- `safe_read src/mcp/server.ts`: `projection: "outline"` with 18-entry
  jump table (417 lines, ~9.4KB avoided)
- `file_outline src/echo/structural-history-client.ts`: sane entries
- `stats`: counters tracking (3 reads, 2 outlines, burden by kind)
- Known defect reconfirmed (tracked, non-blocking): first
  parser-touching search call of a fresh session fails with the
  `ensureParserReady` invariant (`code_find` this time), while `doctor`
  reports `parserHealthy: true`

## Merge, Tag, Publish (Phase 4)

- Release PR: https://github.com/flyingrobots/graft/pull/89
  (CodeRabbit pass; test (20)/(22) pass)
- Merge commit on `main`: `72ef1a4232f0e9f39043b5f005dacd91e16ecdba`
- Tag: `v0.9.0` (annotated) on the merge commit, pushed to origin
- Release workflow run: `27322265769` — jobs `sanity`, `release`,
  `publish` all `success`
- GitHub Release: https://github.com/flyingrobots/graft/releases/tag/v0.9.0
  (assets: `flyingrobots-graft-0.9.0.tgz`, `SHA256SUMS`)
- npm delivery: `npm info @flyingrobots/graft version` → `0.9.0`;
  tarball `https://registry.npmjs.org/@flyingrobots/graft/-/graft-0.9.0.tgz`

## Non-Blocking Warnings

- 4 moderate Dependabot findings remain open for triage (below the
  release-blocking threshold; tracked for a follow-up chore branch).
- `node --import tsx` emits a `module.register()` deprecation warning
  (DEP0205) across script invocations; cosmetic.
