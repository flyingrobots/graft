# Verification: Agent working-set control plane

## Evidence Posture

This witness distinguishes exact committed evidence from local focused checks
and from known-contaminated live-worktree output. It does not treat an unrun,
interrupted, or zero-input check as green.

## Exact Slice Witnesses

| Slice | Exact commit | Clean isolated result |
| --- | --- | --- |
| Baseline observation truth | `da1956f7` | 246 files, 1,856 tests passed |
| Compact receipt policy | `cb1958f1` | 246 files, 1,868 tests passed |
| Summary-first diagnostics | `7dec2a9c` | 247 files, 1,873 tests passed |
| MCP-native structured output | `dccd2d13` | 249 files, 1,889 tests passed |
| Capability discovery | `8af1aa3a` | 251 files, 1,902 tests passed |

The generated dependency-DAG SVG child `2f6d843a` separately passed its two
relevant files and 15 tests from a clean detached worktree.

## Code Lawyer Repair Commits

| Severity | Finding | Commit | Focused evidence |
| --- | --- | --- | --- |
| P1 | Repeated transition occurrences reused event identity | `5948e250` | Distinct A-to-B-to-A IDs; linear acyclic graph. |
| P1 | Snapshot deltas inherited stale Git transition evidence | `1e577e3a` | Checkout then edit persists null Git kind/refs/created epoch. |
| P2 | Legacy WARP `identityId` failed strict validation | `3c9b0344` | `code_find` and ambiguous `code_show` receipt regressions. |
| P2 | Same-second baseline reflog appeared fresh | `32137c12` | Unchanged baseline returns null; fresh reflog remains visible. |
| P1 | Diagnostic CLI JSON changed beneath version 1 | `f74d212e` | Complete schema digests match `origin/main@c3885dab`; nested payload projection passes. |
| P2 | Exact-edit validation occurred after file mutation | `4561d5a0` | Injected body-contract failure leaves file bytes unchanged. |
| P4 | Agent onboarding Markdown was inconsistent | `7f73d011` | README/MCP/SETUP flows aligned; `capabilities` added to setup reference. |
| Test repair | Context guard fixtures omitted the new method | `34c42b7d` | 22 focused unit/playback tests pass. |
| P2 (PR review) | Daemon status sent the v2-only receipt control to pre-v2 daemon tools | `55d21c14` | Old advertised schemas omit the field, v2 schemas request full receipts, and the current-daemon CLI integration passes. |

History-focused validation passed four files and 46 tests. Schema/CLI focused
validation passed receipt, projection, rendering, frozen-schema, and real-peer
witnesses. Mutation-boundary validation passed five files and 47 tests before
the construction-contract fixture repair.

## Final Combined-Head Validation

The clean linked repair worktree at `34c42b7d` produced:

```text
pnpm typecheck
PASS

pnpm lint
PASS

git diff --check origin/main...HEAD
PASS

pnpm exec vitest run --maxWorkers 2
Test Files  253 passed (253)
Tests       1910 passed (1910)
PASS
```

The first combined run exposed six stale context-guard fixtures and one
resource-pressure timeout in the dead-symbol playback. The fixtures were
repaired in `34c42b7d`; the dead-symbol playback passed immediately in the
focused diagnostic run and the unchanged default full-suite rerun then passed.
The only final diagnostic was the pre-existing Node `DEP0205
module.register()` deprecation warning.

## Slice 5 Exact-Commit Validation

The following commands ran from a clean detached worktree at `8af1aa3a` and a
Docker image built from that exact tree:

```text
docker build --target test -t graft-test:slice5-8af1aa3a .
PASS

docker run --rm --network none graft-test:slice5-8af1aa3a pnpm typecheck
PASS

docker run --rm --network none graft-test:slice5-8af1aa3a \
  pnpm exec vitest run --maxWorkers 2
Test Files  251 passed (251)
Tests       1902 passed (1902)

docker run --rm --network none graft-test:slice5-8af1aa3a pnpm lint
PASS

git diff --check
PASS

git status --porcelain
clean
```

The Docker build also ran the package build successfully.

## Affected Compatibility Sweep

An independent affected-surface sweep passed 43 files and 341 tests:

- contracts, schema discovery, API/library surface, capability matrix, and
  release gates: 14 files / 79 tests;
- repo-local MCP invocation, receipts, burden, metrics, and diagnostics:
  12 files / 158 tests;
- daemon, worker, workspace, and routing compatibility with one worker:
  17 files / 104 tests.

The only diagnostic was Node's pre-existing `DEP0205 module.register()`
deprecation warning.

## Post-Publication Review Validation

Codex reviewed PR #233 at `5a5a4c22` and found that the composed
`graft daemon status` reader unconditionally sent `receipt: "full"`. A CLI from
this campaign could therefore fail against a still-running pre-v2 daemon whose
strict tool inputs did not recognize that field.

Repair commit `55d21c14` lists the daemon's advertised tools once and includes
the full-receipt control only when the selected tool advertises it. The repair
passed:

```text
pnpm typecheck
PASS

pnpm lint
PASS

git diff --check
PASS

pnpm exec vitest run \
  test/unit/cli/daemon-status.test.ts \
  test/integration/mcp/daemon-status-cli.test.ts
Test Files  2 passed (2)
Tests       3 passed (3)
```

The 253-file / 1,910-test exact-head witness above predates this repair. The
focused evidence proves the changed compatibility seam; green PR CI on the
current head remains required before merge readiness is claimed.

## Capability and Schema Measurements

| Measurement | Result | Contract |
| --- | ---: | ---: |
| Repo-local registered tools | 34 | exact runtime registry |
| Daemon registered tools | 48 | exact combined registry |
| Repo-local summary response | 1,393 bytes | at most 2,048 |
| Daemon summary response | 1,390 bytes | at most 2,048 |
| Largest repo-local family detail | 1,233 bytes | at most 4,096 |
| Largest daemon family detail | 2,111 bytes | at most 4,096 |
| Strict schemas, aggregate | 511,333 bytes | measurement only |
| Largest strict schema (`doctor`) | 67,291 bytes | measurement only |
| Advertised schemas, aggregate | 52,446 bytes | at most 65,536 |
| Largest advertised schema (`doctor`) | 3,114 bytes | at most 8,192 |
| `capabilities` strict schema | 12,992 bytes | measurement only |
| `capabilities` advertised schema | 2,118 bytes | at most 8,192 |

Installed-SDK tests prove repo-local and unbound-daemon discovery, strict and
advertised-schema validation, compact/full receipt compatibility, and exact
semantic equality between `structuredContent` and canonical JSON text.

## Contaminated Live-Worktree Check

The live-worktree full suite reported 250 passing files and 1,901 passing tests
with one failure. The dependency-DAG test saw the operator's unrelated untracked
`WARP_recoverable-workspace-content-history.md` card in the Docker context while
the committed graph correctly excluded it. No product code was changed to make
that contaminated result pass. The clean exact-commit suite above is the
authoritative result, and its dependency-DAG tests pass.

## Review

- The early Slice 5 review was insufficient and missed actionable defects.
- The complete pre-PR Code Lawyer pass found three P1, three P2, and one P4
  issue. All concrete active-branch defects were repaired before PR creation.
- The broad mutation-atomicity question was narrowed honestly: `graft_edit`
  preflights its domain body before writing, while general daemon
  plan/validate/commit semantics are filed as explicit architectural debt.
- Two delegated review/repair launches stalled. Their elapsed time is not
  counted as review evidence; completed findings, commits, tests, and final
  local validation are the evidence.
- Third-party PR-head review remains a later merge gate and is not claimed here.

## Drift

Manual design/code/test/documentation/non-goal reconciliation found no product
drift. Method's automated output said it scanned one active cycle, zero playback
questions, and 312 test descriptions. That result is not accepted as substantive
evidence; the zero-question and incomplete-root defects are filed separately.

## Human Playback

The operator directed the branch to proceed to pull request after receiving the
four remaining playback claims. That instruction is recorded as approval of:

- explicit full receipt and diagnostic retrieval;
- default doctor usability and size;
- client-native output discovery and validation;
- bounded workflow discovery without reading the full MCP registry.

All human and agent playback questions are now attested or evidenced, and the
retro outcome is `hill-met`.
