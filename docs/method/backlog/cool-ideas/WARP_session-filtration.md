---
title: "Session filtration (accumulation-aware projections)"
requirements:
  - "Observation cache (shipped)"
  - "Session tracking (shipped)"
acceptance_criteria:
  - "Graft tracks the agent's accumulated observations (filtration) within a session"
  - "Subsequent reads of files in an already-outlined directory return higher detail than first reads"
  - "Projection detail level adapts based on what the agent has already seen, not just the request"
  - "A measurable reduction in redundant context-setting across repeated reads within a session"
---

# Session filtration (accumulation-aware projections)

An observer's information grows monotonically over a session.
Graft should track what the agent has already seen and use that
to inform future projections.

If the agent already read the outline of parser/, a subsequent
safe_read of a file in parser/ could return MORE detail because
the outline context is already accumulated. Less context-setting
needed, more detail is valuable.

The agent's filtration has grown. Graft adapts.

This is the deepest OG insight applied to graft: the tool is
not about HOW MUCH to show. It's about what distinctions to
preserve, in what coordinate system, given what the agent
already knows.

Depends on: observation cache (shipped), session tracking
(shipped).

See: OG-I (filtration model of accumulated observation).
