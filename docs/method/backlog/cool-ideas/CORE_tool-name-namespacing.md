---
title: "MCP tool name namespacing"
---

# MCP tool name namespacing

Prefix MCP tool names with `graft_` (e.g., `graft_safe_read`
instead of `safe_read`) to avoid collisions when multiple MCP
servers are active in the same session.

Currently: tools are registered as `safe_read`, `file_outline`,
`changed_since`, etc. If another MCP server registers a `safe_read`
tool, the names collide.

Trade-off: longer names vs collision safety. Most MCP clients
handle namespacing at the server level (the server name IS the
namespace). But explicit prefixes are belt-and-suspenders.

Decision: defer until we see a real collision. Note for 0.1.0
release docs.
