---
title: "Graft — Executive Summary"
generated: 2026-04-05
generator: claude (manual, following Method executive-summary process)
cycles_completed: 22
tests: 417
legends: [CORE, WARP, CLEAN_CODE]
backlog_items: 18
version: 0.3.2
commit: 7051ac1
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

**Cycles completed:** 22 (0001-0022)
**Tests:** 417 passing across 30 files
**Lint:** clean (ESLint strict-type-checked)
**Version:** 0.3.2 (npm: `@flyingrobots/graft`)

### Phase 1 — The Governor (cycles 0001-0007)

Policy engine with dual thresholds (150 lines + 12 KB), 5 ban
categories, `.graftignore`, session-depth dynamic caps. Tree-sitter
WASM outline extraction. MCP tools over stdio. Re-read suppression
via observation cache. Receipt mode on every response. Changed-since
structural diffs. Git-level structural diffs. CLI entry point.

### Phase 2 — Quality (cycles 0008-0014)

Systems-Style JavaScript audit. PolicyResult class hierarchy
(frozen classes replacing plain objects). Server decomposition
(541-line god file to 110 lines + 14 modules). FileSystem port
(hexagonal compliance — zero node:fs in core logic). Outline
quality audit with 7 real-world fixtures. Three parser fixes.
Type-safe respond. Cache abstraction cleanup. Consistent error
shapes. TOCTOU race elimination.

### Phase 3 — Hooks + Value Objects (cycles 0015-0018)

Claude Code hook integration (PreToolUse + PostToolUse). Value
object hardening: all domain types as frozen SSJS classes.
Canonical JSON codec port. Dockerfile for MCP server without Node.

### Phase 4 — Stream Invariant + Pre-WARP (cycles 0019-0022)

Live study protocol design (5-metric matched-pair crossover).
Study infrastructure (task cards, acceptance harness, randomization).
Stream/port boundary invariant with runtime guards. ToolDefinition
registry (OCP compliance).

Pre-WARP release (v0.3.0): budget-aware governor, policy check
middleware, CachedFile value object, guardedPort factory, explain
tool, receipt compression ratio, diff summary lines. Three bug
classes eliminated by construction.

### 12 MCP tools

| Tool | Purpose |
|------|---------|
| `safe_read` | Policy-enforced read (content, outline, refusal, or diff) |
| `file_outline` | Structural skeleton with jump table |
| `read_range` | Bounded range read (max 250 lines), policy-gated |
| `graft_diff` | Structural diff between git refs with summary lines |
| `changed_since` | Check for changes since last read (peek or consume) |
| `run_capture` | Shell output capture — tee to log, tail to agent |
| `state_save` | Save session state (max 8 KB) |
| `state_load` | Restore session state |
| `doctor` | Runtime health check |
| `stats` | Decision metrics summary |
| `explain` | Human-readable reason code help |
| `set_budget` | Declare session byte budget — governor tightens as it drains |

---

## Architecture

```
src/
  ports/        hexagonal port interfaces (FileSystem, JsonCodec)
  adapters/     Node.js implementations (node-fs, canonical-json)
  guards/       stream boundary guards (assertNotStream, guardedPort)
  policy/       read policy engine (thresholds, bans, session depth, budget)
  parser/       tree-sitter WASM outline extraction
  operations/   command implementations (use ports, not node:fs)
  session/      session tracking, tripwires, budget
  mcp/
    server.ts   registration + policy middleware (~140 lines)
    context.ts  ToolContext + ToolDefinition (with policyCheck flag)
    cache.ts    ObservationCache + Observation class
    cached-file.ts  CachedFile immutable snapshot
    receipt.ts  receipt builder with compressionRatio
    metrics.ts  Metrics class
    tools/      12 handler files, one per tool
  cli/          CLI commands (init)
  hooks/        Claude Code hook scripts (PreToolUse + PostToolUse)
```

**Dependencies:**
- `web-tree-sitter` — WASM parser (no native addons)
- `tree-sitter-wasms` — pre-built WASM grammars for JS/TS
- `picomatch` — glob matching for .graftignore
- `@modelcontextprotocol/sdk` — MCP server
- `zod` — schema validation (strict at MCP edge)

---

## Legends

### CORE — The governor itself

Policy, enforcement, extraction, UX, observability — everything
that makes graft useful as a context governor.

**17 cycles completed.** Non-WARP backlog: zero. Up-next: phase 2
precision tools (WARP-gated), non-read burden (study-gated).

### WARP — Structural memory over Git

Git tracks bytes; WARP tracks what those bytes mean structurally.
Level 1: commit-level worldline. Level 2: observation cache (done).
Level 3: sub-commit causal tracking.

**0 cycles completed.** Up-next: ast-per-commit (Level 1 worldline).

### CLEAN_CODE — Systems-Style JavaScript

Structural quality. Runtime-backed domain types, hexagonal
architecture, boundary validation. All SSJS dimensions green as
of cycle 0021.

**7 cycles completed.** Remaining: 1 bad-code item (WARP-blocked).

---

## Roadmap

### Up-next

| Item | Legend | Summary | Effort |
|------|--------|---------|--------|
| AST-per-commit | WARP | Level 1 worldline with structural delta patches | L |
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
   How much of git-warp's API do we need?
2. **Human writes.** Level 3 causal tracking captures agent edits via
   hooks. How do we capture human edits?
3. **Language support.** JS/TS only. Rust is "later." When?
4. **npm OIDC publish.** v0.3.1 will be the first npm publish via
   OIDC provenance. Will the trust chain work?
