# Daemon server owns too many transport and lifecycle concerns in one module

`src/mcp/daemon-server.ts` currently owns:

- socket-path resolution and private-permission setup
- stale socket detection
- HTTP routing for `/mcp` and `/healthz`
- JSON body parsing and JSON-RPC error shaping
- daemon session creation and teardown
- signal-driven shutdown

Why this is debt:

- the control-plane cycle will want session inspection, authorized
  workspace views, and maybe operator-scoped lifecycle hooks
- multi-repo and same-repo concurrent-agent work will put more pressure
  on session hosting and shared repo-state ownership
- transport concerns and daemon-session orchestration should become
  separate seams before more daemon features accumulate here

Desired end state:

- socket/bootstrap concerns separated from request routing
- daemon session host separated from raw HTTP transport glue
- health/status shaping isolated from transport dispatch

Effort: M
