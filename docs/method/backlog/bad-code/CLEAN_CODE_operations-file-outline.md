# file outline operation still returns plain structural objects

File: `src/operations/file-outline.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Behavior on type 🟡

What is wrong:
- operation outputs are interface-shaped rather than runtime-backed
- lawful degrade is correct, but the result model is still weakly structural

Desired end state:
- promote operation results to runtime-backed output types

Effort: S
