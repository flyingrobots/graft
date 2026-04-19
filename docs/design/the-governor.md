---
title: "Cycle 0001 — The Governor"
---

# Cycle 0001 — The Governor

**Type:** Feature
**Sponsor human:** James
**Sponsor agent:** Claude

## Premise

Graft is a tool for agents, not humans. Humans have IDEs. Agents
have context windows — finite, expensive, and wrecked by careless
reads.

Blacklight measured the damage across 1,091 sessions (291K messages,
4.5 months): **96.2 GB of context burden from Read alone** — 6.6×
all other tools combined. 58% of those reads were full-file. The
fattest 2.4% of reads produced 24% of raw bytes. One file
(WarpGraph.js) was read 1,053 times across 85 sessions for 1.74 GB
of burden.

The governor exists to stop this. Every read is policy-checked.
Every decision is logged. The agent gets the smallest structurally
correct view — or a refusal with a reason code and a next step.

The primary surface is MCP tools and Claude Code hooks, not a CLI.
The CLI exists for debugging and testing. All output is structured
JSON optimized for agent consumption, not human readability.

## Hill

A coding agent using Graft cannot accidentally dump a large, binary,
minified, or secret file into its context window. Every read is
policy-checked and returns the smallest structurally correct
representation. Every decision is logged. Session-depth awareness
tightens policy as context pressure grows.

## Playback questions

### Agent perspective

1. Can I read a small file and get its full content as structured JSON?
2. When I read a large file, do I get a useful outline with a jump
   table so I can request specific ranges?
3. When a file is refused, do I get a machine-readable reason code
   and actionable next steps?
4. Can I read a bounded range of a file without bypassing the governor?
5. Can I capture shell output without it flooding my context?
6. Can I save and restore working state across tool calls?
7. Does the governor tighten as my session gets deeper?
8. When I hit a tripwire, do I get a clear signal to save state and
   reset?

### Operator perspective

(James verifying the governor works — not day-to-day usage.)

1. Does Graft refuse binary, lockfile, minified, and secret files?
2. Are the thresholds (lines + bytes) enforced consistently?
3. Can I see what decisions Graft made (metrics/logs)?
4. Does `doctor` help me debug policy problems?
5. Do the tripwires fire at the right moments?

## Non-goals

- **No symbol-level extraction** (Phase 2: code_show, code_find).
- **No WARP integration** (future: structural history over Git).
- **Intent is advisory only** — it never relaxes policy in Phase 1.
- **No pretty terminal output** — all output is structured JSON.
  The CLI is a thin wrapper for testing. MCP is the real surface.

## Commands

### safe_read(path, intent?)

The primary entry point. Applies policy and returns one of:
- **content** — file is within budget, return it.
- **outline** — file exceeds threshold, return structural skeleton
  with jump table.
- **refused** — file is banned, return reason code + next steps.
- **error** — file doesn't exist or can't be read.

**Policy (dual threshold, session-depth-aware):**

Static floor — whichever is hit first triggers an outline:
- Lines: 150
- Bytes: 12 KB

Dynamic cap — tightens with session depth:

| Session depth     | Max read output |
|-------------------|-----------------|
| Early (< 100 messages elapsed)    | 20 KB |
| Mid (100–500 messages elapsed)    | 10 KB |
| Late (> 500 messages elapsed)     | 4 KB  |

The static thresholds always apply. The dynamic cap is an additional
constraint when session depth is known (via MCP session context or
hook metadata). When session depth is unknown, static thresholds
govern alone.

**Bans:**
- Binary files (.gif, .png, .jpg, .jpeg, .pdf, .zip, .wasm, .bin,
  .sqlite, .mp4, .mov, .ico)
- Lockfiles (package-lock.json, pnpm-lock.yaml, yarn.lock, etc.)
- Minified files (*.min.js, *.min.css, etc.)
- Build output (dist/, build/, .next/, out/, target/, bin/)
- Secret files (.env, *.pem, *.key, credentials.*, etc.)
- Files matching .graftignore patterns

**Build path redirect:** When a build artifact is refused, the `next`
array suggests the likely source file instead of just saying "refused."

**Output shape:**
```typescript
interface SafeReadResult {
  path: string;
  projection: "content" | "outline" | "refused" | "error";
  content?: string;
  outline?: OutlineEntry[];
  jumpTable?: JumpEntry[];       // symbol → line range mapping
  reason?: ReasonCode;
  reasonDetail?: string;
  next?: string[];               // actionable next steps
  thresholds?: { lines: number; bytes: number };
  actual?: { lines: number; bytes: number };
  sessionDepth?: "early" | "mid" | "late" | "unknown";
  estimatedBytesAvoided?: number;
}

interface JumpEntry {
  symbol: string;
  kind: "function" | "class" | "method" | "interface" | "type" | "export";
  start: number;
  end: number;
}
```

### file_outline(path)

Structural skeleton: signatures, class shapes, exports. No function
bodies. Always allowed (never refused by policy).

**Output bounded:** max chars per signature, compact params, ellipsize
large defaults.

**Jump table included:** every outlined symbol maps to its line range
so the agent can follow up with `read_range`.

**Broken files:** best-effort outline with `partial: true`. Tree-sitter
recovers gracefully from syntax errors.

### read_range(path, start, end)

Bounded range read. **Max 250 lines.** Byte cap enforced. Returns
the requested range with line numbers.

This is NOT a stealth `cat`. The governor enforces bounds even on
range reads. If the range exceeds limits, it is clipped and metadata
indicates truncation.

### run_capture(command, tail?)

Execute a shell command, tee output to a log file, and return the
last N lines (default: 60). The full output lives at a stable path
so the agent can `read_range` the log if it needs more context
without re-running the command.

Pattern: `cmd 2>&1 | tee .graft/logs/capture.log | tail -N`

### state_save(content)

Save working state. **Max 8 KB.** The governor refuses oversized
state. This is for session bookmarks, not data dumps.

Recommended state shape (from Blacklight):
- Current task and hypothesis
- Files modified and their states
- Next 3 planned actions
- Key findings so far

### state_load()

Returns saved state or empty.

### doctor()

Runtime and config health check:
- Detected project root
- Active thresholds (static + dynamic)
- Parser health (tree-sitter WASM loaded?)
- Banned path patterns
- .graftignore status
- Log location and size
- Session depth (if known)

### stats()

Decision metrics summary from the NDJSON log:
- Total reads, outlines, refusals
- Bytes avoided (estimated)
- Top refused files
- Top re-read files (the WarpGraph.js problem)
- Reason code distribution

## Tripwires

Session health signals. When a tripwire fires, the response includes
a `tripwire` field with the signal name and a recommendation.

| Signal | Threshold | Action |
|--------|-----------|--------|
| `SESSION_LONG` | > 500 messages | Recommend state_save + reset |
| `EDIT_BASH_LOOP` | > 30 edit↔bash transitions | Warn: likely stuck loop |
| `RUNAWAY_TOOLS` | > 80 tool calls since last user message | Warn: possible stuck loop |
| `LATE_LARGE_READ` | Any output > 20 KB after 300 messages | Force outline, refuse content |

Tripwires are **advisory** in Phase 1. They add metadata to
responses but do not block operations (except `LATE_LARGE_READ`,
which forces an outline). The agent or its orchestrator decides
whether to act on the signal.

Tripwire state requires a session counter. In MCP mode, the server
tracks calls per session. In hook mode, the hook reads session
context from Claude Code. In CLI mode, tripwires are disabled
(no session context).

## Reason codes

Machine-stable enums. 14 codes:

| Code | Meaning |
|---|---|
| `CONTENT` | File returned as content (within budget) |
| `OUTLINE` | File returned as outline (exceeded threshold) |
| `BINARY` | Binary file refused |
| `LOCKFILE` | Lockfile refused |
| `MINIFIED` | Minified file refused |
| `BUILD_OUTPUT` | Build artifact refused |
| `SECRET` | Secret/credential file refused |
| `GRAFTIGNORE` | Matched .graftignore pattern |
| `TOO_LARGE` | File exceeds hard size limit |
| `NOT_FOUND` | File does not exist |
| `PERMISSION` | Permission denied |
| `PATH_ESCAPE` | Path traversal outside project root |
| `RANGE_EXCEEDED` | read_range request exceeds bounds |
| `SESSION_CAP` | Dynamic session-depth cap forced outline |

## Project root detection

- Walk up from CWD looking for `.git/`.
- Symlinks: resolve, then verify resolved path is under root.
- Paths outside root: refuse with `PATH_ESCAPE`.
- Temp logs go to `.graft/` inside the project root.

## Metrics

NDJSON decision log at `.graft/logs/decisions.ndjson`.

Each entry:
```json
{
  "ts": "2026-04-01T12:00:00.000Z",
  "command": "safe_read",
  "path": "src/big-file.ts",
  "projection": "outline",
  "reason": "OUTLINE",
  "lines": 450,
  "bytes": 18200,
  "estimatedBytesAvoided": 16800,
  "sessionDepth": "mid",
  "tripwire": null
}
```

**Retention:** 1 MB metrics, 10 MB logs. Rotate when exceeded.

## Internal vocabulary

These terms guide implementation, not the public API:

- **projection** — output mode chosen by policy
- **focus** — file/class/method/range targeting
- **residual** — hidden context not surfaced to the model
- **receipt** — structured decision log entry
- **witness** — exact focus chosen + why + what larger whole it came from

## Architecture

```
src/
  policy/       read policy engine (thresholds, bans, session depth)
  parser/       tree-sitter outline extraction (WASM)
  operations/   command implementations
  format/       output formatting (JSON structured responses)
  metrics/      NDJSON decision logging
  session/      session tracking, tripwires
  hooks/        Claude Code hook integration (stub)
  mcp/          MCP server transport (stub)
```

## Dependencies

- **web-tree-sitter** — WASM-based parser (no native addons)
- **tree-sitter-wasms** — pre-built WASM grammars for JS/TS
- **picomatch** — glob matching for .graftignore and ban patterns
- **vitest** — test framework
- **typescript** + **eslint** — strict type checking and linting

## Test strategy

Failing tests first. Test files mirror the command surface:

- `test/unit/policy/` — threshold checks, ban detection, .graftignore,
  session-depth dynamic caps
- `test/unit/parser/` — outline extraction for JS/TS, jump tables
- `test/unit/operations/` — each command's behavior
- `test/unit/session/` — tripwire detection, session depth tracking
- `test/unit/metrics/` — decision logging
- `test/integration/` — end-to-end safe_read with real files
- `test/fixtures/` — sample files of various sizes and types

## Empirical basis

All thresholds, bans, and tripwires are derived from Blacklight
analysis of 1,091 real coding sessions:

- **96.2 GB** Read context burden (6.6× all other tools)
- **58%** of reads are full-file (no offset/limit)
- **2.4%** of reads (40KB+) produce **24%** of raw bytes
- Dynamic cap + session management = **75.1% reduction** (96.2 → 24 GB)
- Binary ban: 0.89% aggregate savings but prevents outlier disasters
  (one GIF incident: 4 reads → 395 MB burden)
- Build path ban: 1.98% aggregate savings, trivially implemented
- Top re-read file: 1,053 reads, 1.74 GB burden from a single file

Source: `~/git/blacklight/LLM_TOKEN_USE.md`
