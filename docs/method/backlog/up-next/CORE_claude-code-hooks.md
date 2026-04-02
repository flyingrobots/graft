# Claude Code Hooks Integration

PreToolUse hooks on Read and Bash to enforce Graft policy in Claude
Code sessions. Read calls routed through safe_read. Bash test runs
routed through run_capture.

This is the enforced mode — agents can't bypass the governor.

Effort: L
