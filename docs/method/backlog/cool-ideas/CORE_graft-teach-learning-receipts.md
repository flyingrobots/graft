---
title: "graft teach — learning receipts for agent read decisions"
legend: CORE
lane: cool-ideas
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
