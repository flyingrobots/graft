---
title: git graft enhance expanded git subcommands
feature: surface
kind: trunk
legend: SURFACE
lane: cool-ideas
requirements:
  - git graft enhance --since first slice
acceptance_criteria:
  - "Enhance supports intentionally selected git-adjacent subcommands beyond --since"
  - "Each subcommand has a bounded model and renderer"
  - "Human output and JSON output are both deterministic"
  - "Unsupported git commands fail with clear guidance instead of silently passing through"
blocked_by:
  - CORE_git-graft-enhance
---

# git graft enhance expanded git subcommands

Preserve the broader original enhancement vision after the first
`git graft enhance --since` release slice has proven the product shape.

Candidate future surfaces:

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

Each of these should be pulled as its own narrow cycle or grouped only
when the implementation model is genuinely shared. The goal is not to
wrap every Git command by default; the goal is to add structural
annotations where Graft already has truthful, bounded data.

## Non-goals

- No catch-all raw Git wrapper.
- No implementation without focused playback questions.
- No command that requires new WARP indexing semantics as hidden scope.
