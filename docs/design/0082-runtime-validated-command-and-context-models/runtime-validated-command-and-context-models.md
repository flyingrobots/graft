---
title: "runtime validated command and context models"
legend: "CORE"
cycle: "0082-runtime-validated-command-and-context-models"
source_backlog: "docs/method/backlog/up-next/CORE_runtime-validated-command-and-context-models.md"
---

# runtime validated command and context models

Source backlog item: `docs/method/backlog/up-next/CORE_runtime-validated-command-and-context-models.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

The first-pass API/MCP tool-call seam stops relying on raw `JSON.parse`
casts and ad hoc result peeking: tool payloads are treated as
runtime-validated JSON objects, API `callGraftTool(...)` returns
schema-backed output types, and the attributed-read observation path
uses explicit validated models instead of loose `Record<string,
unknown>` bags.

## Playback Questions

### Human

- [ ] Can a reviewer point to explicit runtime models for parsed tool
      payloads and attributed read observations instead of reading those
      boundaries as `JSON.parse(...) as Record<string, unknown>` plus
      manual property checks?

### Agent

- [ ] Do API and MCP tool payload parsing fail lawfully when the result
      is not a JSON object, instead of silently accepting non-object
      payloads or relying on structural casts?
- [ ] Does the attributed-read observation seam accept only validated
      args/result shapes while preserving the same safe-read,
      file-outline, and read-range behavior under the existing targeted
      test slices?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: boundary parsing and
  observation shaping should be readable as named models, not a scavenger
  hunt across inline `typeof` checks and casts.
- Non-visual or alternate-reading expectations: explicit model files and
  helper names should let readers navigate by responsibility rather than
  scanning large handlers for hidden shape assumptions.

## Localization and Directionality

- Locale / wording / formatting assumptions: TBD
- Logical direction / layout assumptions: TBD

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: whether a tool
  payload is a JSON object, whether a tool output matches its declared
  schema, and whether a read observation contains the fields required to
  record local history.
- What must be attributable, evidenced, or governed: payload failures
  must happen at the boundary, and read-observation evidence should only
  be recorded from validated tool outputs.

## Non-goals

- [ ] Do not replace every `Record<string, unknown>` usage in the repo
      in one pass.
- [ ] Do not redesign the full tool-schema registration model in this
      slice.
- [ ] Do not change operator-visible output shapes while tightening the
      boundary models.

## Backlog Context

Replace loose record bags and cast-shaped context objects at adapter boundaries with runtime-validated command, context, and result models. The goal is to make boundary truth and SOLID/DRY pressure align instead of relying on structural casts.
