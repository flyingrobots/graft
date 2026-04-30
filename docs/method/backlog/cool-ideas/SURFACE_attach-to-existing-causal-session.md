---
title: "Attach to existing causal session"
feature: surface
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: M
requirements:
  - "Session tracking (shipped)"
  - "Causal session / strand model (backlog — WARP graph ontology and causal collapse model)"
  - "Same-repo concurrent agent model (backlog)"
acceptance_criteria:
  - "A new agent or resumed agent can attach to an existing causal workspace by session/strand ID"
  - "Attach is rejected if repo, worktree, or checkout epoch does not match the target session"
  - "Attach preserves the causal workspace identity rather than creating a new session"
  - "When attach would be unlawful, the system forks a new strand instead of silently failing"
  - "Multiple attached agents on the same strand are represented distinctly in the session model"
  - "A test verifies that attach after repo mismatch is refused"
---

# Attach to existing causal session

Transport reconnect and agent handoff should not force Graft to pretend
that a new socket means a new line of work.

Need a surface where a new agent or resumed agent can attach to an
existing causal workspace / strand instead of only starting fresh or
doing a passive structural resume.

Why this differs from cross-session resume:
- cross-session resume says "here is what changed since you left"
- attach says "continue this same line of work, with the same causal
  workspace identity, if that is still lawful"

Questions:
- what makes an attach lawful:
  - same repo
  - same worktree
  - same checkout epoch
  - explicit human approval
- when should attach fork a new strand instead
- how should multiple attached agents be represented if one strand has
  several active collaborators
- should attach restore prior intent / decisions or only structural
  state

## Implementation path

1. Define the attach request schema: target session/strand ID, requesting agent identity, repo path, worktree path.
2. Implement lawfulness checks: compare the requesting agent's repo, worktree, and checkout epoch against the target session's recorded values. If any mismatch, reject with a specific reason.
3. On lawful attach: register the new agent as an attached actor on the existing strand. Preserve the causal workspace identity — do not create a new session.
4. On unlawful attach: automatically fork a new strand from the target session's current state, attach the new agent to the fork, and report the fork to both the requesting agent and any existing attached actors.
5. Populate the attaching agent's observation cache with the strand's accumulated context so they start oriented.
6. Wire as an MCP tool (`causal_attach` already exists in shipped form for basic attachment — this extends it with full lawfulness checks and strand-aware semantics).
7. Test: attach with matching repo/worktree/epoch succeeds; attach with mismatched epoch forks; attach with mismatched repo is refused outright.

## Related cards

- **CORE_cross-session-resume**: Resume loads saved state for the SAME agent returning. Attach continues the SAME line of work with a DIFFERENT (or resumed) agent. Both provide continuity but at different levels — resume is structural, attach is causal. Independent.
- **CORE_agent-handoff-protocol**: Handoff serializes context for transfer TO another agent. Attach is the mechanism BY WHICH the receiving agent joins the ongoing work. Handoff produces the payload; attach consumes it. These are complementary and naturally pair, but neither requires the other as a hard prerequisite — attach works without a structured handoff (the strand itself carries the context), and handoff works without attach (the receiving agent can start a new session and ingest the handoff JSON).
- **SURFACE_active-causal-workspace-status**: The causal status surface lets agents inspect the workspace state before deciding whether to attach. Provides the "look before you leap" step. Not a hard dependency — attach could query session state internally — but the status surface makes pre-attach inspection explicit.
- **SURFACE_ide-native-graft-integration**: The IDE integration uses attach for branch-switch and handoff flows. This card is referenced as a soft dependency by the IDE card (required for the full vision, not the minimal slice).
- **CORE_multi-agent-conflict-detection**: When multiple agents attach to the same strand, conflict detection monitors their concurrent modifications. Complementary in multi-agent workflows but independent builds.

## No dependency edges

The key unshipped prerequisites (causal session/strand model, same-repo concurrent agent model) are requirements of THIS card, not separate backlog cards that block it via edges. They represent conceptual infrastructure that must be designed as part of implementing this card. No other cool-ideas card must ship before this one, and no other card is blocked waiting for it.

## Effort rationale

Medium. The basic `causal_attach` tool is already shipped, so the transport plumbing exists. The new work is: lawfulness checks (repo/worktree/epoch comparison), strand-aware forking on unlawful attach, multi-actor representation in the session model, and observation cache population for the attaching agent. The design questions around "when to fork vs. refuse" and "what context to share on attach" require careful judgment but not large implementation surface.
