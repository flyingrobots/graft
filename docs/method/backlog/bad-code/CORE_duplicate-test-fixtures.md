# Duplicate git test fixture setup

`test/unit/git/diff.test.ts` and `test/unit/operations/graft-diff.test.ts`
both have identical beforeEach blocks creating temp git repos with
`git init`, `git config`, `writeFileSync`, `git add`, `git commit`.

Extract a shared `createTestRepo()` factory to `test/helpers/git.ts`.
Reduces duplication and makes it easier to add more git-related tests.

Affects: `test/unit/git/`, `test/unit/operations/`
