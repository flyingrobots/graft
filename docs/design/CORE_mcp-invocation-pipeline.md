---
title: "MCP invocation pipeline"
legend: "CORE"
cycle: "CORE_mcp-invocation-pipeline"
source_audits:
  - "docs/audit/2026-05-04_code-quality.md"
  - "docs/audit/2026-05-04_ship-readiness.md"
---

# MCP invocation pipeline

Source audits:
`docs/audit/2026-05-04_code-quality.md`,
`docs/audit/2026-05-04_ship-readiness.md`

Legend: CORE

## Hill

Turn MCP tool invocation into an explicit pipeline whose stages can be
tested independently.

The current `invokeTool` path in `src/mcp/server-invocation.ts` is the
correct behavioral center, but it owns too many decisions at once:
schema parsing, daemon access checks, execution-context capture,
scheduling, worker offload, cache replay, metrics, receipts,
observability, failure logging, and read attribution.

This design keeps the public MCP surface stable while extracting those
decisions into narrow stages with exact inputs and outputs.

## Playback Questions

### Human

- [x] Can a human name the stages that replace the large
      `invokeTool` span?
- [x] Can a human see which stage owns validation, authorization,
      scheduling, observability, and read attribution?
- [x] Can a human verify that the design does not change MCP tool
      names, arguments, receipts, or public exports?

### Agent

- [x] Does the packet cite the current implementation gravity in
      `src/mcp/server-invocation.ts`?
- [x] Does the packet keep Zod decoding at the boundary instead of
      pushing loose payloads into core stages?
- [x] Does the packet conform to the TypeScript anti-sludge policy by
      requiring exact named types, discriminated unions, and ports?

## Implementation Gravity

The refactor target is concentrated in these source spans:

- `src/mcp/server-invocation.ts:193`: `invokeTool` starts by awaiting
  runtime readiness, recording governor activity, minting trace ids, and
  opening the observability event.
- `src/mcp/server-invocation.ts:225`: validation and daemon access
  enforcement happen inline before execution-context selection.
- `src/mcp/server-invocation.ts:234`: scheduling eligibility is derived
  inline from mode, router binding, scheduler presence, and tool name.
- `src/mcp/server-invocation.ts:258`: daemon scheduling, worker offload,
  cache snapshot transfer, cache update replay, metric deltas, and
  receipt transfer are one nested branch.
- `src/mcp/server-invocation.ts:324`: completion observability is
  emitted after handler execution.
- `src/mcp/server-invocation.ts:346`: read attribution parses the MCP
  payload and records observations.
- `src/mcp/server-invocation.ts:359`: failure classification and
  failure observability are handled in the same catch block.

These behaviors must remain, but their ownership should be explicit.

## Target Shape

Introduce an invocation pipeline built by the composition root and owned
by the MCP invocation module. The public server still exposes
`callTool(name, args)` and registers MCP tools exactly as it does today.

The pipeline is a fixed ordered set of stages:

1. Invocation opening: runtime readiness, trace id, start time, arg keys.
2. Boundary decode: Zod parsing and strict-schema errors.
3. Access decision: daemon versus repo-local tool authorization.
4. Execution binding: workspace context and repo-state observe need.
5. Dispatch plan: inline, scheduled, or daemon-worker execution.
6. Tool execution: handler invocation under invocation scope.
7. Worker reconciliation: cache snapshots, metrics, and receipts.
8. Read attribution: validated read-observation payload recording.
9. Completion event: success event, footprint, latency, receipt data.
10. Failure event: failure classification and non-throwing logging.

The important rule is that stages pass named results forward. A stage
must not peek back into global state that a previous stage already
decided.

## Proposed Types

The internal types should be precise and local to the invocation module.
Do not expose them from the package root.

```ts
type ToolInvocationPlan =
  | InlineToolInvocation
  | ScheduledToolInvocation
  | OffloadedToolInvocation;

interface DecodedToolInvocation {
  readonly tool: ToolDefinition["name"];
  readonly args: JsonObject;
  readonly handler: ToolHandler;
}

interface InvocationEnvelope {
  readonly sessionId: string;
  readonly traceId: string;
  readonly startedAtMs: number;
  readonly argKeys: readonly string[];
}

interface InvocationStageResult {
  readonly envelope: InvocationEnvelope;
  readonly decoded: DecodedToolInvocation;
  readonly execution: WorkspaceExecutionContext | null;
  readonly plan: ToolInvocationPlan;
}
```

The concrete implementation can tune names, but it must preserve these
properties:

- no `any`
- no `as unknown as`
- no ambient flag bags
- no optional-property soup for stage output
- no catch-all `Record<string, unknown>` beyond explicit boundary
  decoding
- no new junk-drawer `types.ts`

## Stage Responsibilities

### 1. Invocation Opening

Create the invocation envelope and record governor activity. This stage
is allowed to read the runtime clock and UUID source because it is a
primary adapter boundary.

Future hardening can replace direct `Date.now()` and `crypto.randomUUID`
with a `ClockPort` and `IdPort`, but that is not required for the first
slice. If introduced, those ports must terminate at the invocation
adapter boundary and must not leak into pure operations.

### 2. Boundary Decode

Own Zod validation.

Inputs:

- raw tool name
- raw `JsonObject` arguments
- optional strict Zod schema
- handler

Output:

- `DecodedToolInvocation`

Rules:

- strict schema behavior stays unchanged
- validation failures preserve current thrown-error behavior
- decoded args are the only args passed to later stages
- no stage after this one calls `schema.parse`

### 3. Access Decision

Own daemon versus repo-local tool authorization.

Inputs:

- workspace mode
- tool name
- workspace binding state
- workspace status

Output:

- `ToolAccessDecision`, accepted or refused

The stage should wrap the existing access policy rather than reauthoring
policy rules. The first slice should move orchestration, not change trust
semantics.

### 4. Execution Binding

Own workspace execution-context capture and repo-state observation
strategy.

This stage answers two questions:

- Does this tool need a captured `WorkspaceExecutionContext`?
- Does this tool require repo-state observation before execution?

The answer should be represented as data, not as repeated conditionals
spread across scheduling and handler execution.

### 5. Dispatch Plan

Own inline versus scheduled versus daemon-worker execution.

The plan should be a discriminated union:

- `InlineToolInvocation`
- `ScheduledToolInvocation`
- `OffloadedToolInvocation`

The scheduling stage may depend on:

- daemon scheduler presence
- daemon worker pool presence
- execution context
- daemon scheduled tool set
- daemon offload eligibility

It must not call the handler. It only builds the plan.

### 6. Tool Execution

Own the actual handler call under invocation scope.

This stage is the only stage that calls `handler(decoded.args, ctx)`.
It is also the only stage that enters invocation and execution scope.
The current `AsyncLocalStorage` dependency should be hidden behind an
`InvocationScopePort` so stage tests can run without Node async-local
state.

### 7. Worker Reconciliation

Own daemon worker result integration.

The stage must preserve current behavior:

- pass cache snapshots to offloaded repo tools when a path is present
- apply returned cache updates to the active execution cache
- apply metrics deltas
- record returned bytes against metrics and governor
- transfer worker receipts and tripwire signals into invocation state

This stage should also be the place to harden cache update ordering in a
future slice. The 2026-05-04 ship-readiness audit calls out a possible
race around daemon offload cache updates. A dedicated reconciliation
stage makes that risk testable.

### 8. Read Attribution

Own read-observation recording for attributed read tools.

Inputs:

- tool name
- decoded args
- MCP result
- optional execution context

Rules:

- parse payloads through the existing validated model
- keep unsupported/error payload handling unchanged
- never let attribution logging alter the user-visible tool result

### 9. Completion Event

Own success observability.

This stage should build the existing `tool_call_completed` event from
the invocation response and footprint snapshot. It should use a
non-throwing observability port so runtime logging remains advisory.

### 10. Failure Event

Own failure classification and failure observability.

Failure event emission must remain best-effort. The tool call should
throw the original error after logging is attempted.

## Observability Port

The existing `emitRuntimeEvent` behavior is correct: logging failures
must not fail a tool call.

The pipeline should make that guarantee explicit:

```ts
interface RuntimeEventPort {
  emit(event: RuntimeEvent): Promise<RuntimeEventEmission>;
}

type RuntimeEventEmission =
  | { readonly status: "emitted" }
  | {
      readonly status: "dropped";
      readonly reason: RuntimeEventDropReason;
    };

type RuntimeEventDropReason = "runtime_not_ready" | "logger_failed";
```

The first implementation may keep the current swallow-on-failure
behavior internally. The type is the target shape for tests and future
circuit-breaker work.

## Public API Contract

This refactor is non-breaking.

Do not change:

- root package exports documented in `docs/public-api.md`
- `createGraftServer`
- `CreateGraftServerOptions`
- `GraftServer.callTool`
- MCP tool names
- MCP input schemas
- MCP output schemas
- receipt shape
- `callGraftTool` behavior

The implementation should remain a patch-level hardening change unless
an unrelated public export is intentionally added in a separate cycle.

## Anti-Sludge Compliance

This design follows `docs/ANTI_SLUDGE_TYPESCRIPT_POLICY.md` by requiring:

- exact stage types with one reason to exist
- discriminated unions for dispatch and emission outcomes
- boundary-only schema decoding
- injected ports for runtime effects
- no broad bag of optional stage data
- no shared generic invocation object mutated by every stage
- no core dependency on MCP SDK classes

The stages are orchestration/application code. Pure operation logic
must stay outside MCP primary-adapter modules.

## Test Plan

The implementation cycle should start with tests that pin current
behavior before extraction:

- schema failures still throw and produce failure observability when
  observability is enabled
- daemon-only tools remain refused in repo-local mode
- repo tools still schedule through `DaemonJobScheduler` in daemon mode
- offloaded `safe_read` preserves cache-hit behavior across worker
  execution
- runtime logger failure does not fail tool calls
- read-attribution events still record `safe_read`, `file_outline`, and
  `read_range`
- receipts keep sequence, latency, projection, burden, metrics, and
  tripwire fields

After behavior is pinned, add focused stage tests for decode, access,
dispatch planning, worker reconciliation, and observability emission.

## Non-goals

- [ ] Change daemon authorization policy.
- [ ] Change MCP result schemas.
- [ ] Change root package exports.
- [ ] Replace the worker pool implementation.
- [ ] Rewrite `RepoWorkspace`.
- [ ] Add new user-facing tools.

## Pull Order

1. Add behavior-preserving tests around the current invocation path.
2. Introduce internal stage types and a pipeline runner.
3. Move Zod decode and access enforcement into stages.
4. Move dispatch planning without changing execution behavior.
5. Move worker reconciliation behind a named stage.
6. Move completion/failure observability into named stages.
7. Keep one final integration path through `createGraftServer`.
