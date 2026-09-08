# Bounded resident LRU verification

## Semantic evidence

Commands run from the PR #251 worktree after merging main at `0a3b8ad2`:

| Evidence | Result |
| :--- | :--- |
| Pre-LRU pool regression | 5 failed / 3 passed; overflow, reuse, and released access detected |
| Pre-change binding lifetime regression | Expected zero pins after settlement; observed one |
| Pool LRU and five-session/two-slot router suites | 262/262 passed, including all 243 length-five traces over three identities |
| Existing pool, binding, and routed execution files | 52/52 passed under declared cold policy where applicable |
| Real Git reconstruction after cold release and LRU pressure | 8/8 passed in the pool lease file; nonempty structural result preserved |
| Recency, pin protection, capacity, final-release recency mutations | Each failed the targeted behavioral assertion; source restored before final GREEN |
| Lint, typecheck, whitespace | Passed |
| Canonical container build | Passed |

Focused commands:

```sh
pnpm test:local test/unit/mcp/warp-pool-lru.test.ts test/unit/mcp/workspace-resident-lru.test.ts --maxWorkers=1
pnpm test:local test/unit/mcp/warp-pool.test.ts test/unit/mcp/warp-pool-lease-eviction.test.ts test/unit/mcp/workspace-binding.test.ts test/unit/mcp/per-call-workspace-route.test.ts --maxWorkers=1
pnpm lint
pnpm typecheck
git diff --check
```

The generated oracle uses reuse distance rather than the implementation's Map
ordering. The boundary is exactly three identities, capacity two, and five
sequential acquire/release steps; explicit barriers separately exercise
pending opens and independent owners. This is bounded evidence, not universal
proof or an exhaustive concurrency model.

## Full-suite first failure and follow-up

`pnpm test --maxWorkers=1` built container image
`sha256:2d4b3782bf58d26e3377c32d8ba3b7f2d83393cb4439a726d5f0fed2fba0e4e5`.
It reported **260 files passed, 4 failed; 2,354 tests passed, 6 failed**.

Failures:

1. Old transport test waited for immediate zero residents after retirement;
   updated to assert session removal and bounded idle replacement.
2. Worker `safe_read` cache integration: 5-second timeout.
3. Worker dirty precision integration: 5-second timeout.
4. Banned-file cache test: 5-second timeout.
5. `read_range` receipt test: 5-second timeout.
6. Hex-layer contract lint test: 30-second timeout.

The updated affected files passed **53/53** with the canonical runner:

```sh
pnpm test test/integration/mcp/daemon-server.test.ts test/unit/mcp/cache.test.ts test/unit/mcp/receipt.test.ts tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts --maxWorkers=1
```

No retries were absorbed into a green full-suite claim. The five timeout causes
are not established by these results. The new transport scenario separately
exceeded five seconds on the host, then reported 1,064 seconds elapsed despite
a 15-second timer; it passed in the isolated follow-up. Initial logs remain
at `/tmp/graft-lru-isolated.log`, `/tmp/graft-lru-transport-green.log`, and
`/tmp/graft-lru-transport-15s.log`; follow-up is
`/tmp/graft-lru-isolated-targets.log`. Temporary paths may expire; this record
preserves outcomes and commands rather than promising permanent raw receipts.

## Bounded memory experiment

A copy of the already diagnosed checkpoint was queried through the new pool
implementation (transpiled to a private temporary module) and the installed
Graft 0.12.0 `openWarp` adapter with git-warp 16. The opener forwarded each
requested writer identity. Capacity was two; twelve sequential distinct writer
lanes each acquired, queried, and released. No writes or indexing were run.
Every query returned the same 7,892 node IDs (SHA-256 over sorted JSON:
`ac17849c4819cbd85ae18cbbdb37df86e42e8c4344b74582162bd7f72713230e`).

| Measurement | Result |
| :--- | :--- |
| Residents after second through twelfth acquisition | 2 throughout |
| Post-GC heap after second acquisition | 180.20 MiB |
| Post-GC heap after twelfth acquisition | 180.65 MiB |
| Post-GC heap after dropping pool | 19.11 MiB |
| Peak sampled RSS during run | 590.41 MiB |
| RSS after dropping pool and forced test-only GC | 501.66 MiB |
| Run duration and exit | 21.42 seconds; exit 0 |

Harness bounds: 384 MiB V8 old space, 768 MiB sampled RSS ceiling, 150-second
wall limit. Three test-only GC turns precede samples. External memory, transient
decode costs, allocator retention, and worker processes are outside the heap
plateau claim. Production does not force GC. The vanished 7 GB incident was
not recreated or conclusively attributed.

Local experiment command/artifacts:

```sh
python3 /tmp/graft-memory-probe.bIuo8Y/run-lru.py leased 0 12 /tmp/graft-memory-probe.bIuo8Y/checkpoint-fixture
```

## Remaining merge gates

Existing PR cleanup review findings require independent repairs. Detailed owner
inventory is explicitly filed as debt. Current-head CI, final full-suite
posture, and substantive review must be reconciled before merge readiness;
this witness does not waive any of those gates.

## Review repair: initial transport failure

`retires only the new session when its initial transport request rejects`
failed on `c31c0eeb`: expected one registered session, observed two. The repair
retires the new session through its existing idempotent owner before returning
`-32603`. The regression and existing connection-rollback test passed 2/2;
the existing session directory remains present and the failed one is removed.
Logs: `/tmp/graft-review-initial-{red,green}.log`.

## Review repair: partial construction

The injected synchronous `registerTool` failure during server construction
left one scratch directory on `3390fc96`. Construction now shares the same
idempotent retirement boundary as connection; it closes a constructed
transport, releases a returned server, and removes the scratch directory.
The construction, initial-request, and connection regressions passed 3/3.
Logs: `/tmp/graft-review-construction-{red,green}.log`.

## Review repair: socket cleanup reporting

Injecting `EACCES` at the real daemon socket-unlink boundary caused shutdown
to resolve on `4b525707`. After restricting suppression to `ENOENT`, the same
failure reaches the aggregate and the listener is closed. Normal socket
shutdown and the all-stage cleanup case also passed (3/3). An initial attempt
to spy on an immutable ESM namespace failed in the harness; it is not RED
evidence. The corrected harness uses the mutable builtin export and restores
its ESM bindings after the test. Logs: `/tmp/graft-review-unlink-red-2.log`
and `/tmp/graft-review-unlink-green.log`.
