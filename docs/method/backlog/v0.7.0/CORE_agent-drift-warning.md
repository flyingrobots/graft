---
title: Agent drift warning
feature: agent-safety
kind: trunk
legend: CORE
lane: v0.7.0
scope_verdict: narrow-before-implementation
requirements:
  - Session tracking and NDJSON metrics (shipped)
  - graft_edit MCP tool exists (shipped)
acceptance_criteria:
  - Successful graft_edit calls can emit an advisory diagnostic when the edit adds a structural pattern that contradicts a pattern removed earlier in the same MCP session
  - Drift detection uses parser/outline-backed structural classification where possible, not freeform regex matching
  - The warning is advisory and schema-validated; it must not refuse the edit unless an existing path/policy/exact-match refusal already applies
  - The warning does not claim causal write-event provenance beyond the existing completion footprint
---

# Agent drift warning

Detect when an agent is generating the same kind of code it was
asked to eliminate.

Graft sees the session's read/write pattern. If the task context
says "convert typedefs to classes" but the agent's recent writes
contain new `@typedef` blocks, fire a diagnostic:

"You're writing new typedefs in a session that's removing them."

More generally: extract the structural intent from the session
(what patterns are being removed?) and compare against the
structural signature of new writes (what patterns are being
added?). Contradiction = drift.

This is what the human had to do manually in cycle 0012 —
repeatedly catching the agent falling back into sludge patterns.
Graft could catch it automatically.

## Scope verdict

Narrow before implementation.

The original card is too broad if interpreted as general task-intent
inference across all agent writes. Current reality is narrower:

- `graft_edit` exists and performs one exact replacement through Graft's
  path, filesystem-port, policy, schema, and runtime observability boundary.
- Runtime observability records `graft_edit` completion metadata and the
  edited path footprint, but it does not record a causal write event.
- Persisted local history currently stores continuity, read, stage, and
  transition events. A write event schema exists, but the shipped local-history
  path does not persist governed write events.
- Existing semantic drift detection covers read-path interpretation drift
  when a file is re-read after related files, not write-pattern contradiction.
- Existing policy/refusal surfaces provide hard denials for path and file
  policy, not task-intent diagnostics.

Therefore the v0.7.0 slice should be `graft_edit`-only and advisory. It can
infer a narrow session-local intent from successful `graft_edit` calls: if an
earlier successful edit removed a structural pattern, and a later successful
edit adds that same structural pattern, emit a drift diagnostic such as:

> You're adding a typedef in a session that has been removing typedefs.

If the changed text or before/after file state cannot be classified
structurally, the tool should emit no drift warning rather than guessing.

## First slice

- Only applies to successful `graft_edit` exact replacements.
- Uses the current call's path, old string, new string, and existing
  completion footprint; it must not mine chat transcripts or native editor
  activity.
- Tracks only session-local structural edit observations needed for the
  warning.
- Emits a deterministic advisory diagnostic in a schema-validated surface.
- Preserves the existing refusal vocabulary for missing, ambiguous,
  outside-repo, and policy-denied edits.
- Does not turn drift into a policy refusal.

## Deferred

- Broad task-intent inference from prompts or transcripts.
- Native `Edit`/`Write` interception.
- `read_range` evidence attestation.
- Causal write events and provenance-backed write history.
- Full governed write tools.
- Daemon, WARP, LSP, or provenance expansion.

Depends on: session tracking (shipped), NDJSON metrics (shipped), and the
`graft_edit` MCP tool (shipped). The broader session-intent version depends
on richer write provenance and belongs with or after the full governed write
surface.
