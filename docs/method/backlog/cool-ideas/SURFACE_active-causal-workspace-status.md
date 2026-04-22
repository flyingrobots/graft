---
title: "Active causal workspace status"
legend: SURFACE
lane: cool-ideas
effort: M
blocking:
  - SURFACE_ide-native-graft-integration
requirements:
  - "Session tracking (shipped)"
  - "Causal session / strand model (backlog — WARP graph ontology and causal collapse model)"
  - "WARP Level 1 indexing (shipped)"
acceptance_criteria:
  - "A surface (tool or command) returns the active causal session/strand ID for the current workspace"
  - "Output includes checkout epoch and pinned base commit"
  - "Output lists attached actors (agents/humans) in the current workspace"
  - "Output shows hot files or symbols touched in the current session"
  - "If no causal session is active, the surface returns a clear 'no active session' state"
  - "Both agents and humans can invoke the surface without special privileges"
---

# Active causal workspace status

Humans and agents should be able to ask:

"What line of work am I in right now?"

That answer is no longer the same thing as "what transport session is
open?" Once causal sessions / strands are real, Graft needs a surface
that explains the active causal workspace directly.

Potential output:
- current causal session / strand id
- checkout epoch / pinned base
- attached actors
- hot files or symbols in the current workspace
- recent decisions or intent checkpoints
- what staged targets would collapse if committed now

Potential surfaces:
- `causal_status`
- `graft session-status`
- daemon projection over attached strands / causal sessions

Why it matters:
- agents are users too; they need orientation inside the causal model,
  not just transport/session plumbing
- humans need an inspectable answer before attach, fork, commit, or
  branch switch
- this makes the product session model operational instead of leaving
  it as design doctrine

## Implementation path

1. Define the `causal_status` response schema: sessionId, strandId, checkoutEpoch, pinnedBaseCommit, attachedActors[], hotFiles[], hotSymbols[], activeState (active | no-session).
2. Query the session tracker for the active session and its causal metadata (session ID, checkout epoch, base commit).
3. Query the observation cache for hot files and symbols — files/symbols with the most reads or writes in the current session.
4. If causal strands are available (post-ontology ship), include strand identity and attached actors. If not, degrade gracefully to transport-session-level data with a note that causal session detail is unavailable.
5. Wire as both an MCP tool (`causal_status`) and a CLI command (`graft session-status`).
6. Return a clear "no active session" state when no session is open — do not error.

## Related cards

- **SURFACE_ide-native-graft-integration** (blocking): The IDE status bar needs this surface to display meaningful causal workspace info. Without it, the IDE can only show transport-level session data. This is a real dependency — the IDE integration is a consumer of this surface.
- **SURFACE_attach-to-existing-causal-session**: Attach needs to know the current causal workspace state before attaching. This surface provides the "inspect before act" step. Not a hard dependency — attach could query session state internally — but this surface makes the pre-attach inspection explicit and reusable.
- **CORE_cross-session-resume**: Resume loads prior state; this surface shows current state. Different lifecycle moments (resuming vs. inspecting). Independent.
- **CORE_session-knowledge-map**: Knowledge map shows "what do I know?" This surface shows "what line of work am I in?" Different questions over partially overlapping data. Independent.

## Effort rationale

Medium. The core query (session state + observation cache aggregation) is straightforward, but the design surface is significant: defining the right response schema, handling graceful degradation when causal strands are not yet shipped, surfacing as both MCP tool and CLI command, and ensuring the output is useful to both agents (structured JSON) and humans (readable summary).
