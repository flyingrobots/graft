---
title: "mcp small diagnostic tool runtime models"
legend: CLEANCODE
lane: bad-code
---

# mcp small diagnostic tool runtime models

The small diagnostic/admin MCP tools are still individually assembling plain-object artifacts and thin record wrappers. Consolidate the runtime-model work for `budget`, `doctor`, `explain`, `state`, and `stats` so these tools stop carrying one-off structural typing debt in parallel.
