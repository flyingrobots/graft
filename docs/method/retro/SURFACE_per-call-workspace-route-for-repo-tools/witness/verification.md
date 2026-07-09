# Verification

Cycle: `SURFACE_per-call-workspace-route-for-repo-tools`

## Commands

```text
npx vitest run test/unit/mcp/per-call-workspace-route.test.ts
```

Result: passed, 5 tests.

```text
npx vitest run test/unit/mcp/per-call-workspace-route.test.ts test/unit/mcp/opened-workspaces.test.ts test/unit/mcp/workspace-binding.test.ts test/unit/mcp/path-boundary-runtime.test.ts test/unit/mcp/daemon-multi-session.test.ts test/unit/contracts/capabilities.test.ts
```

Result: passed, 6 files and 32 tests.

```text
npx vitest run test/unit/contracts/output-schemas.test.ts
```

Result: passed, 1 file and 8 tests.

```text
pnpm typecheck
```

Result: passed.

```text
pnpm lint
```

Result: passed.

```text
git diff --check
```

Result: passed.

## Notes

During the initial slice validation, one new daemon regression hit
Vitest's default 5000 ms timeout. The test performs real git repo setup
and daemon harness work, matching neighboring daemon tests that already
use a 15000 ms timeout. The timeout was raised and the same combined
command then passed.

During final validation, the representative CLI peer schema test
exceeded its old 60000 ms cap both in the combined command and in
isolation on this machine. The test intentionally exercises the full CLI
peer JSON matrix, so its timeout was raised to a named 120000 ms cap.
`npx vitest run test/unit/contracts/output-schemas.test.ts` then passed
in isolation with 1 file and 8 tests.

The daemon multi-session divergent-checkout test also uses real git
worktree setup. Its timeout was aligned with neighboring daemon harness
tests at 15000 ms so the combined route-validation command can run under
normal local load without treating setup latency as a product failure.

`method_drift` was attempted for
`SURFACE_per-call-workspace-route-for-repo-tools`, but the Method tool
reported that the cycle was not in its active-cycle registry. This
repair was created directly from an urgent dogfooding finding rather
than through `method_pull`, so the drift check is recorded as manual
from the tests and docs above.
