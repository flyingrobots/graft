---
title: "capture_range(handle, start, end)"
requirements:
  - "run_capture tool (shipped)"
  - "read_range tool (shipped)"
  - "Budget governor (shipped)"
acceptance_criteria:
  - "run_capture returns an opaque handle instead of raw log file paths"
  - "capture_range accepts a handle and start/end to return a scoped slice of capture output"
  - "Agents cannot use read_range on raw log files to bypass capture limits"
  - "Handles are session-scoped and invalid outside the issuing governor session"
---

# capture_range(handle, start, end)

Opaque log handles for run_capture output. Instead of raw read_range
on log files, return a scoped slice via a handle that the governor
issued. Prevents agents from using read_range to sneak around capture
limits.
