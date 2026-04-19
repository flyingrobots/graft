---
title: "export-surface-diff may throw on new files (base ref getFileAtRef not wrapped)"
legend: CLEAN_CODE
lane: bad-code
---

# export-surface-diff may throw on new files (base ref getFileAtRef not wrapped)

Source: design review exercise 2026-04-19

In `src/operations/export-surface-diff.ts`, `getFileAtRef(base, filePath, ...)` is called without try/catch, while `getFileAtRef(head, filePath, ...)` IS wrapped. If a file exists at head but not at base (new file added between refs), the base call may throw depending on `getFileAtRef`'s error handling.

The head call correctly catches errors and falls back to null. The base call should have the same treatment.

Fix: wrap the base `getFileAtRef` call in try/catch with null fallback, matching the head call pattern.

Affected files:
- `src/operations/export-surface-diff.ts` line 113

Effort: S
