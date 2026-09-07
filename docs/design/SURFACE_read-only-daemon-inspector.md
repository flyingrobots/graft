# Read-only daemon inspector — slice 1

Status: slice 1 implemented and locally validated; publication/review pending.
Parent: [daemon observability program](../method/backlog/cool-ideas/SURFACE_daemon-observability-api-and-bijou-dashboard.md).
Local closure: [Retro and validation](../method/retro/SURFACE_read-only-daemon-inspector/SURFACE_read-only-daemon-inspector.md).

## Hill

From one command, identify the running daemon, inspect current session–workspace
relationships and work within explicit bounds, and distinguish recorded index
evidence from unavailable, incomplete, or outdated knowledge — without
initiating workload activity.

Human surface: deterministic single-frame text and JSON, with session,
workspace ID, and repository ID filters. Agent/library surface: the same
versioned contract and direct typed local inspection client. No MCP tool is
added: this is intentionally same-user operator inspection, not an expansion
of workspace-scoped MCP visibility. The daemon uses the shared application
query directly; clients consume its local transport response, never MCP tools.

## Frozen release gates

1. **Observational:** the dedicated GET route on the existing same-user socket
   never registers/touches workload sessions, renews leases, touches cache
   recency, pins/opens graphs, discovers workspaces, indexes, rebinds, or
   schedules work. No daemon means no daemon; no autostart, upgrade, restart,
   or fallback to the weaker six-MCP-call status reader. Permitted effects are
   bounded CPU/allocation/transport and server-owned observer accounting.
2. **Observation identity and consistency:** schema version, process incarnation,
   and monotonically increasing capture sequence are independent. One short
   synchronous call copies parent-owned projections; serialization happens
   afterward without workload locks. It is coherent for those in-memory fields,
   not an atomic filesystem or child-process observation. Component generation
   and source basis are not fabricated from capture sequence. Failure is explicit.
3. **Relationships:** currently opened membership differs from active default
   binding. Jobs retain their admitted repository/worktree/session IDs across
   rebind/end; an ended originating session is not called an orphan. Reported
   client identity is unverified. Historical workspace usage is not retained.
4. **Index evidence:** availability, completeness, basis/current-source evidence,
   and inspector capture time are independent. No graph traversal is performed
   to obtain counts or freshness. Missing index/storage/coverage projections are
   `not_retained` or `unsupported`, never zero/false. A monitor's recorded commit
   is only its last recorded result, not workspace freshness or global coverage.
5. **Bounds and negative claims:** filters precede matching-result limits. Each
   collection declares complete/truncated/bounded/unknown, returned count,
   matching total when known, and reason. Only a successful complete empty
   collection establishes absence within its exact declared scope. No pagination
   or retained captures in v1. Query traversal, records, text, bytes, observers,
   and transport duration all have finite limits (specified below).
6. **Health and history:** reachability, capability assessment, observation
   failure, and historical outcomes are separate. No health diagnosis from
   lifetime failure totals, no addition/correlation of scheduler and worker
   counters. Counters identify their own accumulation start and incarnation.
   Recent failures are `not_retained`, not an empty incident history.
7. **Trust and compatibility:** only the existing private local transport.
   No TCP/browser/control surface. Exact field allowlists, bounded/redacted
   detail text, terminal-safe encoding, and no identity-based metric labels.
   Running identity is captured from the loaded module at process construction;
   client version and schema version are distinct. Unsupported daemon/schema
   produces a typed result. Existing daemon status and `ok | degraded` remain
   unchanged.

## Smallest consistency boundary

The synchronous capture covers registered session identity/timestamps, each
router's current active binding and opened-membership map, authorization map,
scheduler admission records/states, monitor records, and parent-owned worker
assignment records. There is no await, callback into workload execution, or
workload lock. An in-flight asynchronous operation can be observed between its
own transitions; the query does not assert transactional workflow completion.
Jobs always carry their own admitted route. Worker assignments identify worker
requests; scheduler-job correlation is unavailable unless explicitly recorded.
Parent-held worker state can lag the actual child; that limitation is explicit.

No current-source validation occurs. All index evidence in this first adapter
is unavailable where no existing bounded in-memory projection establishes it.
Schema types permit explicitly scoped counts and mixed source observations;
the production adapter must not manufacture such counts from a pool size.

## Query and bounds

`GET /inspect/v1` accepts at most one of `sessionId`, `workspaceId`, or `repoId`,
plus `limit` (default/max 100; minimum 1). Selectors are exact authoritative IDs,
not paths requiring discovery. A repo selector aggregates its worktrees.

- At most 4,096 iterator steps per capture, including opened memberships.
- At most 100 rows per collection and 500 rows across a capture, including
  nested opened memberships. Lists stop work at the scan bound; they do not
  scan/traverse the graph or gather an unbounded list and truncate afterward.
- At most 512 characters per exported detail field; oversized/secret/control
  containing fields are explicitly represented safely. IDs used for joins are
  not silently shortened into new identities; unrepresentable identity causes
  an explicit unavailable section.
- At most 512 KiB per encoded response; overflow returns a typed observation
  failure rather than an invalid/truncated JSON document.
- At most four concurrent observer responses, with a five-second response
  lifetime. No observer snapshots retained after response completion.
- Request URL at most 4 KiB; unknown/duplicate parameters and unsupported
  methods are rejected. Clients bound response bytes and request duration.

Session filtering selects that session and jobs attributed to it, including
jobs whose origin is no longer registered. Workspace inventory is restricted
to established opened/job relationships; if relationship discovery is bounded
or unavailable its completeness cannot be upgraded by a subsequent empty list.
Workspace/repo filters apply to recorded identities; unrelated samples cannot
hide matching rows behind the output limit. The independent global scan budget
can still prevent finding a row: that is visibly bounded, never absent.
Workers remain a daemon-wide section, explicitly labelled, because v1 does not
claim complete scheduler-to-worker correlation. Monitors are repo-owned and
workspace selection does not imply a per-worktree monitor. Unsupported joins
are explicitly unavailable rather than guessed.

## Playback / falsification

- A session opens A and B; B is active; both current memberships survive.
- Two sessions use the same workspace; identities remain separate.
- A-routed job stays attributed to A after its session binds B or ends.
- Opened workspace without index evidence reports unavailable, never indexed.
- Mixed source observations cannot be labelled a single current basis.
- Truncation, budget exhaustion, and projection failure never assert absence.
- Target filtering happens before result limits; authoritative identity is used.
- Quiescent repeated integration reads leave workload registries, timestamps,
  router/cache/governor/graph state and scheduler state unchanged; spies/traps
  reject graph opens, discovery, lease/cache touches, or work admission.
- Tests allow explicit observer counters and unrelated workload transitions;
  compare operation-specific state/effect witnesses, not just filesystem diffs.
- Fake-clock captures separate observation age from source currency. Captures
  from different incarnations cannot imply continuous counter history.
- Old daemon/schema, absent socket, invalid/oversized response, and hostile
  text produce explicit compatibility/observation results and safe rendering.
- Focused real-socket integration proves the route bypasses MCP initialization.

## Delivery and deferrals

This cycle ships only slice 1: query/contract, dedicated read transport,
single-frame text/JSON, focused filters, documentation and acceptance evidence.
Slice 2 (Bijou navigation, stable selection, polling/backoff/freeze and stale
frames) is independently shippable later. Slice 3 (bounded lifecycle/failure
events and scheduler-owned explanations) is separate again. Coverage measurement
requires its own contract. No control commands, general metrics registry,
portable dashboard artifact, Geordi/browser target, target maps/receipts,
comprehensive tracing, durable history, event diff, or retained pagination.
The parent's unimplemented criteria remain open; this child does not close it.

## Verification strategy

RED/GREEN semantic tests use deterministic projections and a fake clock.
Focused real-daemon tests use disposable sockets/workspaces and trap prohibited
effects. Existing status/parser/daemon tests guard compatibility. Run lint,
typecheck, build, relevant suites, then the repository's isolated full test
gate. Record exact results and residuals in a committed local Retro before PR.
