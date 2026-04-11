# Precision query policy is concentrated in one module

File: `src/mcp/tools/precision-query.ts`

Non-green SSJR pillars:
- SOLID 🟡

What is wrong:
- request normalization, query mode detection, ranking semantics, and
  result sort policy now live together in one module
- adding new match behavior will tend to accrete onto the same policy
  cluster

Desired end state:
- separate request validation from ranking and ordering policy so new
  match modes do not keep growing a single seam

Effort: S
