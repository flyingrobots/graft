---
title: "Design packets receive no automated review"
feature: review-gate
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-08-16
---

# Design packets receive no automated review

## Problem

`.coderabbit.yaml` excludes `**/*.md`, so CodeRabbit skips any pull request
whose diff is documentation only. On PR #245 it posted a review-skipped notice
naming all three changed files as ignored by path filters, and produced no
findings at all.

Design packets are markdown by definition. `METHOD.md` makes the packet the
thing implementation is built from — it names the hill, the acceptance
criteria, and the test strategy before any code exists. So the artifact that
determines what a cycle builds is the one artifact the review gate does not
read.

PR #245 was reviewed only by Codex. That review found sixteen defects across
three rounds, ten of them P1, including a settlement contract that could not
encode the field its own symlink policy turns on, and a replay comparison rule
that would have rejected every valid result it was meant to compare. None of
these would have been caught by CI, which passes on documentation changes by
construction.

## Risk

A design packet with a defective acceptance list produces an implementation
cycle that builds the wrong thing and then proves it correct against the
defective list. The failure is silent and arrives one cycle later, which is the
most expensive place for it to arrive.

The current state also makes review quality depend on which reviewer happens to
be configured. Codex reviewed #245 because Codex reviews every PR; CodeRabbit
did not because of a path filter written for source code.

## Evidence

- `.coderabbit.yaml` — `!**/*.md` in the path filters.
- PR #245 CodeRabbit comment: "Review skipped — Review was skipped due to path
  filters", listing `docs/BEARING.md` and both design documents.
- PR #245 Codex findings: 3 in round one, 7 in round two, 6 in round three.

## Acceptance criteria

- [ ] `docs/design/**` is reviewable by the configured review tooling, either by
      removing it from the ignore list or by an explicit include that overrides
      the default markdown block.
- [ ] A documentation-only PR under `docs/design/` demonstrably receives a
      substantive review rather than a skip notice.
- [ ] The change does not re-enable review for generated or vendored markdown,
      which is what the original filter was for.

## Notes

Widening the filter to all markdown would be the wrong fix — it would pull in
generated backlog artifacts and audit dumps. The narrow include is
`docs/design/**`.
