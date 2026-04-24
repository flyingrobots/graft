# Retro: CORE_migrate-to-slice-first-reads

## What shipped

Migrated precision-warp.ts from getNodes() + per-node getNodeProps()
to query().match().select().run() (QueryBuilder API).

## Acceptance criteria review

| Criterion | Status |
|---|---|
| No getNodes/getEdges on broad apertures | ⚠️ precision-warp fixed; local-history + persisted-local-history remain |
| All reads use traverse/query/bounded-neighborhood | ⚠️ Partial — HIGH sites done, MEDIUM sites wait for git-warp Rung 2+ |

## Gaps

MEDIUM-severity sites in local-history-dag-model.ts and
persisted-local-history.ts still use getNodes/getEdges. Documented
as waiting for git-warp observer geometry ladder Rung 2+ APIs.

## Drift check

- Uses QueryResultV1 from git-warp correctly ✅
- observeGraph convention followed ✅
