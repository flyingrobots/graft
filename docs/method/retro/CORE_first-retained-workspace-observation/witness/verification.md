---
title: "Verification Witness for First Retained Workspace Observation (design packet)"
---

# Verification Witness for First Retained Workspace Observation

This cycle produced a design packet and no runtime code. The witness therefore
records what a documentation cycle can actually prove: that the packet's claims
about the tree are true, that the packet does not contradict itself, and that
nothing executable changed.

Verified from branch commit `c61023f8`, with `dc619514` as the `main` baseline.

## Scope of change

```text
git diff --name-only dc619514..HEAD
docs/design/CORE_first-retained-workspace-observation.md

git diff --stat dc619514..HEAD -- src bin test tests
(no output — no runtime or test file changed)
```

The packet is 769 lines, declaring 15 invariants and 29 acceptance criteria.

## Source Truth

Every claim the packet makes about the current tree was checked against the
tree, not against memory. All eight cited paths resolve:

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
- `src/adapters/repo-paths.ts` — `fs.realpathSync.native` and `fs.lstatSync`
  run during path resolution that precedes `RepoWorkspace` construction, which
  is why pre-request handling must be lexical and separately counted.
- `src/mcp/receipt.ts` and `src/contracts/output-schemas.ts` — responses carry
  `_schema`, `_receipt`, and optionally `_workspace` and `tripwire`, which is
  why the replay comparison is taken on the decoded payload before the wrapper
  is attached.
- `src/mcp/tools/file-outline.ts` — the refusal variant carries `projection`,
  `reasonDetail`, and `next`.

Policy names the packet relies on also exist: `graftignorePatterns` is loaded
per workspace (`src/mcp/workspace-router-runtime.ts`) and `evaluateRefusal` is
the refusal path in `src/operations/repo-workspace.ts`.

## Validation

Documentation-only change. Per `AGENTS.md`, `git diff --check` and `pnpm lint`
are the appropriate gate for a docs cycle; the packet is a planning contract,
not an executable one.

```text
git diff --check dc619514..HEAD     clean
pnpm lint                           clean (eslint .)
```

The full suite was last run green on the `main` baseline `dc619514` — 258 test
files, 2056 tests — and this branch changes no file that suite loads.

## Internal consistency

The round-four self-audit checked the packet against itself and repaired eight
defects in `c61023f8`. Re-checked after repair:

- every `src/**` citation resolves to an existing file;
- invariants are numbered 1–15 with no hole or repeat;
- every invariant reference in prose (4, 9, 10, 12) names a defined invariant;
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
excludes `**/*.md` and it posted a review-skipped notice. That gap is filed as
`CLEAN_design-packets-receive-no-automated-review.md`.

A fourth round was not run before merge. It was performed after the fact as a
self-audit; its eight findings are the `c61023f8` repair recorded above.

## What this witness does not claim

The #228 hill is not met. No Edict source, settlement decoder, retained
composition, or replay path exists. No acceptance criterion in the packet is
executable yet — all 29 are unchecked by design, and the packet's own status
line reads "Implementation has not started."
