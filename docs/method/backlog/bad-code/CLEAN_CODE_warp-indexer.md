# WARP indexer is a major architecture hotspot

File: `src/warp/indexer.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🔴

What is wrong:
- one file owns git commit traversal, file loading, parser extraction, diff patch construction, and WARP write orchestration
- shell/git interaction and structural patch logic are not cleanly separated

Desired end state:
- split commit enumeration, file-state loading, patch derivation, and graph-writing into smaller units
- promote key patch artifacts to stronger runtime-backed types

Effort: XL
