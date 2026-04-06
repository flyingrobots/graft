# Cycle 0027 — Unsupported File Outline Correctness

**Hill:** When an unsupported file would otherwise take the outline
path, Graft returns an explicit parser-unsupported result instead of
pretending a real code outline happened.

**Outcome:** Met.

## What shipped

- `detectLang` now recognizes the broader JS/TS-family extensions that
  were previously relying on a TypeScript fallback:
  `.mts`, `.cts`, `.mjs`, `.cjs`
- Shared outline extraction now gates on supported languages instead of
  defaulting unsupported files to the TypeScript parser
- `safe_read` returns `reason: "UNSUPPORTED_LANGUAGE"` with empty
  outline data and explicit next steps when a large unsupported file
  hits the bounded-read path
- `file_outline` returns an explicit unsupported result instead of a
  silent empty success
- MCP cache paths no longer cache unsupported files as if they had real
  outlines
- RED coverage now exercises unsupported-file behavior across parser,
  operations, integration, MCP tool handling, and cache behavior
- `test/unit/mcp/tools.test.ts` now isolates `state_load` from local
  developer machine state by using a temporary cwd

## Playback

- Agent: if I `safe_read` a large markdown file, do I get an explicit
  signal that no parser-backed outline is available? **Yes.**
- Agent: if I call `file_outline` on markdown, does Graft avoid
  inventing symbol structure? **Yes.**
- Agent: if I reread the same unsupported file, does cache behavior
  preserve honesty? **Yes.**
- Agent: do supported JS/TS-family files like `.mjs`, `.cjs`, `.mts`,
  and `.cts` still outline correctly? **Yes.**
- Operator: does the fix preserve unsupported-lawful-degrade?
  **Yes.**
- Operator: does the fix avoid broadening this cycle into markdown
  summaries? **Yes.**

## Lessons

- “Empty outline” is only honest when the system can also say why it is
  empty. Without an explicit unsupported signal, an empty symbol layer
  reads like a successful parse.
- Cache paths are part of correctness, not just performance. The first
  honest answer can still decay into a later lie if cached metadata
  drops the unsupported context.
- The `.mjs` / `.cjs` / `.mts` / `.cts` coverage belonged in
  `detectLang`, not in accidental parser fallback.

## Follow-on work

- `docs/method/backlog/asap/CORE_markdown-summary-support.md`
- `docs/method/backlog/asap/CORE_policy-fidelity-audit-all-tools-and-cli.md`
- `docs/method/backlog/asap/CORE_test-isolation-and-sandbox-audit.md`
