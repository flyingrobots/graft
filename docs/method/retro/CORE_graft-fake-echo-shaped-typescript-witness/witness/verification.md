---
title: "Verification Witness for Cycle CORE_graft-fake-echo-shaped-typescript-witness"
---

# Verification Witness for Cycle CORE_graft-fake-echo-shaped-typescript-witness

This witness records the verification evidence for the fake Echo-shaped
TypeScript witness slice.

## Pull Request

- PR: https://github.com/flyingrobots/graft/pull/86
- Merge commit: `fab5d0119af174297e7589f337b8941546c69f0e`
- Repair commits: `ad757a67` (CI Wesley pin 0.0.5),
  `e441366c` (PR review findings)
- Merge time: `2026-06-10T21:02:05Z`

## Hill Evidence

- Schema intent: `schemas/graft-structural-history.graphql`
  (`recordGitWarpImportBatch`, `RecordGitWarpImportBatchInput`)
- Generated codecs: `src/generated/graft-structural-history.codec.generated.ts`
  (Wesley 0.0.5 `le-binary`, `OP_RECORD_GIT_WARP_IMPORT_BATCH = 2574440766`)
- Transport port: `src/ports/echo-kernel-transport.ts`
- Envelope codec: `src/echo/structural-history-envelope-codec.ts`
  (EINT v1 per SPEC-0009 ABI v3; canonical-CBOR `ok` envelopes)
- Typed client: `src/echo/structural-history-client.ts`
- Reading adapter: `src/echo/structural-reading-adapter.ts`
  (obstruction → posture table, exported for slice 4)
- Fake transport: `src/adapters/fake-echo-kernel-transport.ts`
- Design packet: `docs/design/CORE_graft-fake-echo-shaped-typescript-witness.md`
  (claims cited against echo@2048da5c)

## Test Evidence

- Witness suite: `test/unit/echo/` — 7 files, 35 tests (authority boundary,
  codec round-trips, intent flows, app-code query flows, obstruction
  mapping, retained posture, determinism, wire strictness)
- RED proven before GREEN: commit `a65ef59c` (6 files failing at import)
- Full suite at merge: 1677 passing; `pnpm typecheck` and `pnpm lint` clean
- Hermetic schema gate: `pnpm schema:structural-history:check` byte-identical
  regeneration at Wesley 0.0.5 (`wesley@ca2755ff`)

## CI Evidence

Checks on `e441366c` (head of PR #86 at merge):

```text
CodeRabbit  pass  Review completed
test (20)   pass  3m1s
test (22)   pass  4m1s
```

## Review Evidence

- Self review: 7 finder angles, verdicts recorded in the PR body
  ("Review trail"), confirmed findings fixed in `1ac60100`
- External review: CodeRabbit pass; chatgpt-codex-connector raised four P2s,
  all fixed in `e441366c` with regression tests
