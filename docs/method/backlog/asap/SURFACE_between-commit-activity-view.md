# Between-commit activity view

Humans should be able to ask:

"What happened between the last Git commit and now?"

Graft is increasingly good at tracking bounded local `artifact_history`,
causal workspace footing, attribution, and semantic transitions, but
that information is still exposed mostly through agent-oriented MCP
surfaces and debugging views. We need an explicit human-facing surface
that turns the between-commit activity stream into something inspectable
without requiring raw chat logs or deep tool spelunking.

The first version should stay honest:
- bounded local `artifact_history`, not canonical provenance
- recent reads, writes, stages, attaches, and semantic transitions
- grouped by active causal workspace and staged target where possible
- explicit `unknown` / degraded posture when evidence is incomplete

Potential surfaces:
- `graft activity`
- `graft replay`
- `git graft enhance show`
- IDE timeline / activity panel

Why it matters:
- humans need to audit agent work without reading the entire chat or
  reconstructing history from raw receipts
- humans also need a resume surface for their own interrupted work, not
  just an agent-debugging view
- this is the most direct human-facing payoff from the local
  `artifact_history`, attribution, overlay, and semantic-transition
  work already shipping
- it creates the bridge from current bounded local history to future
  causal-slice / collapse views

Related:
- `docs/method/backlog/cool-ideas/CORE_structural-session-replay.md`
- `docs/method/backlog/cool-ideas/SURFACE_active-causal-workspace-status.md`
- `docs/method/backlog/cool-ideas/WARP_causal-blame-for-staged-artifacts.md`
- `docs/method/backlog/cool-ideas/CORE_git-graft-enhance.md`
- `docs/method/backlog/cool-ideas/SURFACE_ide-native-graft-integration.md`

Effort: M
