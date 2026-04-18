---
title: "Daemon session directories leak forever"
legend: RE
lane: bad-code
---

# Daemon session directories leak forever

Source: v0.6.0 code review (Codex Level 10)

Each daemon connection creates a `sessions/<uuid>` directory. On session close, only the in-memory map entry is removed — the filesystem directory, logs, and local-history artifacts are never cleaned up. Long-running daemons accumulate orphaned directories.

Files: `src/mcp/daemon-session-host.ts:88,123`, `src/mcp/daemon-server.ts:145`

Desired fix: session close must remove or archive the session directory. Consider a TTL-based cleanup for crash-orphaned directories.

Effort: S
