# MCP

Graft is a high-fidelity tool provider for the Model Context Protocol (MCP).

```mermaid
sequenceDiagram
    participant Client
    participant Server as Graft Server
    participant Policy as Policy Engine
    participant Parser as Tree-Sitter
    Client->>Server: call tool(safe_read, path)
    Server->>Policy: evaluate(path, session)
    Policy-->>Server: ALLOW (outline)
    Server->>Parser: extract outline
    Parser-->>Server: Outline + JumpTable
    Server-->>Client: respond(JSON + Receipt)
```

## Startup

### Repo-local stdio MCP
```bash
npx @flyingrobots/graft serve
```

This is the default repo-local MCP posture. The current checkout is the
active workspace, so there is no separate daemon authorization or
binding step.

### Daemon-backed stdio MCP
```bash
npx @flyingrobots/graft serve --runtime daemon
```

This keeps compatibility with MCP clients that can launch only a stdio
command while routing MCP traffic to the local daemon `/mcp` surface.
The bridge auto-starts the daemon when it is missing, waits for
`/healthz`, then proxies stdio traffic to the daemon. Use
`--no-autostart` to require an already-running daemon:

```bash
npx @flyingrobots/graft serve --runtime daemon --no-autostart
```

Daemon-backed sessions start unbound. Repository-scoped tools fail
until the session is authorized and bound through the workspace control
plane.

### Local Daemon
```bash
npx @flyingrobots/graft daemon
```

Daemon sessions start `unbound`. Once a client is connected to the
daemon MCP surface, repository-scoped work normally follows this
agent-facing flow:

1. optionally call `capabilities` or select its `workspace` family
2. `workspace_open` with the target `cwd`
3. optionally `workspace_list_opened` to inspect opened paths and the
   active workspace
4. then call repository-scoped tools such as `safe_read`, `graft_since`,
   or `code_show`

For concurrent multi-repo use inside one daemon-backed MCP session,
repo tools that support routing also accept `cwd`: `safe_read`,
`file_outline`, `read_range`, `changed_since`, `graft_diff`,
`graft_since`, `graft_map`, `code_show`, `code_find`, and `code_refs`.
That `cwd` is resolved server-side as a per-call route and does not
mutate the active workspace.

`workspace_authorize` and `workspace_bind` remain available as lower-level
daemon control-plane tools.

## Capability Discovery

`capabilities` is the bounded agent-native starting call. With no family it
returns all seven workflow families—`session`, `workspace`, `read`, `code`,
`history`, `review`, and `diagnostic`—with one canonical opening call, one-line
guidance, and a registered-tool count for each. The complete compact response,
including its receipt, is at most 2 KiB and contains no per-tool description
dump.

Pass one explicit family when deeper discovery is useful:

```json
{ "family": "read" }
```

The family-detail response is at most 4 KiB with a compact receipt and returns
only that family's deterministically ordered names and capability-registry
descriptions. It is available in an unbound daemon session and does not inspect
Git or open WARP.

Every response states `discoveryBasis: "registered_surface"`. That basis means
the names are installed in the active repo-local or daemon runtime. It is not a
claim that every registered tool is authorized for the current workspace:
binding, per-call routing, and capability policy can still obstruct an action.

## Key Tool Groups
- **Discovery**: `capabilities`
- **Bounded Reads**: `safe_read`, `file_outline`, `read_range`, `changed_since`
- **Governed Edits**: `graft_edit`
- **Structural History**: `graft_diff`, `graft_since`, `graft_map`,
  `graft_review`, `graft_test_coverage`, `graft_dead_symbols`
- **Structural Metrics**: `graft_churn`, `graft_difficulty`
- **Precision**: `code_show`, `code_find`, `code_refs`
- **Activity & Footing**: `activity_view`, `causal_status`, `causal_attach`, `doctor`
- **Workspace Routing**: `workspace_open`, `workspace_list_opened`, `workspace_status`
- **Daemon Control Plane**: `workspace_authorizations`, `workspace_authorize`, `workspace_bind`, `workspace_rebind`, `workspace_revoke`, `daemon_status`, `daemon_repos`, `daemon_sessions`, `daemon_monitors`, `monitor_*`

## Current Truth
- MCP is the primary agent surface.
- `capabilities` is the compact workflow-discovery surface. Its summary is
  bounded to 2 KiB and one selected family detail to 4 KiB with compact
  receipts; it reports registration rather than current authorization.
- `graft serve` is repo-local stdio; `graft serve --runtime daemon` is
  the daemon-backed stdio bridge.
- MCP responses carry version-2 `_schema` metadata and a compact `_receipt` by
  default. Every tool accepts the common optional input
  `receipt: "compact" | "full"`; use `"full"` only when the complete audit and
  cumulative-accounting envelope is required.
- Every public tool advertises an MCP-native `outputSchema`. The advertised
  schema is a bounded object-root projection of Graft's stricter versioned
  validator: it preserves top-level answer fields, scalar types,
  discriminants, exact `_schema` identity, and compact/full receipt posture
  without recursively dumping every deep audit object into tool discovery.
- Successful calls return the same machine-readable value twice: natively in
  `structuredContent` and as canonical JSON `TextContent` for compatibility
  with older hosts. Graft validates the value against both its strict contract
  and the advertised projection before returning success. `_receipt.returnedBytes`
  continues to count only the canonical compatibility JSON, not both equivalent
  MCP representations or JSON-RPC framing.
- Compact receipts contain only `mode`, `receiptId`, `seq`, `reason`,
  `latencyMs`, and the exact encoded `returnedBytes`. The `receiptId` correlates
  with the runtime-observability log; it is not a fetch handle. `stats` is the
  explicit cumulative-counter surface.
- Tripwire warnings remain top-level response data in both receipt modes.
- CLI peer commands intentionally request full MCP receipts and project them
  into their unchanged version-1 CLI JSON contracts.
- `doctor` and `activity_view` default to strict summary responses. Each default
  response, including its compact receipt, is bounded below 2 KiB. Pass
  `detail: "full"` on the original MCP call for the exhaustive diagnostic view.
- The doctor summary reports overall evidence posture, active workspace
  identity, structural- and local-history readiness, named `degradedReasons`,
  and one recommended next action. `unknown` readiness remains unknown; it is
  not silently promoted to ready. Consequently, `health: "degraded"` can mean
  that evidence is incomplete, not that the runtime itself failed.
- A requested doctor sludge scan is an explicit exhaustive diagnostic and
  therefore returns full detail even if `detail: "summary"` is also supplied.
- The activity summary preserves its Git anchor, matching-item counts,
  truncation truth, group counts, evidence gaps, and whether item detail is
  available, but omits `activeCausalWorkspace` and individual event bodies.
  Long refs and narrative fields are bounded; `anchor.headRefTruncated` is true
  when the summary abbreviates a ref, while the exact commit SHA remains
  present. Use `detail: "full"` to retrieve complete refs and activity items.
- CLI doctor and activity peers explicitly request full detail as well as full
  receipts, preserving their existing human rendering and version-1 JSON
  contracts while MCP remains summary-first.

## Related docs
- [README](../README.md)
- [Setup Guide](./SETUP.md)
- [CLI Guide](./CLI.md)
- [Advanced Guide](./ADVANCED_GUIDE.md)
- [Architecture](../ARCHITECTURE.md)
- [Security Model](./strategy/security-model.md)
- [Causal Provenance](./strategy/causal-provenance.md)
