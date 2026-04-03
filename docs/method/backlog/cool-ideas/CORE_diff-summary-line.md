# Diff summary line per file

graft_diff could include a one-line summary per file for quick
triage:

  src/mcp/server.ts | modified | +3 added, -1 removed, ~2 changed, =5 unchanged

Agents can scan the summary before deciding which files to read
in detail. Humans get a structural `git diff --stat` equivalent.
