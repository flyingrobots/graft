---
title: "export-surface-diff classifies all signature changes as patch (may be breaking)"
legend: CLEAN_CODE
lane: bad-code
---

# export-surface-diff classifies all signature changes as patch (may be breaking)

Source: design review exercise 2026-04-19

`deriveSemverImpact` in `src/operations/export-surface-diff.ts` classifies all signature changes as "patch". However, many signature changes are breaking: adding a required parameter, narrowing a return type, removing an optional parameter, or changing parameter types.

Without deeper analysis (parsing parameter lists, comparing type compatibility), the tool cannot distinguish additive signature changes (patch/minor) from breaking ones (major). The current "patch" classification gives false confidence that a release is non-breaking.

Fix options (in order of pragmatism):
1. Change default to "major" for signature changes (conservative but noisy)
2. Heuristic: if the signature string is shorter, assume removal = major
3. Parse parameter lists and compare arity/types (complex, language-specific)

Affected files:
- `src/operations/export-surface-diff.ts` lines 64-73

Effort: M
