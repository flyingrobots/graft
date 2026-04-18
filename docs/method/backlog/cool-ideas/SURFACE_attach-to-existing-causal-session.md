---
title: "Attach to existing causal session"
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

Why it matters:
- agents are users too; they need continuity, not only fresh starts
- human/operator handoff to a new agent is a first-class workflow
- this makes the product session model concrete instead of leaving it as
  theory

Related:
- `docs/method/backlog/cool-ideas/CORE_cross-session-resume.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md`

Effort: M
