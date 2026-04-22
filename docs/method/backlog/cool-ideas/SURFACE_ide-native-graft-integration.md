---
title: "IDE-native Graft integration"
legend: SURFACE
lane: cool-ideas
effort: XL
blocked_by:
  - SURFACE_active-causal-workspace-status
requirements:
  - "MCP server and tool surface (shipped)"
  - "Session tracking (shipped)"
  - "WARP Level 1 indexing (shipped)"
  - "Active causal workspace status surface (backlog)"
  - "Causal blame for staged artifacts (backlog)"
  - "Attach to existing causal session (backlog)"
acceptance_criteria:
  - "A VS Code extension (or equivalent) connects to the Graft MCP server and displays causal workspace status"
  - "Status bar shows current causal session, checkout epoch, and confidence level"
  - "An editor action for a staged file shows causal blame (why it changed)"
  - "Branch switch triggers a prompt to park or fork the active strand"
  - "The extension works for both human-driven and agent-hosted IDE workflows"
  - "Minimum viable slice functions before the full causal-session model ships"
---

# IDE-native Graft integration

Graft should eventually meet humans and agents where coding work
actually happens: inside the editor / IDE.

This is not just "show graft data in a sidebar." The interesting
version is that the IDE becomes a first-class surface for:
- active causal workspace / strand status
- conversation / coding-session primer
- staged-artifact causal blame
- branch-switch / checkout-epoch warnings
- attach / handoff to an existing causal session
- collapse previews before stage / commit

Possible features:
- status bar showing current causal workspace, checkout epoch, and
  confidence level
- editor action for "why did this staged file change?"
- branch switch prompt that parks or forks the active strand lawfully
- inline symbol or file decorations backed by structural history /
  provenance
- handoff / attach workflow when a new agent or human joins the same
  line of work

Why it matters:
- agents are users too, and many agent workflows now run inside IDE
  hosts rather than only in terminal MCP clients
- humans need the causal model to show up where they edit, not only in
  CLI or daemon diagnostics
- this is the most natural bridge between Git's hard checkpoints and
  Graft's between-commit memory

## Implementation path

1. Build a minimal VS Code extension scaffold that connects to the Graft MCP server via stdio or socket transport
2. Implement a status bar item that queries `causal_status` (shipped) and displays session/workspace info
3. Add a "Show Graft Map" command that runs `graft_map` for the current workspace root and renders it in a webview panel
4. Wire `file_outline` into editor decorations: show symbol structure alongside VS Code's native outline
5. Add a "Why Changed?" editor action that queries causal blame for a staged file (requires `WARP_causal-blame-for-staged-artifacts`)
6. Implement branch-switch detection via VS Code workspace events, triggering strand park/fork prompts (requires `SURFACE_attach-to-existing-causal-session`)
7. Add an attach/handoff flow: when a new editor window opens on a workspace with an active causal session, prompt to attach or fork
8. Iterate on the minimum viable slice: steps 1-4 can ship before the full causal session model exists

## Related cards

- **SURFACE_active-causal-workspace-status** (blocked_by): The IDE status bar needs this surface to display meaningful causal workspace info. Without it, the status bar can only show transport-level session data, which is not the interesting version. This is a real dependency — the IDE integration is a consumer of this surface.
- **WARP_causal-blame-for-staged-artifacts**: The "why changed?" editor action depends on causal blame. Not a hard blocker because the IDE extension has value without this feature (steps 1-4), but the staged-file blame action cannot exist without it.
- **SURFACE_attach-to-existing-causal-session**: The branch-switch and handoff flows need attach semantics. Again, not a hard blocker for the minimal slice, but required for the full vision.
- **CORE_conversation-primer**: The IDE could auto-inject a `graft_map` primer when an agent session starts inside the editor. Complementary, not dependent.
- **CORE_agent-handoff-protocol**: IDE handoff flow is a surface over handoff protocol. Complementary.
- **SURFACE_non-codex-instruction-bootstrap-parity**: IDE integration and instruction bootstrap serve the same "meet agents where they work" goal but are independent implementations.
- **SURFACE_terminal-activity-browser-tui**: Both are presentation surfaces over Graft data, but for different environments (IDE vs terminal). No dependency.

## Effort rationale

XL. This is a cross-platform product requiring: (a) a VS Code extension with its own build/publish lifecycle, (b) a transport bridge between the extension and the MCP server, (c) multiple editor integration points (status bar, decorations, commands, webviews), (d) graceful degradation when causal session features are not yet shipped, and (e) testing across both human-driven and agent-hosted IDE workflows. The extension itself is a separate software artifact.
