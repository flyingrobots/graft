# Testing Standards adoption

Status: Accepted design; policy-only delivery
Date: 2026-09-07
Change kind: deliberate policy behavior change; no runtime behavior change

## Hill

Humans and agents working on Graft can identify the effective testing policy,
apply its corrected obligations to new and materially changed tests, and tell
which evidence is reviewed manually and which checks are actually automated.

The operator approved the supplied 2026-08-16 Testing Standards with explicit
semantic corrections on 2026-09-07. This cycle installs a Graft edition as
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
retrofit. Mechanically moving an unchanged test does not pull the entire suite
into scope; changing its oracle, coverage, environment, or calibration does.

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
