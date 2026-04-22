---
title: "Structural session replay"
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "NDJSON metrics receipts (shipped)"
  - "Session tracking (shipped)"
  - "WARP Level 1 indexing (shipped)"
acceptance_criteria:
  - "A `graft replay <session-id>` command produces a navigable structural walkthrough from NDJSON receipts"
  - "Replay output shows each tool call (map, outline, code_show, edit) in order with file/symbol targets"
  - "At least one render format is supported (Markdown summary or HTML)"
  - "Replay for a session that never read a test file makes that absence visible"
  - "Replay can be generated for any completed session without requiring the original agent"
---

# Structural session replay

Graft already tracks every read, outline, and refusal in NDJSON
receipts. Wire that into a `graft replay` command that re-renders
a session as a structural walkthrough.

"Agent entered via `graft_map src/domain/`, drilled into
`file_outline ConflictAnalyzerService.js`, focused on
`code_show analyzeOneOp`, then edited lines 384-402."

The agent's reasoning trace becomes a structural tour of the
codebase -- not a chat log, a navigation path through the
dependency graph.

Use cases:

- **Onboarding humans**: "here's how Claude understood this module"
- **Debugging agents**: "it never looked at the test file"
- **Provenance input**: feeds directly into the provenance DAG

Could render as a navigable HTML page (like git log --graph but
for structural observations), a Markdown summary, or a replayable
sequence that re-opens each symbol in an editor.

## Implementation path

1. Define replay data model: parse NDJSON receipts for a given session-id, extract tool calls with timestamps, file paths, symbol names, and outcomes (success, refusal, truncation)
2. Build a `graft replay <session-id>` CLI command that reads the session's NDJSON receipts from `.graft/receipts/`
3. Implement Markdown render: chronological list of tool calls with file/symbol targets, grouped by phase (exploration, focused reading, editing). Highlight coverage gaps (directories never visited, test files never read).
4. Add structural annotation: for each read/outline, cross-reference with the WARP graph to show which symbols were available vs. which were actually inspected. This makes "what the agent missed" concrete.
5. Implement absence detection: compare files touched by edits against files read. Flag edits where the test file for the edited module was never read.
6. Add HTML render (stretch): navigable page with collapsible sections, symbol links, and a mini-map showing the structural path through the codebase.

## Related cards

- **CI-002-deterministic-scenario-replay**: Deterministic replay re-drives the runtime against mocks to reproduce behavior. Structural session replay renders the session as a human-readable walkthrough. Different goals: CI regression testing vs. human understanding. They share input data (NDJSON receipts) but are independent implementations.
- **WARP_reasoning-trace-replay**: Reasoning trace replay operates on the provenance DAG (observation nodes with causal edges). Structural session replay operates on flat NDJSON receipts. Reasoning trace replay is a deeper, DAG-based version that requires `WARP_agent-action-provenance` and `WARP_provenance-dag` (both backlog). Structural session replay is the simpler, shippable-now version. Not a dependency in either direction -- they serve different fidelity levels.
- **WARP_provenance-dag**: The provenance DAG is the eventual successor to flat NDJSON receipts as the source of truth for session history. Structural session replay could migrate to DAG-backed queries once the provenance DAG ships, but the NDJSON version is useful independently. Not a hard dependency.
- **CORE_session-knowledge-map**: Knowledge map answers "what do I know right now?" -- replay answers "what did I do in that past session?" Complementary queries over session data. Not dependent.
- **CORE_agent-handoff-protocol**: Handoff could include a replay summary of the outgoing session. Complementary but not dependent.

## No dependency edges

All prerequisites are shipped. NDJSON receipts and session tracking provide the data. The provenance DAG (backlog) would enhance replay fidelity but is not required -- the flat NDJSON version is independently useful. No other card is blocked waiting for structural session replay.

## Effort rationale

Medium. The data is already collected (NDJSON receipts). The core work is: (a) a receipt parser that extracts tool calls with structural targets, (b) a Markdown renderer with coverage-gap detection, and (c) the absence-detection heuristic. The HTML render is a stretch goal that would push toward L, but the Markdown version alone is a complete and useful deliverable.
