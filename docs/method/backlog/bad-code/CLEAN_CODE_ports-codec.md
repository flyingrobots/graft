# codec port is too weakly specified at runtime

File: `src/ports/codec.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- the port is interface-only, so runtime guardrails depend on discipline rather than construction

Desired end state:
- tighten the codec port contract with stronger runtime expectations or guarded adapters

Effort: S
