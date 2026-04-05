# Retrospective — Cycle 0002: MCP Transport

**Outcome:** Hill met.
**Witness:** Live MCP server dogfooded on graft's own repo via stdio
client. Full transcript below.

## Playback

### Agent perspective

1. **safe_read as MCP tool → structured JSON?** Yes.
   `{ projection: "content", reason: "CONTENT", actual: { bytes: 1267 } }`
   for package.json. Full content returned.

2. **file_outline with jump table?** Yes.
   `src/policy/evaluate.ts` → 4 symbols (basename, extname, checkBan,
   evaluatePolicy), each with line ranges in the jump table.

3. **read_range with bounded content?** Yes.
   `src/mcp/server.ts` lines 1–10 returned exactly those lines.

4. **state_save / state_load through MCP?** Tested in unit tests.
   8 KB cap enforced, round-trip works.

5. **Session tracking across calls?** Yes.
   After 7 tool calls: `stats` reports `totalReads: 2, totalOutlines: 2,
   totalRefusals: 1`. Doctor reports `sessionDepth: "early"`.

6. **Tool schema clear enough?** Yes. `listTools` returns JSON Schema
   with named properties. An agent knows to pass `{ path: "..." }`.

### Operator perspective

1. **Single command to start?** Yes.
   `node --import tsx src/mcp/stdio.ts` (or will be `npx @flyingrobots/graft`
   once published).

2. **One-liner MCP config?** Yes. `.mcp.json` written and tested.

3. **Docker without Node?** Not yet — Dockerfile deferred to backlog.

4. **Doctor for debugging?** Yes. Shows project root, parser health,
   thresholds, session depth, message count.

5. **Stats shows metrics?** Yes. Reads, outlines, refusals per session.

### Witness transcript

```
=== TOOLS ===
safe_read, file_outline, read_range, run_capture, state_save, state_load, doctor, stats
Count: 8

=== safe_read: package.json ===
projection: content | reason: CONTENT | bytes: 1267

=== safe_read: src/mcp/server.ts (large) ===
projection: outline | reason: OUTLINE | bytes: 5245
jump table entries: 5

=== safe_read: pnpm-lock.yaml (banned) ===
projection: refused | reason: LOCKFILE
next: [ 'Read package.json for dependency info instead' ]

=== file_outline: src/policy/evaluate.ts ===
symbols: basename, extname, checkBan, evaluatePolicy
jump table entries: 4

=== read_range: src/mcp/server.ts lines 1-10 ===
lines: 1 - 10
(10 lines of imports returned correctly)

=== doctor ===
{
  "projectRoot": "/path/to/graft",
  "parserHealthy": true,
  "thresholds": { "lines": 150, "bytes": 12288 },
  "sessionDepth": "early",
  "totalMessages": 0   ← bug found, fixed in this cycle
}

=== stats ===
{ "totalReads": 2, "totalOutlines": 2, "totalRefusals": 1 }
```

## Bugs found during playback

- `doctor` returned `totalMessages: 0` (hardcoded). Fixed:
  added `getMessageCount()` to SessionTracker, doctor now reads
  from the live session.

## Drift check

| Drift | Disposition |
|-------|------------|
| Dockerfile not created | Deferred to backlog — npx works, Docker is nice-to-have |
| run_capture returns stub | Same as cycle 0001 — needs shell execution design |
| .mcp.json is machine-local | Gitignored. Setup instructions in README needed. |

## New debt

None.

## Cool ideas surfaced

- The governor caught its own source file (server.ts at 170 lines)
  during playback. Graft governing graft. That's the dogfood loop
  working as intended.

## What went well

- Playback-as-dogfooding caught a real bug (doctor totalMessages).
  Tests didn't catch it because they didn't assert on message count.
- The MCP SDK was straightforward to integrate. Tool registration
  is clean.
- stdio transport works out of the box — no HTTP server needed.

## What to improve

- Need a test for doctor's totalMessages field specifically.
- Should add MCP config setup instructions to README.
- Dockerfile should be a backlog item, not deferred indefinitely.
