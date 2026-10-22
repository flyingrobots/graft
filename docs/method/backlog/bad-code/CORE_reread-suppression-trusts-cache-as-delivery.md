---
title: "safe_read reread suppression trusts a cache hit as proof of delivery"
feature: session
kind: bad-code
legend: CORE
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-10-09
---

# safe_read reread suppression trusts a cache hit as proof of delivery

## Problem

`RepoWorkspace.safeRead` returns `projection: "cache_hit"` /
`REREAD_UNCHANGED` (outline in place of content) whenever the slice's
`ObservationCache` holds the same bytes. A cache hit proves the bytes were
parsed, not that this consumer received them:

- `file_outline` or a `safe_read` outline projection fills the cache, so a
  later `safe_read` withholds content that the model never saw.
- A response that failed to reach the client still fills the cache.
- Consumers that share one MCP transport, such as a parent agent and its
  subagents, share the cache.
- After compaction or `/clear`, the model has lost the content, but rereads are
  still suppressed.

## Direction

Move the suppression decision onto the consumer-scoped delivery ledger from
[CORE_unchanged-outline-notice](../../../design/CORE_unchanged-outline-notice.md)
once it lands. Keep the parse memo for computation only. Suppress only when the
consumer has acknowledged a content delivery in the current epoch. Otherwise
fall back to the full governed projection.
