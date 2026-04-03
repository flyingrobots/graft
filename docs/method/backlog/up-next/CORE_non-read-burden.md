# Extend governor thinking beyond file reads

Blacklight shows context burden comes from ALL tool output, not
just file reads:

- Shell output (Gemini: 10.3 KB avg vs Claude: 1.6 KB)
- Batch read tools (105 KB avg per call)
- Subagent results (71% return 25 KB+)
- Search results (grep, glob)
- Git log output
- Build error messages

run_capture addresses shell output. Tripwires catch runaway tool
loops. But there's no policy on:
- Search result size
- Git log verbosity
- Subagent output bloat

## What this might look like

- `run_capture` as the default for ALL shell output (not opt-in)
- Search result pagination/summarization
- Subagent output caps (when graft is the orchestrator)
- Per-tool-type burden tracking in receipts

## Priority

After the live study — let data show which non-read sources are
the biggest burden. Don't optimize in the dark.

Effort: M
