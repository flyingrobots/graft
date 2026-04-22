---
title: "Projection safety classes"
requirements:
  - "Outline extraction (shipped)"
  - "Task-aware projection (backlog)"
acceptance_criteria:
  - "Each projection level (outline, signature, content) has a declared set of question classes it can safely answer"
  - "When an agent asks a question that exceeds the current projection's safety class, graft emits a warning with the required projection level"
  - "The structural insufficiency floor is computed per query: questions below the floor are guaranteed unanswerable at the current aperture"
  - "Safety class metadata is available programmatically for tool integrations"
---

# Projection safety classes

Classify what kinds of questions each projection can safely answer.

"Is there a function called handleError?" — safe under outline.
"Does handleError actually handle all error cases?" — unsafe,
requires content-level reading.

When an agent asks a question that its current projection cannot
reliably answer, graft warns: "Your current view cannot answer
this. You need to read_range lines 42-80."

Below a certain aperture, an observer is GUARANTEED to miss
truths (the structural insufficiency floor from OG-III). Graft
should know this boundary and enforce it.

Depends on: outline extraction (shipped), task-aware projection
(backlog).

See: OG-III (truth transport under coarsening).
