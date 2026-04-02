# Graft — Executive Summary

## Vision

Graft is a context governor for coding agents. It exists because
agents waste enormous context reading files they shouldn't read
whole, re-reading files that haven't changed, and flooding their
context windows with noise.

The empirical basis is Blacklight's analysis of 1,091 real coding
sessions (291K messages, 4.5 months): **96.2 GB of context burden
from Read alone** — 6.6× all other tools combined. 58% of reads
were full-file. One file was read 1,053 times for 1.74 GB of
burden. Dynamic read caps + session management reduce this by
**75.1%**.

Graft is not a tool for humans. Humans have IDEs. Graft is a tool
for agents — an MCP server that enforces read policy, returns the
smallest structurally correct view, and logs every decision.

The long-term vision: Graft grows from a governor into a
**provenance-aware substrate**. Git tracks bytes. Graft, powered
by WARP, tracks what those bytes mean structurally — across commits,
across sessions, across the full causal chain of an agent's reads
and writes.

---

## Current state

**Cycles completed:** 2
**Tests:** 157 passing across 14 files
**Lint:** clean (ESLint strict-type-checked)
**Published:** not yet (npm: `@flyingrobots/graft`)

### Cycle 0001 — The Governor (complete)

The core policy engine. Dual thresholds (150 lines + 12 KB), 5 ban
categories (binary, lockfile, minified, build output, secret),
`.graftignore` support, session-depth dynamic caps (20/10/4 KB).
Tree-sitter WASM outline extraction for JS/TS with jump tables.
4 tripwires for session health. NDJSON decision logging. 14
machine-stable reason codes.

### Cycle 0002 — MCP Transport (complete)

All 8 Phase 1 commands exposed as MCP tools over stdio. Session
tracking built into the server — tripwires and dynamic caps happen
automatically. Dogfooded on graft's own repo during playback.

**Commands available:**

| Command | What it does |
|---------|-------------|
| `safe_read` | Policy-enforced file read → content, outline, or refusal |
| `file_outline` | Structural skeleton with jump table |
| `read_range` | Bounded range read (max 250 lines) |
| `run_capture` | Shell output capture (stub) |
| `state_save` | Save session state (max 8 KB) |
| `state_load` | Restore session state |
| `doctor` | Runtime health check |
| `stats` | Decision metrics summary |

---

## Legends

### WARP — Structural memory over Git

The domain where graft grows from a governor into a provenance-aware
substrate. Git tracks bytes; WARP tracks what those bytes mean
structurally.

**Core model:** A WARP worldline mirrors the git commit timeline but
is richer — one tick per commit, plus ticks for every intermediate
working-copy change. The WARP graph models the project-wide AST
(files, classes, functions, interfaces, relationships). Each tick
stores a structural delta patch, not the full AST. Materializing at
any point means applying patches from a checkpoint.

**Level 1 — Commit-level worldline.** One tick per commit.
Post-commit hook parses changed files, diffs against previous AST,
writes structural patches. Enables `graft since <ref>` and
`graft history <symbol>`.

**Level 2 — Observation cache.** Record every `safe_read` as an
observation. Track what the agent saw and when. Enables
`changed-since-last-read` and re-read detection.

**Level 3 — Sub-commit causal tracking.** Every working-copy edit
is a tick on the worldline. The causal chain of reads and writes IS
the reasoning trace. Walk backward from a test failure through the
structural operations that caused it. Like jj: no unstaged state.

**Frontier ideas:**
- Speculative merge forks (Strands and Braids for semantic merge preview)
- Symbol heatmap (which symbols cause the most context pressure)
- graft pack (one-shot handoff bundle between sessions)
- Receipt mode (compact decision blobs for Blacklight analysis)

---

## Roadmap

### ASAP — pull next

| Item | Summary | Effort | Legend |
|------|---------|--------|--------|
| Re-read suppression | Session hash cache — skip re-reads of unchanged files | S | — |
| graft diff | Structural git diff (symbol-level, not line hunks) | M | — |
| WARP AST-per-commit | Level 1 worldline with structural delta patches | L | WARP |

### Up-next

| Item | Summary | Effort | Legend |
|------|---------|--------|--------|
| Claude Code hooks | PreToolUse hooks enforcing graft policy on Read/Bash | L | — |
| Context budget | Agent declares budget, governor adjusts dynamically | M | — |
| Dockerfile | Docker-based MCP server startup | S | — |
| Phase 2 precision tools | code_show, code_find — symbol-level extraction | XL | — |

### Cool ideas (unshaped)

**Governor improvements:**
- Policy profiles (balanced / strict / feral)
- Auto-focus (intent-driven symbol targeting)
- Graft as teacher (hints in responses for better context hygiene)
- Self-tuning governor (analyze metrics, suggest threshold changes)
- Context budget (cumulative byte tracking)
- graft explain (built-in help for reason codes)
- graft init (scaffolding command for onboarding)

**Structural tooling:**
- graft since \<ref\> (symbols changed since a commit)
- changed-since-last-read (structural delta from last observation)
- Outline diff in commit trailers (structural summary in git log)
- capture_range (opaque log handles for run_capture output)

**WARP frontier:**
- Causal write tracking (every edit is a structural observation)
- Speculative merge forks (semantic conflict detection via Braids)
- Symbol heatmap (hot symbols from metrics + worldline churn)
- graft pack (session handoff bundle referencing worldline position)
- Receipt mode (compact decision blobs for Blacklight)

**Measurement:**
- Token usage comparison (graft vs no-graft, dogfooded on graft itself)

---

## Architecture

```
src/
  policy/       read policy engine (thresholds, bans, session depth)
  parser/       tree-sitter WASM outline extraction
  operations/   command implementations
  format/       output formatting (JSON structured responses)
  metrics/      NDJSON decision logging
  session/      session tracking, tripwires
  mcp/          MCP server + stdio transport
  hooks/        Claude Code hook integration (future)
```

**Dependencies:**
- `web-tree-sitter` 0.20.8 — WASM parser (no native addons)
- `tree-sitter-wasms` — pre-built WASM grammars for JS/TS
- `picomatch` — glob matching for .graftignore
- `@modelcontextprotocol/sdk` — MCP server
- `zod` — schema validation for MCP tools

**Future dependency:**
- `@AverageHelper/git-warp` v16 — structural memory (WARP legend)

---

## Empirical basis

All design decisions trace to Blacklight's analysis of real coding
sessions:

| Metric | Value |
|--------|-------|
| Total sessions analyzed | 1,091 |
| Total messages | 291,265 |
| Read context burden | 96.2 GB (6.6× all other tools) |
| Full-file reads | 58% of all reads |
| Top 2.4% of reads (40KB+) | 24% of raw bytes |
| Worst single file | 1,053 reads, 1.74 GB burden |
| Worst single session | 12.7 GB burden, 5,900 messages |
| Dynamic cap + session mgmt | 75.1% reduction (96.2 → 24 GB) |

Source: `~/git/blacklight/LLM_TOKEN_USE.md`

---

## Open questions

1. **When to publish to npm?** The governor and MCP server work. Is
   it ready for other people's agents?
2. **WARP integration scope.** Level 1 (commit worldline) is shaped.
   How much of git-warp@16's API do we need? Should we explore the
   published package before committing to a cycle?
3. **Human writes.** Level 3 causal tracking captures agent edits via
   hooks. How do we capture human edits? Filesystem watcher? Or accept
   the gap?
4. **Language support.** JS/TS only right now. Rust is in the design
   doc as "later." When?
5. **Threshold tuning.** 150 lines and 12 KB are reasonable defaults
   from Blacklight. Should the self-tuning governor be earlier than
   "cool ideas"?

---

## Process note

This summary was generated by reading, in order:

1. `README.md` — public identity
2. `CLAUDE.md` — project instructions and architecture
3. `docs/method/legends/*.md` — vision domains
4. `docs/design/*/design.md` — cycle designs (completed work)
5. `docs/method/retro/*/retro.md` — what was learned
6. `docs/method/backlog/asap/*.md` — immediate next work
7. `docs/method/backlog/up-next/*.md` — upcoming work
8. `docs/method/backlog/cool-ideas/*.md` — unshaped possibilities
9. `docs/method/backlog/bad-code/*.md` — known debt
10. `docs/method/graveyard/*.md` — rejected ideas

Any project using The Method can produce this summary by reading
those files in that order and synthesizing: vision, current state,
legends with frontier, roadmap by priority tier, architecture,
empirical basis, and open questions.
