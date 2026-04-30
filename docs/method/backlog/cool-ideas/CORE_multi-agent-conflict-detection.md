---
title: "Multi-agent conflict detection"
feature: agent-safety
kind: trunk
legend: CORE
lane: cool-ideas
effort: L
requirements:
  - "Observation cache (shipped)"
  - "Session tracking (shipped)"
  - "Monitor tick worker (shipped)"
  - "Shared observation state across MCP sessions (not shipped)"
acceptance_criteria:
  - "When agent B modifies a file that agent A has read, agent A is notified with a structural diff"
  - "Conflict detection works across concurrent MCP sessions on the same codebase"
  - "Shared state uses .graft/ directory or lightweight IPC -- no external service required"
  - "Detection latency is under 1 second from write to notification"
  - "Notifications include which symbols changed, not just file names"
---

# Multi-agent conflict detection

If two agents work on the same codebase concurrently, graft's
observation cache could detect when one agent modifies a file
another is reading.

"Agent B just modified src/server.ts -- here's the structural diff
since your last read."

Requires: shared observation state across MCP sessions (currently
each session is isolated). Could use the .graft/ directory as
shared state, or a lightweight IPC mechanism.

Pairs with: WARP causal-write-tracking.

## Implementation path

1. Design shared observation registry: a `.graft/observations.lock` or similar file-based protocol where each active session registers its read set (files + symbols + timestamps). Must handle concurrent access safely (advisory file locks or atomic writes).
2. Implement write-event detection: when a session detects a file modification (via the monitor tick worker, which is shipped), check the shared registry for other sessions that have read that file.
3. Build notification mechanism: when a conflict is detected, produce a structural diff (using `changed_since` or `file_outline` delta) and deliver it to the affected session. The notification must include symbol-level detail, not just "file changed."
4. Handle session lifecycle: register on session start, deregister on session end. Handle stale registrations from crashed sessions (TTL or heartbeat).
5. Optimize for latency: the monitor tick worker already polls for filesystem changes. Conflict detection piggybacks on this loop. Target sub-second detection by checking the shared registry on each tick.
6. Add integration test: two concurrent sessions, one writes a file the other has read, verify the reading session receives a notification with structural diff.

## Related cards

- **WARP_causal-write-tracking**: Causal write tracking records every agent write as a WARP observation node with causal links. Conflict detection needs to know WHEN a write happened and WHAT it changed, which is exactly what causal write tracking provides. However, conflict detection can work without it by monitoring filesystem changes directly (which is what the shipped monitor tick worker does). Not a hard dependency -- filesystem monitoring is the pragmatic path; causal write tracking would make it more precise.
- **WARP_shadow-structural-workspaces**: Shadow workspaces give each agent an isolated structural view with deterministic collapse. Conflict detection is the simpler, pragmatic alternative: instead of full isolation, just notify agents when their context is stale. These are complementary approaches at different ambition levels. Shadow workspaces do not require conflict detection, and conflict detection does not require shadow workspaces.
- **CLEAN_CODE_parallel-agent-merge-shared-file-loss**: This card addresses the merge problem (file copy vs git merge) when parallel agents finish. Conflict detection addresses the real-time problem (notification during concurrent work). Complementary -- conflict detection could prevent the merge problem by warning agents before they create conflicting changes.
- **WARP_semantic-merge-conflict-prediction**: Semantic merge prediction operates on branches pre-merge. Multi-agent conflict detection operates on concurrent sessions in real-time. Different time horizons, similar goal (prevent incompatible changes). No dependency.
- **CORE_agent-handoff-protocol**: Handoff transfers context from one agent to another. Conflict detection monitors concurrent agents. Complementary in multi-agent workflows but not dependent.
- **WARP_degeneracy-warning**: Degeneracy warning detects when multiple agents converge on the same structural region. Conflict detection detects when they modify each other's read context. Related problem space, different mechanism. No dependency.

## No dependency edges

The key unshipped prerequisite is shared observation state across sessions, but that is an implementation detail of THIS card, not a separate card that must ship first. The observation cache, session tracking, and monitor tick worker are all shipped. No other card is blocked waiting for conflict detection, and conflict detection does not require any other backlog card.

## Effort rationale

Large. The core conflict detection loop (shared registry + filesystem monitoring + notification) is M, but the hard problems push this to L: (a) concurrent access safety for the shared registry across multiple processes, (b) session lifecycle management with crash recovery, (c) structural diff generation that is fast enough for sub-second latency, and (d) avoiding false positives when agents intentionally work on the same files (e.g., one reads config, another writes it).

## Reciprocal edges needed on other cards

None. No hard dependency edges in either direction.
