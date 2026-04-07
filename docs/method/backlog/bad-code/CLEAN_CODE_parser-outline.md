# outline extraction is a major hex-architecture hotspot

File: `src/parser/outline.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- SOLID 🔴

What is wrong:
- one file owns parser bootstrap, markdown heading extraction, tree-sitter traversal, symbol extraction, and jump-table generation
- parser setup still reaches into module-loading concerns directly

Desired end state:
- split parser bootstrap from per-language extraction
- isolate JS/TS and Markdown extraction strategies behind smaller units

Effort: L
