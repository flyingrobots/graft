# WARP intent and decision events

Read/write footprints alone will not fully explain why a human or
agent made a change.

Graft likely needs first-class optional WARP events for things like:
- declared task intent
- hypothesis shifts
- rejected alternatives
- decision checkpoints
- handoff notes that should become part of causal provenance

Example:
- agent reads `server.ts`
- agent reads `policy.ts`
- agent decides "the bug is actually in policy gating"
- agent edits only `policy.ts`

Without the decision checkpoint, the causal chain is weaker than the
real reasoning.

Why it matters:
- agents are users too; they need a way to preserve reasons without
  relying on chat logs as the only source of truth
- humans auditing agent work need more than file-touch chronology
- causal slices get sharper when decision events can bridge otherwise
  disconnected read/write events

Open questions:
- should intent / decision events be explicit surfaces, inferred from
  tool calls, or both
- should payloads be free text, structured enums, or a layered model
- when should these events collapse into canonical provenance versus
  remain strand-local
- how should human and agent decisions share one actor model

Related:
- `docs/method/backlog/asap/WARP_graph-ontology-and-causal-collapse-model.md`
- `docs/method/backlog/cool-ideas/WARP_agent-action-provenance.md`
- `docs/method/backlog/cool-ideas/WARP_causal-blame-for-staged-artifacts.md`
- `docs/method/backlog/cool-ideas/SURFACE_attach-to-existing-causal-session.md`

Effort: M
