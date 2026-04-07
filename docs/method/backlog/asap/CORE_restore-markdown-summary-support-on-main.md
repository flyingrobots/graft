# CORE_restore-markdown-summary-support-on-main

## Why

Live MCP smoke testing on `main` shows a product-truth drift:

- `safe_read README.md` returns `projection: "outline"` with
  `reason: "UNSUPPORTED_LANGUAGE"`
- `changed_since README.md` returns `status: "unsupported"`
- `src/parser/lang.ts` does not currently recognize Markdown

But repo docs still claim Markdown heading summaries exist:

- `AGENTS.md`
- `docs/releases/v0.5.0.md`
- `docs/method/retro/0029-markdown-summary-support/retro.md`

That means the shipped branch either lost the implementation or kept
the narrative after the code failed to land.

## Hill

Either:

- restore first-class Markdown summary support on the bounded-read path,
  including heading outlines and jump-table ranges

or:

- correct the docs and release narrative so they stop claiming a feature
  that does not exist on `main`

The end state must make code and docs agree again.

## Notes

- This was discovered by live dogfooding through the Graft MCP service,
  not by static inspection alone.
- Treat this as product-truth drift, not just a parser enhancement.
