# CLI index command is still boundary-thin

File: `src/cli/index-cmd.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- flag parsing is still hand-rolled
- result typing is still plain-object oriented instead of runtime-backed

Desired end state:
- move command parsing onto a typed CLI argument model
- promote structured CLI results from ad hoc objects to stronger runtime shapes

Effort: S
