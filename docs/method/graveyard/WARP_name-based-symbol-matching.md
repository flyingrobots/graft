---
title: Name-based symbol matching loses renames
lane: graveyard
legend: WARP
---

# Name-based symbol matching loses renames

## Disposition

Retired as a symptom note because the real work is already captured by the `up-next` WARP direction for symbol identity and rename continuity.

Replacement: `docs/method/backlog/up-next/WARP_symbol-identity-and-rename-continuity.md`

## Original Proposal

diffOutlines matches symbols by name. If a function is renamed AND
its signature changes, the diff reports a spurious remove + add
instead of a single change. This is a fundamental limitation of
name-based matching — you need symbol identity to detect renames.

Example:
- Old: `export function processItem(x: Item): void`
- New: `export function handleItem(x: Item, opts: Options): void`
- Diff reports: removed `processItem`, added `handleItem`
- Should report: renamed `processItem` → `handleItem`, signature changed

Fix path: WARP Level 2+ symbol identity tracking. Symbols get
stable IDs that survive renames. The diff engine would match by
ID first, name second.

Follow-on design work:
- `docs/method/backlog/up-next/WARP_symbol-identity-and-rename-continuity.md`

Interim mitigation: none practical. Agents will see remove + add
for renames. The structural information is still more useful than
a line diff — they just lose the "this was a rename" signal.

Affects: `src/parser/diff.ts`, `diffOutlines()`
