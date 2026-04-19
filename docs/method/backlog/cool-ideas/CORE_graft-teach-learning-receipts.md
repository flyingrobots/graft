---
title: "graft teach — learning receipts for agent read decisions"
legend: CORE
lane: cool-ideas
---

# graft teach — learning receipts for agent read decisions

When an agent makes a suboptimal read decision, graft already knows — the receipt says `projection: outline, reason: SESSION_CAP`. But it doesn't teach. It just enforces.

Add a `teaching` field to receipts with actionable hints:
- "This 12KB file was outline-projected. Try `file_outline` first to check the jump table before requesting full content."
- "This is a re-read of an unchanged file. Use `changed_since` to check before re-reading."
- "This build output file was refused. Source lives in `src/`, not `dist/`."

Make the governor a teacher, not just a gatekeeper. Agents learn by doing — the receipt is already the feedback channel.
