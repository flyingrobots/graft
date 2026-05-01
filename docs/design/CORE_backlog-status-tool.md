---
title: "graft backlog-status - feature completion tracking as a tool"
feature: surface
kind: leaf
legend: CORE
source_lane: asap
effort: S
release_scope: v0.8.0-candidate
cycle: CORE_backlog-status-tool
status: design
source_backlog: "docs/method/backlog/asap/CORE_backlog-status-tool.md"
requirements:
  - "Backlog cards with frontmatter (shipped)"
  - "Retro docs (shipped)"
acceptance_criteria:
  - "A 'graft backlog-status' command reads card frontmatter and retro existence"
  - "Produces the feature menu (done/remaining/blocked per feature) automatically"
  - "No more Python scripts for backlog status"
---

# graft backlog-status - feature completion tracking

Source backlog item: `docs/method/backlog/asap/CORE_backlog-status-tool.md`
Legend: CORE

## Sponsors

- Human: release operator and backlog steward
- Agent: implementation agent

These labels are roles. The design serves the people and agents trying
to answer "what work is real, active, blocked, completed, or stale?"
from repo truth without rebuilding one-off scripts.

## Hill

Create a deterministic backlog-status model and CLI surface that reads
checked-in METHOD files and reports the current work posture without
mutating the backlog.

The first slice should let an operator or agent answer:

- what is waiting in active backlog lanes
- what design cycles are active
- what work has completed retros
- which cards are blocked by internal or external dependencies
- which dependency references are unresolved or stale

without using ad hoc shell/Python scripts or inferring status from
memory.

## Original Card

We keep rebuilding Python scripts to produce the feature menu.
Make it a graft tool that reads card frontmatter, checks retro
existence, and produces the status table automatically.

## v0.8.0 scope note

This is the active opening v0.8.0 scope-forming cycle. Keep the first
slice focused on a deterministic model and CLI rendering over checked-in
backlog, design, retro, and dependency metadata.

## Relevance

Relevant, with narrowed scope.

The v0.7.0 and v0.7.1 release work repeatedly needed manual scans of
backlog lanes, design docs, retros, dependency DAGs, and METHOD caveats.
The repo now has enough checked-in metadata to make that query a product
surface. The missing piece is not more backlog policy; it is one
deterministic read model over existing files.

This card should remain v0.8.0 opening scope because it directly
supports the release thesis in `docs/method/releases/v0.8.0/scope.md`:
operational truth before broader feature expansion.

## Design

Build the model first, render second, and route CLI last.

Preferred implementation shape:

```text
checked-in METHOD files
  -> buildBacklogStatusModel(...)
  -> renderBacklogStatus(model)
  -> graft backlog-status [--json]
```

The model builder should be independent of terminal rendering and should
not execute Git, call GitHub, call METHOD MCP tools, or modify files.

### Inputs

The first slice reads repo-local files only:

- `docs/method/backlog/*/*.md`
- `docs/design/*.md`
- `docs/method/retro/**`
- `docs/releases/**`
- `docs/method/releases/**`
- `docs/method/backlog/dependency-dag.dot`

It may reuse or extract the frontmatter parsing and DAG model logic
currently in `scripts/generate-backlog-dependency-dag.ts`, but runtime
CLI code should not import from `scripts/`. If sharing is needed, move
the shared parser/model code into a small source module and have the
script consume that module.

### Model

The first slice should produce a `BacklogStatusModel` with:

- `summary`
  - active backlog counts by lane
  - active design count
  - completed retro count
  - blocked internal count
  - blocked external count
  - unresolved dependency reference count
- `items`
  - id
  - title
  - legend
  - feature
  - kind
  - lane or source lane
  - status
  - source path
  - blocked-by references
  - blocking references
  - external blockers
  - retro path when detected
- `warnings`
  - unresolved dependency refs
  - active design docs that claim completion without a retro
  - cards whose frontmatter lane disagrees with their directory

Status vocabulary for the first slice:

- `backlog`
- `active_design`
- `completed`
- `blocked_internal`
- `blocked_external`
- `stale_metadata`
- `unknown`

Do not introduce a new METHOD lifecycle or rename existing lanes in this
cycle.

### CLI Surface

Add one release-facing command:

```bash
graft backlog-status
graft backlog-status --json
```

The human output should be compact and scan-oriented: summary first,
then active work, blocked work, and warnings. JSON output must be schema
validated through the existing CLI output schema path.

This should be a CLI-only project command for the first slice. Do not
add MCP, daemon, or API surfaces until the model proves useful and stable.

### Out Of Scope

- No backlog mutation.
- No card moves.
- No METHOD close/drift/witness automation.
- No GitHub PR/issue calls.
- No release tagging or publishing.
- No daemon/WARP/LSP expansion.
- No governed write/edit expansion.
- No live repo playback as subject data.
- No terminal TUI.
- No attempt to fix every stale or ambiguous historical card.

## Playback Questions

### Human

- [ ] Can a human run `graft backlog-status` and see the current active
      backlog posture without reading multiple directories?
- [ ] Does the output clearly distinguish active backlog cards, active
      design cycles, completed retros, blocked work, and metadata
      warnings?
- [ ] Are unresolved dependency references reported honestly instead of
      hidden or treated as completed work?
- [ ] Is the first slice visibly read-only, with no affordance to move,
      close, or rewrite cards?

### Agent

- [ ] Is there a deterministic `buildBacklogStatusModel(...)` tested
      separately from rendering?
- [ ] Does the model use checked-in filesystem truth instead of METHOD
      MCP active-cycle state?
- [ ] Does `renderBacklogStatus(model)` produce deterministic text
      without requiring a live terminal?
- [ ] Does `graft backlog-status --json` validate against a declared
      CLI output schema?
- [ ] Does the command appear in the CLI capability registry as
      CLI-only?
- [ ] Does moving or completing this card update the generated backlog
      DAG so `asap/` no longer lists it as pending?

## RED Test Plan

Stop here for this design phase. The next phase should begin with RED
tests for:

- model classification from synthetic temp METHOD trees
- lane/frontmatter mismatch warnings
- internal, external, and unresolved dependency reporting
- completed retro detection
- deterministic text rendering
- parser and help routing for `graft backlog-status`
- schema-validated `--json` output
- read-only behavior: no writes to backlog/design/retro directories

Use temp directories or static fixtures only. Do not use the live
checkout as mutable subject data.

## Expected Artifacts

- `src/cli/backlog-status-model.ts`
- `src/cli/backlog-status-render.ts`
- `src/cli/backlog-status.ts`
- parser and help wiring for `graft backlog-status`
- capability registry and CLI output schema entries
- focused unit tests for model, renderer, parser, and schema
- optional playback test using a temp METHOD tree
