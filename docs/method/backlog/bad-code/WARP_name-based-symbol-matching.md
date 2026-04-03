# Name-based symbol matching loses renames

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

Interim mitigation: none practical. Agents will see remove + add
for renames. The structural information is still more useful than
a line diff — they just lose the "this was a rename" signal.

Affects: `src/parser/diff.ts`, `diffOutlines()`
