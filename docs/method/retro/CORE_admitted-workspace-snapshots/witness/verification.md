---
title: "Verification Witness for Admitted Workspace Snapshots"
---

# Verification Witness for Admitted Workspace Snapshots

The implementation and post-publication review repairs were verified from
branch commit `37b491cd6f12d5cdbdc2040a4b241d6196725544`. This witness update changes
documentation only and is covered by the final documentation gate.

## Source Truth

- `src/api/repo-workspace.ts` and `src/mcp/repo-workspace.ts` both construct
  `LiveWorkspaceReadSource`. Production still reads the live disk.
- `src/operations/workspace-read-view.ts` declares separate
  `WorkspaceReadView` and `AdmittedWorkspaceReadView` contracts, validates
  snapshot fields before applying the test-only admission assertion, and
  exposes no production settlement decoder.
- `src/operations/repo-workspace.ts` gives `RepoWorkspace` one `readView` and
  routes each bounded read operation through one observation.

## Focused Acceptance

```text
pnpm vitest run \
  test/unit/library/admitted-snapshot-admission.test.ts \
  test/unit/library/admitted-snapshot-analysis.test.ts \
  test/unit/library/workspace-read-authority.test.ts \
  test/unit/library/single-observation.test.ts \
  test/unit/library/refusal-fidelity.test.ts \
  test/unit/library/repo-workspace.test.ts \
  test/unit/helpers/observed.test.ts \
  test/integration/safe-read.test.ts \
  test/unit/operations/safe-read.test.ts \
  test/unit/operations/file-outline.test.ts \
  test/unit/operations/read-range.test.ts \
  test/unit/mcp/tools.test.ts \
  test/unit/contracts/output-schemas.test.ts

Test Files  13 passed (13)
Tests       139 passed (139)
```

## Review Repair Proof

- Non-absence read failures propagate; only `ENOENT` becomes not-found.
- Admitted snapshots expose no retained byte map and copy mutable source bytes.
- UTF-8 BOM bytes participate in observation identity and cache comparison.
- Refused range reads increment refusal metrics rather than successful reads.
- Snapshot budgets must be non-negative safe integers before admission.
- `file_outline.actual` uses the shared non-negative integer schema.
- Invalid-UTF-8 test observations cannot be fabricated from valid text.
- `SnapshotAdmissionError.code` identifies every admission contradiction
  without coupling callers or tests to descriptive prose.

## Integrated Repository Gate

| Gate | Command | Result |
| :--- | :--- | :--- |
| Lint | `pnpm lint` | passed |
| Types | `pnpm typecheck` | passed |
| Build | `pnpm build` | passed |
| Hermetic schema parity | `WESLEY_BIN=/Users/james/.cargo/bin/wesley pnpm schema:structural-history:check` | passed with Wesley 0.1.0; generated model, codec, registry hash, and Echo descriptor in sync |
| Built CLI smoke | `node bin/graft.js --version` | `graft 0.11.1` |
| Full isolated suite | `pnpm test` | 258 files passed; 2,027 tests passed |
| Documentation integrity | `git diff --check` and `pnpm lint` | passed after Retro completion |

The first schema-gate invocation intentionally failed closed because
`WESLEY_BIN` was absent. It was rerun with the installed project-declared
Wesley 0.1.0 binary; no generated artifact changed.

## Mainline Integration

- Regular merge only; no rebase, amend, force, or history rewrite.
- Merge commit: `06986496ec0fe27627ce7048ea7990881e7485ce`.
- Generated dependency graph conflicts were resolved by running
  `pnpm exec tsx scripts/generate-backlog-dependency-dag.ts`.
- The generator reported 140 cards, 15 edges, and one external blocker.
- The regenerated DAG's focused invariant suite passed 2 of 2 tests.

## Remaining Boundary

This witness does not claim Echo-backed production reads. It proves the
internal admission invariants, single-authority seam, projection fidelity, and
integration health that must exist before the real settlement decoder can be
implemented.
