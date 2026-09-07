# Testing Standards adoption — local retro

Date: 2026-09-07
Branch: `cycle/testing-standards`
Base: `e1d34c18fc359b4f7d7f9ba08500421ac0fa9ad5`
Policy: `graft.testing/1.0.0`
Change kind: deliberate policy behavior change; runtime behavior unchanged

## Outcome and evidence boundary

The operator-approved corrected standard is codified as a single 19-rule Graft
edition with matching reviewer checklist and compression. Contributor entry
points and the PR template direct future in-scope work to it. Approval is
effective 2026-09-07; this local retro does not claim a merge, completed
automation, universal legacy conformance, or third-party review.

The [design](../../design/PROCESS_testing-standards-adoption.md) preceded policy
editing. The [adoption record](../../testing/adoption.md) identifies manual and
automated enforcement, missing mechanisms, and explicit exception authority.
No blanket exceptions were granted. No runtime or test code was changed, and
the inspector worktree/PR was not changed by this adoption.

## Semantic playback and reconciliation

This is a manual review of the policy against the approved amendments, not
an automated assertion suite or an independent third-party review.

| Scenario or amendment | Full rule(s) | Checklist item(s) / compressed rule(s) | Result of review |
| --- | --- | --- | --- |
| Three assertions establish one rejection promise | 3–4 | 1, 8 / 3–4 | One atomic claim still requires calibration; independent unexecuted checks are not covered by an earlier failure. |
| Invalid input is correctly rejected and test passes | 4 | 1 / 4 | Negative-path success alone does not establish that a check was observed failing. |
| A test file moves or its fixture improves | 3, 17 | 4 / 3, 17 | Legitimate maintenance is explained; contractual expectations stay fixed during refactoring. |
| Name contains “and” | 3 | 8 / 3 | Cohesion is reviewed; no token prohibition. |
| Stable internal invariant needs direct testing | 1 | 5 / 1 | Narrow internal contract allowed; no forced public API extraction. |
| Generator could recreate a known counterexample | 5, 18 | 15, 19 / 5, 18 | Insufficient for deletion; replay must be guaranteed or retirement explicitly justified. |
| Generated comparisons all agree | 5 | 15 / 5 | Conclusion limited to stated domain, budget, oracle and execution assumptions; no unrestricted proof. |
| Specified expectation fails | 6 | 2 / 6 | Disagreement may block; diagnosis locates implementation, oracle, harness or contract defect. |
| Quarantine expires or lacks an owner | 10, 18–19 | 13, 19 / 10, 18–19 | Remediation/owned approved risk decision required; no automatic deletion or defect closure. |
| Seeded simulation passes while OS behavior differs | 7, 14 | 10, 16 / 7, 14 | Model/interception limits explicit; real-system integration, stress and race evidence remain valid supplements. |
| Crash injected at a fixed write point | 15 | 17 / 15 | Fixed schedule and initial state are valid replay evidence; random seed not required. |
| Same-run benchmark ratio is flat but SLA is missed | 16 | 18 / 16 | Absolute requirement still tested under its declared conditions. |
| Golden changes or XFAIL fails differently | 6, 17 | 2, 4, 13 / 6, 17 | Review oracle/behavior changes; unrelated failure cannot satisfy an XFAIL pin. |
| No mutation/expiry automation exists | 4, 10, 19 | 1, 13, 19 / 4, 10, 19 | Manual calibration and owned failure records bind now; missing necessary controls need specific approval. |
| Coverage or simulation is described as exhaustive | 5, 11, 14 | 14–16 / 5, 11, 14 | Scope and assumptions limit conclusions; configured or unavailable evidence is not a completed result. |

The remaining rules were checked across all three views: observable effects
and fake conformance (2), controlled sources and isolation (7–8), measured size
and suite budgets (9), red-on-unfixed with explicit reproduction gaps (12),
maintained trust-boundary fuzz/property targets and corpora (13), and owned,
trustworthy integration evidence (19). Rule 18 permits the traversal and
state-machine control flow needed by Rules 2, 5, 14 and 15. The original source's
empirical discussion was condensed; the Graft edition retains the obligations
and selected source links without declaring those external sources freshly
audited.

## Validation

- `pnpm install --frozen-lockfile`: succeeded; no lockfile/package changes.
- `pnpm lint`: passed, exit 0. This checks the existing lint surface; it is not
  a semantic policy verifier.
- `git diff --check` and `git diff --cached --check`: passed, including the new
  documents. The staged path audit contained only the 13 intended policy,
  documentation, template, and generated backlog-artifact files.
- Local Markdown link inspection: all 29 local targets resolved.
  This was a one-off publication check, not a new document-format test.
- `pnpm exec tsx scripts/generate-backlog-dependency-dag.ts`: regenerated DOT
  and SVG, 145 cards / 15 edges / 1 external blocker. The two unresolved legacy
  references to `CLEAN_CODE_export-diff-semver-signature-as-patch` remain visible
  and are already tracked in `CLEAN_backlog-dag-unresolved-internal-dependencies`.
- SVG identity comparison against the base: exactly the three new backlog
  nodes added; no existing nodes removed and no edge identities changed. Layout
  coordinates moved as expected; no separate visual design claim is made.
- `pnpm exec vitest run test/unit/method/backlog-dependency-dag.test.ts`:
  **2 passed**, one file, 582 ms reported total. This existing focused host check
  validates the regenerated backlog artifact; it is not isolated runtime-suite
  evidence and does not validate the policy's prose.
- No new tests, changed assertions, full runtime test run, or release surface
  gate: N/A to the policy-only surface. Existing PR CI still runs independently.

The npm configuration warned about an unresolved `NPM_TOKEN` placeholder;
cached installation and validation succeeded without it. No credentials were
needed or recorded. The generator also emitted an existing Node deprecation
warning without failing.

## Follow-on debt and review

Three cards were filed, all owned by @flyingrobots for review on 2026-10-07:

- [Resource class enforcement](../backlog/bad-code/TEST_size-resource-enforcement.md).
- [Evidence ledger automation](../backlog/bad-code/TEST_evidence-ledger-automation.md).
- [Bounded campaign support](../backlog/bad-code/TEST_bounded-campaign-support.md).

No new cool-idea card or inspector scope was added. Each automation delivery
needs its own design; missing central machinery does not defer the meaning of
binding. This retro and the policy must be committed and validated before the
non-draft PR is opened. `.coderabbit.yaml` currently excludes Markdown, a known
issue already recorded in `CLEAN_coderabbit-path-filters-skip-method-docs`.
Request substantive eligible third-party review; a skipped/acknowledged review
does not meet the merge gate. Merge and release remain separately authorized.
