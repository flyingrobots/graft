---
title: "Graft — Executive Summary"
generated: 2026-04-05
generator: claude (manual, following Method executive-summary process)
cycles_completed: 23
tests: 434
legends: [CORE, WARP, CLEAN_CODE]
backlog_items: 25
version: 0.4.0
commit: 8b03a2c
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

**Cycles completed:** 23 (0001-0023)
**Tests:** 434 passing across 33 files
**Lint:** clean (ESLint strict-type-checked)
**Version:** 0.4.0 (npm: `@flyingrobots/graft`)

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
registry (OCP compliance). Pre-WARP release (v0.3.0): budget-aware
governor, policy check middleware, CachedFile value object,
guardedPort factory, explain tool, `graft init` onboarding command.
Three bug classes eliminated by construction.

### Phase 5 — WARP Level 1 (cycle 0023)

**Structural memory substrate.** Git remembers bytes. Graft now
remembers structure.

WARP indexer writes structural delta patches per commit into a
git-warp graph. `graft_since` gives instant structural diff between
any two refs. `graft_map` gives instant structural map of any
directory. Directory tree modeled as graph nodes with containment
edges. Commits linked to files and symbols via provenance edges
(touches, adds, changes, removes).

Observer Law enforced: write facts, read projections, never
traverse by hand. 11 WARP invariants protect the substrate.

### 14 MCP tools

| Tool | Purpose |
|------|---------|
| `safe_read` | Policy-enforced read (content, outline, refusal, or diff) |
| `file_outline` | Structural skeleton with jump table |
| `read_range` | Bounded range read (max 250 lines), policy-gated |
| `graft_diff` | Structural diff between git refs with summary lines |
| `graft_since` | Structural changes since a ref (symbols added/removed/changed) |
| `graft_map` | Structural map of a directory (all files + symbols) |
| `changed_since` | Check for changes since last read (peek or consume) |
| `run_capture` | Shell output capture — tee to log, tail to agent |
| `state_save` | Save session state (max 8 KB) |
| `state_load` | Restore session state |
| `set_budget` | Declare session byte budget — governor tightens as it drains |
| `explain` | Human-readable reason code help |
| `doctor` | Runtime health check |
| `stats` | Decision metrics summary |

---

## Architecture

```text
src/
  ports/        hexagonal port interfaces (FileSystem, JsonCodec)
  adapters/     Node.js implementations (node-fs, canonical-json)
  guards/       stream boundary guards (assertNotStream, guardedPort)
  policy/       read policy engine (thresholds, bans, session depth, budget)
  parser/       tree-sitter WASM outline extraction
  operations/   command implementations (use ports, not node:fs)
  session/      session tracking, tripwires, budget
  warp/
    indexer.ts  commit indexer (writes structural patches to WARP)
    observers.ts  observer factory (8 canonical lenses)
    open.ts     WarpApp initialization
  mcp/
    server.ts   registration + policy middleware
    context.ts  ToolContext + ToolDefinition
    cache.ts    ObservationCache + Observation class
    cached-file.ts  CachedFile immutable snapshot
    receipt.ts  receipt builder with compressionRatio
    metrics.ts  Metrics class
    tools/      14 handler files, one per tool
  cli/          CLI commands (init, index)
  hooks/        Claude Code hook scripts (PreToolUse + PostToolUse)
```

**Dependencies:**
- `web-tree-sitter` — WASM parser (no native addons)
- `tree-sitter-wasms` — pre-built WASM grammars for JS/TS
- `picomatch` — glob matching for .graftignore
- `@modelcontextprotocol/sdk` — MCP server
- `zod` — schema validation (strict at MCP edge)
- `@git-stunts/git-warp` — WARP graph substrate
- `@git-stunts/plumbing` — git plumbing adapter

---

## Legends

### CORE — The governor itself

Policy, enforcement, extraction, UX, observability — everything
that makes graft useful as a context governor.

**18 cycles completed.** Up-next: phase 2 precision tools
(WARP-gated), non-read burden (study-gated).

### WARP — Structural memory over Git

Git tracks bytes; WARP tracks what those bytes mean structurally.
Level 1: commit-level worldline (DONE — v0.4.0).
Level 2: observation cache (DONE — shipped in Phase 1-2).
Level 3: sub-commit causal tracking (future).

**1 cycle completed.** Up-next: symbol identity, precision tools,
agent action provenance.

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
| Phase 2 precision tools | CORE | code_show, code_find — symbol-level | XL |
| Non-read burden | CORE | Measure Bash/Edit context waste | M |
| Symbol identity | WARP | Rename-robust identity via structural continuity | L |

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

1. **WARP indexing performance.** Level 1 indexing is slow on large
   repos. Background/incremental indexing needed.
2. **Human writes.** Level 3 causal tracking captures agent edits
   via hooks. How do we capture human edits?
3. **Language support.** JS/TS only. Rust is "later." When?
4. **Agent adoption.** `graft init` generates CLAUDE.md snippets
   but agents still default to native Read. How do we make graft
   the default path?
