# Cycle 0029 — Markdown Summary Support

**Hill:** When an agent reads a large markdown file, Graft returns an
honest heading outline with section ranges instead of treating the file
as an unsupported blob.

**Outcome:** Met.

## What shipped

- Markdown is now a supported structured format for bounded read
  surfaces
- Heading outlines reuse the existing `OutlineEntry` / `JumpEntry`
  contract with `kind: "heading"`
- `safe_read` and `file_outline` return markdown heading outlines
  instead of `UNSUPPORTED_LANGUAGE`
- Heading hierarchy is preserved through nested `children`
- Jump-table ranges now map headings to the bounded sections they own
- Fenced code blocks are ignored during heading extraction
- Markdown outlines now participate in the normal MCP observation cache
- Code-only surfaces such as hooks, WARP indexing, `graft_diff`,
  `graft_map`, and precision tools remain code-language scoped; this
  cycle did not widen them to markdown

## Playback

- Agent: if I `safe_read` a large `README.md`, do I get a heading
  outline instead of `UNSUPPORTED_LANGUAGE`? **Yes.**
- Agent: if I call `file_outline` on markdown, do I get section
  structure with jump ranges? **Yes.**
- Agent: if the markdown file has nested headings, is hierarchy
  preserved? **Yes.**
- Agent: if the markdown file has no headings, do I get an honest empty
  markdown outline instead of an unsupported result? **Yes.**
- Agent: are heading-like lines inside fenced code blocks ignored?
  **Yes.**
- Operator: did this cycle reuse the current outline surface instead of
  inventing a second document-outline API? **Yes.**
- Operator: did this cycle avoid broadening into WARP document indexing
  or markdown-aware precision tools? **Yes.**

## Lessons

- Markdown support belongs on the bounded-read surface first. That is
  where the operator and agent value is highest.
- “Supported format” and “parser-backed code language” are different
  boundaries. Keeping them separate prevented accidental widening of
  WARP and other code-only surfaces.
- The existing outline/jump-table contract was already flexible enough
  for docs. The right move was to extend it with `heading`, not fork it.

## Follow-on work

- `docs/method/backlog/asap/CORE_policy-fidelity-audit-all-tools-and-cli.md`
- `docs/method/backlog/asap/CORE_versioned-json-output-schemas.md`
