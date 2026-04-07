# graft diff operation is a core orchestration hotspot

File: `src/operations/graft-diff.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🔴

What is wrong:
- one file owns git ref reads, status detection, refusal checks, parser dispatch, diffing, and summary generation
- node path handling still sits in core logic instead of a thinner seam
- results are still mostly structural objects

Desired end state:
- separate git content loading, policy/refusal filtering, parser diffing, and summary formatting
- keep the operation core free of path/environment glue

Effort: L
