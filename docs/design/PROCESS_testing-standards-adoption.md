# Testing Standards adoption

- Status: Accepted design; policy-only delivery
- Date: 2026-09-07
- Change kind: deliberate policy behavior change; no runtime behavior change

## Hill

Humans and agents working on Graft can identify the effective testing policy,
apply its corrected obligations to new and materially changed tests, and tell
which evidence is reviewed manually and which checks are actually automated.

The operator approved the supplied 2026-08-16 Testing Standards with explicit
semantic corrections on 2026-09-07. This cycle initially installed the Graft edition
`graft.testing/1.0.0`. The supplied document's Accepted/Binding frontmatter was
not, by itself, a prior Graft adoption record.

## Acceptance criteria

1. A single versioned policy contains all 19 full rules, the reviewer checklist,
   and the compressed standard, with consistent obligations in all three.
2. Calibration of new/materially changed consequential claims remains binding;
   multiple assertions may establish one claim. Manual evidence is sufficient
   where automation is absent; missing machinery is not an implicit waiver.
3. Known counterexamples remain in guaranteed replay. Quarantine expiry and
   absent ownership require remediation or an explicit risk decision, not
   automatic deletion. Refactoring preserves expectations, not file locations.
4. Bounded tests make bounded claims. Oracle failure requires diagnosis;
   simulation has a declared model boundary; fixed fault schedules are valid;
   absolute performance promises remain testable.
5. Effective version, scope, legacy treatment, exception authority, and actual
   enforcement states are recorded and linked from contributor entry points.
6. Deferred automation has owned backlog records and review dates. No tool is
   described as implemented without file/command evidence.
7. This branch contains policy, integration documentation, a PR template, and
   local retro only. The daemon inspector delivery remains separate.

## Playback questions

- Does a three-assertion atomic rejection promise still need calibration?
- May a test move without changing its contractual expectations?
- May an example disappear because a generator could produce it?
- Does a specified-oracle failure already establish that production is wrong?
- What happens when quarantine expires or has no owner?
- Can a fixed crash schedule satisfy the recovery rule without a random seed?
- What must an author supply before mutation or quarantine automation exists?
- Which exact controls does the existing isolated runner provide?

## Scope and non-goals

The binding core takes effect under the operator's approval for new and
materially changed tests, and failure/waiver decisions made from adoption
onward. This does not certify unchanged legacy tests or require their wholesale
retrofit. Mechanical moves do not bring unrelated tests into scope. Changing
a test's oracle, coverage, environment, or calibration brings that changed test
and its affected claims into scope. A shared fixture or harness change also
brings tests whose behavior or evidence it actually affects into scope.
Unrelated unchanged tests remain outside that boundary even in the same suite.

No test runner changes, test rewrites, new runtime dependencies, policy-format
tests, mutation service, simulation platform, coverage target, observability
feature, or inspector PR change belongs to this delivery. Git, RED/GREEN repair,
local Retro, third-party review, and merge/release authority remain governed by
the existing repository workflow.

## Validation strategy

This is a policy change, not executable/product behavior. Review the policy
against the approved amendments and play back the concrete questions above.
Check full rules, checklist, and compression together. Run `git diff --check`
and `pnpm lint`; inspect local links and the staged path list. Do not manufacture
RED/GREEN runtime evidence or write tests for Markdown structure. Complete and
commit the local retro before opening the non-draft PR.

## Delivery

One independently reviewable policy adoption commit and PR. A separate adoption
record distinguishes approval/effect from branch publication and merge; Git and
the PR remain the authority for whether the policy has reached `main`.

## Authorized review repair plan

The operator authorized resolution of R1–R5 from the
[self-review](https://github.com/flyingrobots/graft/pull/255#issuecomment-5575909666).
External Codex review also raised R1–R4. Each concern gets a separate focused
commit and its own validation entry in the
[repair retro](../method/retro/PROCESS_testing-standards-repairs.md).

1. R1: make the affected-test scope explicit, including genuinely affected
   consumers of a changed shared fixture or harness.
2. R2: use one binding strength for cohesive behavioral promises in the rule,
   checklist, and compression while preserving multiple supporting assertions.
3. R3: admit intentionally checked compiler/deadline/resource/crash outcomes;
   reject incidental failures that prevent or bypass the intended oracle.
4. R5: render metadata as lists in the adoption record, original design, and
   original retro, preserving their values.
5. R4: replace relative PR-template links with immutable GitHub blob URLs to
   the published documents after R1–R3 and R5. R5 precedes this final link step
   so the pinned adoption record includes its corrected presentation.

The three normative corrections receive patch versions 1.0.1, 1.0.2, and 1.0.3
with explicit amendment records. R4 and R5 change presentation, not policy
meaning. Historical adoption/validation records retain their original basis.
No runtime tests or policy-format assertions are added. Use manual semantic
counterexamples for R1–R3, GitHub file rendering for R5, and rendered PR hrefs
plus HTTP delivery for R4, with lint and whitespace checks. Required PR CI and
current-head third-party review remain separate from local correction receipts.
