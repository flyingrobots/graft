---
title: "Export surface diff"
legend: "WARP"
cycle: "WARP_export-surface-diff"
source_backlog: "docs/method/backlog/up-next/WARP_export-surface-diff.md"
---

# Export surface diff

Source backlog item: `docs/method/backlog/up-next/WARP_export-surface-diff.md`
Legend: WARP

## Hill

An agent or human can answer "what changed in the public API
between these two git refs?" and get a precise list of added,
removed, and signature-changed exports with an automatic semver
impact classification. This is the API changelog generator and
breaking change detector.

This slice is complete when:

- `graft_exports` returns added, removed, and changed exported
  symbols between two refs
- Semver impact is derived: removed = major, added = minor,
  signature changed = patch, none = none
- The tool works by extracting outlines at both refs and
  comparing exported symbols
- Re-exports (`export { X } from './y'`) are handled by the
  parser's outline extraction
- `export default` is handled by the parser
- The summary gives a one-line API change overview

## Playback Questions

### Human

- [ ] Can I see what exports were added and removed between
      two releases?
- [ ] Does it tell me if a release is a breaking change
      (semver major)?
- [ ] Does it catch when a function's parameter types change?

### Agent

- [ ] Does `graft_exports` handle re-exports
      (`export { X } from './y'`)?
- [ ] Does it handle `export default`?
- [ ] When one export is removed (major) and one is added
      (minor), does semver classification correctly resolve to
      major?
- [ ] What happens with files that are added or deleted between
      refs (new file = all exports added, deleted file = all
      exports removed)?
- [ ] Does the outline parser handle all supported languages'
      export syntax?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - Three flat lists: added, removed, changed
  - Single semver verdict
  - Summary line with counts
- Non-visual or alternate-reading expectations:
  - JSON output is fully structured
  - Summary is plain text

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - Symbol names and file paths are repo-local
  - Semver terms (major/minor/patch) are standard English
- Logical direction / layout assumptions:
  - Changes grouped by type, not by file

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - The exact semver impact classification
  - The previous and new signatures for changed symbols
  - The file path for every change
- What must be attributable, evidenced, or governed:
  - Every change is traceable to a specific file and outline
    entry
  - Semver classification follows deterministic rules (removed
    > added > changed)

## Non-goals

- [ ] Generating a full CHANGELOG (this provides the data,
      not the prose)
- [ ] Detecting behavioral changes without signature changes
- [ ] Handling non-exported symbols (those are internal)
- [ ] Cross-package dependency analysis
- [ ] Recommending the next version number (just the impact
      level)

## Acceptance Criteria

1. `exportSurfaceDiff(opts)` returns `ExportSurfaceDiffResult`
   with `base`, `head`, `added[]`, `removed[]`, `changed[]`,
   `semverImpact`, `summary`
2. Each `ExportChange` has `symbol`, `filePath`, `kind`,
   `changeType`, `signature?`, `previousSignature?`
3. Semver rules: removed = major, added = minor, changed =
   patch, none = none; highest wins
4. Only exported symbols are compared
5. Files added between refs have all exports counted as "added"
6. Files deleted between refs have all exports counted as
   "removed"
7. MCP tool `graft_exports` exposes `base` and `head`
8. Summary format: "+N added, -N removed, ~N changed exported
   symbols. Semver impact: X."

## Gap Analysis

Comparing acceptance criteria against
`src/operations/export-surface-diff.ts` and
`src/mcp/tools/export-surface-diff.ts`:

- **PASS**: Criteria 1-4, 7-8 implemented as specified
- **PASS**: Semver derivation correctly applies highest-wins
  logic (removed > added > changed)
- **PASS**: Re-exports are handled — the parser's
  `extractOutline` handles `export { A, B } from './x'` and
  `export * from './x'` (confirmed in parser/outline.ts)
- **GAP: Deleted files may throw instead of returning null** —
  `getFileAtRef` for the head ref is wrapped in try/catch
  (returning null on error), but `getFileAtRef` for the base
  ref is NOT wrapped. If a file exists at head but not at base
  (new file), the base content call may throw. The base call
  uses `getFileAtRef(base, filePath, ...)` without try/catch.
  However, `getFileAtRef` may return null for missing files
  depending on its implementation. Needs verification. Filed
  as bad-code card.
- **GAP: Signature change classified as "patch" is
  questionable** — changing an exported function's parameter
  types is typically a major (breaking) change, not a patch.
  The `deriveSemverImpact` function classifies all signature
  changes as "patch", but narrowing a parameter type or adding
  a required parameter is breaking. This is a design-level
  concern — distinguishing additive vs breaking signature
  changes requires deeper analysis than string comparison.
  Filed as bad-code card.
- **PASS**: `export default` is handled through the parser's
  outline extraction which includes default exports

## Backlog Context

"What changed in the public API between two refs?"

Filter to exported symbols only, compare at two worldline positions.
Shows added exports, removed exports, and changed signatures.

API changelog generator. Breaking change detector. Pairs naturally
with semver: new exports = minor, removed = major, changed = check.

## Depends on

- WARP_symbol-reference-counting (for impact analysis)
- code_find (shipped)
- graft_diff (shipped)
