# MCP `.graftignore` and policy-option parity

Hooks currently load `.graftignore`, but MCP surfaces do not. Unify the
policy option flow so MCP tools can pass the same `graftignorePatterns`
that hooks already use, alongside session depth and budget.

This is a bug fix, not a design exploration. Missing `.graftignore`
parity means the same file can be denied by hooks and allowed by MCP.

Target areas:

- `src/mcp/server.ts` middleware
- `src/operations/safe-read.ts`
- `src/mcp/tools/changed-since.ts`
- `src/mcp/tools/precision.ts`

Done when:

- the same file denied by `.graftignore` is denied consistently by
  hooks and MCP
- policy helpers stop hardcoding their own partial option sets
- tests cover `.graftignore`, session depth, and budget together
