---
title: "Graft — Executive Summary"
generated: 2026-04-02
generator: claude (manual, following Method executive-summary process)
cycles_completed: 2
tests: 157
legends: [CORE, WARP]
backlog_items: 23
commit: HEAD
---

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

### CORE — The governor itself

Policy, enforcement, extraction, UX, observability — everything
that makes graft useful as a context governor, independent of
structural memory.

Covers: policy engine (thresholds, bans, caps, budgets), extraction
(outlines, jump tables, structural diffs, precision tools),
enforcement (MCP server, Claude Code hooks, profiles), UX
(onboarding, help, teaching, auto-focus), observability (metrics,
receipts, self-tuning, token measurement), distribution (npm,
Docker).

**15 backlog items.** 2 cycles completed.

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

**Frontier:**
- Speculative merge forks (Strands and Braids for semantic merge preview)
- Symbol heatmap (which symbols cause the most context pressure)
- graft pack (one-shot handoff bundle between sessions)
- Receipt mode (compact decision blobs for Blacklight analysis)

**8 backlog items.** 0 cycles completed.

---

## Roadmap

### ASAP — pull next

| Item | Legend | Summary | Effort |
|------|--------|---------|--------|
| [Re-read suppression](#core-re-read-suppression) | CORE | Session hash cache — skip re-reads of unchanged files | S |
| [graft diff](#core-graft-diff) | CORE | Structural git diff (symbol-level, not line hunks) | M |
| [WARP AST-per-commit](#warp-commit-level-worldline) | WARP | Level 1 worldline with structural delta patches | L |

### Up-next

| Item | Legend | Summary | Effort |
|------|--------|---------|--------|
| [Claude Code hooks](#core-claude-code-hooks-integration) | CORE | PreToolUse hooks enforcing graft policy on Read/Bash | L |
| [Context budget](#core-context-budget) | CORE | Agent declares budget, governor adjusts dynamically | M |
| [Dockerfile](#core-dockerfile) | CORE | Docker-based MCP server startup | S |
| [Phase 2 precision tools](#core-phase-2-precision-tools) | CORE | code_show, code_find — symbol-level extraction | XL |

### Cool ideas (unshaped)

**CORE — Governor improvements:**
- [Policy profiles](#core-policy-profiles)
- [Auto-focus](#core-auto-focus)
- [Graft as teacher](#core-graft-as-training-signal)
- [Self-tuning governor](#core-self-tuning-governor)
- [graft explain](#core-graft-explain-reason-code)
- [graft init](#core-graft-init)
- [capture_range](#core-capture_rangehandle-start-end)
- [Token usage comparison](#core-token-usage-graft-vs-no-graft)
- [Receipt mode](#core-receipt-mode)

**WARP — Structural memory:**
- [graft since \<ref\>](#warp-graft-since-git-ref)
- [changed-since-last-read](#warp-graft-changed-since-last-read)
- [Outline diff in commit trailers](#warp-outline-diff-in-commit-trailers)
- [graft pack](#warp-graft-pack)
- [Symbol heatmap](#warp-symbol-heatmap)
- [Causal write tracking](#warp-causal-write-tracking)
- [Speculative merge forks](#warp-speculative-merge-forks)

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

**Method tooling opportunities identified during this process:**

| Operation | Manual steps | Tool |
|-----------|-------------|------|
| Create a legend | Write file in legends/, pick a code | `legend.create(code, description)` |
| Assign legend to backlog item | Rename file with prefix | `backlog.assign(legend, item)` |
| Audit backlog for orphans | Find files without legend prefix | `backlog.audit()` |
| List backlog by legend | Grep filenames for prefix | `backlog.list(legend?, lane?)` |
| Generate executive summary | Read 10 artifact types, synthesize | `vision.generate()` |
| Check cycle status | Read design doc, count tests, check phase | `cycle.status()` |
| Inventory all artifacts | ls every Method directory | `method.inventory()` |

The highest-value automation is `vision.generate()` — it touches
every artifact type and produces the most complex output. Second
is `backlog.audit()` + `backlog.assign()` which prevent orphaned
items from drifting outside legend coverage.

---

## Appendix: Full backlog

Complete text of every backlog item, organized by lane and legend.

### ASAP

#### CORE: Re-read suppression

> Source: `docs/method/backlog/asap/CORE_reread-suppression.md`

Session-level observation cache in the MCP server. Track
`Map<path, { hash, timestamp }>`. When the agent reads the same
file twice and it hasn't changed, return "unchanged since your last
read" with the cached outline instead of re-reading and re-parsing.

Addresses the single biggest empirical finding from Blacklight:
WarpGraph.js was read 1,053 times across 85 sessions for 1.74 GB
of burden. Most re-reads find the same content.

No WARP dependency. Just a content hash comparison in the session.
This is the Level 2 observation cache from the WARP legend, but
the minimal version that works today.

Effort: S

---

#### CORE: graft diff

> Source: `docs/method/backlog/asap/CORE_graft-diff.md`

Diff two tree-sitter outlines (working tree vs HEAD, or any two
refs) and return structural changes instead of line hunks.

Output: "function `evaluatePolicy`: added parameter `sessionDepth`",
"class `SessionTracker`: added method `getMessageCount`",
"file `src/mcp/server.ts`: added".

Uses the existing outline extractor — no WARP needed. Proves the
structural diff primitive that the WARP worldline will need for
tick patches. Useful standalone as an MCP tool and CLI command.

Effort: M

---

#### WARP: Commit-level worldline

> Source: `docs/method/backlog/asap/WARP_ast-per-commit.md`

First WARP integration. Worldline mirrors the git commit timeline.
Each tick stores a structural delta patch (not full AST). The WARP
graph models the project-wide AST; materializing at any tick gives
the full structural state at that commit.

Tick patches are AST operations: add symbol, remove symbol, change
signature, move method. Post-commit hook parses changed files with
tree-sitter, diffs against previous materialized state, writes
the structural patch.

Enables `graft since <ref>` — structural delta between two commits
without touching the worktree.

Dependencies:
- git-warp@16 (published, stable)
- tree-sitter parser (already in graft)
- git post-commit hook (or lazy parse on first query)

See legend: WARP, Level 1.

Effort: L

---

### Up-next

#### CORE: Claude Code Hooks Integration

> Source: `docs/method/backlog/up-next/CORE_claude-code-hooks.md`

PreToolUse hooks on Read and Bash to enforce Graft policy in Claude
Code sessions. Read calls routed through safe_read. Bash test runs
routed through run_capture.

This is the enforced mode — agents can't bypass the governor.

Effort: L

---

#### CORE: Context budget

> Source: `docs/method/backlog/up-next/CORE_context-budget.md`

Agent declares a token/byte budget at session start. Graft adjusts
all thresholds dynamically to stay within it. The governor becomes
budget-aware, not just size-aware.

Instead of fixed caps (150 lines, 12 KB) the governor tracks
cumulative bytes returned and tightens as the budget drains. A
200K-token session that's used 150K gets stricter caps than one
that's used 20K.

Connects to Blacklight: the sessions that blew up were the ones
where nobody was counting.

Effort: M

---

#### CORE: Dockerfile

> Source: `docs/method/backlog/up-next/CORE_dockerfile.md`

Docker-based startup for the MCP server. Run graft without installing
Node. Mounts the project directory at /workspace.

```
docker run -i --rm -v "$PWD:/workspace" flyingrobots/graft
```

Effort: S

---

#### CORE: Phase 2: Precision Tools

> Source: `docs/method/backlog/up-next/CORE_phase2-precision-tools.md`

Commands: code_show, code_find, exports view. Structural aperture —
focus on a class, method, or export by name. Requires symbol-level
extraction beyond file_outline.

Languages: JS/TS first, Rust second.

Effort: XL

---

### Cool ideas — CORE

#### CORE: Auto-focus

> Source: `docs/method/backlog/cool-ideas/CORE_auto-focus.md`

`focus: 'auto'` — intent-driven auto-focus. The governor infers which
symbol or range the agent actually needs based on the request context,
instead of requiring explicit targeting.

---

#### CORE: capture_range(handle, start, end)

> Source: `docs/method/backlog/cool-ideas/CORE_capture-range.md`

Opaque log handles for run_capture output. Instead of raw read_range
on log files, return a scoped slice via a handle that the governor
issued. Prevents agents from using read_range to sneak around capture
limits.

---

#### CORE: Graft as training signal

> Source: `docs/method/backlog/cool-ideas/CORE_graft-as-teacher.md`

Refusals and outlines currently block or downgrade. What if they
also taught?

"I gave you an outline instead of 5245 bytes because your context
window is finite and the jump table lets you be surgical. Next time,
try file_outline first."

Agents fine-tuned on graft interactions would learn to request
outlines first, use read_range for details, and avoid full-file
reads instinctively. The governor becomes a teacher, not just a
bouncer.

Could emit a `hint` field in every response with a one-line
suggestion for better context hygiene.

---

#### CORE: graft explain \<reason-code\>

> Source: `docs/method/backlog/cool-ideas/CORE_graft-explain.md`

Built-in help for machine reason codes. `graft explain BINARY` returns
a human-readable explanation of why binary files are refused and what
the agent should do instead.

---

#### CORE: graft init

> Source: `docs/method/backlog/cool-ideas/CORE_graft-init.md`

Scaffolds .graftignore, updates .gitignore, generates instruction
snippets for CLAUDE.md / system prompts, and installs hooks. The
zero-friction onboarding command.

---

#### CORE: Policy profiles

> Source: `docs/method/backlog/cool-ideas/CORE_policy-profiles.md`

Named policy presets: balanced / strict / feral. Different thresholds,
different ban lists, different outline verbosity. Switchable per
session or per project via .graftrc or CLI flag.

---

#### CORE: Receipt mode

> Source: `docs/method/backlog/cool-ideas/CORE_receipt-mode.md`

Compact decision blobs for Blacklight analysis. Instead of full
NDJSON logs, emit minimal receipts that Blacklight can aggregate to
compare pre-graft vs post-graft context burden.

---

#### CORE: Self-tuning governor

> Source: `docs/method/backlog/cool-ideas/CORE_self-tuning-governor.md`

Analyze the NDJSON metrics log to suggest threshold adjustments.

- If 80% of outlines fire on files between 150–200 lines, suggest
  raising the line threshold.
- If a directory is always refused, suggest adding it to .graftignore.
- If the dynamic session cap never triggers, it might be too generous.
- If a specific file is re-read 50+ times, flag it as a hot path.

Could run as a `graft tune` command that reads the metrics and
emits suggestions, or as a periodic self-check in the MCP server.

---

#### CORE: Token usage: graft vs no-graft

> Source: `docs/method/backlog/cool-ideas/CORE_token-usage-comparison.md`

Track actual token consumption with and without graft during
development. The tool's own build is the first test subject.

Approach: Blacklight already measures Read burden per session. Run
paired sessions — same tasks, one with graft enforcing policy, one
without. Compare context bytes, re-read frequency, outline-vs-content
ratio, and total session length.

The metrics logger already captures `estimatedBytesAvoided` per
decision. Aggregate that across a session and compare to Blacklight's
baseline numbers (96.2 GB across 1,091 sessions = ~88 MB/session
average).

This is how we PROVE graft works — not with synthetic benchmarks,
but with real sessions building graft itself.

---

### Cool ideas — WARP

#### WARP: graft changed-since-last-read

> Source: `docs/method/backlog/cool-ideas/WARP_changed-since-last-read.md`

The doorway to WARP territory. Track what the agent last observed and
surface only the structural delta. Requires observation timestamps and
symbol identity — the minimal provenance model.

---

#### WARP: graft since \<git-ref\>

> Source: `docs/method/backlog/cool-ideas/WARP_graft-since.md`

Symbols changed since a commit. The bridge between Graft (current
structure) and WARP (structural history). Requires symbol identity
across revisions.

---

#### WARP: graft pack

> Source: `docs/method/backlog/cool-ideas/WARP_graft-pack.md`

One-shot handoff bundle: state + touched files + decisions + next
reads. For passing context between agents or sessions in a single
artifact.

---

#### WARP: Outline diff in commit trailers

> Source: `docs/method/backlog/cool-ideas/WARP_outline-diff-commit-trailer.md`

Post-commit hook appends a structural summary to the commit message
as a trailer:

```
Structural-Diff: added createGraftServer; changed SessionTracker.getMessageCount (new)
```

Machine-readable metadata that agents can consume from `git log`
without reading the actual diff. Pairs naturally with `graft diff`
(same structural diff primitive, different output target).

Depends on: graft diff.

---

#### WARP: Symbol heatmap

> Source: `docs/method/backlog/cool-ideas/WARP_symbol-heatmap.md`

Derive from metrics: which symbols trigger outlines or re-reads most
often? Surface hot symbols to help agents (and humans) understand
where context pressure concentrates.

---

#### WARP: Causal write tracking

> Source: `docs/method/backlog/cool-ideas/WARP_causal-write-tracking.md`

Like jj eliminates staged/unstaged by treating every working-copy
state as a commit, graft could eliminate "unobserved edits" by
treating every agent write as a structural observation in WARP.

The causal chain of reads and writes IS the reasoning trace. Walk
backward from a test failure to the read that informed the edit
that caused it.

Requires: write interception (hooks on Edit tool), sub-commit WARP
nodes, causal linking between observations.

See legend: WARP, Level 3.

---

#### WARP: Speculative merge forks

> Source: `docs/method/backlog/cool-ideas/WARP_speculative-merge.md`

Use Strands and Braids to model speculative branch merges. Fork the
worldline, apply both branches' structural patches, see where the
AST conflicts are — without actually merging in git.

Structural conflicts are richer than text conflicts:
- Both branches added a method with the same name to the same class
- One branch changed a function signature that the other branch calls
- One branch moved a symbol that the other branch modified in place
- Export surface changed incompatibly across branches

This is merge preview at the structural level. Git sees line
collisions. WARP sees semantic collisions.

Could also simulate: "what would happen if I rebased this branch
onto current main?" by forking the worldline and replaying patches
in a different order.

See legend: WARP. Depends on Level 1 (commit-level worldline).
