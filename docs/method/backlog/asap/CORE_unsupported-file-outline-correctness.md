# Unsupported files should not fabricate empty code outlines

`safe_read` and `file_outline` call `extractOutline(content)` without
first checking `detectLang(filePath)`. `extractOutline` defaults to
TypeScript, so large markdown and other unsupported text files can
return an empty `outline` / `jumpTable` as if a structural summary
actually happened.

That is the wrong failure mode. An unsupported file should degrade
lawfully, not masquerade as a successful code outline with no symbols.

Fix path:
- Gate outline extraction on `detectLang(path)`
- If unsupported, return an honest non-symbol result instead of
  defaulting to TS parsing
- Keep receipts/reason codes explicit so the agent knows no parser-backed
  structure was available

Affects: `src/operations/safe-read.ts`, `src/operations/file-outline.ts`,
`src/parser/lang.ts`
