---
title: "git-warp v19 migrator exceeds plumbing's cat-file batch bound"
feature: git-warp-upgrade
kind: bad-code
legend: WARP
lane: bad-code
priority: 1
effort: M
status: open
reported: 2026-08-25
---

# git-warp v19 migrator exceeds plumbing's cat-file batch bound

## Problem

The published git-warp 19.1.0 retained-substrate migrator cannot seed bounded
v19 indexes from Graft's real `graft-ast` checkpoint. The supported dependency
set is git-warp 19.1.0, git-cas 6.5.10, and plumbing 3.3.0.

An official dry run against a disposable, writer-anchored v18.0 checkpoint
translated all 2,563 writer commits and then failed while building the
checkpoint indexes:

```text
Workspace staged a batch but could not establish retention
```

A seed-only reproduction on a separate no-hardlink mirror exposed the nested
failure:

```text
WORKSPACE_RETENTION_FAILED
  ROOT_SET_TARGET_UNREADABLE
    A cat-file batch may contain at most 1000 objects
    details: { count: 1026, maxObjects: 1000 }
```

git-cas validates all retained root-set targets with one
`readObjectInfos()` call. At this graph size, that becomes 1,026 objects.
plumbing's typed `GitCatFileSession.infoMany()` correctly enforces its
1,000-object maximum, so retention fails deterministically.

The source repository is not damaged: the migrator fails in scratch before
promotion, and the disposable source's checkpoint, writer, and archive refs
remain unchanged. The same failure also explains the earlier no-checkpoint
full-replay rehearsal.

## Risk

The defect blocks the supported v18-to-v19 migration for realistic retained
graphs even when their checkpoint lineage and storage format are valid. A
private node_modules edit could bypass the failure but would make migration
evidence depend on unpublished code and would not provide an auditable release
identity for a live cutover.

## Desired Outcome

git-cas must inspect root-set targets in bounded waves no larger than the
plumbing capability, while preserving input order, duplicate behavior, error
attribution, cache behavior, and retention evidence. git-warp must then publish
a release that locks or admits the repaired dependency and proves the complete
v18-to-v19 migration against a checkpoint with more than 1,000 retained
targets.

## Acceptance Criteria

- git-cas `readObjectInfos()` never passes more objects to
  `GitCatFileSession.infoMany()` than plumbing supports.
- A regression fixture crosses the 1,000-object boundary and verifies all
  metadata in original request order.
- Missing and type-mismatched targets still identify the actual failing
  object, including when it occurs in a later wave.
- git-warp publishes a v19.1.0-or-newer package whose supported dependency set
  contains the repair.
- The official, unmodified `git-warp-v18-to-v19 --dry-run --yes --json`
  command reports `verified-dry-run` for a disposable copy of Graft's real
  graph.
- The dry run leaves every source `refs/warp/graft-ast/*` OID unchanged.
- No private export-map bypass, package patch, or live-ref mutation is required
  for the accepted proof.
