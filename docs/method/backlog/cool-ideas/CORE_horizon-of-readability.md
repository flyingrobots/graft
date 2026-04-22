---
title: "Horizon of readability"
requirements:
  - "Compression ratio tracking (shipped)"
  - "file_outline tool (shipped)"
  - "Budget governor with projection decisions (shipped)"
acceptance_criteria:
  - "The governor detects when no projection can meaningfully reduce a file's size (outline is near content size)"
  - "When the horizon is reached, the governor returns full content instead of a degraded outline"
  - "The response explicitly tells the agent: 'This cannot be simplified further — full content provided'"
  - "Detection is based on measurable gradients (compression ratio, symbol density), not heuristics"
---

# Horizon of readability

Detect when no projection can reduce complexity further. The file
is irreducibly complex for the current representation.

Tell the agent explicitly: "This cannot be simplified further.
You must read the full content." The optimization boundary is
detectable, not a guess.

When gradients flatten — outline is barely smaller than content,
every symbol is dense, no range slice is self-contained — you've
hit the horizon. Stop trying to optimize and give the agent what
it needs.

Depends on: compression ratio (shipped), outline extraction.
