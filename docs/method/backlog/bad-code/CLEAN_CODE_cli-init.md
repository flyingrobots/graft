# CLI init command is still boundary-thin

File: `src/cli/init.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- init command parsing and rendering still rely on plain objects and manual flag checks
- scaffolding actions are typed structurally but not runtime-backed

Desired end state:
- typed CLI parse/result boundary
- stronger runtime-backed action/result shapes for init scaffolding

Effort: S
