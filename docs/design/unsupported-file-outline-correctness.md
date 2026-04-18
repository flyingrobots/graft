---
title: "Cycle 0027 — Unsupported File Outline Correctness"
---

# Cycle 0027 — Unsupported File Outline Correctness

**Sponsor human:** Repository Operator
**Sponsor agent:** Implementation Agent

## Premise

`safe_read` and `file_outline` currently call `extractOutline(content)`
without first proving the file has a supported parser-backed language.
Because outline extraction defaults to TypeScript, large markdown and
other unsupported text files can come back looking like a successful
empty code outline.

That is the wrong failure mode.

Graft is allowed to degrade. It is not allowed to fabricate.

This cycle makes unsupported files degrade lawfully:
- no fake symbol extraction
- explicit unsupported-language signaling
- no cache path that turns the first honest answer into a later lie

## Hill

When an unsupported file would otherwise take the outline path, Graft
returns an explicit parser-unsupported result instead of pretending a
real code outline happened.

## Playback questions

### Agent perspective

- If I `safe_read` a large markdown file, do I get an explicit signal
  that no parser-backed outline is available? **Must be yes.**
- If I call `file_outline` on markdown or YAML, does Graft avoid
  inventing symbol structure? **Must be yes.**
- If I reread the same unsupported file, does cache behavior preserve
  honesty instead of collapsing back to a fake empty outline?
  **Must be yes.**
- Do supported JS/TS-family files like `.mjs`, `.cjs`, `.mts`, and
  `.cts` still outline correctly? **Must be yes.**

### Operator perspective

- Does the fix preserve the invariant that unsupported files may have
  file-layer truth but not fabricated symbol-layer truth?
  **Must be yes.**
- Does the fix avoid broadening this cycle into markdown summarization?
  **Must be yes.**

## Non-goals

- First-class markdown heading summaries
- Broader document-structure support for YAML, JSON, or prose
- New WARP document nodes or document-specific observers
- A full policy-fidelity audit for every tool

## Design

### Supported-language gate

Outline extraction must always be gated on language detection.

If `detectLang(path)` returns `null`, Graft must not call the JS/TS
tree-sitter parser for symbol extraction.

### Honest unsupported result

For `safe_read` on the outline path:
- keep `projection: "outline"` so the bounded-read contract holds
- return `reason: "UNSUPPORTED_LANGUAGE"`
- return `outline: []` and `jumpTable: []`
- include next-step guidance that no parser-backed structure is
  available

For `file_outline`:
- return `outline: []` and `jumpTable: []`
- return an explicit unsupported error message instead of a silent empty
  success

### Cache posture

Unsupported files must not be cached as if they had a real outline.

Otherwise the first honest answer would degrade into a later
`cache_hit` or `cacheHit` response with an unexplained empty outline.

### JS/TS-family extensions

The fix must not regress files that are actually supported by the
existing parser posture but were only working through a TypeScript
fallback.

At minimum:
- `.ts`
- `.tsx`
- `.mts`
- `.cts`
- `.js`
- `.jsx`
- `.mjs`
- `.cjs`

## Deliverables

1. RED tests covering unsupported-file outline behavior across
   operations and MCP
2. Supported-language gate for outline extraction
3. Explicit unsupported result for bounded reads and file outlines
4. Cache behavior that preserves unsupported-file honesty

## Effort

S
