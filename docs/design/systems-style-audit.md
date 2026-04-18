---
title: "Cycle 0008 — Systems-Style JavaScript Audit"
---

# Cycle 0008 — Systems-Style JavaScript Audit

**Type:** Debt (Design cycle)
**Legend:** CLEAN_CODE
**Sponsor human:** James
**Sponsor agent:** Claude

## Scorecards

### src/policy/types.ts (36 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🔴 | `Projection`, `ReasonCode`, `PolicyResult` are TS types/interfaces — vanish at runtime |
| Boundary validation (P2) | 🟡 | No construction point; trusted by convention |
| Behavior on type (P3) | 🔴 | No behavior — plain data bags. Callers switch on `projection` string |
| Schemas at boundaries (P4) | N/A | Internal types, not boundary |
| Serialization (P5) | 🟢 | Not serialized directly |
| SOLID | 🟡 | SRP ok. OCP violated — adding a projection requires editing every switch |
| DRY | 🟢 | Single definition |

**Priority: HIGH.** This is the root of the shape soup. `PolicyResult` should be a class hierarchy (`ContentResult`, `OutlineResult`, `RefusedResult`, `ErrorResult`). Every downstream `if (result.projection === "...")` becomes `instanceof`.

---

### src/policy/evaluate.ts (167 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🔴 | Returns plain objects conforming to `PolicyResult` interface |
| Boundary validation (P2) | 🟡 | Input validated by shape, not by construction |
| Behavior on type (P3) | 🔴 | `evaluatePolicy` is a god function — ban check, threshold check, session cap, all in one |
| Schemas at boundaries (P4) | N/A | Internal |
| Serialization (P5) | 🟢 | Not serialized |
| SOLID | 🔴 | SRP violated — one function does bans + thresholds + session caps. OCP violated — adding a ban type means editing the function |
| DRY | 🟡 | Ban patterns are inline arrays, could be a registry |

**Priority: HIGH.** Split into: `BanChecker`, `ThresholdChecker`, `SessionCapChecker`. Each returns a typed result. `evaluatePolicy` becomes an orchestrator.

---

### src/policy/graftignore.ts (7 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🟢 | Returns `string[]` — no domain concept to model |
| Boundary validation (P2) | 🟢 | Parses raw text into patterns |
| Behavior on type (P3) | 🟢 | Simple utility |
| SOLID | 🟢 | Single responsibility |
| DRY | 🟢 | No duplication |

**Priority: NONE.** This file is fine.

---

### src/parser/types.ts (24 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🔴 | `OutlineEntry`, `JumpEntry`, `OutlineResult` are interfaces — no runtime backing |
| Behavior on type (P3) | 🔴 | No behavior. Callers access raw fields |
| SOLID | 🟡 | Data-only, acceptable for value objects if frozen |
| DRY | 🟢 | Single definition |

**Priority: MEDIUM.** These are value objects. Should be frozen classes with constructors, but less urgent than PolicyResult because they don't drive dispatch.

---

### src/parser/outline.ts (289 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🟡 | Returns plain objects, but tree-sitter nodes are runtime-real |
| Boundary validation (P2) | 🟢 | Parses source code through tree-sitter |
| Behavior on type (P3) | 🟡 | `nodeKind` switch on tree-sitter node types is acceptable (external grammar) |
| Serialization (P5) | 🟢 | Not serialized |
| SOLID | 🟡 | SRP ok. 289 lines is getting large — extraction helpers could be separate |
| DRY | 🟡 | `processDeclaration` and `processLexicalExport` share patterns |
| Hexagonal | 🔴 | Imports `node:module` (createRequire) for WASM path resolution |

**Priority: MEDIUM.** The node:module import is the main issue. WASM path resolution should be an adapter.

---

### src/parser/diff.ts (99 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🔴 | `DiffEntry`, `OutlineDiff` are interfaces |
| Behavior on type (P3) | 🟢 | Pure function, no dispatch |
| SOLID | 🟢 | Single responsibility, open for extension |
| DRY | 🟢 | Clean recursive implementation |
| Hexagonal | 🟢 | No host imports |

**Priority: LOW.** Good structure. DiffEntry could become a frozen class but it's not urgent.

---

### src/parser/lang.ts (13 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| All | 🟢 | Simple utility function |
| Hexagonal | 🟡 | Imports `node:path` for `extname` — could use a string-only impl |

**Priority: NONE.**

---

### src/session/tracker.ts (92 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🟢 | Runtime-backed class with private fields |
| Behavior on type (P3) | 🟢 | Behavior lives on the class |
| SOLID | 🟢 | Single responsibility |
| DRY | 🟢 | No duplication |
| Hexagonal | 🟢 | No host imports |

**Priority: NONE.** This file follows the standard. Model for other files.

---

### src/session/types.ts (7 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🔴 | `Tripwire` is an interface, `SessionDepth` is a type alias |
| SOLID | 🟢 | Simple |

**Priority: LOW.** Tripwire could be a frozen class but it's tiny.

---

### src/metrics/logger.ts (63 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🟢 | Runtime-backed class |
| Behavior on type (P3) | 🟢 | Behavior on the class |
| SOLID | 🟢 | Single responsibility |
| Hexagonal | 🔴 | Imports `node:fs`, `node:path` directly |

**Priority: LOW.** Good class design. Needs a FileSystem port for hexagonal compliance.

---

### src/metrics/types.ts (13 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🔴 | `DecisionEntry` is an interface |
| SOLID | 🟢 | Simple data type |

**Priority: LOW.**

---

### src/operations/safe-read.ts (82 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🔴 | Returns plain `SafeReadResult` objects |
| Behavior on type (P3) | 🟡 | Switches on `policy.projection` string |
| Hexagonal | 🔴 | Imports `node:fs/promises` |
| SOLID | 🟡 | Mixes file I/O with policy orchestration |

**Priority: MEDIUM.** Needs PolicyResult class hierarchy + FileSystem port.

---

### src/operations/file-outline.ts (35 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Hexagonal | 🔴 | Imports `node:fs/promises` |
| SOLID | 🟢 | Simple orchestration |

**Priority: LOW.** Just needs FileSystem port.

---

### src/operations/graft-diff.ts (105 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Hexagonal | 🔴 | Imports `node:fs`, `node:path` |
| SOLID | 🟢 | Clean orchestration |
| DRY | 🟢 | Uses shared `detectLang` |

**Priority: LOW.** Needs FileSystem port.

---

### src/operations/read-range.ts (64 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Hexagonal | 🔴 | Imports `node:fs/promises` |
| SOLID | 🟢 | Single responsibility |

**Priority: LOW.** Needs FileSystem port.

---

### src/operations/state.ts (34 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Hexagonal | 🔴 | Imports `node:fs/promises`, `node:path` |
| SOLID | 🟢 | Simple |

**Priority: LOW.**

---

### src/git/diff.ts (97 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🟡 | `GitError` is a proper class. `ChangedFilesOptions` is an interface |
| Hexagonal | 🔴 | Imports `node:child_process` |
| SOLID | 🟢 | Clean separation of concerns |

**Priority: LOW.** Needs a Git port for hexagonal compliance.

---

### src/mcp/server.ts (541 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🔴 | `Observation`, `GraftServer` are interfaces. Results are plain objects |
| Boundary validation (P2) | 🟡 | zod schemas at MCP edge, but args cast with `as` not parsed into domain types |
| Behavior on type (P3) | 🔴 | Massive tag switching on projection strings throughout |
| Serialization (P5) | 🔴 | `JSON.stringify` called directly, receipt built as `Record<string, unknown>` |
| SOLID | 🔴 | SRP violated — 541-line god file. Observation cache, receipt generation, every tool handler, session plumbing all in one |
| DRY | 🟡 | Tool registration pattern is consistent but file read + cache check is repeated |
| Hexagonal | 🔴 | Imports `node:fs`, `node:crypto`, `node:child_process`, `node:path` |

**Priority: CRITICAL.** Worst file in the codebase. Everything lands here.

---

### src/mcp/stdio.ts (7 lines)

| Dimension | Score | Notes |
|-----------|-------|-------|
| All | 🟢 | Thin entry point, no logic |

**Priority: NONE.**

---

## Summary

| Score | Count | Files |
|-------|-------|-------|
| 🟢 Clean | 4 | graftignore.ts, lang.ts, session/tracker.ts, mcp/stdio.ts |
| 🟡 Needs work | 5 | parser/outline.ts, parser/diff.ts, metrics/logger.ts, session/types.ts, metrics/types.ts |
| 🔴 Violations | 10 | policy/types.ts, policy/evaluate.ts, parser/types.ts, all operations/*, git/diff.ts, mcp/server.ts |

## Prioritized migration plan

### Phase 1: PolicyResult class hierarchy (HIGH)

The single highest-impact change. Eliminates string-tag switching
across the entire codebase.

- `ContentResult`, `OutlineResult`, `RefusedResult`, `ErrorResult`
- Each is a frozen class with constructor validation
- `instanceof` dispatch replaces `if (result.projection === "...")`
- Touches: policy/types.ts, policy/evaluate.ts, operations/safe-read.ts, mcp/server.ts

### Phase 2: Server decomposition (HIGH)

Split the 541-line god file:

- `src/mcp/tools/*.ts` — one file per tool handler
- `src/mcp/cache.ts` — observation cache as a class
- `src/mcp/receipt.ts` — receipt builder as a class
- `src/mcp/server.ts` — registration + plumbing only

### Phase 3: FileSystem port (MEDIUM)

Extract a `FileSystem` port interface. All operations import the
port, not `node:fs`. Node adapter implements it.

- `src/ports/filesystem.ts` — port interface
- `src/adapters/node-fs.ts` — Node implementation
- Touches: all operations/*, metrics/logger.ts

### Phase 4: Value objects (LOW)

Freeze outline entries, diff entries, jump entries, tripwires.
Constructor validation where invariants exist.

### Phase 5: Codec port (LOW)

Replace `JSON.stringify` with canonical JSON codec. Already in
backlog (CC_json-codec-port).
