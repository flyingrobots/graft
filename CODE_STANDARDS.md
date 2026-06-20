# CODE_STANDARDS

These standards define the required review and repair posture for Graft.
They are operational doctrine, not suggestions. When these rules conflict
with convenience, convenience loses.

## Code Lawyer Mandate

Code Lawyer is the repository's strict audit posture:

- Treat correctness, determinism, architecture, typing, documentation, and
  style as release-relevant integrity concerns.
- Prefer inspectable evidence over assertion. Anchor findings to files,
  line numbers, commands, commits, PR threads, or reproducible tests.
- Do not normalize sludge. Duplication, hidden nondeterminism, vague
  ownership, stale docs, loose types, and unbounded processes must either
  be fixed or filed as explicit debt.
- Never hide risk behind green reruns. A pass after an unexplained failure
  is evidence of nondeterminism until the failure mode is understood or
  bounded.

## Severity Ladder

Use this priority order when building a review or repair queue:

| Severity | Meaning |
| :--- | :--- |
| P0 Critical | Data loss, security boundary failure, release corruption, destructive Git risk, or a broken invariant with broad blast radius. |
| P1 High | User-visible bug, deterministic correctness failure, authz/path escape, broken public API, or CI/release gate failure. |
| P2 Medium | Edge-case bug, architectural mismatch, race risk, missing contract coverage, or misleading generated output. |
| P3 Low | Docs drift, incomplete witness, degraded diagnostics, missing targeted regression, or narrow maintainability issue. |
| P4 Style | Formatting, naming, markdown structure, consistency, or local readability issue that does not change behavior. |
| P5 Nit | Tiny polish item that should still be fixed when already touching the area. |

## Phase 0: Lockdown

Before any Code Lawyer review or repair loop:

```bash
export GH_PAGER=cat
git status --porcelain
```

- Dirty worktree: halt, report dirty paths, and abort.
- Clean worktree: run `git fetch origin`.
- If `gh` authentication fails, halt immediately with:

```text
Auth error — run `gh auth login` and retry.
```

Do not continue a GitHub-dependent workflow after an auth failure.

## Phase I: Discovery and Radical Transparency

1. Fetch unresolved review context. For PR work, use a full GraphQL query
   that includes global comments, reviews, inline review threads,
   `isResolved`, `isOutdated`, path, line, and comment bodies.
2. Run the branch audit:

   ```bash
   git diff origin/main...HEAD
   ```

3. Audit for logic bugs, races, edge cases, nondeterminism, duplication,
   separation-of-concerns violations, style drift, typing holes, stale docs,
   and release-gate gaps.
4. If self-discovered issues exist on a PR, immediately post a PR comment
   with a clean issue table and include `@codex` for a second opinion.

Findings must include:

- filepath
- line or range when available
- infraction type
- severity
- evidence
- recommended mitigation

## Phase II: Surgical Execution Loop

Merge PR feedback and self-discovered findings into one prioritized queue,
ordered P0 through P5. Resolve one issue at a time.

For each issue, print a local log entry:

```text
=== [N] [P0-P5] ===================================
Source: [PR / Self]
File: path/to/file.ext
Lines: Lxx-Lyy
Issue: [one-line summary]
```

Then run a Red-Green-Verify-Document-Commit loop:

1. RED: create the smallest deterministic regression that fails only for
   the issue under repair. Run it and confirm failure.
2. GREEN: make the smallest architecture-preserving fix.
3. VERIFY: rerun the regression and the relevant suite. Both must pass.
4. DOCUMENT: update `CHANGELOG.md` or internal docs when behavior,
   schema, API, release truth, or invariant posture changes.
5. COMMIT: make one focused commit per issue:

   ```bash
   git add -A
   git commit -m "Fix: <precise description>"
   ```

6. RESOLVE: if the issue came from a PR thread, mark that exact thread
   resolved through GraphQL.

Regression quality rules:

- Avoid wall-clock timing, unseeded randomness, ambient network state, and
  live-checkout fixture coupling.
- Assert observable behavior, not implementation text.
- Prefer error types, codes, and structured output over fragile message
  matching.
- Stdout and stderr are not enough for behavioral proof unless the public
  contract is explicitly a CLI rendering contract.

## Phase III: Closure

Before opening a PR for a cycle, complete and commit the local retro. A PR is a
publication and review surface; it must not be used as a substitute for local
cycle closeout. If the retro automation is unavailable, write the retro locally
by hand, commit it, and only then publish the branch for review.

For PR work, post an Activity Summary comment:

```markdown
| Issue | Severity | File | Commit SHA | Outcome |
| :--- | :--- | :--- | :--- | :--- |
| {Issue Description} | {P0-P5/Docs} | {File} | {Hash} | {Result} |
```

Print a console SitRep for every resolved item:

```text
--[ ITEM N ]-----------------------------------------------------------------
ISSUE:      {Description}
SEVERITY:   {Severity}
COMMIT:     {Hash}
REGRESSION: {Test Name}; {Command}
OUTCOME:    {Summary of technical change}
-----------------------------------------------------------------------------
```

## Phase IV: Merge Gate

Before declaring a PR mergeable, verify all gates:

- CI green via `gh pr checks`.
- Third-party review satisfied.
- Zero Changes Requested reviews.
- Local tests and linters are 100% clean for the changed surface.
- No unresolved actionable review threads.
- Worktree is clean.

### Requirement: Third-Party Review

The merge gate requires completed third-party review on the current PR head. Do
not require a fixed number of GitHub approving reviews in solo-owner
repositories; the requirement is that a non-author reviewer had a chance to
inspect the current head and either raised no issues or had every issue
resolved.

Eligible third-party reviewers include:

- CodeRabbitAI.
- Codex, when requested through a PR comment.
- A human reviewer who is not the PR author.

Acknowledgement is not review completion. CodeRabbitAI and Codex may react to a
review-request comment or post a short acknowledgement before doing the actual
review. Treat that as pending. Wait for the later substantive response.

A third-party reviewer is finished only when one of these is true for the
current PR head:

- The reviewer reports `LGTM`, `no issues`, `no actionable comments`, `review
  finished`, or an equivalent clean final result.
- The reviewer opens PR comments, review threads, or issues, and every
  actionable item has been fixed, answered, or explicitly accepted by the
  operator.
- A human reviewer submits an approving review and there are no unresolved
  actionable comments from that reviewer.

If CodeRabbitAI is in cooldown, rate-limited, out of credits, or otherwise
temporarily unavailable, immediately request a Codex review by posting:

```text
@codex review please
```

CodeRabbitAI cooldown comments must be interpreted using their last-updated
timestamp, not merely their original text. If the comment says to check back in
N minutes and its last update was less than N minutes ago, wait the remaining
time and check again. If the last update is older than the stated wait window
and CodeRabbitAI has not completed a review and is not currently pending,
request another CodeRabbitAI review by posting:

```text
@coderabbitai review please
```

The third-party-review gate is satisfied when every reviewer that was
successfully requested for the current head has finished and no actionable
review issue remains open. If CodeRabbitAI remains unavailable but Codex has
completed a clean review of the current head, the third-party-review gate is
satisfied unless the operator explicitly requires CodeRabbitAI for that PR.

### Requirement: Green CI

The merge gate requires green CI on the current PR head. Use `gh pr checks` as
the primary evidence. All required status checks must pass. Pending checks keep
the gate locked; failed checks require repair or an explicit operator override.

If ready:

```text
MERGE GATE: OPEN ✅
All invariants satisfied. Reply **YES** to execute merge.
```

If blocked:

```text
MERGE GATE: LOCKED 🔒
Blocking reasons:
• ...
Reply with fixes or "FORCE" only if you accept risk.
```

Admin override is allowed only when the operator explicitly accepts that
risk. Even then, use normal merge mechanics; never rebase, amend, or force.

## Repository Integrity Rules

- Keep work scoped to the issue being resolved.
- Do not combine unrelated fixes in one commit.
- Do not rewrite history.
- Do not push to `main` without explicit permission.
- Keep generated or build artifacts out of commits unless they are the
  documented deliverable.
- Update docs when behavior, workflow, release truth, or invariants change.
- File unresolved bad-code findings in `docs/method/backlog/bad-code/`.
- File non-blocking ideas in `docs/method/backlog/cool-ideas/`.
- Treat `pnpm lint`, `pnpm typecheck`, and the relevant tests as the
  minimum proof surface for code changes.
