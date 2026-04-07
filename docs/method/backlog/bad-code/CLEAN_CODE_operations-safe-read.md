# safe read operation still leans on plain object projections

File: `src/operations/safe-read.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Behavior on type 🟡

What is wrong:
- operation projection results are still object/tag based instead of runtime-backed variants
- this is one of the product’s most important paths and deserves stronger runtime truth

Desired end state:
- move safe-read outputs toward runtime-backed projection types

Effort: M
