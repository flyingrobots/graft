# Structural session replay

Graft already tracks every read, outline, and refusal in NDJSON
receipts. Wire that into a `graft replay` command that re-renders
a session as a structural walkthrough.

"Agent entered via `graft_map src/domain/`, drilled into
`file_outline ConflictAnalyzerService.js`, focused on
`code_show analyzeOneOp`, then edited lines 384–402."

The agent's reasoning trace becomes a structural tour of the
codebase — not a chat log, a navigation path through the
dependency graph.

Use cases:

- **Onboarding humans**: "here's how Claude understood this module"
- **Debugging agents**: "it never looked at the test file"
- **Provenance input**: feeds directly into the provenance DAG

Could render as a navigable HTML page (like git log --graph but
for structural observations), a Markdown summary, or a replayable
sequence that re-opens each symbol in an editor.

Depends on: NDJSON metrics (shipped), session tracking (shipped),
provenance DAG (backlog).
