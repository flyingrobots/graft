# git-files helper is an environment-heavy utility hotspot

File: `src/mcp/tools/git-files.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- helper shells out directly and returns lightly-shaped data
- environment concerns and file-list semantics are mixed together

Desired end state:
- isolate git file enumeration behind a clearer adapter seam
- strengthen returned artifact typing

Effort: M
