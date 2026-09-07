# Graft testing policy adoption and enforcement

Policy: [graft.testing/1.0.3](../../TESTING_STANDARDS.md)
Approved and effective: 2026-09-07, by the repository operator
Accountable maintainer: @flyingrobots
First enforcement review: 2026-10-07; covered subsystem risk maps at least quarterly

## Authority and effective scope

The operator approved a separate policy-only adoption of the supplied Testing
Standards with the semantic corrections recorded in the
[design packet](../design/PROCESS_testing-standards-adoption.md). The initial
Graft edition was 1.0.0; the effective version is identified above and its
authorized amendments below. The originally supplied Accepted/Binding
frontmatter had not itself installed repository policy.

The 19 rules bind new and materially changed tests immediately under that
approval, and govern review, failure handling, quarantine, and exception
decisions made from this date. Material changes affect claims, expectations,
covered cases, oracles, dependencies, nondeterminism, resource use, calibration,
or retained evidence. Mechanical moves or import maintenance do not by
themselves require unrelated legacy-test conversion. Deletion is an evidence
change and requires Rule 18 accounting. A shared fixture or harness change
brings into scope tests whose behavior or evidence it actually affects; suite
membership alone does not pull unrelated unchanged tests into scope.

Existing open work applies the policy to subsequent in-scope changes; this
adoption does not authorize rewriting another delivery or its history. The
daemon inspector remains a separate PR. Unchanged legacy tests are not declared
conformant and need no blanket retrofit. Existing stricter Graft repair,
third-party review, and merge/release gates remain in force.

Approval, repository codification, enforcement, and merge are separate facts.
This record establishes the version and intended authority; inspect its Git
commit and PR to determine whether it has reached `main`. It makes no claim
about an unobserved remote branch, a completed suite audit, or future tooling.
Future normative changes require a version increment and an explicit adoption
record describing the changed obligations and scope.

## Authorized amendments

On 2026-09-07 the operator authorized resolution of the
[five review findings](https://github.com/flyingrobots/graft/pull/255#issuecomment-5575909666).
The [repair retro](../method/retro/PROCESS_testing-standards-repairs.md) records
the evidence and publication boundaries. Normative amendments are:

| Effective version | Date | Change and scope |
| --- | --- | --- |
| 1.0.1 | 2026-09-07 | R1: clarify affected-test scope, including actual shared-fixture/harness effects, while excluding unrelated unchanged tests. |
| 1.0.2 | 2026-09-07 | R2: make one cohesive behavioral promise binding in the full rule, checklist, and compression; independent behaviors require separation or an approved scoped exception. |
| 1.0.3 | 2026-09-07 | R3: distinguish intended compiler/deadline/resource/SUT-crash oracle outcomes from incidental or unclassified harness failures; preserve exact XFAIL classification and release-risk decisions. |

The initial 1.0.0 approval remains historical. These amendments neither certify
legacy tests nor authorize a merge, an unrelated legacy retrofit, or deferred
automation.

## What is enforced now

This inventory was inspected at base `e1d34c18fc359b4f7d7f9ba08500421ac0fa9ad5`
on 2026-09-07. It describes the named mechanisms, not an exhaustive audit of
every existing test, fuzz target, or external service.

| Mechanism | Actual state at adoption | Evidence and limitation |
| --- | --- | --- |
| Lint and type checks | Automated in CI | [`ci.yml`](../../.github/workflows/ci.yml), [`package.json`](../../package.json); static checks do not evaluate policy semantics. |
| Isolated regression command | Automated `pnpm test` in Node 22 CI | [`isolated-test-runner.ts`](../../scripts/isolated-test-runner.ts) runs the test container with `--network none`; this is container network isolation, not complete test hermeticity. |
| Test process concurrency | Automated default, caller-overridable | [`isolated-test-args.ts`](../../scripts/isolated-test-args.ts) supplies `--maxWorkers 2` when absent; this is not a per-class resource ceiling. |
| Assertion retries | No retry configured in the inspected Vitest/CI path | [`vitest.config.ts`](../../vitest.config.ts) and the runner; Docker image-build retries are separate, logged infrastructure attempts, not replayed assertion results. New retries still need review. |
| Coverage configuration | V8 provider configured; collection/provider execution not verified in this adoption | [`vitest.config.ts`](../../vitest.config.ts); the inspected default CI command does not collect it or enforce a percentage. Do not claim a coverage report was obtained without running it. |
| Claim calibration, oracle review, red-on-unfixed evidence | Binding, manually enforced in review | PR/design/retro receipts below; no automatic per-claim attestation verifier is installed by this change. |
| Scope, counterexample retention, quarantine/XFAIL and deletion decisions | Binding, manually enforced in review | Visible owned records and explicit approvals; no automatic expiry/first-failure ledger service is installed. |
| Size/resource declarations, budgets and isolation review | Binding, manual declarations plus existing harness controls | Authors specify numeric ceilings and use applicable runner controls; comprehensive class sandboxing and suite-budget reporting are deferred. |
| Generated, fuzz, concurrency, fault, and performance evidence | Binding where the claim requires it; target-specific execution and review | Record actual local/CI experiments and replay inputs. No repository-wide campaign, simulation, or calibrated benchmark infrastructure is established by this policy change. |

These states are deliberately separate: a review obligation is binding; a
configured automated check is implemented; a proposed automated check is
deferred. An automation deferral does not waive a practical authoring-time
demonstration, first-failure record, controlled test, or counterexample replay.

## Evidence without new infrastructure

Use the design packet, test documentation, or retro already required by METHOD.
Link the evidence from the PR instead of copying a large checklist into every
test. One record may cover an atomic claim with several assertions. Identify
independent claims separately and state which failure calibrates each one.

```text
Policy: graft.testing/1.0.3
Change kind / surface:
Claim and contract boundary:
Oracle source:
Test target / owner / size:
Numeric runtime and resource ceilings / suite budget / environment:
Input classes, schedule/fault model, run count/budget, exclusions:
Calibration violation / unfixed revision:
Command and exact intended failed check:
First-failure artifact and observed outcome:
Restored revision / command / passing outcome:
Replay command / corpus case / seed when randomized / configuration:
Counterexample retention or guaranteed replacement:
Actual isolation and resource controls / remaining gaps:
Relevant coverage evidence and consequential unexercised paths:
Exception reference, or none:
```

Store replay seeds outside the test process before launch. Persist logs in a
committed bounded witness or a durable linked CI artifact, recording artifact
retention and preserving the reproducer in the repository corpus. A short
factual receipt with exact output is sufficient; do not commit large raw logs,
credentials, or workstation-specific secrets. Evidence must survive the PR
review window and retain the inputs needed for later regression replay.

For policy/docs-only changes, mark runtime claims and calibration N/A with the
reason, review the semantics manually, and run `git diff --check` plus
`pnpm lint` as required by AGENTS. Do not invent tests for document formatting
or a red runtime test for a change that has no runtime behavior.

## Genuinely missing controls and exceptions

Where an obligation can be met manually, it must be. Where a necessary control
cannot be supplied, the author must obtain an explicit, scoped maintainer risk
decision before integration. A backlog item, a tool's absence, elapsed time,
or an unanswered request is not that decision. This adoption grants no blanket
exceptions and certifies no inherited noncompliance as resolved.

Keep exceptions in the affected design/retro or a linked issue visible to
reviewers. @flyingrobots is the accountable approver; the author or automation
cannot infer approval. Required fields are:

```text
Exception ID / policy version / rule:
Affected claim, tests, revision or delivery scope:
Missing evidence/control and attempts made:
Residual product and test risk:
Compensating checks and available evidence:
Owner and remediation backlog path:
Explicit approver and approval reference:
Expiry date and review trigger:
Resolution or newly approved decision:
```

At expiry, remediate or obtain a new explicit decision. Do not silently extend,
delete the test, or close the discovered defect. Missing ownership escalates to
the accountable maintainer. Until resolved, an expired exception cannot justify
integration. Quarantine and XFAIL records additionally identify the exact
failure, first evidence, continuing execution, and the risk still carried.

## Deferred machinery

All rows are owned for triage by @flyingrobots with first review on 2026-10-07.
That is a review date, not a promise that all platforms ship that day. Each
implementation needs its own design and bounded delivery; none is part of the
inspector's merge criteria or this policy-only PR.

| Deferred mechanism | Binding obligation while deferred | Tracking |
| --- | --- | --- |
| Comprehensive size-class resource enforcement and budget/flake reporting | Declare measured limits, use existing controls, inspect isolation, report gaps and get scoped exceptions for necessary unavailable controls | [Resource controls](../method/backlog/bad-code/TEST_size-resource-enforcement.md) |
| Calibration receipt verification, first-failure/quarantine/XFAIL expiry and selection-audit automation | Manually preserve and review relevant evidence, maintain owned records and review dates, validate affected-test selection with periodic full runs | [Evidence bookkeeping](../method/backlog/bad-code/TEST_evidence-ledger-automation.md) |
| Recurring diff-mutation, generated/fuzz, schedule/fault and calibrated performance campaign orchestration | Run claim-appropriate bounded local/CI evidence with recorded replay, retained counterexamples, risk maps and schedules; missing target capability needs its own exception | [Campaign support](../method/backlog/bad-code/TEST_bounded-campaign-support.md) |

Mutation remains selective by risk; full-system simulation is not mandatory
for every concurrency change. Campaign scheduling support does not alter the
requirement to test the relevant promises now. No repository-wide retrofit,
new coverage target, or automatic policy-document assertion is authorized here.
