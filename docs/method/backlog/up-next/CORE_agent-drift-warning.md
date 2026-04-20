---
title: "Agent drift warning"
legend: CORE
lane: up-next
---

# Agent drift warning

Detect when an agent is generating the same kind of code it was
asked to eliminate.

Graft sees the session's read/write pattern. If the task context
says "convert typedefs to classes" but the agent's recent writes
contain new `@typedef` blocks, fire a diagnostic:

"You're writing new typedefs in a session that's removing them."

More generally: extract the structural intent from the session
(what patterns are being removed?) and compare against the
structural signature of new writes (what patterns are being
added?). Contradiction = drift.

This is what the human had to do manually in cycle 0012 —
repeatedly catching the agent falling back into sludge patterns.
Graft could catch it automatically.

Depends on: session tracking (shipped), NDJSON metrics (shipped),
write interception (backlog — needs Edit tool hooks).
