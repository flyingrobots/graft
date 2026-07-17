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

- Local Code Lawyer review of the complete Slice 5 diff: no actionable P0-P3
  finding.
- Independent affected-test sweep: zero failures.
- A separate independent-review subagent stalled without producing a finding;
  it is recorded as interrupted, not as approval.
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
