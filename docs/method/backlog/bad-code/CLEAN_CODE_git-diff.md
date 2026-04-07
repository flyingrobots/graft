# git diff helper leaks shell concerns into a core seam

File: `src/git/diff.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- shell execution and git error shaping live in the same helper surface
- return values remain structurally typed rather than domain-backed

Desired end state:
- isolate git process interaction behind a clearer port/adapter seam
- return stronger runtime-backed git diff artifacts

Effort: M
