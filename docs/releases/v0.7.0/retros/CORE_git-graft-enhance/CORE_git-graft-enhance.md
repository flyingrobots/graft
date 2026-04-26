---
title: "git graft enhance --since first slice"
cycle: "CORE_git-graft-enhance"
release: "v0.7.0"
design_doc: "docs/releases/v0.7.0/design/CORE_git-graft-enhance.md"
outcome: hill-met
drift_check: yes
---

# git graft enhance --since first slice Retro

## Summary

Hill met. Shipped the narrow git graft enhance first slice as a CLI-only aggregator: `git-graft enhance --since <ref> [--head <ref>] [--json]` and the Git external-command form route through the shared top-level enhance parser, compose existing `graft_since` and `graft_exports` facts, render deterministic human output, and emit schema-validated JSON. Playback used a throwaway git repo and scrubbed Git environment variables; the live checkout was not used as subject data. No new WARP indexing semantics, arbitrary Git wrapping, provenance hints, per-symbol blame fanout, code_find expansion, governed writes, or LSP work were added. Backlog DAG regenerated after removing the completed slice as an active blocker from the two future enhance idea cards.

## Playback Witness

Artifacts under `docs/releases/v0.7.0/retros/CORE_git-graft-enhance/witness`.

## Temp-Repo Playback

Playback was performed against a throwaway git repo with `GIT_DIR`,
`GIT_WORK_TREE`, and `GIT_WARP_HOME` scrubbed. The live checkout was not
used as subject data.

```text
$ git-graft enhance --since HEAD~1
Git Graft Enhance
range: HEAD~1..HEAD

Structural
files: 1
symbols: +1 -0 ~1

Exports
exports: changed
semver impact: minor
export symbols: +1 -0 ~1

Top files
- api.ts (modified, 2): api.ts | modified | +1 added, ~1 changed

$ git-graft enhance --since HEAD~1 --json
{"_schema":{"id":"graft.cli.git_graft_enhance","version":"1.0.0"},"exports":{"addedExports":1,"changed":true,"changedExports":1,"removedExports":0,"semverImpact":"minor"},"range":{"head":"HEAD","since":"HEAD~1"},"structural":{"addedSymbols":1,"changedFiles":1,"changedSymbols":1,"removedSymbols":0,"topFilesByChangeCount":[{"changeCount":2,"path":"api.ts","status":"modified","summary":"api.ts | modified | +1 added, ~1 changed"}]},"warnings":[]}
```

## Non-Goals Confirmed

- No new WARP indexing semantics.
- No arbitrary Git command wrapping.
- No provenance hints or per-symbol blame fanout.
- No `code_find` reference expansion.
- No governed write/edit work.
- No LSP enrichment.
- No playback used the live checkout as subject data.

## Verification

- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_WARP_HOME pnpm exec vitest run test/unit/cli/command-parser.test.ts test/unit/cli/git-graft-enhance-model.test.ts test/unit/cli/git-graft-enhance-render.test.ts test/integration/cli/git-graft-enhance-cli.test.ts tests/playback/CORE_git-graft-enhance.test.ts`
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_WARP_HOME pnpm exec vitest run test/unit/contracts/output-schemas.test.ts test/unit/contracts/capabilities.test.ts test/unit/release/three-surface-capability-posture.test.ts tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts`
- `pnpm exec tsx scripts/generate-backlog-dependency-dag.ts`
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_WARP_HOME pnpm exec vitest run test/unit/method/backlog-dependency-dag.test.ts`
- METHOD drift reported no playback-question drift.
- `git diff --check`
- `pnpm lint`
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_WARP_HOME pnpm typecheck`
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_WARP_HOME pnpm test`

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
