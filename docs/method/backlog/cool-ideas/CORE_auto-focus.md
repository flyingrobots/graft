---
title: "Auto-focus"
requirements:
  - "Budget governor (shipped)"
  - "file_outline tool (shipped)"
  - "graft_map tool (shipped)"
  - "Session tracking (shipped)"
acceptance_criteria:
  - "A `focus: 'auto'` mode is available on read tools"
  - "The governor infers the target symbol or range from the agent's request context"
  - "Auto-focused reads return only the inferred relevant content, not the full file"
  - "Auto-focus produces equivalent or better precision than explicit manual targeting"
---

# Auto-focus

`focus: 'auto'` — intent-driven auto-focus. The governor infers which
symbol or range the agent actually needs based on the request context,
instead of requiring explicit targeting.
