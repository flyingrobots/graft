---
title: "safe_read accepts an intent parameter that changes nothing"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-08-02
---

# safe_read accepts an intent parameter that changes nothing

## Problem

The MCP `safe_read` tool declares `intent` in its input schema and passes it
through `RepoWorkspace.safeRead`. Nothing reads it. It does not affect the
observation, the policy decision, the result, the cache key, a request
identity, a receipt, or any persisted read attribution.

As of #228 it is no longer even carried into the `safeRead` operation, which
now takes only what it uses. It survives on the MCP surface alone.

## Risk

A declared parameter that does nothing teaches callers a false model. An agent
supplying a careful `intent` reasonably believes it is recorded and will shape
attribution or replay. It is discarded. That is worse than not offering the
field, because the caller pays attention cost and gets nothing, and a future
reader has to run the code to discover the field is inert.

## Repair sketch

Either remove it from the schema — a breaking MCP surface change, so it needs a
version note — or give it semantics. If it is kept, the honest split is between
*semantic* observation intent, which participates in request identity, and
*diagnostic* prose, which does not and should be named so it cannot be mistaken
for identity-bearing.
