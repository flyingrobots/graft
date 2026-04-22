---
title: "Graft as training signal"
feature: session
kind: leaf
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "Budget governor with projection decisions (shipped)"
  - "file_outline tool (shipped)"
  - "read_range tool (shipped)"
acceptance_criteria:
  - "Every governor response includes a `hint` field with a one-line suggestion for better context hygiene"
  - "Hints are contextual — they reference the specific projection decision (outline, refused, etc.)"
  - "Hints teach agents to prefer file_outline first, use read_range for details, and avoid full-file reads"
  - "Hint generation adds no measurable latency to tool responses"
  - "Hints are omitted when the read decision was already optimal (no noise)"
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

## Implementation path

1. Define a `HintGenerator` that takes a projection decision (type, reason, file metadata) and returns an optional hint string.
2. Build a hint rule set keyed on projection type:
   - **outline projected**: "This file was outlined because [reason]. Try `file_outline` first to see the jump table, then `read_range` for the specific symbol."
   - **refused**: "This file was refused because [reason]. Check if the source lives elsewhere (e.g., `src/` not `dist/`)."
   - **content (large file)**: "This file fit in budget but is [N] lines. Consider `file_outline` first for faster orientation."
   - **re-read**: "You already read this file [N] times this session. Use `changed_since` to check if it actually changed."
3. Attach the `hint` field to governor response objects. Omit when the decision was already optimal (small file, first read, content projection).
4. Ensure hint generation is a pure string lookup with no I/O — zero latency impact.
5. Test that hints are contextually accurate and reference the correct alternative tools.

## Related cards

- **CORE_graft-teach-learning-receipts**: Very closely related. Learning receipts propose a `teaching` field on receipts for suboptimal reads. This card proposes a `hint` field on every governor response. The difference is scope: receipts target suboptimal decisions specifically; this card targets all decisions as a training signal. If both were built, they should be unified — one hint/teaching field that fires when relevant. Not a dependency — a deduplication candidate.
- **CORE_policy-playground**: Playground returns what WOULD happen. Teacher explains what DID happen and why. Different temporal perspective (before vs. after). Independent.
- **CORE_self-tuning-governor**: Tuning analyzes patterns across sessions. Teaching gives per-decision hints in real time. Both aim to improve agent behavior but at different scales. Independent.
- **CORE_horizon-of-readability**: When the horizon is reached, the hint would say "this file cannot be simplified further — full content is the right choice." The horizon detection enriches the hint but is not required. Independent.

## No dependency edges

Standalone. All prerequisites are shipped. The hint generator is a pure function over existing projection decisions. No other card requires this as a prerequisite — it is an enhancement to governor responses, not a capability gate.

## Effort rationale

Small. The projection decision already contains all the data needed to generate hints (projection type, reason, file size, session read count). This is a string-generation layer over existing data with no new I/O, no new data sources, and no architectural changes. The main work is writing good hint copy and testing that hints are contextually appropriate.
