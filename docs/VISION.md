---
title: "Graft — Executive Summary"
generated: 2026-04-03
generator: claude (manual, following Method executive-summary process)
cycles_completed: 15
tests: 307
legends: [CORE, WARP, CLEAN_CODE]
backlog_items: 28
version: 0.2.0
commit: 00a105453ceb2cc2cc4e2b8bfeaaf3389068d2e4
---

# Graft — Executive Summary

## Vision

Graft is a context governor for coding agents. It exists because
agents waste enormous context reading files they shouldn't read
whole, re-reading files that haven't changed, and flooding their
context windows with noise.

The empirical basis is Blacklight's analysis of 1,091 real coding
sessions (291K messages, 4.5 months): **96.2 GB of context burden
from Read alone** — 6.6x all other tools combined. 58% of reads
were full-file. One file was read 1,053 times for 1.74 GB of
burden. Dynamic read caps + session management reduce this by
**75.1%**.

Graft is agent-first — an MCP server that enforces read policy,
returns the smallest structurally correct view, and logs every
decision. But the structural tools (outlines, diffs, symbol history)
are useful to anyone. Don't market it as a human tool. Do leave the
door unlocked.

The long-term vision: Graft grows from a governor into a
**provenance-aware substrate**. Git tracks bytes. Graft, powered
by WARP, tracks what those bytes mean structurally — across commits,
across sessions, across the full causal chain of an agent's reads
and writes.

---

## Current state

**Cycles completed:** 15 (0001-0015, skipping 0007 which was folded into release prep)
**Tests:** 307 passing across 24 files
**Lint:** clean (ESLint strict-type-checked)
**Version:** 0.2.0 (npm: `@flyingrobots/graft`)

### Phase 1 — The Governor (cycles 0001-0007)

Policy engine with dual thresholds (150 lines + 12 KB), 5 ban
categories, `.graftignore`, session-depth dynamic caps. Tree-sitter
WASM outline extraction. 10 MCP tools over stdio. Re-read suppression
via observation cache. Receipt mode on every response. Changed-since
structural diffs. Git-level structural diffs. CLI entry point.

### Phase 2 — Quality (cycles 0008-0014)

Systems-Style JavaScript audit. PolicyResult class hierarchy
(frozen classes replacing plain objects). Server decomposition
(541-line god file to 110 lines + 14 modules). FileSystem port
(hexagonal compliance — zero node:fs in core logic). Outline
quality audit with 7 real-world fixtures proving extraction works
on React components, Express routers, barrel files, god classes,
dense generics, and decorated classes. Three parser fixes: arrow
function exports, enum extraction, re-export extraction. Type-safe
respond (eliminated all double-casts). Cache abstraction cleanup.
Consistent error shapes. TOCTOU race elimination.

### Phase 3 — Hooks (cycle 0015)

Claude Code hook integration. PreToolUse blocks banned files
(secrets, binaries, lockfiles, .graftignore). PostToolUse educates
agents on context cost after large file reads, showing what
safe_read would have saved. Shared module with validated input
parsing, path traversal guard, stdin size guard. HookInput and
HookOutput as frozen SSJS classes.

### 10 MCP tools

| Tool | Purpose |
|------|---------|
| `safe_read` | Policy-enforced read (content, outline, refusal, or diff) |
| `file_outline` | Structural skeleton with jump table |
| `read_range` | Bounded range read (max 250 lines) |
| `graft_diff` | Structural diff between git refs |
| `changed_since` | Check for changes since last read (peek or consume) |
| `run_capture` | Shell output capture — tee to log, tail to agent |
| `state_save` | Save session state (max 8 KB) |
| `state_load` | Restore session state |
| `doctor` | Runtime health check |
| `stats` | Decision metrics summary |

---

## Architecture

```
src/
  ports/        hexagonal port interfaces (FileSystem)
  adapters/     Node.js implementations (node-fs)
  policy/       read policy engine (thresholds, bans, session depth)
  parser/       tree-sitter WASM outline extraction
  operations/   command implementations (use ports, not node:fs)
  metrics/      NDJSON decision logging (uses FileSystem port)
  session/      session tracking, tripwires
  mcp/
    server.ts   registration + plumbing (110 lines)
    context.ts  ToolContext interface + ToolHandler type
    cache.ts    ObservationCache + Observation class
    receipt.ts  receipt builder with stabilization loop
    metrics.ts  Metrics class
    tools/      9 handler files, one per tool
  hooks/        Claude Code hook scripts (PreToolUse + PostToolUse)
```

**Dependencies:**
- `web-tree-sitter` — WASM parser (no native addons)
- `tree-sitter-wasms` — pre-built WASM grammars for JS/TS
- `picomatch` — glob matching for .graftignore
- `@modelcontextprotocol/sdk` — MCP server
- `zod` — schema validation for MCP tools

---

## Legends

### CORE — The governor itself

Policy, enforcement, extraction, UX, observability — everything
that makes graft useful as a context governor.

**12 cycles completed.** ASAP: live study design. Up-next: context
budget, Docker, token comparison, precision tools, non-read burden.

### WARP — Structural memory over Git

Git tracks bytes; WARP tracks what those bytes mean structurally.
Level 1: commit-level worldline. Level 2: observation cache (done).
Level 3: sub-commit causal tracking.

**0 cycles completed.** ASAP: ast-per-commit (Level 1 worldline).

### CLEAN_CODE — Systems-Style JavaScript

Structural quality. Runtime-backed domain types, hexagonal
architecture, boundary validation. PolicyResult classes (done).
Server decomposition (done). FileSystem port (done). Type-safe
respond (done).

**5 cycles completed.** Remaining: value objects, JSON codec port,
bad-code backlog (1 item).

---

## Roadmap

### ASAP

| Item | Legend | Summary | Effort |
|------|--------|---------|--------|
| Live study design | CORE | 5-metric before/after study methodology | M |
| AST-per-commit | WARP | Level 1 worldline with structural delta patches | L |

### Up-next

| Item | Legend | Summary | Effort |
|------|--------|---------|--------|
| Value objects | CC | Remaining plain objects to frozen classes | S |
| JSON codec port | CC | Hexagonal JSON serialization | S |
| Context budget | CORE | Agent declares budget, governor adjusts | M |
| Dockerfile | CORE | Docker-based MCP server startup | S |
| Token usage comparison | CORE | Measure graft vs no-graft burden | M |
| Phase 2 precision tools | CORE | code_show, code_find — symbol-level | XL |
| Non-read burden | CORE | Measure Bash/Edit context waste | M |

### Bad-code backlog (1 remaining)

- Name-based symbol matching (WARP concern — needs Level 2 identity)

---

## Empirical basis

| Metric | Value |
|--------|-------|
| Sessions analyzed | 1,091 |
| Total messages | 291,265 |
| Read context burden | 96.2 GB (6.6x all other tools) |
| Full-file reads | 58% of all reads |
| Top 2.4% of reads (40KB+) | 24% of raw bytes |
| Worst single file | 1,053 reads, 1.74 GB burden |
| Dynamic cap + session mgmt | 75.1% reduction |

Source: `~/git/blacklight/LLM_TOKEN_USE.md`

---

## Open questions

1. **WARP integration scope.** Level 1 (commit worldline) is shaped.
   How much of git-warp@16's API do we need?
2. **Human writes.** Level 3 causal tracking captures agent edits via
   hooks. How do we capture human edits?
3. **Language support.** JS/TS only. Rust is "later." When?
4. **Threshold tuning.** Self-tuning governor — should it be earlier?
5. **npm publish.** v0.2.0 is published. When is it ready for
   broader promotion beyond early adopters?
