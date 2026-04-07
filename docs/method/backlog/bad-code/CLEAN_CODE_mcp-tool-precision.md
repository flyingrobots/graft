# Precision shared helper is accumulating cross-cutting concerns

File: `src/mcp/tools/precision.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- one helper now spans git content access, WARP reads, live parsing, path handling, policy checks, and precision match shaping

Desired end state:
- split precision retrieval into smaller strategy-focused units
- strengthen match/result types beyond structural objects

Effort: M
