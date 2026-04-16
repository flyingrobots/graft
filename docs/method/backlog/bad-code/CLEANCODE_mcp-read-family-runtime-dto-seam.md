---
title: "mcp read-family runtime dto seam"
legend: CLEANCODE
lane: bad-code
---

# mcp read-family runtime dto seam

`safe_read`, `file_outline`, `read_range`, and `changed_since` now share the right architectural direction through `RepoWorkspace`, but each MCP adapter still parses tool args into casted field access and shapes responses independently. Lift the read-family request/result DTO boundary into a shared seam so these tools stop re-solving the same runtime model problem one handler at a time.
