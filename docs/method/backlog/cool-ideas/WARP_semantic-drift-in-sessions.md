---
title: "Semantic drift detection in agent sessions"
---

# Semantic drift detection in agent sessions

If an agent reads file A, then reads file B (which
recontextualizes A), then re-reads A — the agent's understanding
may have shifted. The loop through related files produces a
different interpretation on re-reading.

This is holonomy from OG-II: translating through a chain of
observers and returning to start does NOT return to the same
understanding.

Graft could track the reading path and flag: "You read server.ts
before reading policy.ts. Re-reading server.ts now would likely
change your interpretation of the policy middleware."

Depends on: observation cache (shipped), session tracking
(shipped).

See: OG-II (loop defects / holonomy).
