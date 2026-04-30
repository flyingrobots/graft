---
title: "Cross-session structural resume"
feature: session
kind: trunk
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "state_save / state_load tools (shipped)"
  - "graft_since / changed_since tools (shipped)"
acceptance_criteria:
  - "A new session can load a saved state and receive a structural diff from the last known state to current HEAD"
  - "The structural diff includes added, removed, and modified symbols — not just file names"
  - "Agents skip re-reading unchanged files and focus on what actually changed"
  - "Resume works across branch switches and merges"
---

# Cross-session structural resume

state_save + WARP could persist structural understanding across
sessions. When an agent starts a new session, it loads the saved
state and gets "here's what the codebase looked like when you left,
and here's what changed since."

Instead of re-reading files to rebuild context, the agent gets a
structural diff from its last known state to current HEAD. Instant
orientation.

## Implementation path

1. At session end (or periodically), `state_save` records the
   current HEAD SHA and session observations
2. At new session start, `state_load` retrieves the saved state
3. `graft_since` or `changed_since` computes the structural diff
   between the saved HEAD and current HEAD
4. Present the diff: added symbols, removed symbols, changed
   signatures, new files, deleted files
5. Agent resumes with "here's what you knew, here's what changed"

All primitives are shipped. This is orchestration — wiring
existing tools into a session lifecycle flow.

## Related cards

- **CORE_agent-handoff-protocol**: Complementary but independent.
  Handoff produces a structured JSON for transferring TO another
  agent. Resume loads saved state for THE SAME agent returning.
  Both use `state_save` (shipped) but for different purposes.
- **CORE_conversation-primer**: Alternative approach to fast
  session start. Primer runs `graft_map` for orientation; resume
  provides a structural diff from last-known state. They could
  coexist (primer for fresh sessions, resume for returning ones).
- **WARP_background-indexing**: Background indexing ensures the
  WARP graph is fresh when the agent resumes, making the
  structural diff accurate. Nice-to-have but not a hard dependency
  — resume works with on-demand indexing.

## No dependency edges

Standalone. All prerequisites are shipped and no other card
requires cross-session resume as a hard prerequisite.

## Effort rationale

Small. The hard problems (structural diffing across branch
switches, merge-aware comparison) are already solved by
`graft_since` and `changed_since`. This card wires them into a
session lifecycle flow — load, diff, present.
