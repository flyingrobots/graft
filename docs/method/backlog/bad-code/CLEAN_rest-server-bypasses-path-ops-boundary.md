---
title: "REST server bypasses the PathOps boundary"
feature: surface
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-07-26
---

# REST server bypasses the PathOps boundary

## Problem

The `rest-api-mcp` branch's `src/mcp/rest-server.ts` imports `node:path`
directly. The repository's PathOps architecture test permits path operations
only in explicit adapters and composition boundaries, so
`test/unit/release/path-ops-boundary-allowlist.test.ts` fails.

This violation predates the REST-session Git identity and Docker-isolation
repair.

## Risk

Direct platform path access in the REST server can diverge from the shared
repository-confinement policy. Simply adding the file to the allowlist would
hide that architectural drift instead of correcting it.

## Desired Outcome

Route REST-session path construction through the existing PathOps or
repository-path adapter boundary.

## Acceptance Criteria

- `src/mcp/rest-server.ts` no longer imports `node:path` directly.
- REST-session path resolution preserves repository confinement.
- `pnpm exec vitest run test/unit/release/path-ops-boundary-allowlist.test.ts`
  passes without expanding the allowlist for the REST server.
