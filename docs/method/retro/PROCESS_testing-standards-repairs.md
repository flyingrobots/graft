# Testing Standards review repairs

- Date: 2026-09-07
- Branch: `cycle/testing-standards`
- Reviewed baseline: `02faaf22b6902d2e0e1af43521733ba54061ce94`
- Effective policy: `graft.testing/1.0.3`
- Change kind: normative policy corrections and document presentation repairs;
  runtime behavior unchanged
- Authorization: operator request to resolve all discovered issues following
  [R1–R5](https://github.com/flyingrobots/graft/pull/255#issuecomment-5575909666)
- Status: R1–R5 corrected and locally validated; publication and current-head
  review/CI gates are checked separately

## Scope and validation boundary

The [repair plan](../../design/PROCESS_testing-standards-adoption.md#authorized-review-repair-plan)
preceded implementation. Each issue receives a focused commit. Policy semantics
are checked against concrete examples; runtime RED/GREEN tests and Markdown
assertion suites would not supply the relevant evidence here and are not added.
Use lint, whitespace checks, and the consuming GitHub rendering/delivery surface
where applicable. The initial adoption retro remains a historical receipt.

## R1 — affected tests, not an entire suite

The reviewed design's final “does” repeated “pull the entire suite into scope.”
The corrected design, policy scope, and adoption record now identify changed
tests/claims and actual shared-fixture/harness effects. Amendment 1.0.1 records
the correction; contributor pointers identify the effective version.

Manual semantic playback:

| Change | In scope | Outside the retrofit boundary |
| --- | --- | --- |
| Correct one test's oracle | That test and its affected claims | Unrelated unchanged tests in the same suite |
| Change a shared fixture's observed state | Tests whose behavior/evidence depends on that changed state | Tests unaffected by that state, including unrelated consumers |
| Mechanically move a test without changing its semantics/evidence | No new scope solely because of the move | Other suite members |

The three authoritative scope statements were read against these examples;
none uses suite membership alone to expand adoption. `git diff --cached --check`
and `pnpm lint` passed. Published commit: `c401abe7`; its matching external
review thread is resolved. No legacy tests were changed.

## R2 — one binding strength for cohesive behavior

Rule 3 previously used the defined preference mechanism while checklist item 8
required the atomic promise or an exception. Amendment 1.0.2 makes the full
rule, checklist item, and compressed rule require one cohesive promise.
Independent behaviors require separate tests or an approved scoped exception;
multiple supporting assertions, generated/parameterized cases, “and” names,
and cohesive protocol sequences remain valid.

Manual semantic playback across all three formulations:

| Test organization | Required result |
| --- | --- |
| Rejection preserves balance and ledger, checked by several assertions | Allowed as one atomic promise; calibration still required |
| Many generated inputs check the same normalization invariant | Allowed as cases of the same promise |
| A short request/reply exchange checks one protocol guarantee | Allowed as a cohesive sequence |
| One test checks independent authorization and formatting behaviors | Split the behaviors or obtain an approved scoped exception; a convenience reason alone is insufficient |

The original retro now points to this corrective record without rewriting its
historical validation claims. `git diff --cached --check` passed; the previously
passed lint surface is unchanged. Published commit: `3fdf6fe3`; its matching
external review thread is resolved.

## R3 — intended outcomes and incidental failures

Rule 4 formerly rejected compilation/timeouts by category, and Rule 17 rejected
crashes without distinguishing the observer from the SUT. Amendment 1.0.3
requires the observing oracle to identify the exact outcome and produce a
verdict. Incidental failures that bypass the oracle remain invalid evidence.
Rules 4 and 17, their checklist items, and their compressed rules now make
that distinction. Rule 13 retains release-risk decisions for crash findings
even when a precise XFAIL record exists.

Manual semantic playback:

| Controlled observation | Evidence accepted? | Boundary |
| --- | --- | --- |
| Break an API type contract; its compiler oracle reports the identified diagnostic | Yes, with the violated contract, exact diagnostic, and restored success recorded | Compiler result is the intended check |
| An unrelated import error prevents a runtime behavioral assertion from executing | No | Intended oracle was bypassed |
| Exceed a declared deadline/resource limit; its observing harness records the identified limit failure | Yes, with controlled conditions and a restored successful run | A generic runner hang is insufficient |
| A known SUT crash is observed and precisely matched by an independent XFAIL harness | May match the pin, subject to its owned risk decision | A different crash/result must fail classification |
| The XFAIL harness itself crashes before classifying the SUT | No | Missing observer verdict cannot satisfy the pin |

These are policy counterexamples reviewed across the full rules, checklist,
and compression, not newly executed compiler or fault-injection tests. The
repair changes no runtime behavior or test harness. `git diff --cached --check`
passed. Published commit: `8fa2722b`; its matching external review thread is
resolved. The closeout below records the final lint result.

## R5 — metadata in the repository file view

The adoption record, design, and original retro formerly used bare source
newlines for parallel metadata fields. Their repository-file rendering folded
these into a paragraph. The fields are now explicit Markdown lists, retaining
the policy versions, dates, branch, base, owner, and scope descriptions.
The original retro's 1.0.0 remains its historical basis; the adoption record
continues to identify effective version 1.0.3.

Validation uses GitHub's Markdown API in document (`markdown`) mode before
publication, followed by the published Contents API's HTML representation.
PR-comment (`gfm`) mode is not the file-view oracle because its soft-break
behavior differs. This is a one-off presentation check, not a new automated
repository assertion.

Document-mode rendering returned lists with 4, 3, and 5 fields respectively.
Source comparison against `8fa2722b` preserved all 12 field values after folding
the intentional wrapped list item. `git diff --check` passed.

After publishing `1067c371374e9234de47bf89fd65cbef6c1cb6ac`, the GitHub Contents
API with `Accept: application/vnd.github.html+json` returned explicit metadata
lists of 4, 3, and 5 items in those same three files. This verifies the published
repository-file rendering, not just the local source or comment rendering.

## R4 — stable links in the consuming PR surface

The original `../TESTING_STANDARDS.md` and `../docs/testing/adoption.md` hrefs
survived PR Markdown rendering and resolved to invalid repository routes;
both returned HTTP 404 during the self-review. The template now uses absolute
permalinks to published commit `1067c371374e9234de47bf89fd65cbef6c1cb6ac`, which
contains effective policy 1.0.3 and the corrected adoption metadata:

- [Pinned Testing Standards](https://github.com/flyingrobots/graft/blob/1067c371374e9234de47bf89fd65cbef6c1cb6ac/TESTING_STANDARDS.md).
- [Pinned adoption record](https://github.com/flyingrobots/graft/blob/1067c371374e9234de47bf89fd65cbef6c1cb6ac/docs/testing/adoption.md).

GitHub's Markdown API (`mode=gfm`, `context=flyingrobots/graft`) rendered the
complete revised template. Both hrefs remained the exact absolute permalinks
when resolved from `https://github.com/flyingrobots/graft/pull/255`; both
destinations returned HTTP 200. These links do not depend on the working branch
surviving or on a future merge to become available. The template tells future
policy adopters to update the two pinned URLs and version label together.

## Closeout and remaining gates

- All five findings have corrections and issue-specific evidence above. The
  final link repair is the commit carrying this closeout; Git history and the
  PR activity summary identify its commit SHA after publication.
- Final `pnpm lint`: passed after the template edit. No linted source changed
  during these policy-only repairs.
- Whitespace checks passed for each repair; the final staged check is repeated
  before committing this closeout. Local link inspection resolved all 31 local
  file targets, separately from the two PR-surface HTTP checks.
- No runtime/test/dependency/CI code or backlog cards changed during repair.
  No new policy-format tests, full local runtime suite, or debt/idea cards were
  needed; the three existing automation follow-ups remain open.
- Original adoption and validation receipts keep their historical versions and
  evidence limits. No complete legacy-test audit or new automation is claimed.
- The final published head still needs fresh CI and substantive third-party
  review. Resolving an addressed thread is not a completed review of a later
  head. No merge or release is authorized by this repair record.

No local review finding remains open. Any new external finding must be
evaluated against the exact head rather than inferred from earlier CI or
acknowledgements.
