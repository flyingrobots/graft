# Session depth is monotonic

**Legend:** CORE

Session depth progresses `early` (< 100 messages) → `mid`
(100-500) → `late` (> 500) and never decreases. The message
counter only increments.

## If violated

Dynamic caps could loosen mid-session. An agent in a late
session could suddenly get large reads again, defeating the
progressive tightening that protects context windows.

## How to verify

- `SessionTracker.getSessionDepth()` derives depth from
  `totalMessages` which only increments via `recordMessage()`
- No method resets or decrements the counter
- Tests verify depth transitions at boundary values
