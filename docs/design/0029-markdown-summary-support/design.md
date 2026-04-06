# Cycle 0029 — Markdown Summary Support

**Sponsor human:** Repository Operator
**Sponsor agent:** Reading Agent

## Premise

README files and docs are some of the highest-frequency reads an agent
makes when entering a repo.

Graft now degrades large markdown files honestly by returning
`UNSUPPORTED_LANGUAGE` instead of a fake code outline. That fixed the
lie, but it did not make docs useful.

Markdown has real structure:
- heading hierarchy
- bounded sections
- stable line ranges for follow-up reads

Graft should expose that structure directly.

## Hill

When an agent reads a large markdown file, Graft returns an honest
heading outline with section ranges instead of treating the file as an
unsupported blob.

## Playback questions

### Agent perspective

- If I `safe_read` a large `README.md`, do I get a heading-based outline
  instead of `UNSUPPORTED_LANGUAGE`? **Must be yes.**
- If I call `file_outline` on a markdown doc, do I get section
  structure with jump ranges that make `read_range` useful?
  **Must be yes.**
- If the markdown file has nested headings, does the outline preserve
  that hierarchy? **Must be yes.**
- If the markdown file has no headings, does Graft return an honest
  empty markdown outline instead of pretending the format is
  unsupported? **Must be yes.**
- If a heading-like line appears inside a fenced code block, does Graft
  avoid treating it as a real section heading? **Must be yes.**

### Operator perspective

- Does this cycle make markdown first-class without pretending all text
  formats are now supported? **Must be yes.**
- Does the surface reuse the current outline/jump-table contract rather
  than inventing a second document-outline API? **Must be yes.**
- Does this cycle avoid broadening into WARP document indexing or
  markdown-aware precision search? **Must be yes.**

## Non-goals

- YAML, JSON, prose, or generic text summarization
- `code_show` / `code_find` support for markdown headings
- WARP heading nodes or markdown history queries
- Rich markdown semantics beyond headings
  Examples: links, lists, tables, callouts
- Full MDX support

## Design

### Reuse the current outline shape

Markdown should reuse the existing `OutlineEntry` and `JumpEntry`
surface.

This cycle answers the backlog question directly:
- add a new `EntryKind` of `heading`
- use `children` to represent nested heading hierarchy
- use jump-table entries of kind `heading`

Do not introduce a separate document-outline variant.

The current outline surface is already the right product shape:
- bounded
- easy to diff
- already paired with `read_range`
- already understood by agents using Graft

### Markdown becomes a supported structured document format

Markdown should be treated as a supported structured format for
`safe_read` and `file_outline`.

This does **not** mean markdown becomes a JS/TS parser language.

The implementation should keep the distinction clear:
- JS/TS remain parser-backed code languages
- markdown uses a dedicated heading extractor

If the current `detectLang` naming becomes misleading, refactor the
boundary to describe supported structured formats more honestly.

### Heading extraction rules

Support honest, common markdown heading forms:
- ATX headings: `#` through `######`
- Setext headings using `===` and `---`

Ignore heading-like lines inside fenced code blocks.

For this cycle, a simple extractor is enough if it is:
- deterministic
- line-based
- honest about what it does not parse

### Section ranges

Jump-table entries should map a heading to the bounded section it owns:
- `start` is the heading line
- `end` is the line before the next heading of the same or higher level
- the final section ends at end-of-file

This is what makes `read_range` useful for docs.

### Files with no headings

A markdown file with no headings is still a supported markdown file.

That case should return:
- a normal markdown outline result
- `outline: []`
- `jumpTable: []`

It must not return `UNSUPPORTED_LANGUAGE`.

### Cache posture

Markdown outlines should participate in the normal observation cache.

This is now honest because the extractor is real, unlike the old
unsupported-file fallback path.

## Deliverables

1. RED tests for markdown heading extraction, hierarchy, fenced-block
   handling, empty-heading cases, and MCP surface behavior
2. Markdown structured-format detection
3. Heading extractor and section-range jump-table generation
4. `safe_read` / `file_outline` integration using the existing outline
   contract

## Effort

M
