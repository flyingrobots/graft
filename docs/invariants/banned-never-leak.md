# Banned files never leak

**Legend:** CORE

Files matching ban categories (BINARY, LOCKFILE, SECRET,
BUILD_OUTPUT, MINIFIED, GRAFTIGNORE) always produce a
`RefusedResult`. No content or outline is ever returned for
a banned file.

## If violated

Secrets (.env, credentials) could be read into agent context.
Binary files waste context. Lockfiles flood with noise.

## How to verify

- Policy evaluation tests cover all 6 ban categories
- PreToolUse hook tests verify exit code 2 for each ban type
- `evaluatePolicy` checks bans before thresholds — ban order
  matters (a banned file is refused regardless of size)
