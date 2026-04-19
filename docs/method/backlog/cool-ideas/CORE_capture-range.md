---
title: "capture_range(handle, start, end)"
---

# capture_range(handle, start, end)

Opaque log handles for run_capture output. Instead of raw read_range
on log files, return a scoped slice via a handle that the governor
issued. Prevents agents from using read_range to sneak around capture
limits.
