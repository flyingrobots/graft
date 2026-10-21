# Banned files never leak

**Legend:** CORE

Files matching ban categories (BINARY, LOCKFILE, SECRET,
BUILD_OUTPUT, MINIFIED, GRAFTIGNORE) always produce a
`RefusedResult`. No content or outline is ever returned for
a banned file.

## Relevance omission versus content denial

Bans serve two purposes, and the invariant differs between them.

- **Relevance omission** (BINARY, LOCKFILE, MINIFIED, BUILD_OUTPUT,
  GRAFTIGNORE): content and outlines are never returned, but a search may
  report how many of its matches fell in such files, by reason.
  `.graftignore` is a relevance control, not a confidentiality control.
- **Content denial** (SECRET): a confidential file's content must not
  influence any response, including matches, match counts, refusals, sizes,
  receipt byte counts, ratios, digests and errors. Searches never read
  confidential files and never count them. Confidentiality is decided by file
  name (`src/policy/confidential.ts`), independently of the order in which
  bans choose a refusal's displayed reason: `dist/.env` is confidential
  although it is refused as BUILD_OUTPUT.

Not every surface meets the content-denial rule yet; see
`docs/method/backlog/bad-code/CORE_confidential-content-surface-audit.md`.

## If violated

Secrets (.env, credentials) could be read into agent context.
Binary files waste context. Lockfiles flood with noise.

## How to verify

- Policy evaluation tests cover all 6 ban categories
- PreToolUse hook tests verify exit code 2 for each ban type
- `evaluatePolicy` checks bans before thresholds — ban order
  matters (a banned file is refused regardless of size)
- `test/unit/mcp/code-refs-confidentiality.test.ts` compares `code_refs`
  responses across paired repositories that differ only in a confidential
  file's content or existence
