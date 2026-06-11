---
title: "sha256 stable-id hashing duplicated across six call sites"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 4
effort: S
status: open
reported: 2026-06-10
---

# sha256 stable-id hashing duplicated across six call sites

## Problem

`crypto.createHash("sha256").update(...).digest("hex")` stable-id derivation
is independently implemented in `src/mcp/runtime-causal-context.ts`,
`src/mcp/repo-state-observation.ts`, `src/mcp/workspace-router-resolution.ts`,
`src/warp/writer-id.ts`, `src/mcp/daemon-bootstrap.ts`,
`src/adapters/fake-echo-kernel-transport.ts` (`submissionIdFor`), and now
`src/echo/structural-reading-generated-model.ts` (`sha256Hex`/`deriveId`,
slice 4) plus its test-side twin in
`test/unit/echo/generated-model-parity.test.ts`.

## Risk

Algorithm rotation or output-format change (e.g., truncated vs full hex)
requires finding every site; one missed site silently breaks identity
stability assumptions.

## Desired Outcome

One shared `stableHashId` helper (or hashing port) used by all sites, with a
unit test pinning the output format.

## Acceptance Criteria

- Shared helper exists with the existing call sites migrated.
- No remaining inline `createHash("sha256")` stable-id derivations outside
  the helper.
