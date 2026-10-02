---
title: "Sludge scan survives untyped parameters"
legend: "CLEAN"
cycle: "CLEAN_sludge-untyped-parameter-crash"
source_backlog: "docs/method/backlog/bad-code/CLEAN_sludge-untyped-parameter-crash.md"
---

# Sludge scan survives untyped parameters

Source backlog item: `docs/method/backlog/bad-code/CLEAN_sludge-untyped-parameter-crash.md`
Legend: CLEAN

## Hill

`doctor --sludge` run against the whole graft repository returns a report.
A JavaScript or TypeScript function whose first parameter has no type
annotation is analyzed like any other function, not fatal to the scan.

## Evidence

- Whole-repo `doctor sludge=true` fails with
  `Cannot read properties of undefined (reading 'text')`.
- Path bisection: `src`, `test`, `scripts`, `docs/design`, `docs/method`, and
  `docs/study/tasks` complete; `docs/study/infra/generate-randomization.js`
  alone reproduces the failure.
- `file_outline` on the same file succeeds, so the outline extractor is not
  involved; the failure is in the detector's own tree walk.
- Stack against branch source ends in `normalizedTypeName`
  (`src/operations/sludge-detector.ts:133`), called from `firstParameterType`.
- `web-tree-sitter` 0.20.8 types `childForFieldName()` as `SyntaxNode | null`
  but returns `undefined` for an absent field.

Three detector sites compare a `childForFieldName()` result to `null`
directly:

1. `normalizedTypeName` — a parameter with no `type` field (the observed crash).
2. `declarationFunctionFacts` — a declarator with no `value`, e.g. `let x;`,
   then reads `value.type`.
3. `isPlainObjectExpression` — receives the `body` field result. Functions the
   detector visits always carry a body, so this site is not known to be
   reachable with `undefined`; it is normalized for consistency, not because a
   crash was observed.

## Playback Questions

### Agent

- [ ] Does analyzing a JavaScript file whose functions take untyped parameters
      return a report instead of throwing?
- [ ] Does an untyped TypeScript first parameter count as "no project type",
      so it raises no `free_function_data_behavior` signal?
- [ ] Does a top-level `let x;` with no initializer analyze without throwing?
- [ ] Does `detectSludge` over a set containing such a file finish and count
      it as scanned?

### Human

- [ ] Does `doctor --sludge` on the graft repository return a report?

## Non-goals

- [ ] Isolating per-file analysis failures inside `detectSludge`. Reporting a
      skipped file needs a new field in the sludge report schema; that is a
      contract change with its own card.
- [ ] Auditing every `childForFieldName()` null comparison outside the
      detector. Other sites compare with `!== null` and misbehave silently
      rather than crash; they get their own card.
- [ ] Making the sludge detector enforce the anti-sludge policy rules.

## Acceptance Criteria

1. `analyzeSludgeFile` returns a report for a JavaScript source whose
   top-level function takes an untyped first parameter.
2. An untyped first parameter yields no `free_function_data_behavior` signal
   for that function.
3. `analyzeSludgeFile` returns a report for a source containing a top-level
   declarator with no initializer.
4. Each detector site treats an absent field as absent whether the binding
   returns `null` or `undefined`.
5. `doctor --sludge` over the graft repository completes (manual playback
   evidence, recorded in the retro).

## Test Strategy

RED: add unit cases to `test/unit/operations/sludge-detector.test.ts` that
feed real parser-backed sources — an untyped JavaScript function, an untyped
TypeScript function, and a bare `let x;` — through `analyzeSludgeFile`, plus a
`detectSludge` case that includes the JavaScript file. They assert returned
reports, scanned counts, and signal kinds, not error strings. Each case must
fail on current `main` with the observed TypeError.

GREEN: normalize the absent-field result once in the detector and use it at
the three sites.

Validation: the focused unit file, `pnpm typecheck`, `pnpm lint`,
`git diff --check`, and a whole-repo `doctor --sludge` run from the built CLI.
