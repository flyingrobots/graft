---
title: "Cycle 0031 — MCP `.graftignore` Parity"
---

# Cycle 0031 — MCP `.graftignore` Parity

**Hill:** A file denied by `.graftignore` through hook-side policy is
also denied by the MCP bounded-read and precision surfaces, with the
same effective policy inputs flowing through each path.

## Why now

Cycle 0030 established that missing `.graftignore` on MCP is not a
style issue. It is a bug. Today hooks load `.graftignore`, but MCP
paths on `main` still do not, so the same file can be denied by hooks
and readable via MCP.

This slice fixes the shared option flow first. Structural multi-file
tools remain a follow-on cycle.

## Playback questions

1. Does `safe_read` refuse `.graftignore` matches the same way hooks
   do?
2. Does `read_range` middleware use the same `.graftignore`, session
   depth, and budget inputs as the rest of MCP?
3. Does `changed_since` pass the same policy options instead of its own
   reduced subset?
4. Do precision tools (`code_show`, `code_find`) respect
   `.graftignore`, including project-wide live search?
5. Have we removed the "each call site invents its own policy options"
   drift?

## Scope

In scope:

- shared MCP policy option flow
- `.graftignore` loading for MCP
- `safe_read`
- `file_outline`
- `read_range`
- `changed_since`
- precision policy helper paths used by `code_show` / `code_find`

Out of scope:

- structural multi-file tools (`graft_map`, `graft_diff`, `graft_since`)
- `run_capture`
- cross-surface parity matrix tests beyond this focused slice

## Design

Introduce a shared MCP policy helper that provides:

- repo-relative policy paths when a file is inside the project root
- pass-through absolute paths outside the repo for non-`.graftignore`
  bans
- `.graftignore` patterns loaded from `<projectRoot>/.graftignore`
- current session depth
- current budget remaining

All targeted MCP call sites should use that shared helper rather than
assembling partial option sets inline.

## Witnesses

- `.graftignore`-matched `safe_read` returns `projection: "refused"`
  with `reason: "GRAFTIGNORE"`
- `.graftignore`-matched `file_outline` returns
  `projection: "refused"` with `reason: "GRAFTIGNORE"`
- `.graftignore`-matched `read_range` is refused through middleware
- `.graftignore`-matched `changed_since` is refused instead of
  `no_previous_observation`
- `.graftignore`-matched `code_show` is refused
- project-wide `code_find` on only ignored matches does not silently
  return an empty result
