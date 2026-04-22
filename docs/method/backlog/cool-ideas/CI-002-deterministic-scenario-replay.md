---
title: "CI-002 — Deterministic Scenario Replay"
requirements:
  - "MCP tool-call logging with versioned schemas (shipped)"
  - "Session tracking (shipped)"
  - "Filesystem and Git port abstractions (shipped)"
acceptance_criteria:
  - "A `graft replay` command accepts a session log and re-drives the runtime against a mock worktree"
  - "Replayed sessions produce identical tool-call sequences as the original"
  - "FS and Git ports are fully mocked from the log — no live IDE or editor required"
  - "At least one regression scenario is captured and passes in CI"
---

# CI-002 — Deterministic Scenario Replay

Legend: [DX — Developer Experience](../../legends/DX-developer-experience.md)

## Idea

Graft logs every tool call and its versioned schema. These logs can be used to create deterministic "Scenarios" for integration testing.

Implement a `graft replay` command that takes a session log and re-drives the Graft runtime against a mock worktree. This would allow developers to "replay" a specific context-governance failure or a complex daemon authz sequence.

## Why

1. **Reproduction**: Makes "it worked in my editor" bugs trivial to capture and fix.
2. **Regression Testing**: Allows building a library of complex agent-interaction scenarios that must always stay governed.
3. **CI/CD**: Enables high-fidelity testing of daemon logic without needing a live IDE attached.

## Effort

Medium-Large — requires a playback driver and a way to mock the FS/Git ports from a log.
