# Stale CodeRabbit check status workaround

When CodeRabbit hits a rate limit, the check status stays "failed"
even after the cooldown expires and the incremental review confirms
no new issues. This blocks merge gates that require all checks green.

Possible fixes:
- Push an empty commit to trigger a fresh check run
- Temporary break-glass only: if branch protection must be relaxed, assign an owner,
  time-box it, and re-enable the required CodeRabbit check immediately after unblock
- Add a "force clear stale checks" step to the PR feedback flow:
  1) trigger rerun via `gh api repos/{owner}/{repo}/check-suites/{id}/rerequest`
  2) verify check suite refreshes to passing
  3) post resolution note in PR thread

Observed on PRs [#15](https://github.com/flyingrobots/graft/pull/15),
[#16](https://github.com/flyingrobots/graft/pull/16), and
[#19](https://github.com/flyingrobots/graft/pull/19).
