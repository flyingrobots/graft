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

Questions:
- should this start as lightweight editor commands over existing MCP
  surfaces, or as a richer extension with push notifications and branch
  transition hooks
- what editor events should become causal events versus stay local UI
- how should IDE integration differ for human-first versus agent-hosted
  workflows
- what is the minimum useful IDE slice before the full causal-session
  model exists

Related:
- `docs/method/backlog/cool-ideas/CORE_conversation-primer.md`
- `docs/method/backlog/cool-ideas/SURFACE_active-causal-workspace-status.md`
- `docs/method/backlog/cool-ideas/WARP_causal-blame-for-staged-artifacts.md`
- `docs/method/backlog/cool-ideas/SURFACE_attach-to-existing-causal-session.md`
- `docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md`
- `docs/method/backlog/cool-ideas/CORE_git-graft-enhance.md`

Effort: L
