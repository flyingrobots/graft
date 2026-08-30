---
title: "First retained workspace observation (design packet)"
cycle: "CORE_first-retained-workspace-observation"
design_doc: "docs/design/CORE_first-retained-workspace-observation.md"
outcome: not-met
drift_check: yes
---

# First retained workspace observation — Design Packet Retro

## Summary

This cycle produced the design packet for issue #228 and nothing else. No
runtime code changed. The packet names the hill, the authority model, the
canonical request and settlement contracts, fifteen invariants, an acceptance
list with machine-checkable evidence, and a test strategy — so that the
implementation cycle starts from a recorded contract rather than an unrecorded
plan, which is what `METHOD.md` requires.

The #228 hill is not met and is not claimed — hence `outcome: not-met` above,
which is the accurate value even though the cycle did what it set out to do.
A design packet cannot meet an implementation hill. Implementation has not
started.
What is done is the decision record: an unknown-basis request protocol, an
explicit durable replay key, and a deny-by-default replay comparison whose
authoritative enumeration is required to live in code rather than in this
document.

This retro is **written after its pull request merged**, which is itself a
process failure and is recorded as such below rather than smoothed over.

## Playback Witness

- [verification.md](./witness/verification.md)
- The packet's human and agent playback questions were both amended during the
  cycle; question wording that had drifted from the decisions it mirrors is now
  aligned rather than merely checked off.

## Drift

- **The retro gate was violated, knowingly.** `AGENTS.md` and `METHOD.md` both
  say a PR must not be opened before the cycle's local retro is complete and
  committed. PR #245 was opened first. The condition was flagged three times
  before merge and the operator directed the merge; the exception is recorded
  here rather than left implicit. The rule's own words — "the PR may review the
  retro, but it must not be the first place the retro exists" — describe
  exactly what happened.
- **Review found sixteen defects across three rounds, and did not converge.**
  Round one: 3 findings, all P1. Round two: 7. Round three: 6. A descending
  curve never appeared, and the PR merged while the fourth round was unrun.
- **Five of the sixteen were caused by the previous round's repair.** Fixing a
  design document adds specification surface, and the new surface carried its
  own defects. Two examples are load-bearing: the deny-by-default
  `replayProjection` introduced in round one named four kept fields when the
  result union carries more, so as written it would have rejected every valid
  partial, unsupported, or refused result; and the pre-observation policy gate
  introduced in round one is unimplementable against the current
  `RepoWorkspaceRefusedResult`, which requires `actual` sizes sourced from the
  observation being skipped.
- **The same defect class recurred one layer up.** After round two corrected
  the projection's operation-level enumeration, round three found the identical
  omission at the MCP wrapper. That recurrence changed the repair: the
  comparison moved to the decoded payload before the wrapper is attached, and
  the authoritative enumeration was required to live in code with a totality
  test. A third hand-maintained list was rejected as a fix.
- **A fourth round, self-audited after merge, found eight more.** All were the
  same class: sections edited in rounds one to three left sections that were
  not edited contradicting or under-scoping them. The Hill/acceptance
  contradiction that round three caught had five untouched siblings — two
  playback questions, two test-strategy steps, and the implementation boundary.
  Commit `c61023f8` closed them.
- **CodeRabbit reviewed none of it.** `.coderabbit.yaml` excludes `**/*.md`, so
  the review gate read zero lines of the artifact that defines what the next
  cycle builds.
- **I filed a duplicate card for it, and review caught that too.** The gap was
  already tracked as `CLEAN_coderabbit-path-filters-skip-method-docs.md`, open
  since 2026-06-01 against issue #69, with `docs/design/**/*.md` already in its
  acceptance criteria. I wrote a second card without searching the backlog
  first, which would have given one defect two identities, two priorities, and
  two nodes in the generated dependency DAG. The duplicate was deleted and the
  existing card updated with the #245 recurrence. **Search the backlog before
  filing** is the correction, and it belongs in this retro rather than only in
  a review thread.
- **"Documentation-only" was wrong, and CI caught it.** This retro's own two
  backlog cards invalidated `docs/method/backlog/dependency-dag.dot`, a
  generated artifact pinned by `backlog-dependency-dag.test.ts`. I had applied
  the reduced docs gate — `git diff --check` plus lint — on the reasoning that
  no runtime file changed, and stated in the witness that the branch touched
  nothing the suite loads. `test (22)` failed and disproved it. Backlog
  frontmatter is a suite input; a cycle that files cards owes a regeneration
  through the owning script and a full suite run.
- **One finding was closed by narrowing rather than specifying.** The
  settlement contract permitted `bytes | retainedContentReference` while
  defining neither where a reference durably lives nor which authority resolves
  it after restart. A one-file inline proof would have passed every counter
  while the other permitted representation violated the closed-world invariant.
  The branch was removed from this cycle instead of being left permitted and
  untested.

## What surprised you?

That a design document behaves like code under review, and fails the same way.
The most damaging defects were not wrong statements about the system — every
source citation checked out. They were **two parts of the same document
disagreeing**, produced by editing one and not the other. That is a merge
conflict without a conflict marker, and nothing in the toolchain looks for it.

The second surprise is how convincingly a defective evidence rule reads. The
pre-request path-resolution finding is the sharpest artifact of this cycle:
`repo-paths.ts` calls `realpathSync.native` and `lstatSync` before
`RepoWorkspace` exists, so an ordering assertion scoped to the observation
authority would have reported green against a workspace that had already been
read. The evidence would have looked cleanest precisely when it was wrong,
which is the failure mode the whole packet exists to prevent.

## What would you do differently?

Run the review loop **before** opening the PR, not through it. Three of the
four rounds could have happened locally against the same reviewer, and the
fourth would not have been needed because the PR would not have merged mid-loop.

Treat "the acceptance list changed" as an obligation to re-read the Hill, the
playback questions, the test strategy, and the implementation boundary in the
same commit. Every round-four finding would have been prevented by that single
habit, and it is cheap enough to be a rule rather than a discipline.

Stop hand-maintaining any enumeration in a design document that mirrors a live
type. Two rounds were spent on the same list at two different layers before the
right fix — put it in code, assert totality — became obvious.

## New Debt

- None new. The CodeRabbit review gap this cycle hit was **already tracked**:
  [CodeRabbit path filters skip Method docs PRs](../../backlog/bad-code/CLEAN_coderabbit-path-filters-skip-method-docs.md)
  (open since 2026-06-01, issue #69). It has been updated with the PR #245
  recurrence rather than duplicated.

## Cool Ideas

- [A lint for design-packet internal consistency](../../backlog/cool-ideas/CORE_design-packet-consistency-lint.md)

## Follow-up Items

- Open the #228 implementation cycle against this packet. The first two things
  RED should pin are the decisions this packet deliberately left open: the
  concrete replay-key shape, and the recovery-state result schema.
- The packet requires contract additions before its acceptance list can be
  met — `entryKind` and the discriminated retained-analysis projection per
  admitted entry; `settlementSchemaIdentity`, `reconciliationLawIdentity`,
  `analysisProjectionPolicy`, and `proseProjectionSchemaIdentity` on the
  request; a path-only refusal variant carrying no `actual`; and a
  recovery-state variant in both the operation and MCP unions. These are named
  in the implementation boundary and are not optional extras.
- Keep #228 open. This cycle recorded a decision; it did not meet the hill.

## Backlog Maintenance

- [x] Every defect this cycle deferred has a card above.
- [x] The unrun fourth review round was not silently dropped — it was performed
      as a self-audit and its eight findings were repaired in `c61023f8`.
- [x] No dead work was marked complete. The packet's own status line still
      reads "Implementation has not started."
- [x] The retro-gate violation is recorded rather than omitted.
