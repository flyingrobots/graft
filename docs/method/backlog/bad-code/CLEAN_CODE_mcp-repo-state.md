# Repo state tracker is a major environment-coupled hotspot

File: `src/mcp/repo-state.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🔴

What is wrong:
- one file owns git shelling, reflog parsing, dirty-state parsing, transition inference, and worldline observation shaping
- this mixes environment observation with semantic interpretation

Desired end state:
- isolate git observation capture from transition classification
- keep layered-worldline semantics separate from raw git process access

Effort: L
