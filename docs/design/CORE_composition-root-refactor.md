---
title: "Composition root refactor"
legend: "CORE"
cycle: "CORE_composition-root-refactor"
source_audits:
  - "docs/audit/2026-05-04_code-quality.md"
  - "docs/audit/2026-05-04_ship-readiness.md"
---

# Composition root refactor

Source audits:
`docs/audit/2026-05-04_code-quality.md`,
`docs/audit/2026-05-04_ship-readiness.md`

Legend: CORE

## Hill

Decompose `createGraftServer` into a small public entrypoint plus
internal factories for runtime config, infrastructure adapters,
workspace routing, invocation, MCP registration, and the returned server
surface.

The current function has good dependency visibility, but it is doing too
much in one place. It should remain the public composition root while
delegating cohesive construction decisions to private factories.

## Playback Questions

### Human

- [x] Can a human see how `createGraftServer` gets smaller without
      hiding the composition order?
- [x] Can a human identify the factories for workspace routing,
      invocation, daemon runtime, and MCP surface registration?
- [x] Can a human verify that the public API contract remains unchanged?

### Agent

- [x] Does the design preserve the root composition role instead of
      scattering dependency construction through the codebase?
- [x] Does each proposed factory have one reason to exist?
- [x] Does the plan avoid broad option bags and generic service
      locators?

## Implementation Gravity

`src/mcp/server.ts:72` starts `createGraftServer`.

Inside one function, it currently owns:

- MCP server construction and session id selection
- workspace mode, project root, and graft dir resolution
- codec, run-capture, observability, git, process, and WARP adapter
  construction
- persisted local-history construction
- daemon scheduler, worker pool, control plane, monitor runtime, and
  runtime descriptor construction
- workspace router construction
- daemon repo overview construction
- runtime initialization promise
- invocation engine construction
- tool-context construction
- MCP tool registration
- session-started event emission
- returned `GraftServer` surface

The single function is only about 200 lines, but it crosses too many
ownership boundaries. The audit finding is not that the behavior is
wrong. The finding is that future changes have no small place to land.

## Target Shape

Keep `createGraftServer(options)` as the only public constructor.
Internally, have it read as a declarative composition list:

```ts
export function createGraftServer(
  options: CreateGraftServerOptions = {},
): GraftServer {
  const config = resolveGraftServerConfig(options);
  const infrastructure = createGraftInfrastructure(config, options);
  const daemon = createDaemonRuntimeParts(
    config,
    infrastructure,
    options,
  );
  const workspace = createWorkspaceRouterParts(
    config,
    infrastructure,
    daemon,
    options,
  );
  const runtime = createRuntimeInitialization(config, workspace, daemon);
  const invocation = createMcpInvocationParts(
    config,
    infrastructure,
    workspace,
    daemon,
    runtime,
  );
  const registration = registerGraftMcpTools(config, invocation);
  return createGraftServerSurface(
    config,
    workspace,
    invocation,
    registration,
  );
}
```

The snippet names the intended shape, not a mandatory exact API.

## Factory Boundaries

### `resolveGraftServerConfig`

Own deterministic option resolution.

Inputs:

- `CreateGraftServerOptions`
- environment map
- process cwd adapter if needed

Outputs:

- session id
- workspace mode
- project root
- graft dir
- session WARP writer id
- resolved run-capture config
- resolved observability state

Rules:

- keep `process.env` and `process.cwd()` reads at this boundary
- preserve the existing daemon-mode `graftDir` error
- do not add public options
- do not widen `CreateGraftServerOptions`

### `createGraftInfrastructure`

Own concrete adapter construction.

Outputs:

- file system adapter
- git adapter
- process runner
- canonical JSON codec
- WARP pool
- persisted local-history store
- runtime event logger

Rules:

- default adapters remain the same
- injected adapters from options still win
- no factory after this one imports Node adapters directly

### `createDaemonRuntimeParts`

Own daemon-only runtime construction.

Outputs:

- scheduler or null
- worker pool or null
- control plane or null
- monitor runtime or null
- daemon runtime descriptor callback
- daemon repo overview inputs

Rules:

- repo-local mode returns explicit null parts
- daemon mode creates the same defaults as today
- initialization stays centralized
- no hidden global daemon state

### `createWorkspaceRouterParts`

Own `WorkspaceRouter` construction and daemon repo overview creation.

Outputs:

- `WorkspaceRouter`
- optional `DaemonRepoOverview`

Rules:

- keep authorization and shared-attach policy wiring visible
- keep persisted local-history graph default unchanged
- do not let MCP tool registration import workspace construction

### `createRuntimeInitialization`

Own the runtime-ready promise.

Outputs:

- `runtimeReady: Promise<void>`

Rules:

- repo-local `.graft` exclusion still runs before router initialization
- router, daemon control plane, and monitor initialization order stays
  equivalent
- failed initialization behavior stays unchanged

### `createMcpInvocationParts`

Own invocation engine and tool context construction.

Outputs:

- invocation engine
- tool context

Rules:

- this factory is the consumer of the invocation pipeline design
- `AsyncLocalStorage` does not leak outside invocation parts
- tool context remains a facade over workspace routing and active
  execution context

### `registerGraftMcpTools`

Own tool registry selection and MCP SDK registration.

Outputs:

- MCP server instance
- handlers map
- schemas map

Rules:

- daemon mode still registers `ALL_TOOL_REGISTRY`
- repo-local mode still registers `TOOL_REGISTRY`
- input schemas remain strict for tools that define schemas
- `callTool` keeps using the same handler and schema path as SDK
  registration

### `createGraftServerSurface`

Own the returned `GraftServer` object.

Outputs:

- `getRegisteredTools`
- `callTool`
- `injectSessionMessages`
- `getWorkspaceStatus`
- `getRuntimeCausalContext`
- `getMcpServer`

Rules:

- preserve the exact current method names and behavior
- keep unknown-tool errors unchanged
- keep runtime causal context null when the router is unbound

## Type Discipline

Each factory needs a named input and output type. Avoid passing the
entire prior factory result into every later factory.

Good:

```ts
interface GraftInfrastructure {
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly codec: CanonicalJsonCodec;
  readonly runtimeLogger: RuntimeEventLogger;
}
```

Bad:

```ts
interface ServerStuff {
  readonly parts?: unknown;
  readonly flags?: unknown;
}
```

The goal is to make ownership narrower, not to replace one large
function with one large mutable object.

## Public API Contract

This is a non-breaking internal refactor.

Do not change:

- `createGraftServer(options?: CreateGraftServerOptions): GraftServer`
- `CreateGraftServerOptions`
- `GraftServer`
- root exports listed in `docs/public-api.md`
- tool registration names
- MCP input/output schemas
- runtime default behavior

No new root export is required for the first implementation. If a later
cycle decides to expose a factory, that is a minor-version API decision
and must be handled separately.

## Anti-Sludge Compliance

This design follows `docs/ANTI_SLUDGE_TYPESCRIPT_POLICY.md` by requiring:

- exact factory result types
- dependency construction at the composition boundary
- ports and adapters rather than direct imports in deeper factories
- no service locator
- no generic context bag
- no `Partial`-based internal configuration beyond the existing public
  option boundary
- no `types.ts` junk drawer
- no core logic moved into primary adapter registration

The refactor should trend toward the architecture in `ARCHITECTURE.md`:
primary adapters compose use cases; core operations stay below the MCP
surface.

## Test Plan

Before extracting factories:

- pin `createGraftServer` default repo-local behavior
- pin daemon mode registration and runtime status behavior
- pin injected git, process runner, WARP pool, daemon scheduler, worker
  pool, and control-plane options
- pin `callTool` and SDK registration sharing the same strict schema
- pin `getRuntimeCausalContext` null/unbound behavior

After extraction:

- unit-test config resolution without constructing an MCP server
- unit-test daemon parts in repo-local and daemon modes
- unit-test registry selection and strict-schema registration
- integration-test a repo-local server and daemon-bound server through
  existing public methods

## Migration Order

1. Add parity tests around `createGraftServer`.
2. Extract config resolution.
3. Extract infrastructure construction.
4. Extract daemon runtime parts.
5. Extract workspace router parts.
6. Extract runtime initialization.
7. Extract invocation/tool-context construction.
8. Extract tool registration.
9. Extract returned server surface.

Every slice should be behavior-preserving and independently reviewable.

## Non-goals

- [ ] Change startup semantics.
- [ ] Add new public options.
- [ ] Move MCP tools out of the registry.
- [ ] Replace daemon scheduler or worker pool behavior.
- [ ] Change WARP pool semantics.
- [ ] Modify `src/operations` behavior.
