---
title: "Retro 0029 — Markdown Summary Support"
---

# Retro 0029 — Markdown Summary Support

**Status:** Met

## What shipped

Markdown became a first-class structured document format on the bounded
read surfaces.

The cycle shipped:

- `.md` detection in the parser language boundary
- heading-based outlines with nested hierarchy
- section-range jump tables that make `read_range` useful for docs
- fenced-code-block exclusion so fake headings inside code do not leak
  into the outline
- honest empty outlines for heading-less Markdown
- markdown outline caching on the MCP bounded-read path

This landed on:

- `safe_read`
- `file_outline`
- the MCP cache path those tools share

It did not widen WARP, precision tools, structural git-history tools,
or hook behavior beyond the bounded read/document-summary surface.

## Why this matters

README files and docs are some of the first things agents read in a
repo. Before this cycle, Graft could only degrade honestly on Markdown.
After this cycle, it can summarize Markdown structure intentionally.

That makes docs a first-class bounded-read target instead of a lawful
but second-class exception.

## What remains

Still open beyond this cycle:

- broader non-code document support outside Markdown
- any future document-aware precision or structural-history tools
- versioned JSON schemas for the now-expanded document summary surface

## Evidence

- commit `4c84611` `feat: add markdown summary support`
- verification at ship time: `pnpm test`, `pnpm lint`, `pnpm typecheck`
