---
title: "CI-002 — Deterministic Scenario Replay"
feature: session
kind: leaf
legend: CORE
lane: cool-ideas
effort: L
requirements:
  - "MCP tool-call logging with versioned schemas (shipped)"
  - "Session tracking (shipped)"
  - "Filesystem and Git port abstractions (shipped)"
  - "NDJSON receipt/metrics logging (shipped)"
acceptance_criteria:
  - "A `graft replay` command accepts a session log and re-drives the runtime against a mock worktree"
  - "Replayed sessions produce identical tool-call sequences as the original"
  - "FS and Git ports are fully mocked from the log — no live IDE or editor required"
  - "At least one regression scenario is captured and passes in CI"
---

# CI-002 — Deterministic Scenario Replay

Legend: [CORE — Core Governor](../../legends/CORE-core-governor.md)

## Idea

Graft logs every tool call and its versioned schema. These logs can be used to create deterministic "Scenarios" for integration testing.

Implement a `graft replay` command that takes a session log and re-drives the Graft runtime against a mock worktree. This would allow developers to "replay" a specific context-governance failure or a complex daemon authz sequence.

## Why

1. **Reproduction**: Makes "it worked in my editor" bugs trivial to capture and fix.
2. **Regression Testing**: Allows building a library of complex agent-interaction scenarios that must always stay governed.
3. **CI/CD**: Enables high-fidelity testing of daemon logic without needing a live IDE attached.

## Implementation path

1. Define a replay-scenario format: a session log (NDJSON receipts) paired with a filesystem snapshot (file tree with contents at session start). The scenario is a self-contained artifact that can be checked into the repo.
2. Build a mock FS port that serves file contents from the snapshot instead of the real filesystem. The Git port mock returns commit data from the snapshot.
3. Build a playback driver that reads tool calls from the session log in order, feeds them to the Graft runtime with the mock ports, and captures the responses.
4. Implement assertion: compare replayed responses to original responses. Identical tool-call sequences and projection decisions constitute a pass.
5. Handle non-determinism: timestamps, session IDs, and tick counters must be seeded from the log to ensure determinism.
6. Wire as a `graft replay <scenario-file>` CLI command.
7. Capture at least one regression scenario from a real session and add it to the test suite.

## Related cards

- **CORE_structural-session-replay**: Structural replay renders a session as a human-readable walkthrough. Deterministic replay re-drives the runtime for automated testing. Same input data (NDJSON receipts), completely different goals (human understanding vs. CI regression). No dependency in either direction.
- **WARP_reasoning-trace-replay**: Reasoning trace replay walks the provenance DAG backward from a write. Deterministic replay replays the entire session forward through mocked ports. Different mechanisms, different purposes. No dependency.
- **CORE_session-knowledge-map**: Knowledge map shows current-session context coverage. Replay could verify that a replayed session produces the same knowledge map. Complementary but not dependent.

## No dependency edges

All prerequisites are shipped. NDJSON logging, session tracking, and port abstractions provide everything needed. The mock FS/Git ports are implementation details of this card, not separate cards. No other card requires deterministic replay as a prerequisite, and no backlog card must ship first.

## Effort rationale

Large. The playback driver and mock ports are medium effort individually, but ensuring true determinism (seeding timestamps, handling async operations, mocking filesystem state) pushes this to L. The scenario format design requires care — it must be compact enough to check into the repo but complete enough to reproduce the session faithfully. Building even one realistic regression scenario requires capturing a full session with its filesystem context.
