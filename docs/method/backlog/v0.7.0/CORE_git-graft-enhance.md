---
title: git graft enhance --since first slice
feature: surface
kind: leaf
legend: CORE
lane: v0.7.0
requirements:
  - git-graft binary alias exists (shipped)
  - graft_since structural diff surface exists (shipped)
  - graft_exports export surface diff exists (shipped)
  - provenance-backed structural blame exists (shipped)
acceptance_criteria:
  - "git graft enhance --since <ref> [--head <ref>] [--json] exists as the release-facing first slice"
  - "The command composes existing structural diff and export surface truth without adding new WARP indexing semantics"
  - "Human output is concise and review-oriented by default"
  - "JSON output is schema-validated and stable for automation"
  - "Direct graft invocation is documented only as the same binary path behind the git-graft alias, not as a separate product surface"
---

# git graft enhance --since first slice

## Scope-check verdict

Classification: too broad and should be narrowed before implementation.

The original card described a broad product surface:

- `git graft enhance log`
- `git graft enhance diff`
- `git graft enhance show`
- `git graft enhance blame`
- `git graft enhance shortlog`
- `git graft enhance stash`
- `git graft enhance cherry-pick`
- `git graft enhance merge`
- `git graft enhance branch`
- `git graft enhance tag`
- `git graft enhance bisect`

That is not one v0.7.0 cycle. The repo already has strong structural
building blocks, but there is no dedicated `enhance` parser, command
model, renderer, output schema, or docs surface. The first release slice
should prove the product shape with one useful command and no new WARP
semantics.

## Existing truth

Already shipped:

- `git-graft` is a package binary alias for the same CLI entrypoint as
  `graft`, so `git graft ...` is a viable Git external-command flow once
  installed.
- `graft struct since <base-ref> [--head <ref>] [--json]` maps to the
  `graft_since` MCP tool and returns structural diff facts.
- `graft struct exports [<base-ref> <head-ref>] [--json]` maps to
  `graft_exports` and returns public API changes plus semver impact.
- `graft symbol blame <symbol> [--path <path>] [--json]` maps to
  provenance-backed structural blame.
- `graft symbol find <query> [--kind <kind>] [--path <path>] [--json]`
  maps to `code_find`.

Not yet real:

- No `enhance` CLI command or parser branch.
- No `graft git` command group.
- No `git graft enhance` docs.
- No dedicated enhance model, renderer, schema, tests, or playback.
- No interleaving of raw Git output with structural annotations.

## Narrowed command

Primary product surface:

```bash
git graft enhance --since <ref> [--head <ref>] [--json]
```

Implementation may parse the same top-level `enhance` command through
the shared `graft` / `git-graft` binary, but docs should present
`git graft enhance` as the release-facing surface. Do not add a parallel
`graft git enhance` command group in this slice.

## First-slice behavior

The command should build a deterministic model from existing peer
surfaces:

- `graft_since` for structural diff summary and per-file structural
  changes
- `graft_exports` for public API changes and semver impact

Human output should answer:

- what ref range was inspected
- how many files had structural changes
- total added / removed / changed symbols
- whether public exports changed
- the derived semver impact
- the top changed files by structural count

JSON output should expose the same model with schema metadata. It should
not require scraping the human text.

## Explicit non-goals

- No implementation of `log`, `diff`, `show`, `blame`, `shortlog`,
  `stash`, `cherry-pick`, `merge`, `branch`, `tag`, or `bisect`
  enhancement subcommands.
- No new WARP indexing semantics.
- No LSP enrichment.
- No governed write/edit work.
- No raw `git` command execution wrapper that interleaves arbitrary Git
  output.
- No per-symbol blame fanout in this first slice.
- No `code_find` reference expansion in this first slice.
- No live-checkout playback. Tests and playback must use temp repos or
  static source inspection only.

## Acceptance diff from original card

Removed from this v0.7.0 slice:

- wrapping arbitrary git commands
- supporting the full subcommand suite
- interleaving structural annotations into native Git output
- provenance hints for every touched symbol
- reference expansion through `code_find`

Kept for this v0.7.0 slice:

- the `git graft enhance` user-facing concept
- human output by default
- JSON output for automation
- composition of already-shipped structural surfaces
- no new WARP behavior

## Follow-up cards

Deferred scope is preserved in:

- `docs/method/backlog/cool-ideas/SURFACE_git-graft-enhance-provenance-hints.md`
- `docs/method/backlog/cool-ideas/SURFACE_git-graft-enhance-expanded-git-subcommands.md`

## Proceed recommendation

Implementation should proceed next only if the first slice stays limited
to `git graft enhance --since <ref> [--head <ref>] [--json]`.

If the next cycle starts to include arbitrary Git command wrapping,
per-symbol blame fanout, reference expansion, or interactive workflow
advice, stop and split again.
