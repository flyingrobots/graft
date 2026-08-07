---
title: "Verification Witness for Admitted Workspace Snapshots"
---

# Verification Witness for Admitted Workspace Snapshots

The implementation and post-publication review repairs were verified from
branch commit `cfa25da8f937a6ba2b20a88dbf30e1546880854a`. This witness update
changes documentation only and is covered by the final documentation gate.

## Source Truth

- `src/api/repo-workspace.ts` supplies the compatibility `fs` input that
  `RepoWorkspace` normalizes to `LiveWorkspaceReadSource`;
  `src/mcp/repo-workspace.ts` constructs that view explicitly. Production
  still reads the live disk.
- `src/operations/workspace-read-view.ts` declares separate
  `WorkspaceReadView` and `AdmittedWorkspaceReadView` contracts, validates
  snapshot fields before applying the test-only admission assertion, and
  exposes no production settlement decoder.
- `src/operations/repo-workspace.ts` routes every bounded analysis method
  through one `readView` and one observation. Filesystem-backed workspaces keep
  the legacy public `fs` member, but analysis methods never consult it.

## Focused Acceptance

```text
pnpm exec vitest run \
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
  test/unit/mcp/runtime-observability.test.ts \
  test/unit/mcp/precision.test.ts \
  test/unit/mcp/workspace-read-observation.test.ts \
  test/unit/mcp/changed.test.ts \
  test/unit/ports/filesystem-contract.test.ts \
  test/unit/contracts/output-schemas.test.ts

Test Files  18 passed (18)
Tests       220 passed (220)
```

## Review Repair Proof

- Filesystem adapters may classify native missing errors, and standard
  portable missing shapes normalize to `ENOENT`; non-absence failures still
  propagate.
- Admitted snapshots retain bytes, aperture, and admission state only in
  module-private storage, expose no byte map, and copy mutable source bytes.
- Admission validates the exact defensive copy it retains, so effectful caller
  collections cannot detach the validated fields from the stored bytes.
- UTF-8 BOM bytes participate in observation identity and cache comparison.
- Refused range reads increment refusal metrics rather than successful reads.
- Snapshot budgets must be non-negative safe integers before admission.
- `file_outline.actual` uses the shared non-negative integer schema.
- Invalid-UTF-8 test observations cannot be fabricated from valid text.
- `SnapshotAdmissionError.code` identifies every admission contradiction
  without coupling callers or tests to descriptive prose.
- The public `RepoWorkspace({ fs })` constructor and `fs` member remain source-
  and runtime-compatible while analysis normalizes reads to one
  `LiveWorkspaceReadSource`.
- Admitted descriptors, apertures, and exposed evidence are frozen after
  defensive copying, callers cannot replace the evidence property, and the
  completed view rejects properties that would shadow its authority methods.
  The exported snapshot-view prototype is also frozen and the view is
  runtime-final, so callers cannot replace those methods globally or through a
  derived prototype.
- A normalized `RepoWorkspace.readView` cannot be replaced after construction,
  so every bounded analysis remains attached to its admitted authority.
- An admitted view's evidence root must exactly match its
  `RepoWorkspace.projectRoot`; a mismatch throws `WORKSPACE_ROOT_MISMATCH`
  before any settled bytes can be presented under another workspace identity.
  Absolute paths beneath that exact root map back to the workspace-relative
  aperture key used by the settled bytes. POSIX backslashes remain literal,
  while Windows drive and backslash-UNC roots accept either separator.
- `file_outline` and `read_outline` advertise schema v2 for their expanded
  cache-hit payload while unrelated contracts remain on v1.
- Split MCP `file_outline` and CLI `read_outline` body schemas accept the same
  cache-hit `actual` evidence as their wrapped peers.
- Invalid-UTF-8 outline and range results use the standard refusal projection,
  so both tool metrics record refusals instead of successful reads.
- Refused outline observations are not persisted as successful outline
  attribution.
- Decoded outline content is narrowed once before cache lookup and recording;
  no redundant nullable branch can diverge from the UTF-8 refusal decision.
- The retained-state regression test directly proves that bytes, aperture, and
  admission membership remain absent from runtime properties.
- MCP `changed_since` delegates to `RepoWorkspace.changedSince`, so it uses the
  same workspace authority and refuses invalid UTF-8 instead of replacement-
  decoding it through an independent filesystem path.
- Empty and refused ranges retain the considered path without recording a line
  region that was never returned.
- `UnadmittedPathError` and `MissingSnapshotBytesError` expose stable codes,
  distinct from admission-time `MISSING_APERTURE_BYTES`.
- Live `code_show` search carries matched content through policy evaluation and
  range projection, so all three stages share one filesystem observation;
  match-only live searches discard source after extracting compact matches.
- Every SHA named as verification evidence resolves to its claimed Git commit.

## Integrated Repository Gate

| Gate | Command | Result |
| :--- | :--- | :--- |
| Lint | `pnpm lint` | passed |
| Types | `pnpm typecheck` | passed |
| Build | `pnpm build` | passed |
| Hermetic schema parity | `WESLEY_BIN=/Users/james/.cargo/bin/wesley pnpm schema:structural-history:check` | passed with Wesley 0.1.0; generated model, codec, registry hash, and Echo descriptor in sync |
| Built CLI smoke | `node bin/graft.js --version` | `graft 0.11.1` |
| Full isolated suite | `pnpm test` | 258 files passed; 2,048 tests passed |
| Documentation integrity | `git diff --check` and `pnpm lint` | passed after Retro completion |

The first schema-gate invocation intentionally failed closed because
`WESLEY_BIN` was absent. It was rerun with the installed project-declared
Wesley 0.1.0 binary; no generated artifact changed.

## Mainline Integration

- Regular merge only; no rebase, amend, force, or history rewrite.
- Merge commit: `06986496ec0fe27627ce7048ea7990881e7485ce`.
- Generated dependency graph conflicts were resolved by running
  `pnpm exec tsx scripts/generate-backlog-dependency-dag.ts`.
- The generator reported 141 cards, 15 edges, and one external blocker.
- The regenerated DAG's focused invariant suite passed 2 of 2 tests.

## Remaining Boundary

This witness does not claim Echo-backed production reads. It proves the
internal admission invariants, single-authority seam, projection fidelity, and
integration health that must exist before the real settlement decoder can be
implemented.
