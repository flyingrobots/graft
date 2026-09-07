---
title: "Verification Witness for First Retained Workspace Observation (design packet)"
---

# Verification Witness for First Retained Workspace Observation

This cycle produced a design packet and no runtime code. The witness therefore
records what a documentation cycle can actually prove: that the packet's claims
about the tree are true, that the packet does not contradict itself, and that
nothing executable changed.

`dc619514` is the `main` baseline. This witness does not infer final-head
validation from commit messages. Current pull-request eligibility is attached
to an immutable head by GitHub checks and the PR activity summary; the durable
claims below are limited to commands actually evidenced for this documentation
cycle.

An earlier draft of this line pinned the gate to `e187963f` and claimed later
commits touched only the witness and retro. That was false —
`git diff --name-only e187963f..302f8c42` includes the design packet, both
backlog cards, and both DAG artifacts. Pinning a witness to a SHA that later
commits move past is a provenance claim that decays on the next push. A prose
rule asserting that every relevant commit was tested has the same defect, so
this witness makes neither claim.

## Scope of change

```text
git diff --name-only dc619514..HEAD
docs/design/CORE_first-retained-workspace-observation.md
docs/method/backlog/bad-code/CLEAN_coderabbit-path-filters-skip-method-docs.md
docs/method/backlog/cool-ideas/CORE_design-packet-consistency-lint.md
docs/method/backlog/dependency-dag.dot
docs/method/backlog/dependency-dag.svg
docs/method/retro/CORE_first-retained-workspace-observation/CORE_first-retained-workspace-observation.md
docs/method/retro/CORE_first-retained-workspace-observation/witness/verification.md

git diff --stat dc619514..HEAD -- src bin test tests
(no output — no runtime or test file changed)
```

The two `dependency-dag.*` files are generated, not authored; see *Validation*.

The packet's invariant, acceptance-criterion, and line counts are deliberately
not copied into this witness. They are derived properties of the packet and
already drifted during review; duplicating them here created a second source of
truth without adding evidence.

## Source Truth

Every claim the packet makes about the current tree was checked against the
tree, not against memory. Every cited source path resolves:

- `src/operations/repo-workspace.ts` — `fileOutline` calls `observe()` before
  `evaluateRefusal()`, which is why invariant 13 exists; the cache-hit branch
  returns `cacheHit` and `actual` that the cold path omits, which is why raw
  result equality is not the replay bar.
- `src/operations/file-outline.ts` — `FileOutlineResult` carries `partial` and
  `error` beyond the success fields, and has no `pending` or
  `outcome-unknown` variant, which is why the packet requires one.
- `src/operations/workspace-read-view.ts` — `SettledFile` requires
  `entryKind: "regular" | "symlink"` and enforces `symlinkPolicy: "refuse"`
  against it, which is why `entryKind` is in the canonical settlement contract.
- `src/adapters/colorful-cli-prose-projector.ts` — the projection calls
  `processRunner.run`, so replay that closes only the workspace observer is not
  closed-world.
- `src/operations/colorful-prose-projection.ts` — `ProseProjection` contains
  `format`, `partial`, `syntaxSpans`, `outline`, and `jumpTable`, and the
  Colorful consumer fixes both a contract version and vocabulary hash; these
  are the fields and producer identities retained by the settlement contract.
- `src/adapters/repo-paths.ts` — `fs.realpathSync.native` and `fs.lstatSync`
  run during path resolution that precedes `RepoWorkspace` construction, which
  is why pre-request handling must be lexical and separately counted.
- `src/mcp/workspace-router-resolution.ts` — routing performs two `rev-parse`
  calls and canonicalizes the returned roots, which bounds the identity reads
  exempted from the request-before-effect invariant.
- `src/mcp/workspace-router-runtime.ts` — runtime setup reads `.graftignore`
  and constructs the worktree-root path resolver before an operation exists,
  which completes that closed prerequisite-read exemption.
- `src/mcp/server-invocation.ts` — an explicit `cwd` is routed through
  workspace authorization and execution-context planning before the tool
  handler runs, which is why replay needs a pre-routing input posture.
- `src/mcp/receipt.ts` — the MCP boundary attaches per-call receipt metadata,
  which is why replay comparison occurs before the wrapper is attached.
- `src/contracts/output-schemas.ts` — the output schemas admit `_schema`,
  `_receipt`, and optional `_workspace` and `tripwire` wrapper fields rather
  than making them part of the retained operation payload.
- `src/mcp/tools/file-outline.ts` — the refusal variant carries `projection`,
  `reasonDetail`, and `next`.

## Validation

Documentation-only change. Per `AGENTS.md`, `git diff --check` and `pnpm lint`
are the appropriate gate for a docs cycle; the packet is a planning contract,
not an executable one.

```text
git diff --check dc619514..HEAD     clean
pnpm lint                           clean (eslint .)
```

The 258-file, 2,056-test result recorded earlier in this cycle is historical,
not final-head evidence. A current full-suite run belongs to the exact PR head
reported by CI and the activity summary; it is not promoted to a timeless fact
inside a file that can itself change afterwards.

**An earlier draft of this witness claimed the branch changed no file the suite
loads. That was false, and CI proved it.** Adding two backlog cards invalidated
`docs/method/backlog/dependency-dag.dot`, a checked-in artifact generated from
backlog frontmatter and pinned by
`test/unit/method/backlog-dependency-dag.test.ts`. `test (22)` failed on
`c93bea5e` with one assertion: the checked-in DOT no longer equalled the DOT
rendered from the active cards.

The artifact was regenerated through its owning script,
`scripts/generate-backlog-dependency-dag.ts` — 142 cards, 15 edges, one external
blocker — and no generated byte was hand-resolved. The two unresolved dependency
refs it reports are pre-existing and reference a card outside this cycle.

The lesson is recorded rather than quietly patched: in this repository
"documentation-only" is not a synonym for "cannot break the suite". Backlog
frontmatter is an input to a generated, test-pinned artifact, so a cycle that
files debt cards owes a regeneration and a full suite run — not the reduced
docs gate.

## Internal consistency

The round-four self-audit checked the packet against itself and repaired eight
defects in `c61023f8`. Re-checked after repair:

- every `src/**` citation resolves to an existing file;
- invariant numbers have no hole or repeat;
- every explicit invariant-number reference in prose names a defined invariant;
- every cross-reference ("see below", "defined below") resolves in the stated
  direction;
- no section asserts raw result equality while the named projection exists;
- the evidence block, the acceptance criteria, and the implementation boundary
  name the same set of counters.

## Review history

PR #245, three Codex rounds, sixteen findings, all verified against source
before repair and all answered on their own threads:

| round | head | findings |
|---|---|---|
| 1 | `24f2a975` | 3 (3×P1) |
| 2 | `b9caa721` | 7 (4×P1, 2×P2, 1×P3) |
| 3 | `f5793e5c` | 6 (4×P1, 2×P2) |

Totals: 16 findings — 11×P1, 4×P2, 1×P3.

CI was green on every head. CodeRabbit reviewed none of it — `.coderabbit.yaml`
excludes `**/*.md` and it posted a review-skipped notice. That gap was already
tracked as `CLEAN_coderabbit-path-filters-skip-method-docs.md` (open since
2026-06-01, issue #69); this cycle added the #245 recurrence to that card
rather than opening a second one.

A fourth round was not run before merge. It was performed after the fact as a
self-audit; its eight findings are the `c61023f8` repair recorded above.

## What this witness does not claim

The #228 hill is not met. No Edict source, settlement decoder, retained
composition, or replay path exists. No acceptance criterion in the packet is
executable yet — they remain unchecked by design, and the packet's own status
line reads "Implementation has not started."
