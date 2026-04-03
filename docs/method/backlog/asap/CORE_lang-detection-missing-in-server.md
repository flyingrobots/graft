# Language detection missing in MCP server paths

The safe_read diff path and changed_since tool call
`extractOutline(rawContent)` without specifying a language,
defaulting to TypeScript. If the file is `.js`, it gets parsed
as TS (which mostly works but isn't semantically correct).

`graft-diff.ts` has proper `detectLang()` but server.ts doesn't
use it. Should detect language from the file extension and pass
it to `extractOutline(rawContent, lang)`.

Affects: `src/mcp/server.ts` (safe_read diff path, changed_since)
