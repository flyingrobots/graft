# MCP code_refs tool is still orchestration-heavy

File: `src/mcp/tools/code-refs.ts`

Non-green SSJR pillars:
- SOLID 🟡

What is wrong:
- the tool currently owns request normalization, pattern building,
  engine fallback, preview filtering, policy filtering, and response
  assembly in one module

Desired end state:
- split text-fallback search execution and match filtering into smaller
  seams so the tool focuses on request translation and response
  contract

Effort: M
