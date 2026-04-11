# Define auth, authorization, and isolation for a shared daemon

Source backlog item: `docs/method/backlog/up-next/SURFACE_shared-daemon-authz-and-isolation.md`
Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

The shared-daemon trust model is explicit and honest: Graft remains a
repo-local stdio tool today, while any future shared daemon is defined
as a same-user local service with server-resolved workspace identity,
operator-mediated authorization, isolated session and log state, and
default-denied escape-hatch capabilities.

## Playback Questions

### Human

- [x] Can we say exactly what a future shared daemon trusts, and what it
  must refuse to trust, before we build transport or control-plane
  machinery on top of it?
- [x] Can we answer who may access which workspace, session state, logs,
  and shell escape hatches without hand-waving?

### Agent

- [x] Does the design define the supported authentication posture for a
  shared daemon?
- [x] Does it define the authorization event and the default capability
  boundary for a bound workspace?
- [x] Does it separate canonical repo identity, worktree identity, and
  client session identity instead of collapsing them?
- [x] Does it connect those boundaries back to workspace binding,
  multi-repo coordination, and control-plane follow-ons?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: keep the trust model in a
  small set of explicit deployment tiers and isolation tables
- Non-visual or alternate-reading expectations: the model should be
  inspectable from docs alone without requiring architecture diagrams

## Localization and Directionality

- Locale / wording / formatting assumptions: no locale-sensitive
  behavior is in scope
- Logical direction / layout assumptions: none beyond standard
  left-to-right doc review

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: current local
  repo-scoped behavior versus future shared-daemon behavior, plus the
  server-resolved identity keys for repo, worktree, and session
- What must be attributable, evidenced, or governed: workspace
  authorization decisions, session-local receipts/logs, and explicit
  gating of escape-hatch tools like `run_capture`

## Non-goals

- [x] Do not design a remote or multi-user network service in this cycle
- [x] Do not claim cross-session or multi-writer collaboration semantics
  that the product does not yet implement
- [x] Do not weaken today's repo-local stdio posture by pretending it
  already needs daemon-grade credentials
- [x] Do not redesign `run_capture` itself here; define its shared-daemon
  capability boundary instead

## Backlog Context

The 2026-04-07 ship-readiness audit found that the future shared-daemon
direction still lacks an explicit operational model for authentication,
authorization, and resource isolation across concurrent clients and
repos.

Why this matters:
- a local repo-scoped stdio server can rely on implicit trust in ways a
  system-wide daemon cannot
- once multiple agents and repos share one long-lived service, routing
  alone is not enough
- the product needs an explicit answer for who can access which
  workspaces, caches, logs, and execution surfaces

Desired end state:
- define the trust model for a shared daemon
- specify authentication and authorization expectations for clients
- define isolation boundaries for:
  - repo identity
  - worktree identity
  - session state
  - logs and receipts
  - escape-hatch tools like `run_capture`
- connect the result back to the daemon/workspace-binding design

Related:
- `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-multi-repo-agent-coordination.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: L

## Proposed Trust Model

Graft has three distinct deployment tiers:

1. Repo-local stdio, today: one process, one repo root, one local user,
   implicit trust inside that repo checkout.
2. Shared daemon, future: one long-lived local service for one OS user
   on one machine, serving many repos and many client sessions.
3. Remote or multi-user service, out of scope: any transport or product
   claim that crosses user or host boundaries.

This cycle only defines tier 2. It does not bless tier 3.

## Authentication

The future shared daemon should authenticate clients as local-user
processes, not as arbitrary strings in MCP payloads.

- transport should be local-only, such as a Unix domain socket or
  platform-equivalent named pipe, not a default TCP listener
- OS-level access controls on the socket/pipe are the first trust gate
- client identity should come from the transport or host process
  context when possible; client-declared repo ids or worktree ids are
  never authoritative
- daemon-minted session ids are correlation handles, not a substitute
  for workspace authorization

Consequence: "same machine, same user" is the supported shared-daemon
trust envelope. Anything broader needs a different cycle and a stricter
security story.

## Authorization

The authorization event is workspace bind, not "every tool can point at
any path."

- a client may present `cwd` or a workspace hint
- the daemon resolves canonical identities server-side:
  - worktree identity from the resolved toplevel checkout
  - canonical repo identity from the git common dir
- the daemon authorizes that resolved worktree against an operator-owned
  allowlist or equivalent local policy
- a successful bind attaches a capability profile to the session for
  that workspace

Default shared-daemon capability posture:

- bounded read and structural tools: allowed within the authorized
  workspace
- session-local state (`state_save`, `state_load`, budget, cache,
  receipts): allowed only inside the bound session/worktree
- runtime logs and receipt inspection: visible only to the originating
  session and the operator control plane
- escape hatches like `run_capture`: denied by default in shared-daemon
  mode, with explicit operator opt-in required per workspace or profile

No tool should cross from one authorized workspace to another without a
new explicit bind or rebind event.

## Isolation Boundaries

| Surface | Identity key | Shared across worktrees? | Notes |
| --- | --- | --- | --- |
| Canonical repo / WARP history | git common dir | Yes, for the same repo | Structural history can be shared without collapsing live state |
| Live worktree policy + overlay | resolved worktree root | No | `.graftignore`, checkout state, and dirty overlay remain worktree-local |
| Session budget / cache / saved state | daemon session id + bound worktree | No | Never silently promoted to repo-global daemon state |
| Receipts and runtime events | daemon session id, tagged with repo/worktree ids | No by default | Operator plane may inspect metadata; peer sessions do not get raw receipts |
| Escape-hatch execution | daemon session id + capability profile | No | `run_capture` runs only inside the bound workspace and should be default-denied in shared mode |

If a client cwd is outside a git repo, the daemon may offer a
diagnostic-only session, but it must not fabricate repo identity or
implicitly widen access later.

## Implications For Related Cycles

`SURFACE_system-wide-mcp-daemon-and-workspace-binding`

- should implement bind/rebind as the authorization seam
- should treat client-supplied repo/worktree values as hints only
- should attach capability profiles to sessions after server-side
  workspace resolution

`SURFACE_system-wide-multi-repo-agent-coordination`

- should remain observational, not permission-granting
- may count sessions, repos, and worktrees system-wide, but must not
  make one session's receipts or caches visible to another by default

`SURFACE_system-wide-control-plane-for-persistent-monitors`

- should own operator-managed workspace allowlists, capability posture,
  and session visibility
- should be the place where an operator can see that `run_capture` is
  disabled or explicitly enabled for a given workspace

`WARP_same-repo-concurrent-agent-model`

- may share canonical repo history across sessions and worktrees
- must keep session-local receipts, budgets, and attribution distinct
- still does not imply multi-writer merge safety

## Resulting Product Stance

Current product contract:

- repo-local stdio server is supported today
- repo-local instruction/bootstrap files are supported today
- a shared daemon is not yet a supported deployment surface

Future shared-daemon contract, if built:

- same-user, local-machine only by default
- explicit workspace bind before repo-scoped tools
- operator-mediated authorization
- isolated session state and receipt visibility
- default-denied escape hatches
