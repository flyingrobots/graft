# read range operation is still interface-first

File: `src/operations/read-range.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Behavior on type 🟡

What is wrong:
- range result and failure states are plain objects with string reasons

Desired end state:
- explicit runtime-backed range result / error variants

Effort: S
