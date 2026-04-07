# CLI default mode violates least astonishment

Files:
- `bin/graft.js`
- `src/cli/main.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡

What is wrong:
- running `graft` with no subcommand starts an MCP stdio server instead
  of showing help
- this is correct for transport bootstrap but surprising for a human
  CLI surface

Desired end state:
- require an explicit `serve` or equivalent transport subcommand for
  stdio mode, or show help by default and keep bootstrap behavior
  explicit

Effort: S
