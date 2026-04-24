---
title: "capture_range(handle, start, end)"
feature: session
kind: leaf
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "run_capture tool (shipped)"
  - "read_range tool (shipped)"
  - "Budget governor (shipped)"
  - "Session tracking (shipped)"
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

## Implementation path

1. Modify `run_capture` to return an opaque handle (e.g., a UUID) instead of raw log file paths. The handle maps to the underlying log file internally, stored in the session's capture registry.
2. Implement a `capture_range` MCP tool that accepts a handle + start/end line numbers and returns the requested slice of the capture output. The tool validates the handle against the current session.
3. Remove or restrict direct `read_range` access to capture log files. Log files stored in `.graft/captures/` should not be readable via `safe_read` or `read_range` — only through the handle-based `capture_range` tool.
4. Enforce session scoping: handles are tied to the session that created them. A handle from session A is rejected in session B.
5. Apply budget accounting to `capture_range` reads so that slicing through a capture still counts toward the session budget.

## Related cards

- **CORE_speculative-read-cost**: Speculative read cost previews the budget impact of a read before committing. `capture_range` governs access to capture output. These are orthogonal governance mechanisms — one previews cost, the other controls access. No dependency.
- **CORE_policy-playground**: Playground previews projection decisions. `capture_range` is about access control for capture output, not projection decisions. No dependency.

## No dependency edges

All prerequisites are shipped. `run_capture` and `read_range` are both shipped tools. This card modifies `run_capture`'s return type and adds a new tool — no other backlog card must ship first. No other card requires capture_range as a prerequisite.

## Effort rationale

Small. The core change is: (a) `run_capture` returns a handle instead of a path (trivial), (b) a new `capture_range` tool that resolves the handle and delegates to the existing range-read logic (small), and (c) blocking direct file access to capture logs (access control check in `safe_read`/`read_range`). No new algorithms or data structures — just an indirection layer for access control.
