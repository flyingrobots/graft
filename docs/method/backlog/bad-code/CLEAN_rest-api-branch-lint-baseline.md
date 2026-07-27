---
title: "REST API branch has an existing 43-error lint baseline"
feature: surface
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-07-26
---

# REST API branch has an existing 43-error lint baseline

## Problem

The `rest-api-mcp` branch's full `pnpm lint` command fails with 43 errors in
two files that predate the REST-session Git identity isolation repair:

- `src/mcp/rest-server.ts`: 29 errors
- `test/unit/mcp/rest-server.test.ts`: 14 errors

The failures are primarily strict TypeScript ESLint violations in the new REST
server implementation and its unit tests. The files changed by the Git identity
repair pass a focused ESLint invocation.

## Risk

The branch cannot satisfy the repository-wide lint gate, and new changes can
be blamed for a pre-existing failure unless the baseline is tracked
explicitly. Fixing these errors inside an identity-isolation repair would also
mix unrelated REST-server cleanup into a security-sensitive patch.

## Desired Outcome

Bring the REST server implementation and tests under the repository's normal
strict ESLint rules without weakening or disabling those rules.

## Acceptance Criteria

- `pnpm lint` reports zero errors.
- The REST server's public behavior and session tests remain unchanged.
- No ESLint rule is disabled merely to make the baseline green.
