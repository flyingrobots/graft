# Slice 1 validation witness — 2026-09-07

Implementation commit: `38437450`. Host Node `v26.0.0`, pnpm `10.30.0`;
the canonical `pnpm test` runner built and ran the repository's isolated Node 22
Alpine test image. No dependencies or lockfile entries were changed.

| Gate | Executable evidence | Observed result |
| --- | --- | --- |
| Observational route | `test/integration/mcp/daemon-inspection.test.ts`, repeated real-socket reads with actual workload entry-point traps and complete projected-state comparison | Pass; deliberate hidden activity-touch mutation failed the same test |
| Consistency and identities | `test/unit/operations/daemon-inspection.test.ts`, copied projections/fake clock; integration restart | Detached parent-memory values, distinct incarnation, capture sequence reset; no fabricated source basis |
| Recorded relationships | Query tests for two opened worktrees/shared workspace/ended origin; real scheduled request held across rebind in integration | Admitted A route survives active B; ended origin is `not_registered` |
| Independent index evidence | Query schema/capture-age tests | Missing evidence remains null/unknown/not_retained; mixed observations reject a single basis |
| Explicit bounds | Query traversal/filter tests; `test/unit/mcp/daemon-inspection-route.test.ts` | Pre-limit filtering, 4,096-step stop, row/byte caps, four observer responses, fake-clock deadline release |
| Health/history distinctions | Query and CLI fixtures | Layer counts and accumulation epoch remain separate; current service assessment unsupported |
| Trust/compatibility | Local-socket integration, CLI test, terminal/schema hostile-input tests, existing status test | No TCP fallback, old endpoint/schema unsupported, absent daemon absent, safe display, old status contract preserved |

The initial missing-module RED demonstrated that the feature did not exist;
it is not claimed as behavioral falsification. Four load-bearing claims were
subsequently calibrated against executable production mutations. The checked-in
calibration receipt records each mutation, command, original source hash,
nonzero test exit, named assertion failure, and restoration.

Commands run successfully:

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm pack:check
pnpm release:surface-gate
pnpm test
pnpm exec vitest run test/unit/operations/daemon-inspection.test.ts test/unit/cli/daemon-inspect.test.ts test/unit/mcp/daemon-inspection-route.test.ts test/integration/mcp/daemon-inspection.test.ts test/unit/release/path-ops-boundary-allowlist.test.ts
git diff --check
```

Final isolated test summary:

```text
Test Files  264 passed (264)
     Tests  2092 passed (2092)
  Start at  18:14:51
  Duration  245.38s
```

The isolated run copied its input before removal of redundant fake-effect
assertions from the query unit test. That test still checks detached copies;
the real-socket integration owns the forbidden-effect claim. The final focused
run covers the committed test version: 25/25 passed. Runtime sources were the
same in both runs. No test was skipped or quarantined to obtain the final gate.

First isolated run, retained as a failed experiment:

```text
Test Files  2 failed | 262 passed (264)
     Tests  2 failed | 2090 passed (2092)
  Duration  289.86s
```

Failures were the ESM test-spy error and the new direct path import, both
corrected before the final isolated run. The separate local generic-timeout
failure and invalid-cardinality pressure failure are described in the Retro.

The built command's older-daemon compatibility observation was:

```json
{"status":"unsupported","clientVersion":"0.13.0","reason":"DAEMON_INSPECTION_UNSUPPORTED"}
```

This is an endpoint-compatibility observation, not a fresh workload inventory
or a health assessment. Running-package inspection support was not installed
into that daemon. The fictional `example.json`/`example.txt` pair is illustrative
only and carries no process or source-freshness authority.
