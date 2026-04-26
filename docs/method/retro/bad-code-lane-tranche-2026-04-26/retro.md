# Retro: bad-code lane tranche 2026-04-26

## What shipped

Cleared a focused set of bad-code cards whose fixes were either already landed
or small enough to close without changing release posture:

- `commitsForSymbol-returns-current-signature.md` - `commitsForSymbol` now
  delegates to `symbolTimeline`, so deprecated callers receive historical
  per-version signatures instead of the current HEAD signature on every entry.
- `daemon-multi-session-test-timeout-pressure.md` - the shared daemon session
  test now carries an explicit integration-style timeout budget.
- `drift-sentinel-dead-pattern-param.md` - `runDriftSentinel` now applies the
  optional markdown glob pattern.
- `runtime-observability-hook-test-timeout-pressure.md` - the hook-observed
  checkout-boundary test already had an explicit integration-style timeout and
  was revalidated in this tranche.
- `stale-backlog-dependency-dag.md` - the backlog dependency graph was
  regenerated from active backlog files after retiring completed cards.
- `stale-docs-version-regex-missing-brackets.md` - the changelog version regex
  already accepts bracketed Keep a Changelog headings and the regression tests
  were revalidated.
- `structural-log-stale-since-param.md` - unsupported `since` input was removed
  from the WARP-backed `graft_log` MCP schema, CLI parser, usage text, and
  structural-log design truth surface.

## Playback

The bad-code lane now keeps only unresolved work in `docs/method/backlog/bad-code/`.
Completed cards were moved to `docs/method/graveyard/` so the original backlog
records remain searchable. Completion evidence lives here under
`docs/method/retro/`.

## Verification

- `pnpm exec vitest run test/unit/warp/structural-queries.test.ts test/unit/warp/drift-sentinel.test.ts test/unit/warp/stale-docs.test.ts test/unit/mcp/daemon-multi-session.test.ts test/unit/mcp/runtime-observability.test.ts test/unit/contracts/output-schemas.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm guard:agent-worktrees`
- `pnpm test`
