---
title: "Wesley CLI hermetic structural-history check"
legend: CLEAN
cycle: CLEAN_wesley-cli-not-hermetic-in-graft-ci
source_backlog: "docs/method/backlog/bad-code/CLEAN_wesley-cli-not-hermetic-in-graft-ci.md"
---

# Wesley CLI hermetic structural-history check

Source backlog item: `docs/method/backlog/bad-code/CLEAN_wesley-cli-not-hermetic-in-graft-ci.md`
Legend: CLEAN

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

Graft's structural-history schema check proves that the checked-in TypeScript
artifact was emitted from `schemas/graft-structural-history.graphql` by the
pinned Wesley CLI, not hand-edited to match a manifest.

## Acceptance Criteria

- `pnpm schema:structural-history:check` requires a configured `WESLEY_BIN`.
- The check fails when the configured Wesley binary is missing.
- The check fails when the configured Wesley binary reports a version other
  than the manifest's `wesleyCliVersion`.
- The check regenerates `src/generated/graft-structural-history.ts` into a
  temporary path and compares it byte-for-byte with the committed artifact.
- The check verifies Wesley's L1 registry hash output against the manifest.
- CI installs a pinned Wesley CLI and runs the regenerate-and-diff check.
- Echo and Wesley semantics are not changed.

## Playback Questions

### Human

- [ ] Can I see which exact Wesley version CI used?
- [ ] Can I tell that generated TypeScript is derived from GraphQL rather than
      manually massaged?
- [ ] Can I run the check locally with `WESLEY_BIN=/path/to/wesley`?

### Agent

- [ ] Does the command fail loudly without `WESLEY_BIN`?
- [ ] Does a stale generated artifact fail even if the manifest hash is
      manually edited?
- [ ] Does a mismatched Wesley binary fail before artifact comparison?
- [ ] Does the static test surface remain usable without a real Wesley binary?

## Decision

The script keeps its pure static manifest/hash checks available as an exported
function for unit tests and fixtures. The command-line entry point is stricter:
it requires `WESLEY_BIN`, runs Wesley `version`, `schema hash`, and
`emit typescript`, then compares the regenerated output with the committed
artifact.

CI installs Wesley from the pinned `flyingrobots/wesley` commit that backs
release `v0.0.4`. The workflow caches the installed binary and exposes it to
the package script through `WESLEY_BIN`.

## Non-goals

- Do not alter the GraphQL schema.
- Do not alter generated TypeScript contents.
- Do not change Echo.
- Do not change Wesley compiler semantics.
- Do not make Graft depend on an unpublished npm wrapper.

## Expected Test Strategy

- Unit-test missing `WESLEY_BIN` behavior with a fixture workspace.
- Unit-test exact regenerated artifact comparison through a fake Wesley binary.
- Unit-test Wesley version mismatch behavior.
- Run the focused structural-history schema tests.
- Run `pnpm schema:structural-history:check` with a configured Wesley binary.
