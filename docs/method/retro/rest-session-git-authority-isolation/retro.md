---
title: "REST-session Git authority isolation retro"
---

# REST-session Git authority isolation retro

**Outcome:** Met for the identity and Docker authority boundaries.

## Hill

Starting the REST-session harness must never alter the operator's Git identity,
and its Docker witness must have no authority path back to the host repository.

## What changed

- removed the entrypoint and image-wide global Git identity writes
- made test-repository identity configuration explicitly repository-local
- retained test authorship only in process-scoped author and committer
  environment variables
- kept host `.git` metadata outside the Docker build context
- initialized a fresh repository from source copied into `/app`
- removed `origin` inside the image and made the build assert that no remotes
  remain
- added a live-container assertion that the REST-session service has no mounts

## Playback

- A subprocess sentinel proved the prior entrypoint overwrote an isolated
  global Git configuration. The repaired entrypoint leaves the exact bytes
  unchanged.
- The Docker E2E passed 4 of 4 tests. Its isolation witness observed an empty
  Docker mount list, `/app/.git` as the image-local Git directory, and an empty
  remote list.
- The external clone session still provisioned and served tools after the base
  image repository's remote was removed.
- The operator's global identity remained
  `James Ross <james@flyingrobots.dev>`, and `/Users/james/.gitconfig` retained
  its pre-run modification time of `2026-07-23 15:17:14 PDT`.

## Validation

- `bats test/e2e/rest-sessions/test.bats`: 4 passed, 0 failed
- focused identity and REST/helper tests: 42 passed, 0 failed
- `pnpm typecheck`: passed
- focused ESLint for changed TypeScript files: passed
- `git diff --check`: passed
- full `pnpm test`: 1,917 passed and 2 failed before regenerating the backlog
  DAG; the generated-DAG test passes after regeneration
- full `pnpm lint`: 43 pre-existing errors in unchanged REST-server files

## Drift and debt

- [REST API branch lint baseline](../../backlog/bad-code/CLEAN_rest-api-branch-lint-baseline.md)
- [REST server PathOps boundary bypass](../../backlog/bad-code/CLEAN_rest-server-bypasses-path-ops-boundary.md)

These branch-baseline failures remain outside this security repair. Neither
lint rules nor the PathOps allowlist were weakened.

## Publication

The requested branch push is the only publication step. No pull request is to
be opened.
