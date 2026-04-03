# Cycle 0012 — Outline Quality Audit

**Legend**: CORE
**Branch**: cycle/0012-outline-quality-audit
**Status**: complete

## Goal

Prove outlines work on real-world code patterns. Find and fix the
gaps that matter most for agent navigation.

## What shipped

### Fixtures (7 files in `test/fixtures/audit/`)

1. `react-component.tsx` — arrow components, hooks, JSX, props
2. `express-router.ts` — 15 arrow handler exports, middleware
3. `re-exports.ts` — named, type, and wildcard re-exports
4. `god-class.ts` — 30+ methods: static, get/set, async, private
5. `mixed-declarations.ts` — interfaces, types, classes, enums, functions
6. `dense-code.ts` — long signatures, complex generics
7. `decorated-class.ts` — NestJS-style @Controller, @Get decorators

### Tests

40 assertions in `test/unit/parser/outline-audit.test.ts` covering:
- Symbol extraction completeness per fixture
- Jump table coverage and validity
- Signature informativeness
- Context budget (outline size)
- Error recovery (partial parse handling)

### Parser Fixes

1. **Arrow function exports** — `export const fn = () => {}` now gets
   `kind: "function"` with extracted parameter/return type signature
   instead of generic `kind: "export"`. Highest impact fix.
2. **Enum extraction** — `enum_declaration` mapped to new `kind: "enum"`.
   Added to OutlineEntry.kind union and export_statement handler.
3. **Re-export extraction** — Named re-exports (`export { A } from './x'`),
   type re-exports, and wildcard re-exports now appear in outlines.
   Barrel files are no longer invisible.

## Audit Findings

| Pattern | Result | Notes |
|---------|--------|-------|
| Arrow function exports | Fixed | Was biggest gap — now kind=function |
| Enums | Fixed | New kind: "enum" |
| Re-exports | Fixed | Barrel files now visible |
| JSX in TSX files | Partial parse, symbols recover | Acceptable |
| Complex generics | Partial parse, symbols recover | Acceptable |
| Decorators | Partial parse, symbols recover | Acceptable |
| God class (30+ methods) | All methods extracted | Including static, get/set |
| Long signatures | Properly truncated at 199 chars | Working |
| Dense single-line code | Jump table line ranges correct | Working |

## Deferred

- Decorator metadata extraction (classes/methods still parse fine)
- Namespace declarations (rare in modern TS)
- Class property fields (not navigable landmarks)
- Nested functions (internal detail)
- Configurable verbosity (feature design question)

## Metrics

- 6 commits, tests green after each
- 7 fixture files (496 lines of test data)
- 40 new test assertions (267 total, up from 227)
- 3 parser fixes shipped
- 0 test skips remaining
