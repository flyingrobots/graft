# Retro: CORE_capture-range

## What shipped

`CaptureHandleRegistry` — maps opaque handles to capture content.
`register(sessionId, content)` returns a handle;
`getRange(handle, sessionId, start, end)` returns a line slice.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| run_capture returns opaque handle | ❌ Registry exists but run_capture not modified |
| capture_range accepts handle + start/end | ✅ Registry.getRange() |
| Agents cannot bypass via read_range | ❌ No access control added |
| Handles session-scoped | ✅ Validates session ID |

## Gaps

1. **run_capture not modified**: The registry is standalone — run_capture
   still returns raw log paths.
2. **No read_range blocking**: Capture log files remain readable via
   safe_read/read_range.

## Drift check

- Pure class, no node imports (counter-based IDs, not crypto) ✅
