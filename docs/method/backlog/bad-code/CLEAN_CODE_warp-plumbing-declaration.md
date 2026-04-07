# WARP plumbing declaration is weakly aligned with runtime truth

File: `src/warp/plumbing.d.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- local declaration shim is a necessary escape hatch, but it is only a compile-time story
- drift risk exists between declared shape and actual package runtime

Desired end state:
- remove or minimize local declaration shim debt
- keep the adapter contract aligned with the real dependency surface

Effort: S
