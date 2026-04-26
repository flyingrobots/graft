# Retro: full-suite timeout nondeterminism

## What shipped

The release-blocking nondeterministic full-suite timeout was fixed by removing
hidden test runtime pressure and making test Git execution explicit.

Implemented:

- `createGraftServer` can accept an injected `GitClient`
- repo-local test MCP servers use an isolated temp-only Git client
- `createServerInRepo` disables eager persisted local-history graph writes by
  default
- MCP helper tests prove inherited `GIT_DIR` and `GIT_WORK_TREE` do not redirect
  server Git operations into the live checkout
- daemon integration tests cap the real child-process worker pool at one worker
  and disable unrelated persisted-history graph writes
- `causal_status` schemas now allow nullable repo concurrency, matching runtime
  output

## Playback

The original timeout pattern came from tiny tests paying hidden full server
startup costs:

- repo-local MCP test servers opened WARP-backed persisted local-history graph
  state even when tests only needed bounded reads
- app-side test Git calls used the production Git adapter instead of the
  existing isolated test Git boundary
- daemon transport tests spawned more child-process workers than needed for the
  behavior under test

The fix keeps production defaults unchanged and makes the test harness opt out
of unrelated graph work when the behavior under test does not require it.

## Verification

- `pnpm exec vitest run test/unit/helpers/git.test.ts test/unit/helpers/mcp.test.ts test/unit/mcp/precision.test.ts test/unit/policy/cross-surface-parity.test.ts`
- `pnpm exec vitest run test/unit/contracts/output-schemas.test.ts test/integration/mcp/daemon-server.test.ts test/integration/mcp/daemon-bridge.test.ts test/integration/mcp/daemon-status-cli.test.ts`
- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_WARP_HOME pnpm test`

Final full-suite result:

```text
Test Files  178 passed (178)
Tests       1365 passed (1365)
```

## Follow-up

No new backlog card was filed. The remaining release concern is process
discipline: playback must continue to use temp repos, temp daemon roots, and
temp sockets instead of the live checkout as subject data.
