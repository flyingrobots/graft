# language detection still mixes core logic with node path details

File: `src/parser/lang.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- parser language selection still depends directly on `node:path`
- supported language identity is still light-weight string typing

Desired end state:
- keep extension normalization minimal and environment-agnostic
- strengthen supported-language identity beyond loose strings

Effort: S
