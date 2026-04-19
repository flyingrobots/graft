---
title: "Zero-noise code review"
legend: "WARP"
cycle: "WARP_zero-noise-code-review"
source_backlog: "docs/method/backlog/up-next/WARP_zero-noise-code-review.md"
---

# Zero-noise code review

Source backlog item: `docs/method/backlog/up-next/WARP_zero-noise-code-review.md`
Legend: WARP

## Hill

A reviewer (agent or human) facing a 50-file, 2000-line PR can
instantly see: "3 functions added, 2 signatures changed, 1
export removed. The other 47 files are formatting. Zero
structural changes." Review attention is focused on the files
that actually matter structurally. No other tool can do this.

This slice is complete when the `graft_review` tool (documented
in `SURFACE_structural-review.md`) is available and delivers
the zero-noise experience described above.

**Relationship to SURFACE_structural-review**: This design doc
describes the user-facing *outcome* — the zero-noise review
experience. `SURFACE_structural-review` describes the *tool*
(`graft_review`) that delivers it. They are the same feature
viewed from two angles: this doc owns the "why" and the
experience-level acceptance; that doc owns the "how" and the
implementation-level acceptance.

## Playback Questions

### Human

- [ ] When I run graft_review on a large PR, do I immediately
      know which files need careful review vs which are noise?
- [ ] Does the review catch when someone silently removes a
      public API export?
- [ ] Can I trust the "formatting" label — does it really mean
      zero structural changes?

### Agent

- [ ] Does `graft_review` separate signal from noise at the
      file level (structural vs formatting vs test vs docs
      vs config)?
- [ ] Does the breaking change detection include impact counts
      (how many files depend on the broken symbol)?
- [ ] Is the summary sufficient for an agent to decide where
      to focus a detailed code review?
- [ ] Does the tool handle PRs with only formatting changes
      (zero structural files) correctly?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - The summary is the entire review in one sentence
  - Category counts tell the story before file-level details
  - Breaking changes are called out with explicit warnings
- Non-visual or alternate-reading expectations:
  - Summary uses plain text with simple counts
  - No reliance on color, icons, or spatial layout

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - English labels for categories and change types
  - File paths are repo-relative
- Logical direction / layout assumptions:
  - Summary first, then details — inverted pyramid

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - Every file has exactly one category
  - Breaking changes are exhaustively enumerated
  - The summary is machine-parseable (counts are explicit)
- What must be attributable, evidenced, or governed:
  - "Formatting" classification is based on outline diffing,
    not heuristics — a file is formatting only when the parser
    confirms zero symbol-level changes
  - Impact counts are based on actual file-system search

## Non-goals

- [ ] Replacing human judgment on code quality
- [ ] Providing a pass/fail verdict on the PR
- [ ] Reviewing test coverage or test quality
- [ ] Handling non-code files (images, binaries) meaningfully
- [ ] Suggesting improvements or rewrites

## Acceptance Criteria

1. `graft_review` is the single entry point for zero-noise
   review (no separate tool needed)
2. Every changed file in the PR is categorized as one of:
   structural, formatting, test, docs, config
3. The number of structural files is always <= the total
   changed files (the "noise ratio" is visible)
4. Breaking changes are flagged with symbol name, change type,
   and impact count
5. A PR with only formatting/test/docs/config changes produces
   a summary confirming "zero structural changes"
6. The experience works for any base..head range

## Gap Analysis

This feature is delivered by `graft_review`
(`src/operations/structural-review.ts`). All implementation
gaps are documented in `SURFACE_structural-review.md`. The
key experience-level gaps are:

- **GAP: False breaking change reports on non-exported
  symbols** — the breaking change detector does not filter by
  the `exported` flag, so removing a private helper function
  triggers a breaking change warning. This directly undermines
  the "zero noise" promise. See SURFACE_structural-review gap
  analysis.
- **GAP: Renamed files produce false breaking changes** — a
  file rename appears as a full removal + full addition,
  generating spurious breaking change warnings for every
  symbol in the renamed file. This is noise, not signal. See
  SURFACE_structural-review gap analysis.
- **PASS**: The categorization of formatting-only files works
  correctly — any file in the diff with zero symbol-level
  changes is correctly labeled "formatting"
- **PASS**: The summary format clearly shows the structural
  vs noise breakdown

## Backlog Context

"This PR changes 50 files and 2000 lines."

With WARP: "3 functions added, 2 signatures changed, 1 class
removed. The other 47 files are formatting. Zero structural
changes."

Separate signal from noise at the PR level. Focus reviewer
attention on the files that actually matter structurally. No
other tool can do this.

Depends on: WARP Level 1 (shipped), graft_since (shipped),
PR review structural summary (backlog).
