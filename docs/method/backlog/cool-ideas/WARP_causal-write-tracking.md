# WARP: Causal write tracking

Like jj eliminates staged/unstaged by treating every working-copy
state as a commit, graft could eliminate "unobserved edits" by
treating every agent write as a structural observation in WARP.

The causal chain of reads and writes IS the reasoning trace. Walk
backward from a test failure to the read that informed the edit
that caused it.

Requires: write interception (hooks on Edit tool), sub-commit WARP
nodes, causal linking between observations.

See legend: WARP, Level 3.
