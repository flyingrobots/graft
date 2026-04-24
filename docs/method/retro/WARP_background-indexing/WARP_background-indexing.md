# Retro: WARP_background-indexing

## What shipped

`monitor_nudge` MCP tool — triggers immediate re-index tick for a
running monitor. Added `nudgeMonitor()` to PersistentMonitorRuntime.
Wired through ToolContext, server-context, capability registry.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Runs in background on startup without blocking | ✅ Scheduler handles priority separation |
| Post-commit hook triggers incremental indexing | ⚠️ monitor_nudge tool exists but no hook script |
| Only commits since last indexed position | ✅ Tick ceiling handles this |
| WARP-backed tools auto-read from graph | ✅ Already the behavior |
| Agent tool calls never blocked | ✅ Scheduler separates bg/fg |
| Test verifies non-blocking | ✅ Test exists |

## Gaps

1. No post-commit hook script in scripts/hooks/ — only the nudge tool.

## Drift check

- monitor_nudge wired through proper ToolContext interface ✅
- Capability registry, output schemas, burden all updated ✅
- Uses same MonitorActionResult type as other monitor tools ✅
