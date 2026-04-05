# Agent instructions snippet for graft users

graft init (when it exists) should generate a CLAUDE.md / AGENTS.md
snippet that tells the agent to prefer graft tools over native reads.

Example snippet:

```markdown
## File reads

This project uses graft as a context governor. Prefer graft's MCP
tools over native file reads:

- Use `safe_read` instead of `Read` for file contents
- Use `file_outline` to see structure before reading
- Use `read_range` with jump table entries for targeted reads
- Use `graft_diff` instead of `git diff` for structural changes
- Use `explain` if you get an unfamiliar reason code
- Call `set_budget` at session start if context is tight

These tools enforce read policy, cache observations, and track
session metrics. Native reads bypass all of that.
```

This is the "last mile" of adoption — the agent needs to know
graft exists and prefer it. Without this, agents default to their
built-in Read tool and graft only catches them via hooks (safety
net, not primary surface).

Pairs with: CORE_graft-init (scaffolding command).
