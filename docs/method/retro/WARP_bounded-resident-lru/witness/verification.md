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

At the initial LRU commit, PR cleanup findings still required independent repairs. Detailed owner
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

## Review repair: signal shutdown

The actual daemon-registered SIGTERM callback was invoked with an injected
socket I/O failure on `424a8c59`. RED showed exit status zero and one unhandled
aggregate rejection. The handler now consumes the rejection, reports it once,
and sets exit status one. The transport and shutdown files passed 13/13 with
no unhandled errors. The test invokes only its own newly registered callback;
it does not send an OS signal to another process. Logs:
`/tmp/graft-review-signal-red.log`, `/tmp/graft-review-transport-green.log`.

## Review repair: settlement barrier

The originally suggested log-write failure is already caught by
`emitRuntimeEvent` in `server-invocation.ts`; it cannot reject `sessionStarted`.
A controlled logger failure test confirms that best-effort behavior and that
release still awaits pending router cleanup.

The converse fault exposed an early-settlement defect: inject rejection at the
router cleanup boundary while holding startup logging behind a promise gate.
On `beced76b`, release reported failure before logging settled. The surface
now awaits all settled obligations and then aggregates errors. Both new
settlement tests pass. The broader host observability run reported 16 passed
and one existing correlated-events test timeout; that first failure is retained
at `/tmp/graft-review-settlement-green.log`, despite the file's provisional name.
RED is `/tmp/graft-review-settlement-red.log` (one failed, one passed).

Final typecheck also caught a missing signal argument in the earlier signal
witness. `4c6f36fd` supplies `SIGTERM`; typecheck then passed. The failing CI
head must not be described as green or silently substituted with a later run.

The five inherited cleanup concerns are now repaired with the qualification
above. Detailed owner inventory is committed debt, as explicitly permitted by
its review finding. Final current-head validation and review remain required.

## Final source validation and generated-artifact repair

`pnpm test --maxWorkers=1` on `d92f1bc1` completed in 204.34 seconds:
**264 files passed, one failed; 2,367 tests passed, one failed**. Every runtime
case passed, including the earlier timeout cases and all new lifecycle tests.
The sole failure was the checked-in backlog DOT omitting the two new debt
cards. No runtime test or global timeout budget changed to obtain this result.
First-failure records above remain valid evidence of test-run variability.

Regenerated both DOT and SVG with:

```sh
pnpm exec tsx scripts/generate-backlog-dependency-dag.ts
pnpm test:local test/unit/method/backlog-dependency-dag.test.ts --maxWorkers=1
```

The DOT diff adds exactly the two WARP cards and changes the bad-code count
from 25 to 27. Its existing two-test artifact/relationship contract passes.
The generated SVG layout changes alongside it. This artifact-only correction
does not require another local full runtime campaign; CI validates the final
published tree. Source state is still `d92f1bc1`.

Logs: `/tmp/graft-lru-final-isolated.log`,
`/tmp/graft-lru-backlog-generation.log`, `/tmp/graft-lru-backlog-verify.log`.
Final lint and typecheck passed; Node 20 CI typecheck/build/runtime smoke passed
on `d92f1bc1`. Current-head full CI and reviewer completion remain publication
gates, to be checked live rather than inferred from this historical record.

CI run `34189530172` independently produced the same result on `d92f1bc1`:
Node 20 passed; Node 22 passed all runtime tests and failed only the stale DOT
contract (2,367 passed, one failed). The generated-artifact commit repairs that
specific failure. Final docs-only lint and whitespace validation passed.

## Outside-diff review: harness teardown

CodeRabbit's review body on `0a3b8ad2` also contained two findings outside
inline threads. The router/server settlement finding is covered by removing
binding-owned leases in `c31c0eeb` and settling the server obligations in
`d92f1bc1`. Router retirement now waits for pending initialization; running
invocations settle their own capabilities.

The harness finding remained actionable: an injected first-session release
failure left the harness root and later resources live. The existing
`closeDaemonResources` stage runner now closes every session, monitor, worker,
and root directory before aggregating errors. The new resource regression and
routed-workspace file passed 15/15; lint, typecheck, and whitespace checks
passed. Logs: `/tmp/graft-review-harness-{red,green}.log`.

Before this harness-only change, exact-head CI on `346a487f` passed both jobs:
run `34190011523`, Node 20 job `101945968625`, Node 22 job `101945968441`.
That Node 22 run included the full corrected isolated suite. This is historical
validation of that head; the final harness commit requires its own CI result
and substantive review before merge readiness.

## Current review repair: single-slot rebind continuity

CodeRabbit thread `PRRT_kwDOR3kM9M6gGu2N` identified self-inflicted pressure:
the rebind nested previous/current graph scopes, so capacity one suppressed the
previous graph and skipped its park record. The new real Git witness on
`85f81d94` observed `start`/one record for the old workspace instead of
`park`/two records. The store now exposes the existing departure write as a
separate operation. The router leases the previous graph for that write,
releases it, then leases the current graph for arrival; existing
previous-before-current ordering is unchanged. Same-workspace rebinds skip the
separate departure scope. This does not introduce a durable transaction.

The new witness and binding/history files pass 47/47. Existing tests that stub
history writes now stub the separate departure operation as well; their opaque
pool handles intentionally do not emulate graph storage. Lint and typecheck
passed. Logs: `/tmp/graft-review-rebind-red.log`,
`/tmp/graft-review-rebind-verify.log`. No capacity override or test timeout
increase was needed to pass the new witness.

## Review maintenance: rollback oracle

The rollback test now records opened worktree roots and requires the replacement
repository to have been opened. It still requires the original binding identity,
zero resident pins under its explicit cold policy, and the injected history
failure. The exact count of opener calls is removed because it was incidental
to lease granularity. The targeted test, relevant-file ESLint, and typecheck
passed. This preserves the existing consequential rollback claim rather than
adding a new behavior. Log: `/tmp/graft-review-rollback-oracle.log`.
