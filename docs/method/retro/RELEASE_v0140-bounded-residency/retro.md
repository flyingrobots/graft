# v0.14.0 release preparation retro

## Outcome

Initially prepared the release from merged PR #251 without changing runtime
source or locked dependency versions. Release review then identified the MCP
status schema-version defect, repaired with a red/green contract regression.
The locked dependency graph remains unchanged. Updated package/source-version metadata, dated the
changelog, documented the capacity error and client reconnect requirements,
and recorded local preflight and isolated MCP dogfood results.

## Playback and drift

The sequential release gate passed, including 2,370 Docker tests, ten public
contract tests, build, and the zero-high/critical security policy. Dogfood used
copied Graft source in a temporary repository. The default four-handle claim
still does not imply a byte or process memory limit. Publication and daemon
replacement remain separately verified steps after review.

## Debt

Filed `CLEAN_moderate-dependency-advisories` with the eight moderate audit
entries, runtime/development dependency paths, fixed versions, owner, and
next-release reassessment. No dependency was silently changed to obtain green
validation. Existing WARP owner-inventory and byte-budget cards remain open.
No new cool-ideas cards were needed.

## Next gate

Review the preparation commit, merge through the normal gates, tag merged
main, verify all publication jobs and registry delivery, then replace the local
daemon only after a fresh idle-work check. Release witness:
`docs/method/releases/v0.14.0/verification.md`.

## Retained evidence

The complete MCP smoke command and bounded results now live in the release
witness. Replaying the retained command passed the original observations.
No test or lint configuration changed to retain this evidence. The first
standalone `.mjs` placement failed typed-project lint and was replaced with
the complete shell command in Markdown. A trailing blank line in the retained
RED excerpt was removed in this documentation follow-up.
