# Verification

Cycle: `SURFACE_per-call-workspace-route-for-bounded-reads`

## Commands

```text
npx vitest run test/unit/mcp/per-call-workspace-route.test.ts
```

Result: passed, 3 tests.

```text
npx vitest run test/unit/mcp/per-call-workspace-route.test.ts test/unit/mcp/opened-workspaces.test.ts test/unit/mcp/workspace-binding.test.ts test/unit/mcp/path-boundary-runtime.test.ts test/unit/mcp/daemon-multi-session.test.ts test/unit/contracts/output-schemas.test.ts test/unit/contracts/capabilities.test.ts
```

Result: passed, 7 files and 38 tests.

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

An earlier combined run timed out one new daemon regression at Vitest's
default 5000 ms threshold. The test performs real git repo setup and
daemon harness work, matching neighboring daemon tests that already use
a 15000 ms timeout. The timeout was raised and the same combined command
then passed.

`method_drift` was attempted for
`SURFACE_per-call-workspace-route-for-bounded-reads`, but the Method tool
reported that the cycle was not in its active-cycle registry. This
repair was created directly from an urgent dogfooding finding rather
than through `method_pull`, so the drift check is recorded as manual
from the tests and docs above.
