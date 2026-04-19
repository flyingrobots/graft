---
title: "Symbol identity and rename continuity"
legend: "WARP"
cycle: "WARP_symbol-identity-and-rename-continuity"
source_backlog: "docs/method/backlog/up-next/WARP_symbol-identity-and-rename-continuity.md"
---

# Symbol identity and rename continuity

Source backlog item: `docs/method/backlog/up-next/WARP_symbol-identity-and-rename-continuity.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

This packet was pulled active too early and closed as `not-met` without
execution. The direction remains real, but it is ontology and
trust-posture work that should follow the scheduler, monitor,
provenance, and same-repo activity foundations rather than run ahead of
them.

Live plan:
- `docs/method/backlog/up-next/WARP_symbol-identity-and-rename-continuity.md`
- Keep behind `0068 daemon-job-scheduler-and-worker-pool`
- Keep behind `0070 monitors-run-through-scheduler`
- Keep behind `0072 logical-writer-lanes`

## Playback Questions

### Human

### Agent

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: TBD
- Non-visual or alternate-reading expectations: TBD

## Localization and Directionality

- Locale / wording / formatting assumptions: TBD
- Logical direction / layout assumptions: TBD

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: TBD
- What must be attributable, evidenced, or governed: TBD

## Non-goals

- [ ] TBD

## Backlog Context

Level 1 WARP is intentionally name-addressable. That keeps the
model cheap and honest, but it also means structural diffs lose
rename continuity and report remove + add where users really mean
"this symbol continued under a new name or shape."

Hill:
- A human or agent can ask what changed structurally across commits
  or live edits, and Graft can preserve symbol continuity across
  renames, moves, and compatible refactors without pretending weak
  heuristics are true identity.

Scope:
- define a Level 2 symbol identity model beyond `sym:<path>:<name>`
- decide how identity is minted and carried across commits
- define when continuity is certain, likely, or unknown
- decide how rename/move continuity appears in diff outputs
- make the model inspectable enough to defend false-positive and
  false-negative tradeoffs

Non-goals:
- papering over rename continuity with a heuristic and calling it
  identity
- silently changing existing Level 1 semantics without an explicit
  contract update

Why separate cycle:
- this is not a local diff-engine tweak in `src/parser/diff.ts`
- it changes WARP ontology, output contracts, and trust posture
- it likely intersects with provenance, persisted local history,
  and same-repo concurrent activity

Dependencies / adjacent work:
- `docs/method/backlog/up-next/WARP_persisted-sub-commit-local-history.md`
- `docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: XL
