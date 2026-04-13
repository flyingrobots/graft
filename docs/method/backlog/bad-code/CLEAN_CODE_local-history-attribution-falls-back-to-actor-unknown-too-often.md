---
title: CLEAN_CODE local history attribution falls back to actor unknown too often
lane: bad-code
legend: CLEAN_CODE
---

# CLEAN_CODE local history attribution falls back to actor unknown too often

## Problem

Recent `activity_view` and `local-history-dag` inspection still surfaces many events as `actor:unknown`. The label is now honest and explicit, but the underlying attribution truth is still weak too often for a system that is trying to preserve causal history.

## Why it matters

- human operators cannot tell which agent or human actually drove a slice of local history
- repo concurrency posture becomes less actionable when contributor identity collapses to unknown
- WARP-backed local history loses part of its causal usefulness if authorship is routinely missing

## Desired outcome

- explicit actor declarations and transport/session identity should flow into local-history attribution wherever lawful
- `unknown_fallback` should become the exception path, not the common case
- CLI and MCP causal surfaces should make high-confidence actor identity available without fabricating certainty
