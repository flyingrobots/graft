# state operation is still structural-object based

File: `src/operations/state.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Behavior on type 🟡

What is wrong:
- persisted state artifacts are handled structurally rather than as runtime-backed domain objects

Desired end state:
- explicit runtime-backed state payload model

Effort: S
