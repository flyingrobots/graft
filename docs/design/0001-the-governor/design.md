# Cycle 0001 — The Governor

**Type:** Feature
**Sponsor human:** James
**Sponsor agent:** Claude

## Hill

A coding agent using Graft cannot accidentally dump a large, binary,
minified, or secret file into its context window. Every read is
policy-checked and returns the smallest structurally correct
representation. Every decision is logged.

## Playback questions

### Agent perspective

1. Can I read a small file and get its full content?
2. When I read a large file, do I get a useful outline instead of raw content?
3. When a file is refused, do I get a machine-readable reason code and suggested next steps?
4. Can I read a bounded range of a file without bypassing the governor?
5. Can I capture shell output without it flooding my context?
6. Can I save and restore working state across tool calls?
7. Can I check if the governor is healthy and correctly configured?

### Human perspective

1. Does Graft refuse binary, lockfile, minified, and secret files?
2. Are the thresholds (lines + bytes) enforced consistently?
3. Can I see what decisions Graft made (metrics/logs)?
4. Is the install and config experience simple?
5. Does `doctor` help me debug policy problems?

## Non-goals

- **No symbol-level extraction** (Phase 2: code_show, code_find).
- **No session intelligence** (Phase 3: tripwires, re-read warnings).
- **No WARP integration** (future: structural history over Git).
- **No MCP server** in this cycle (transport is a separate backlog item).
- **No Claude Code hooks** in this cycle (separate backlog item).
- **Intent is advisory only** — it never relaxes policy in Phase 1.

## Commands

### safe_read(path, intent?)

The primary entry point. Applies policy and returns one of:
- **content** — file is small enough, return it.
- **outline** — file exceeds threshold, return structural skeleton.
- **refused** — file is banned, return reason code + next steps.
- **error** — file doesn't exist or can't be read.

**Policy (dual threshold):**
- Lines: 150
- Bytes: 12 KB
- Whichever is hit first triggers an outline.

**Bans:**
- Binary files
- Lockfiles (package-lock.json, pnpm-lock.yaml, yarn.lock, etc.)
- Minified files (*.min.js, *.min.css, etc.)
- Build output (dist/, build/, .next/, etc.)
- Secret files (.env, *.pem, *.key, credentials.*, etc.)
- Files matching .graftignore patterns

**Output shape:**
```typescript
interface SafeReadResult {
  path: string;
  projection: "content" | "outline" | "refused" | "error";
  content?: string;
  outline?: OutlineEntry[];
  reason?: ReasonCode;
  reasonDetail?: string;
  next?: string[];
  thresholds?: { lines: number; bytes: number };
  actual?: { lines: number; bytes: number };
}
```

### file_outline(path)

Structural skeleton: signatures, class shapes, exports. No function
bodies. Always allowed (never refused by policy).

**Output bounded:** max chars per signature, compact params, ellipsize
large defaults.

**Broken files:** best-effort outline with `partial: true`. Tree-sitter
recovers gracefully from syntax errors.

### read_range(path, start, end)

Bounded range read. **Max 250 lines.** Byte cap enforced. Returns
the requested range with line numbers.

This is NOT a stealth `cat`. The governor enforces bounds even on
range reads. If the range exceeds limits, it is clipped and metadata
indicates truncation.

### run_capture(command, tail?)

Execute a shell command and return the last N lines of output
(default: 60). For test runs, build output, and other noisy commands.

### state_save(content)

Save working state. **Max 8 KB.** The governor refuses oversized
state. This is for session bookmarks, not data dumps.

### state_load()

Returns saved state or empty.

### doctor()

Runtime and config health check:
- Detected project root
- Active thresholds
- Parser health (tree-sitter WASM loaded?)
- Banned path patterns
- .graftignore status
- Log location

### stats()

Decision metrics summary from the NDJSON log:
- Total reads, outlines, refusals
- Bytes avoided (estimated)
- Top refused files
- Reason code distribution

## Reason codes

Machine-stable enums. 13 codes:

| Code | Meaning |
|---|---|
| `CONTENT` | File returned as content (small enough) |
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
  "estimatedBytesAvoided": 16800
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
  policy/       read policy engine
  parser/       tree-sitter outline extraction (WASM)
  operations/   command implementations
  format/       output formatting
  metrics/      NDJSON decision logging
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

- `test/unit/policy/` — threshold checks, ban detection, .graftignore
- `test/unit/parser/` — outline extraction for JS/TS
- `test/unit/operations/` — each command's behavior
- `test/unit/metrics/` — decision logging
- `test/integration/` — end-to-end safe_read with real files
- `test/fixtures/` — sample files of various sizes and types
