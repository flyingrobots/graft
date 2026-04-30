---
title: "graft teach — learning receipts for agent read decisions"
feature: session
kind: leaf
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "Budget governor with projection receipts (shipped)"
  - "Session tracking (shipped)"
  - "changed_since tool (shipped)"
  - "file_outline tool (shipped)"
acceptance_criteria:
  - "Receipts include a `teaching` field with actionable hints when suboptimal reads are detected"
  - "Hints cover at least: outline-projected large files, re-reads of unchanged files, and refused build output"
  - "Teaching hints reference the correct alternative tool or path (e.g., file_outline, changed_since, src/ instead of dist/)"
  - "Teaching field is omitted when the read decision was already optimal"
---

# graft teach — learning receipts for agent read decisions

When an agent makes a suboptimal read decision, graft already knows — the receipt says `projection: outline, reason: SESSION_CAP`. But it doesn't teach. It just enforces.

Add a `teaching` field to receipts with actionable hints:
- "This 12KB file was outline-projected. Try `file_outline` first to check the jump table before requesting full content."
- "This is a re-read of an unchanged file. Use `changed_since` to check before re-reading."
- "This build output file was refused. Source lives in `src/`, not `dist/`."

Make the governor a teacher, not just a gatekeeper. Agents learn by doing — the receipt is already the feedback channel.

## Implementation path

1. Identify the receipt emission point in the governor pipeline where projection decisions are finalized.
2. Build a `TeachingHintGenerator` that takes a projection decision (type, reason, file metadata, session read history) and returns an optional teaching string.
3. Define hint rules keyed on projection type and reason:
   - **outline projected**: "This file was outline-projected. Try `file_outline` first, then `read_range` for the specific symbol you need."
   - **re-read of unchanged file**: "This file has not changed since your last read. Use `changed_since` to check before re-reading."
   - **refused (build output)**: "This build output was refused. Source lives in `src/`, not `dist/`."
   - **refused (large binary/generated)**: "This file type is not useful for structural understanding."
4. Attach the `teaching` field to NDJSON receipt objects. Omit when the read decision was already optimal (first read, small file, content projection).
5. Test that hints are contextually accurate — each hint must reference the correct alternative tool.

## Related cards

- **CORE_graft-as-teacher**: Deduplication candidate. That card proposes a `hint` field on every governor response for training-signal purposes. This card proposes a `teaching` field on receipts specifically when suboptimal reads are detected. The scope differs — this card targets suboptimal decisions only; graft-as-teacher targets all decisions as a general training signal. If both were built, they should be unified into one hint mechanism that fires when relevant. Not a dependency — a merge candidate.
- **CORE_self-tuning-governor**: Self-tuning analyzes batch metrics across sessions. Teaching provides real-time per-decision feedback. Different temporal scales (historical analysis vs. in-the-moment guidance). Independent.
- **CORE_horizon-of-readability**: When the readability horizon is reached, the teaching hint could say "this file cannot be simplified further — full content is the right choice." The horizon enriches teaching hints but is not required for them. Independent.
- **CORE_speculative-read-cost**: Cost preview before a read complements teaching after a read. Together they bracket the read lifecycle (plan, then learn). Independent.

## No dependency edges

All prerequisites are shipped. The teaching hint generator is a pure function over existing projection decisions and session read history — no new data sources, no new infrastructure, no dependency on unshipped cards. No downstream card requires this as a prerequisite.

## Effort rationale

Small. The projection decision already contains all the data needed (projection type, reason, file size, session read count). This is a string-generation layer over existing data with no new I/O. The main work is writing good hint copy, covering the key suboptimal-read cases, and testing that hints correctly reference alternative tools.
