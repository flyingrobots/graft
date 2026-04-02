# graft diff — structural git diff

Diff two tree-sitter outlines (working tree vs HEAD, or any two
refs) and return structural changes instead of line hunks.

Output: "function `evaluatePolicy`: added parameter `sessionDepth`",
"class `SessionTracker`: added method `getMessageCount`",
"file `src/mcp/server.ts`: added".

Uses the existing outline extractor — no WARP needed. Proves the
structural diff primitive that the WARP worldline will need for
tick patches. Useful standalone as an MCP tool and CLI command.

Effort: M
