# PR #254 review repairs

## Optional undefined fields — P2

Review: [CodeRabbit thread](https://github.com/flyingrobots/graft/pull/254#discussion_r3952013844).
Base: `13a66297`.

The public request schema accepts optional fields explicitly set to undefined.
The client serialized those own properties into literal `undefined` query
values. For identity selectors this could produce a misleading complete empty
inventory; an undefined limit could cause refusal.

Four parameterized tests observe the request at the real local HTTP boundary.
The independent oracle is absence of the undefined field with defined identity
and limit parameters preserved. Each test requires exactly one received request.

RED on the unfixed client:

```sh
pnpm exec vitest run test/integration/mcp/daemon-inspection.test.ts -t 'omits an undefined'
```

All four cases failed at the query-parameter assertion. The actual request
contained `sessionId=undefined`, `workspaceId=undefined`, `repoId=undefined`, or
`limit=undefined` respectively. This was an assertion failure, not a setup error.

The client now skips undefined values before string conversion. The design
packet and public API documentation explicitly state that contract.

GREEN/VERIFY: the four-file inspection suite passed 27 tests, including all four
regressions; typecheck and lint passed.

## Empty query delimiter — P5

The compatibility test required the incidental trailing `?`, although its
contract is one request to `/inspect/v1` without an MCP/health fallback.
Temporarily omitting an empty delimiter in the client made the old test fail:
expected `/inspect/v1?`, received `/inspect/v1`. The revised test checks request
cardinality and the parsed pathname. It passed with the delimiter omitted; the
temporary client change was then restored and the revised test passed with the
original client too. No runtime behavior changed for this repair.

## Named capability registration — P3

Aggregate API/CLI counts and the generic `operator_query` assertions did not
prove that `daemon_inspect` itself remained registered. A focused contract test
now requires that exact capability ID, API exposure, CLI path, parity, and
API/CLI surfaces, with no MCP tool.

Calibration renamed only the production registry ID to `other_operator`.
The new assertion failed because `daemon_inspect` was absent. Production source
was restored byte for byte. GREEN/VERIFY: the registry and public-surface suites
passed 15 tests across three files. No runtime behavior changed for this repair.

## Combined repair verification

The nine-file combined inspection, old-status compatibility, registry,
public-surface, and path-boundary suite passed 45 tests. Typecheck, lint, build,
and whitespace checks passed. All temporary calibration mutations were restored.
CI and fresh third-party review are required on the published repair head before
calling the PR merge-ready.

## Merge with main and second review round

`origin/main` was merged twice: at `3770af23`, 58 commits behind, with conflicts
in `CHANGELOG.md`, `src/mcp/daemon-server.ts` and
`src/mcp/daemon-session-host.ts`, and at `13b582b3` for PRs #260 and #256, with
a `CHANGELOG.md` conflict only. The first merge also moved the integration
test's no-graph-open trap from the removed `InMemoryWarpPool.getOrOpen` to
main's `acquire`, so it still watches the path that opens graphs.

### Contradictory reported-client state — P2 (review thread)

The observation schema accepted `reportedClient: null` with
`reportedClientAvailability: "available"`, and a client object with
`"not_retained"`. A refine now requires the payload to be null exactly when the
availability is `not_retained` (`0b1e858c`). The regression test failed before
the refine and passes after it.

### Nested rows charged to a dropped parent — P3 (self-audit)

Opened-workspace rows were charged to the 500-row capture budget even when
their session row was then dropped or filtered out, so later collections came
back truncated with fewer than 500 rows emitted, against the budget stated in
the design packet. The charge is now refunded when the parent row is dropped
(`f7e0bb98`). With 5 sessions of 100 memberships, the test saw 404 rows emitted
and a truncated, empty job collection before the fix.

### Truncated collection with no omitted rows — P4 (self-audit)

The collection validator accepted `truncated` with a known `matchingTotal` no
greater than `returned`. A refine now rejects it (`1cc92489`). The producer
never emits this state; the validator is the public contract for older or
faulty daemons.

## Third review round

### Job start time contradicting its state — P2 (review thread)

The job row schema accepted a `queued` job with a non-null `startedAt` and a
`running` job with `startedAt: null`. The producer never emits either: `enqueue`
creates every job with `startedAt: null`, and `startJob` sets it before putting
the job in the running map; `queued` and `running` are the only states. A refine
on the job row now requires `startedAt` to be null exactly when the state is
`queued`. Before the refine, the regression test failed on its first
contradiction: a queued job with a start time parsed successfully.

### Worker repository missing from the text frame — P2 (review thread)

The worker projection keeps `repoId` for every assigned task, but the text
renderer printed only session and workspace, which are both null for a
persistent-monitor task (`daemon-worker-child-pool.ts`). Such a row showed two
unavailable values and no repository. Worker rows now end with
`repo <repoId>`, or `repo unavailable` for an idle worker. Before the fix the
regression test's monitor-assigned row read `... | session unavailable |
workspace unavailable` with no repository. `example.txt` was re-rendered from
`example.json` with the same clock; only its worker line changed. JSON output
already carried `repoId` and is unchanged.
