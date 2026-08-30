# Security Model

Graft is a same-user local toolchain, not a network service for
multi-tenant arbitrary clients. Its security posture is intentionally
bounded around that deployment model.

## Threat model

Graft is designed to protect against accidental over-read, ambiguous
workspace routing, and unintended ambient daemon access across repositories
owned by the same local user.

It is not designed to safely host untrusted remote users or provide a
hardened privilege boundary across operating-system accounts.

## Core boundaries

### Repo-local stdio

- one MCP server per repo checkout
- the current worktree is the execution footing
- no daemon session registry or cross-repo authorization layer

### Same-user daemon

- one daemon host per user
- sessions start `unbound`
- a non-empty explicit `cwd` on a routed repository tool is same-user opening
  intent for its exact server-resolved Git worktree
- routed opening uses the default capability profile and does not activate the
  worktree; an omitted route still requires an active binding
- explicit `workspace_bind` requires prior authorization, while
  `workspace_open` owns activation and capability configuration
- authorization, active binding, and causal workspace identity stay
  separate on purpose
- the source repository is observation evidence, never WARP persistence;
  private sidecars are keyed by repository, worktree, and actor identity

## Read and execution posture

- bounded read surfaces (`safe_read`, `file_outline`, `read_range`,
  `changed_since`) are policy-mediated
- structural and precision tools run through the same policy seam
- `run_capture` is an explicit shell-output escape hatch and remains
  default-denied in daemon mode unless an authorized workspace enables it
- an explicit route opens only its containing Git worktree; Graft does not scan
  siblings, inherit the daemon process directory, or trust client identity hints

## Observability and logs

- MCP responses carry versioned `_schema` metadata and `_receipt`
  decision data
- runtime observability is metadata-first; the goal is to explain what
  happened without persisting raw repository content by default
- operators should still treat runtime logs as potentially sensitive
  operational artifacts

## Degraded truth

Graft reports degraded posture explicitly when the full footing is not
available. Common examples:

- missing checkout-boundary hooks
- unbound daemon sessions
- activity views that are bounded local `artifact_history`, not canonical
  provenance

## Non-goals

- remote multi-user daemon hosting
- privilege separation stronger than the local OS user boundary
- claiming canonical provenance when only local bounded history is
  available

## Related docs

- [Setup Guide](../SETUP.md)
- [MCP](../MCP.md)
- [Causal Provenance](./causal-provenance.md)
- [Architecture](../../ARCHITECTURE.md)
