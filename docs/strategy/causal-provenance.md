# Causal Provenance

Graft distinguishes transport/session plumbing from the line of work an
agent or human is actually pursuing. That distinction is the core of its
causal provenance model.

## Terms

### Transport session

The concrete MCP connection or daemon session carrying requests.

Transport sessions are runtime plumbing. They can disappear and resume.
They are not the same thing as a lasting line of work.

### Causal workspace

The bounded local record of the active line of work: current causal
context, recent reads/stages/transitions, and current footing.

### Strand

A strand is the continuity lane for related causal work across bounded
runtime sessions.

### Causal collapse

Causal collapse is the act of treating many low-level transport events
or speculative edits as one lawful line of work only when the footing
and handoff evidence support that claim.

Current Graft is intentionally conservative: it prefers degraded truth
over collapsing unrelated activity into a fabricated single story.

### Checkout epoch

The branch/base footing for the current worktree state. A branch switch,
merge, or rewrite can create a new epoch even if the same repo is still
in play.

## Current truth

Today Graft can report bounded local causal footing, same-repo
concurrency posture, and between-commit activity. It does not yet claim
full canonical multi-writer provenance.

That is why:

- `activity_view` is explicitly bounded local `artifact_history`
- `causal_status` explains current footing and degraded posture
- concurrency surfaces can report `exclusive`, `shared_worktree`,
  `shared_repo_only`, `overlapping_actors`, or `divergent_checkout`

## Handoff model

`causal_attach` exists so a new session can continue a lawful line of
work rather than pretending every reconnect is a fresh start.

The lawful attach question is narrower than "same repo":

- is this the same worktree
- is this the same checkout epoch
- is there explicit handoff evidence
- is the same-repo concurrency posture still coherent

## Why this matters

Without this distinction, a tool can easily confuse:

- a new socket with a new line of work
- a branch switch with harmless continuity
- local activity history with canonical provenance

Graft prefers explicit degraded truth over fabricated certainty.

## Operator surfaces

- `causal_status` answers "what line of work am I in right now?"
- `causal_attach` records lawful continuation or handoff
- `activity_view` answers the human question first for bounded local
  between-commit activity

## Related docs

- [Security Model](./security-model.md)
- [MCP](../MCP.md)
- [Architecture](../../ARCHITECTURE.md)
- [docs/invariants/transport-session-not-causal-session.md](../invariants/transport-session-not-causal-session.md)
