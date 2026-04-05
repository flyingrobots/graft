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
