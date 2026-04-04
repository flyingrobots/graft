# Tripwires fire at documented thresholds

**Legend:** CORE

| Tripwire | Threshold |
|----------|-----------|
| SESSION_LONG | > 500 messages |
| EDIT_BASH_LOOP | > 30 edit-bash cycles |
| RUNAWAY_TOOLS | > 80 tool calls since last user message |
| LATE_LARGE_READ | > 20 KB output after 300 messages |

These thresholds are constants, not configurable by the agent.

## If violated

Agents go off the rails without warning. Long sessions exhaust
context without intervention. Edit-bash loops waste tokens.
Runaway tool calls burn rate limits.

## How to verify

- Threshold constants are defined in `SessionTracker`
- Tripwire tests verify firing at exact boundary values
  (e.g., 500 does not fire, 501 fires)
