# filesystem port is still interface-only

File: `src/ports/filesystem.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- the most important environment seam remains interface-only
- runtime boundary guarantees rely on adapters and caller discipline rather than the port itself

Desired end state:
- strengthen port boundary guarantees with runtime guards and clearer bounded-artifact expectations

Effort: S
