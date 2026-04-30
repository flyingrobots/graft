---
title: "Offer rename as an explicit refactor surface"
feature: surface
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: L
requirements:
  - "Symbol identity and reference tracing (shipped — code_refs)"
  - "file_outline symbol extraction (shipped)"
  - "code_find for symbol search (shipped)"
  - "Confidence / ambiguity reporting (backlog)"
acceptance_criteria:
  - "A human or agent can request a rename assessment for a given symbol"
  - "The response includes a confidence rating, list of affected references, and a previewable edit plan"
  - "Ambiguous or low-confidence renames are flagged rather than silently applied"
  - "No file is modified without explicit user approval (preview-first contract)"
  - "Rename covers all reference sites found by code_refs, not just the definition"
  - "A test verifies that a rename with ambiguous references produces a warning rather than a silent edit"
---

# Offer rename as an explicit refactor surface

Graft should eventually be able to do more than explain symbol identity
or show references. When the evidence is strong enough, it should be
able to offer a rename operation as an explicit, inspectable refactor.

Hill:
- a human or agent can ask "should this be renamed?" or "rename this
  safely", and Graft can respond with a confidence-rated rename offer,
  affected references, and a previewable edit plan instead of a vague
  heuristic suggestion

Why separate from rename continuity:
- `WARP_symbol-identity-and-rename-continuity` is about ontology and
  historical continuity across changes
- this item is about the product surface: turning symbol identity,
  reference tracing, and policy boundaries into an explicit rename
  workflow

Needed first:
- stronger reference tracing than text fallback alone
- lawful confidence / ambiguity reporting
- a preview-first contract rather than silent edits

## Implementation path

1. Define a `rename_assess` tool schema: accepts symbol name + file path, returns confidence score, definition site, and all reference sites from `code_refs`
2. Build confidence scoring: high confidence when all references are structural (tree-sitter resolved), lower when some references are text-grep fallback
3. Generate edit plan: for each reference site, produce a preview diff showing old name → new name with surrounding context
4. Implement ambiguity flagging: when confidence is below threshold (e.g., dynamic dispatch, string interpolation, comments), flag those sites as "needs human review" rather than auto-including them
5. Add a `rename_apply` tool that accepts the edit plan and applies it only with explicit approval (preview-first contract)
6. Wire into the governed-write path if `SURFACE_governed-write-tools` is available, otherwise use a standalone approval flow
7. Add integration tests: rename with all-structural refs (high confidence), rename with text-fallback refs (ambiguity warning), rename of unexported symbol vs exported symbol

## Related cards

- **WARP_dead-symbol-detection**: Dead symbols are rename candidates (rename to nothing = removal). Complementary but independent — rename assessment does not require dead-symbol detection, and dead-symbol detection does not require rename.
- **WARP_structural-impact-prediction**: Impact prediction answers "what breaks if I change this signature?" — rename is a special case of signature change. Complementary. Impact prediction is a heavier tool (requires counterfactual refactoring and strands); rename assessment is narrower and can ship earlier using existing `code_refs`.
- **SURFACE_governed-write-tools** (v0.7.0): If governed writes ship, rename_apply should use them for the approval flow. Not a hard dependency — rename can implement its own preview-first contract.
- **WARP_auto-breaking-change-detection**: Renaming an exported symbol is a breaking change. The rename surface could consume breaking-change detection to warn about public API impact. Not a hard dependency.
- **WARP_lsp-enrichment** (post-v0.7.0): LSP data would dramatically improve reference accuracy and confidence scoring. Not a hard dependency — the card works with tree-sitter + text fallback — but LSP enrichment would be a force multiplier.

## No dependency edges

All shipped infrastructure (`code_refs`, `file_outline`, `code_find`) is sufficient for a useful first version. Confidence/ambiguity reporting is noted as a backlog prerequisite in the requirements, but it can be built inline as part of this card rather than requiring a separate card to ship first. No other card is blocked waiting for rename.

## Effort rationale

Large. The core rename assessment (confidence scoring + reference collection) is M, but the edit plan generation, ambiguity flagging with meaningful UX, preview-first contract, and the breadth of test scenarios (dynamic dispatch, string references, comments, re-exports) push this to L. Getting the false-positive/false-negative balance right for ambiguity detection is the hard part.
