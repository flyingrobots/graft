---
title: "Cross-session structural resume"
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

Depends on: WARP Level 1 (structural state at commits), state_save
(session bookmarks).
