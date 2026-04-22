---
title: Automatic breaking change detection
legend: WARP
lane: cool-ideas
effort: L
blocked_by:
  - WARP_dead-symbol-detection
  - CLEAN_CODE_export-diff-semver-signature-as-patch
requirements:
  - WARP Level 1 indexing (shipped)
  - graft_since structural diff (shipped)
  - Export surface diff (backlog)
  - Dead symbol detection (backlog)
acceptance_criteria:
  - Comparing two tags identifies removed exported symbols and changed exported signatures
  - Detected breaking changes auto-generate BREAKING CHANGE commit footer text
  - Semver bump suggestions are produced (major for removals/signature changes)
  - An API migration guide is generated from the structural delta without human annotation
  - Non-breaking additions (new exports, additive parameters) are not flagged as breaking
  - A test verifies that removing an exported function between two tags is detected as breaking
---

# Automatic breaking change detection

Compare export surfaces between two tags. Exported signature
changed? Exported symbol removed? That's a breaking change.

Auto-generate BREAKING CHANGE commit footers. Suggest semver
bumps. Produce API migration guides. All from the structural
delta, zero human annotation.

"v0.4.0 → v0.5.0: evaluatePolicy gained a required parameter.
This is a BREAKING CHANGE. Consumers must update call sites."

## Implementation path

1. Accept two git refs (tags, branches, SHAs) as input
2. Compute the export surface at each ref using `export-surface-diff`
   (requires the semver classification fix to distinguish breaking
   from non-breaking signature changes)
3. Diff the two surfaces: removed symbols, changed signatures,
   added symbols
4. Classify each change: removal → major, breaking signature change
   → major, additive → minor, non-structural → patch
5. For removed symbols, cross-reference `WARP_dead-symbol-detection`
   to confirm they are truly dead (not re-added under a different
   export path)
6. Generate structured output: list of breaking changes with symbol
   name, old signature, new signature, and nature of break
7. From the structured output, generate: BREAKING CHANGE footer
   text, semver bump suggestion, and a human-readable migration
   guide ("change call sites from X(a, b) to X(a, b, c)")

## Related cards

- **WARP_dead-symbol-detection** (blocked_by): Dead symbol
  detection identifies symbols removed and never re-added. This is
  the "removed symbol" primitive that breaking-change detection
  consumes. Without it, we can only detect signature changes, not
  removals. **Hard dependency.**
- **CLEAN_CODE_export-diff-semver-signature-as-patch** (blocked_by):
  The current export-surface-diff classifies all signature changes
  as "patch". Breaking-change detection needs accurate
  classification to distinguish additive changes from breaking ones.
  Without this fix, every signature change would either be missed or
  over-reported. **Hard dependency.**
- **WARP_semantic-merge-conflict-prediction**: Both analyze
  structural incompatibility, but on different axes. Breaking-change
  detection compares tags on a single branch; merge conflict
  prediction compares branches. Not a dependency — they share
  infrastructure (export-surface-diff) but have independent
  implementations.
- **WARP_structural-impact-prediction**: Impact prediction answers
  "what would break if I changed this?" while breaking-change
  detection answers "what DID break between these releases?" One is
  speculative, the other retrospective. Complementary, not dependent.

## Effort rationale

Large. The export surface comparison itself is medium complexity
(export-surface-diff exists), but: (a) generating accurate
migration guides from structural deltas requires understanding
parameter-level changes, not just "signature differs"; (b) handling
re-exports, re-names, and aliased symbols adds edge cases;
(c) the semver classification needs to be correct — false negatives
(missing a breaking change) are worse than false positives. The
accuracy bar makes this L, not M.
