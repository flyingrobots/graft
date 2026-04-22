---
title: "Active causal workspace status"
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

Related:
- `docs/method/backlog/asap/WARP_graph-ontology-and-causal-collapse-model.md`
- `docs/method/backlog/cool-ideas/SURFACE_attach-to-existing-causal-session.md`
- `docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: M
