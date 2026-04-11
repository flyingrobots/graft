# MCP code_show tool is still request-light

File: `src/mcp/tools/code-show.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- precision show flow still bridges from validated input to loose request state quickly
- the handler still owns ref resolution, live/WARP fallback, visibility filtering, ambiguity handling, and final response shaping

Desired end state:
- runtime-backed request/result seam for symbol focus reads
- split resolution, filtering, and response assembly into smaller strategy seams

Effort: S
