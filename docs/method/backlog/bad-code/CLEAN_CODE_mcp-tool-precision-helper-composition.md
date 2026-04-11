# Precision helper still carries too many responsibilities

File: `src/mcp/tools/precision.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- SOLID 🟡

What is wrong:
- the shared precision helper still mixes repo path normalization, git
  ref resolution, historical file listing, content loading, live/WARP
  search execution, symbol collection, and range helpers

Desired end state:
- split the helper into smaller modules with clearer contracts for
  repo/ref utilities, symbol collection, precision execution, and
  content loading

Effort: M
