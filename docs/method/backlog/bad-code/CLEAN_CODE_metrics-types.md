# metrics types are still interface-only

File: `src/metrics/types.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- metrics entries are interfaces only
- the logger path accepts structural data without constructor-enforced invariants

Desired end state:
- runtime-backed metrics event type with constructor validation

Effort: S
