# MCP code_find tool still mixes source selection and response shaping

File: `src/mcp/tools/code-find.ts`

Non-green SSJR pillars:
- SOLID 🟡

What is wrong:
- explicit request validation now exists, but the handler still owns
  WARP/live source selection, visibility filtering, and response
  shaping in one branchy flow

Desired end state:
- move search execution and visibility filtering behind smaller seams so
  the tool focuses on request translation and final response framing

Effort: S
