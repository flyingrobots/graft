---
title: "Conversation primer"
---

# Conversation primer

Use `graft_map` as a session-start primer instead of waiting for the
agent to discover it manually.

At conversation start, run `graft_map` on a default scope like `src/`
and inject the result into the session bootstrap or system prompt.
The agent begins already oriented:

- what directories and files matter
- the major symbols already present
- where to drill with `code_show` or `file_outline`

This is distinct from a manual codebase orientation map:
the value is not just that the map exists, but that it becomes the
default first context instead of an opt-in extra step.

Questions:

- what default scope should be primed: repo root, `src/`, or a
  heuristic target?
- how do we keep the primer compact enough for small-context clients?
- when should the primer refresh after writes or branch switches?
- should this live in hooks, MCP client integration, or a separate
  bootstrap helper?

Why cool:

- it reduces adoption friction without requiring full read-path
  interception
- it makes the best structural surface (`graft_map`) show up before
  the first warmup read
- it complements `CORE_codebase-orientation-map` and `CORE_auto-focus`
  rather than replacing them

Prompted by external dogfood feedback:
- "`graft_map` as conversation primer"
- "the agent starts every conversation already oriented"

Effort: M
