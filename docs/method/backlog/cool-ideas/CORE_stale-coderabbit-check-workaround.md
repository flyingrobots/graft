# Stale CodeRabbit check status workaround

When CodeRabbit hits a rate limit, the check status stays "failed"
even after the cooldown expires and the incremental review confirms
no new issues. This blocks merge gates that require all checks green.

Possible fixes:
- Push an empty commit to trigger a fresh check run
- Configure branch protection to not require the CodeRabbit check
- Add a "force clear stale checks" step to the pr-feedback flow

This has bitten us on PRs #15, #16, and #19.
