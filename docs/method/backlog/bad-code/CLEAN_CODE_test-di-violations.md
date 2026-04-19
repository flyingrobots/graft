---
title: "8 test files import real adapters instead of using dependency injection"
legend: CLEAN_CODE
lane: bad-code
---

# 8 test files import real adapters instead of using DI

Source: test audit 2026-04-19

These unit tests hardcode `nodeFs` or `nodeGit` imports instead of accepting adapters as parameters:
- `unit/operations/safe-read.test.ts`
- `unit/operations/file-outline.test.ts`
- `unit/operations/read-range.test.ts`
- `unit/operations/graft-diff.test.ts`
- `integration/safe-read.test.ts`
- `unit/adapters/node-git.test.ts`
- `unit/ports/filesystem-contract.test.ts`
- `unit/mcp/worktree-identity-canonicalization.test.ts`

Note: some of these are intentionally testing the real adapter (contract tests, integration tests). Those are legitimate. The operations tests are the real violations — they should inject a test double FileSystem.

Effort: S-M
