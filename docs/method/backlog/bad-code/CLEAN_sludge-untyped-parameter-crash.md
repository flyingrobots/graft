---
title: "Sludge scan crashes on an untyped first parameter"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: S
status: active
reported: 2026-10-02
design: "docs/design/CLEAN_sludge-untyped-parameter-crash.md"
---

# Sludge scan crashes on an untyped first parameter

## Problem

`doctor --sludge` over the whole graft repository fails with
`Cannot read properties of undefined (reading 'text')` instead of returning a
report. Bisecting by path isolates one tracked file,
`docs/study/infra/generate-randomization.js`; `src`, `test`, and `scripts`
scan cleanly.

Reproduced against branch source:

```text
TypeError: Cannot read properties of undefined (reading 'text')
    at normalizedTypeName (src/operations/sludge-detector.ts:133)
    at firstParameterType (src/operations/sludge-detector.ts:153)
    at functionFact (src/operations/sludge-detector.ts:160)
```

`web-tree-sitter` 0.20.8 declares `childForFieldName()` as
`SyntaxNode | null` but returns `undefined` for an absent field. The detector
guards with `=== null`, so a parameter with no type annotation — every plain
JavaScript parameter — reaches `.text` on `undefined`.

## Risk

One file aborts the whole scan, and the raw TypeError is the tool result. The
scan silently depends on graft's own TypeScript happening to type every first
parameter.

## Desired Outcome

The detector treats an absent field as absent whether the binding returns
`null` or `undefined`, and a repository-wide sludge scan completes.
