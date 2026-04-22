---
title: "Graft as training signal"
requirements:
  - "Budget governor with projection decisions (shipped)"
  - "file_outline tool (shipped)"
  - "read_range tool (shipped)"
acceptance_criteria:
  - "Every governor response includes a `hint` field with a one-line suggestion for better context hygiene"
  - "Hints are contextual — they reference the specific projection decision (outline, refused, etc.)"
  - "Hints teach agents to prefer file_outline first, use read_range for details, and avoid full-file reads"
  - "Hint generation adds no measurable latency to tool responses"
---

# Graft as training signal

Refusals and outlines currently block or downgrade. What if they
also taught?

"I gave you an outline instead of 5245 bytes because your context
window is finite and the jump table lets you be surgical. Next time,
try file_outline first."

Agents fine-tuned on graft interactions would learn to request
outlines first, use read_range for details, and avoid full-file
reads instinctively. The governor becomes a teacher, not just a
bouncer.

Could emit a `hint` field in every response with a one-line
suggestion for better context hygiene.
