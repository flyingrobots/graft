---
title: "mcp read tools repeat repo workspace assembly"
legend: CLEANCODE
lane: bad-code
---

# mcp read tools repeat repo workspace assembly

`safe_read`, `file_outline`, `read_range`, and `changed_since` now delegate to `RepoWorkspace`, which is the right architectural direction, but each tool still reconstructs the same adapter bundle (`projectRoot`, `fs`, `codec`, `graftignorePatterns`, `resolvePath`, `toPolicyPath`, `session`, `cache`) inline. Extract a thin primary-adapter helper or composition seam so the MCP read-family tools stay DRY while the application service remains the single home for the business flow.
