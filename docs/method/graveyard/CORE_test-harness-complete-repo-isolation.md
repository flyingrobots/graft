---
title: Test harness complete repo isolation
lane: graveyard
legend: CORE
---

# Test harness complete repo isolation

## Disposition

Completed by the fixture-mirroring and isolated-workspace harness work landed on next in commit 13f5627, which removed the live-checkout fixture dependency and established temp-workspace test posture.

## Original Proposal

Tests should not touch the live Graft repo at all.

The current harness is now strong enough that Git-mutating tests can be
forced into temp sandboxes, but that still is not the full contract the
product should live under. The sharper requirement is:

- no test mutates the live repo
- no test relies on the live repo as an ambient Git worktree
- ideally no test even reads product fixtures directly from the live
  checkout during execution
- tests either:
  - create their own repo/worktree under `/tmp`, copying in only the
    fixtures they need, or
  - run inside a fully isolated Docker/container image with copy-in
    inputs instead of mounted working trees

Why it matters:
- prevents test bugs from ever mutating the developer's working copy
- makes repo-state / worktree tests easier to trust
- removes ambiguity when branch/worktree churn appears in test output
- pushes the product toward truly hermetic test posture instead of
  "mostly isolated by convention"

Likely scope:
- isolate fixture access through copied temp workspaces
- remove remaining ambient reads of docs/fixtures from the live repo
- document allowed versus forbidden test harness patterns
- optionally add a CI path that runs the suite in a copy-in container

Related:
- `test/helpers/git.ts`
- `docs/method/backlog/bad-code/CLEAN_CODE_cli-init-test-fixtures.md`

Effort: M
