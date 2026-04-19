---
title: "as unknown as casts in WARP adapter bridge"
legend: HT
lane: bad-code
---

# as unknown as casts in WARP adapter bridge

Source: anti-sludge audit 2026-04-19

Two `as unknown as` casts remain in the WARP adapter layer:
- `src/warp/open.ts:68` — `build(patch as unknown as WarpPatchBuilder)`
- `src/warp/indexer.ts:94` — `const patch = builder as unknown as PatchOps`

These bridge the untyped `@git-stunts/git-warp` patch builder API to our typed port interface. The upstream library doesn't export proper types for its patch builder.

Fix direction: add proper type declarations for the git-warp patch builder in `src/warp/plumbing.d.ts`, or contribute types upstream.

Effort: S
