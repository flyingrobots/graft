---
Title: Graft Testing Standards
Policy: graft.testing
Version: 1.0.0
Status: Accepted
Binding: true
Adopted: 2026-09-07
Scope: new and materially changed tests; subsequent review and failure decisions
Source: operator-supplied Testing Standards dated 2026-08-16, with approved corrections
---

# Testing Standards

This is the Graft edition of the supplied 19-rule standard. The operator
approved its corrected adoption on 2026-09-07. The [adoption record](docs/testing/adoption.md)
defines applicability, evidence, exceptions, and actual enforcement state.
Acceptance does not certify unchanged legacy tests, completed automation, or
publication to `main`; Git and the PR establish publication state.

The numbered rules are binding within that scope. “Must” expresses an
obligation; “prefer” expresses a default whose alternative needs a reason.
The checklist and compressed standard are review aids for the same rules,
not separate policies. Correct contradictions in these views; do not choose
whichever formulation is easier. [CODE_STANDARDS.md](CODE_STANDARDS.md) continues
to govern Graft's RED/GREEN repair and review workflow.

## The frame

A test is an experiment with controlled inputs and an encoded expectation.
Input exploration and oracle quality are independent: many inputs with a weak
oracle and a strong oracle on one example answer different questions. Neither
case counts nor a green run establish general correctness.

This standard addresses three useful categories of suite failure: false
confidence, false alarms, and decay. Each rule names the failure it prevents.
Account for claims, counterexamples, and blind spots. A useful test has an
explicit oracle, demonstrated sensitivity to a relevant violation, a stated
exploration boundary, and a failure that identifies the affected promise.
It is not a perfect detector of every implementation or specification defect.

## 1. Test at the narrowest boundary that owns a contract

Test the behavior where its promise is owned: a module contract, port, CLI,
wire format, durable record, or another stable boundary. A contract may be
internal and owned by the same team. Public visibility and organizational
separation are neither necessary nor sufficient to make it meaningful.

Prefer narrow tests over outermost end-to-end tests when the narrow boundary
can honestly express the risk. Avoid freezing private helper choreography or
incidental representation. A B-tree invariant or conflict lattice can warrant
direct internal testing; explain the invariant and why that boundary owns it.
Extracting a module can improve design, but do not create a production public
API merely to satisfy a test rule. Stable behavioral expectations should
survive implementation refactoring. See the discussion of public behavioral
testing in [SWE at Google, chapter 12](https://abseil.io/resources/swe-book/html/ch12.html).

**Prevents:** structure-sensitive tests, unnecessary API expansion, and slow
outer-boundary testing of behavior a smaller contract already owns.

## 2. Assert observable outcomes and guard against vacuity

Assert artifacts, return values, durable state, exit semantics, emitted
messages, refusals, released resources, or the absence of forbidden effects.
Use parsed semantic projections, unordered collections when order is not
contractual, and exact output only where the exact artifact is the contract.
Do not assert implementation text or incidental terminal wording.

For a universal output property, inspect all relevant output elements rather
than hand-listing today's fields. Report the witness count and assert required
existence separately. An empty domain may be valid, but a zero-witness run
cannot establish that a required element was checked. For protected schemas,
classify every relevant shape and reject unrecognized shapes; a field-name
regex alone is not evidence of complete secret protection. Specify the
traversal's scope so unrelated opaque fields do not acquire accidental rules.

Interaction assertions are appropriate when the interaction itself is the
contract, including a prohibited lease renewal, workload enqueue, or resource
pin. They must not become a transcript of private collaboration. A forbidden
effect test may observe an authoritative dependency boundary and its state
transitions; absence of changed files alone is insufficient evidence.

Prefer real dependencies where fast, deterministic, and constructible. Fakes
need an owner and a shared conformance suite against the real dependency for
the semantics they replace. Use stubs for explicit cases and mocks for
contractual interactions. If real conformance cannot run locally, record how
it is verified and the remaining drift risk; a schema or recorded response
alone does not establish stateful behavioral equivalence. Missing required
verification needs a scoped exception, not an unowned fake.

**Prevents:** tests that verify choreography while missing the result,
vacuous universal checks, leaking new fields, and silently drifting doubles.

## 3. Organize tests by behavior and classify changes

Every change declares the applicable kind or kinds: pure refactoring, new
feature, bug fix, or deliberate behavior change. For documentation, policy,
build, or test-harness maintenance, name that surface and explicitly say when
runtime behavior is unchanged. Mixed changes must identify their components.

Refactorings preserve contractual expectations. New features add expectations;
bug fixes add a regression; deliberate behavior changes explain changed
expectations. Test moves, imports, fixture improvements, harness changes, and
corrections to an erroneous oracle are legitimate maintenance when explained.
An oracle correction is not evidence that the old expectation was preserved.
Do not change goldens to conceal an unintended behavior change.

Prefer one atomic promise per test, not one test per function or assertion.
Several checks may establish one promise: rejection preserves balance and
ledger. A name such as `rejection_preserves_balance_and_ledger` is valid.
“And” is a review clue about cohesion, never a banned token. Short protocol
exchanges and parameterized cases are valid; label the behavior and each case
so a failure is identifiable. Keep incidental setup out of the assertion story.

**Prevents:** method-shaped suites, concealed behavior changes, fragmented
evidence, and syntax rules that obstruct legitimate test maintenance.

## 4. Demonstrate sensitivity for each consequential claim

Every new or materially changed load-bearing claim must have authoring-time
calibration evidence showing its test fails for a relevant violation. The
accounting unit is the consequential claim, not the assertion statement.
Several assertions may jointly establish one atomic claim; the receipt must
identify what each demonstration establishes and what it does not exercise.
One early failure does not calibrate independent checks that never execute.

Use an observed regression on unfixed code, a controlled fault or behavioral
mutation, or injected invalid observations that violate the checked property.
A correctly rejected invalid request is a useful example, but its passing
negative-path assertion is not itself a demonstrated failed check. Record the
claim, command, source revision, changed fault/input, intended failed check,
actual failure, and restored passing run. Preserve output or a durable CI
artifact; “would fail” and an unrecorded recollection are insufficient. Manual
execution is acceptable and mandatory evidence remains practical without a
mutation service.

The violation must reach the intended check. Compilation, setup, timeout, or
unrelated earlier failures do not establish its sensitivity. A behavioral
mutation changes the protected behavior while preserving the path to that
check; a behavior-preserving mutation cannot demonstrate detection of a
behavioral violation. Invalidate relevant caches and verify the mutated build
actually ran. Detect skipped callbacks and unexecuted checks; a test required
to make an assertion must not silently execute zero assertions.

Use continuous diff-scoped mutation where risk justifies it, with bounded work,
arid-line filtering, and survivor triage. Equivalent mutants and changes solely
to unpromised optimizations are not automatically missing tests. Never gate on
a mutation percentage. Calibration establishes sensitivity to the demonstrated
faults, not adequacy against every possible fault. The distinction between
selective mutation and universal mutation adequacy is also discussed in
[Practical Mutation Testing at Scale](https://homes.cs.washington.edu/~rjust/publ/practical_mutation_testing_tr_2021.pdf).

**Prevents:** vacuous or unexecuted checks, unrelated red runs presented as
evidence, stale-build calibration, and mutation-score targets.

## 5. Explore quantified claims with generated evidence

For claims such as “these paths agree” or “this refactor preserves behavior
over these inputs,” use generated differential, property, or metamorphic
evidence over a declared domain; exhaustive enumeration of a tractable declared
domain is also valid. A few hand-selected examples alone do not discharge a
claim about a space. Existing suitable generated evidence may be reused when
its scope covers the changed contract. Keep named examples for readability.

Record input classes, generator constraints, run budget, oracle, and excluded
regions. Classify generated cases so thousands of empty values do not masquerade
as diverse exploration. Generated evidence supports a bounded conclusion; it
does not prove unrestricted equivalence. Exhaustion applies only to the exact
enumerated domain and modeled execution conditions.

For randomized runs, persist the seed outside the test process before launch;
retain generator/build/configuration versions and a replay command. Use a
reproducible baseline and additional recorded exploration seeds. Shrinking or
reduction is required for generated failures; record a scoped exception when
the target cannot yet support it. Fixed enumerations need their case/schedule
identity, not a fictitious seed.

Promote minimized counterexamples into the permanent regression corpus and
execute them deterministically in the relevant regression run. Retain named
examples where they explain the promise. A replacement may remove duplicate
storage only if it necessarily replays the relevant case or deterministically
subsumes its trigger and checks, with that mapping recorded. “The generator
could produce it” is insufficient. Rule 18 governs actual retirement.

Differential oracles can share a specification error, and the old version can
be wrong. Keep independently specified checks; explicitly re-scope intended
behavior changes instead of preserving an old bug. See the original
[QuickCheck paper](https://www.cis.upenn.edu/~bcpierce/courses/552-2008/resources/icfp-quickcheck.pdf)
for property-driven input exploration.

**Prevents:** overgeneralized example evidence, irreproducible exploration,
lost counterexamples, correlated-oracle confidence, and bug-for-bug lock-in.

## 6. Name the oracle and diagnose disagreement

Every claim must have an identifiable source for its expectation. State it in
the test's construction; add a one-line oracle note when it is non-obvious.
Useful categories are specified requirements, derived reference models or
vectors, invariants/relations, differential comparisons, and characterization
goldens. These identify evidence, not an infallibility ranking. A requirement
may itself be an invariant, and a reviewed golden may encode a specified wire
contract rather than merely today's implementation output.

Prefer an independent, simple model to duplication of the production algorithm.
Do not compute expected and actual with the same helper that could contain the
defect under test. Label characterization explicitly; minimize and review it
under Rule 17, and add stronger semantic checks where an oracle is available.

> A specified oracle detects disagreement between observed behavior and an
> encoded contractual expectation. Diagnosis determines whether the defect lies
> in the implementation, expectation, harness, or governing contract.

A failure can block integration without establishing which component is
guilty. Do not relabel a failed expectation as a product defect, or bless an
oracle change, without diagnosis. See the survey of the
[oracle problem](https://dl.acm.org/doi/10.1109/TSE.2014.2372785).

**Prevents:** tautological expectations, oracle laundering, and premature
assignment of blame from a failing test.

## 7. Construct determinism at the sources actually observed

Control time, randomness, scheduling, environment, and identity where they
affect the verdict. Inject clocks for time-dependent semantics and use
monotonic durations. Persist random seeds before execution. Synchronize on
conditions or explicit scheduler events, never a bare sleep. Own relevant
environment variables, locale, timezone, DNS assumptions, IDs, and temp paths.

Do not add seams for imaginary dependencies. A test may use real OS resources
when that is its contract; the harness must bound and record those observations
and accurately state residual nondeterminism. Real scheduling and I/O need
integration evidence even when the model is deterministic. An uncontrolled
identity may be irrelevant after a justified semantic projection; it must not
silently influence a claimed deterministic verdict.

Record build, environment, clock/configuration, input, and schedule needed for
replay. A seed alone is insufficient when execution also depends on uncontrolled
events. Existing ambient dependencies are not retroactively certified; for an
in-scope change, control them or record a scoped exception and follow-on work.

**Prevents:** nondeterminism hidden behind a fixed seed and unnecessary
abstraction around resources that cannot affect the claim.

## 8. Make tests hermetic by default

Tests own the mutable state they observe and clean it up. Use fresh scratch
directories, schemas, or namespaces; harness-controlled environment; no ambient
external network; and no shared mutable fixtures. Bind local servers to port
zero and read the assigned port. Check isolation by running relevant new or
changed tests alone, shuffled, and concurrently where their declared size
supports it. Record the conditions and limits of this examination.

Sharing immutable conformance vectors and infrastructure with demonstrable
per-test rollback or namespace isolation is valid. Share builders with explicit
inputs when they improve clarity; do not hide changing fixture state in a
shared scene. Real external integration tests must be separately classified,
owned, bounded, and explicitly identified as nonhermetic, with their gating
risk addressed under Rules 10 and 19.

Enforce denied egress and resource isolation in the harness where available;
review the actual control rather than a “hermetic” label. Periodically check
covered suites in a minimal environment with recorded environment variation.
Container execution alone does not control time, scheduling, or shared state.

**Prevents:** order dependence, ambient-service failures, port collisions, and
mistaking shared infrastructure for safely isolated test state.

## 9. Declare test size, resource ceilings, and suite budgets

Every in-scope test inherits or declares a size, resource policy, owner, and
numeric runtime ceiling through an identifiable target or suite. Size measures
resources, independently of the behavior's scope. Use the smallest honest size.

| Size | Resource ceiling |
| --- | --- |
| Small | One process; no test-created threads, sleeps, application filesystem/database I/O, or network. Harness code/fixture loading is declared infrastructure. |
| Medium | One machine; owned files/processes/databases; loopback communication only. |
| Large | Resources beyond medium, explicitly bounded and identified. |

Each covered suite must declare a latency budget, concurrency/resource caps,
measurement environment, and CI stage. Prefer millisecond-scale small tests;
choose numeric limits from the contract and measured harness costs, not an
unmeasured universal number. Measure per-class p95 and total feedback latency;
reclassification does not excuse an overall budget regression. Explain testing
the same promise at multiple sizes by the distinct risks each detects.

Enforce configured ceilings with actual timeouts and resource controls.
Until comprehensive class enforcement exists, declarations and manual resource
inspection remain required, actual supported controls must be used, and gaps
must be recorded as in the adoption record. Do not describe manual inspection
as sandbox enforcement. A missing necessary control needs a scoped exception.
Separate a resource-limit failure from a noisy timing sample before diagnosing
behavior; both may block under an appropriate declared rule.

Small tests belong in the fast integration gate, medium tests before merge,
and larger exploration/platform/performance campaigns in risk-appropriate
scheduled and release stages. No mandatory portfolio ratio substitutes for
the subsystem risk map.

**Prevents:** unbounded suites, dishonest size labels, latency decay, and
arbitrary timing gates that create false alarms.

## 10. Preserve first failures and own quarantine risk

Treat intermittent failure as a possible product defect until diagnosis.
Preserve the first failure. Reruns on the same revision may characterize it,
but a retry does not erase the original verdict or turn an unexplained failure
green. Record retry counts, inputs, environment, and all outcomes.

Remove an untrustworthy test verdict from the normal gate the day the flake is
identified, through an explicit quarantine/risk decision. Quarantine keeps the
test running and visible with an owner, defect link, first-failure evidence,
affected promises, compensating checks, and expiry. Quarantine is not a waiver
of a known production race; release risk needs an explicit decision.

Assign unowned failures to the repository maintainer for triage. Never delete
them automatically. At expiry, require remediation or an approved, time-bounded
risk decision with a new review date. Retain failure evidence and unresolved
product risk even if deletion is separately justified under Rule 18. An expired
exception cannot silently continue authorizing integration.

Classify the smallest affected unit, investigate root cause, and measure flake
rate against a declared budget. Exercise relevant new/changed tests with repeated
and reordered runs before relying on them as gates. A clean sample is bounded
evidence, not proof of zero flakiness. Diagnostic automation may help, but an
owner and a visible ledger are required without it.

**Prevents:** retry-to-green, alert fatigue, hidden production races, and
quarantine expiry being mistaken for resolution.

## 11. Use coverage to inspect gaps, not certify quality

Inspect changed-code coverage and periodic subsystem maps to ask what was not
exercised. Record consequential gaps and their risk. Coverage measures execution,
not the quality of the oracle; pair it with calibration and behavioral evidence.
No project-wide coverage percentage or mutation score is a quality target or
merge gate.

A component owner may choose a documented local diff-coverage review check or
a structural-completeness obligation for a narrow kernel. State its purpose,
scope, exclusions, and tradeoffs; it does not certify correctness. A local check
must not become a disguised repository percentage target. Preserve useful
defensive branches instead of deleting them to improve the number. See the
limitations and costs described in [SQLite's testing documentation](https://www.sqlite.org/testing.html).

Use coverage for review, archaeology, and investigating a changed suite on
unchanged source. Do not reject a valuable black-box test just because it adds
no newly executed lines. Do not describe an unavailable coverage report as zero.

**Prevents:** assertion-free coverage theater, averages hiding critical gaps,
and a metric being presented as a correctness judgment.

## 12. Observe the regression on unfixed code

A bug fix must include a regression observed failing for the relevant reason
on the unfixed implementation, then passing with the fix. Graft's existing
RED/GREEN repair workflow remains in force. Preserve the exact parent/build,
command, reproduction, failed check, and restored result; separate test/fix
commits or an independently replayable red-on-parent receipt are acceptable.
Porting a test to an older harness must not change the behavior being checked.

Test the correct boundary behavior, not the mechanism of this particular patch.
Keep the named reported case and use generated or systematic boundary evidence
for its failure class. Preserve generated counterexamples under Rule 5.

For an irreproducible failure, record the attempts, evidence, uncertainty,
reviewed exception, owner, and expiry. Add useful invariant checks or diagnostic
instrumentation and expand the relevant input, schedule, or fault exploration.
Keep the reproduction gap tracked until understood. Do not block an urgent,
reviewed mitigation behind an impossible reproducer, or claim an unobserved
test went red. “Obvious” and “trivial” are not exemptions.

**Prevents:** regressions without causal evidence, tests that die with a
refactoring, and false reproduction claims made to satisfy a process.

## 13. Fuzz trust-boundary parsers and property-test transformations

Trust-boundary parsers, decoders, deserializers, frame/file readers, and query
front ends in scope must have maintained fuzz targets and recurring exploration.
Total transformations must have relevant invariant, round-trip, or relational
tests. Identify the meaningful property; a matching encoder and decoder can
share a bug, so round-trip success alone is not conformance evidence.

Targets must build with the code and replay a minimized, deduplicated corpus in
CI. Run exploration with suitable assertions and sanitizers where supported,
structured seeds/dictionaries, a recorded budget, and retained reproducers.
Strengthen crash/hang oracles with validity, semantic, differential, or
corruption checks when those promises exist. Schema validation does not make a
custom decoder's trust-boundary risk disappear.

Crash, corruption, and sanitizer findings are release-relevant failures needing
repair or an explicit risk decision under Rule 19. Scope targets by the actual
input surface; do not build an unrelated fuzz platform for each CRUD handler.
Missing campaign infrastructure must be recorded with the manual/local evidence
and any necessary exception, not described as continuous fuzzing. Manage corpus
size while preserving deterministic replay of known failures under Rule 5.

**Prevents:** unexercised hostile-input paths, crash-only oracles presented as
semantic checks, dormant fuzz targets, and corpus growth without curation.

## 14. Explore concurrency within an explicit model boundary

Concurrency promises require controlled interleaving evidence at the boundary
that owns them. Start with explicit dispatchers, barriers, and event orderings;
use recorded seeded scheduling, bounded systematic exploration, or deterministic
simulation as risk and architecture justify. State explored operations,
scheduling points, bounds, fairness assumptions, and excluded executions.
Fixed schedules are useful deterministic regressions.

Separate safety from liveness. Test progress under stated healthy conditions,
fairness, and bounded modeled time/steps; a timeout alone neither proves a
deadlock nor establishes eventual progress. Retain schedules/inputs and enough
build/configuration information to replay failures.

A simulation only explores its model and intercepted dependencies. It can miss
real OS behavior, memory-model effects, I/O semantics, or uninstrumented races.
Use real integration, race detectors, stress runs, or external history checking
to cover those boundaries. Stress is supplementary evidence, not a substitute
for controlled schedules or a proof of correctness. A seeded single-thread
scheduler does not strictly subsume all real-thread stress behavior.

Race-detector silence does not establish linearizability or deadlock freedom.
State-space explosion limits exploration; report the bound and residual risk.
Where control is missing, add the narrow seam or record a scoped exception and
appropriate supplementary evidence. Do not require a whole-system simulator to
test one callback ordering. [CHESS](https://www.usenix.org/event/osdi08/tech/full_papers/musuvathi/musuvathi.pdf)
is an example of bounded systematic scheduling.

**Prevents:** stress results presented as complete concurrency evidence,
unreplayable races, untested liveness, and simulations overstating their scope.

## 15. Inject faults into durability and recovery promises

Every in-scope durability or recovery promise needs controlled fault injection
against its stated fault model: crash, torn/reordered writes, full disk,
allocation failure, timeout, cancellation, restart, or combinations that apply.
Maintain a subsystem fault matrix crossing relevant fault types with phases,
including faults during recovery. Explain excluded cells and residual risk.

Use deterministic fixed schedules, enumerated failure points, or recorded
seeded schedules. Record the fault script/point, source/build/configuration,
initial persisted state, oracle, and replay command. A seed is necessary when
randomness drives the schedule, and insufficient without the other replay
inputs. It is not required for a fixed schedule.

Check integrity and promised recovery behavior after each injected fault,
including stacked faults where relevant. Fake storage/network adapters test
the model they implement; add real integration evidence for OS/storage promises
the fake cannot establish. Quantified recovery point/time commitments need
explicit conditions and numeric checks. An unexecuted runbook is not evidence.

**Prevents:** untested recovery paths, fault models omitting recovery itself,
seed-only artifacts that cannot reproduce a failure, and model overclaims.

## 16. Measure performance as a controlled experiment

State the hypothesis, workload, environment, warmup, run budget, oracle,
confounders, and decision rule before interpreting measurements. Report suitable
distributions and sample counts; latency claims need relevant percentiles and
maximum, while throughput and resource claims need their own measures. A p99
from too few samples must not be presented as a stable estimate.

For comparative regressions, control machine class and confounders where
practical, randomize run order, and prefer a same-run baseline when comparing
shared-runner measurements. State tolerance and uncertainty; ratios do not
eliminate every confounder. For an absolute contractual requirement, also test
the absolute bound under its declared workload and environment. A relatively
unchanged implementation can still violate its latency or memory contract.

Account for coordinated omission when measuring offered-load latency. Validate
the load generator against a known service and demonstrate sensitivity to a
deliberately slowed or resource-inflated variant. Preserve first-failure data.
Scheduled controlled experiments and release checks may enforce justified
limits; cheap same-run smoke measurements may provide pre-merge evidence when
their noise and tolerances support it. Do not gate on a threshold narrower
than the experiment's natural uncertainty.

**Prevents:** misleading timings, omitted latency pain, noisy gates, and
relative comparisons masking an absolute contract violation.

## 17. Review golden changes and keep expected failures precise

Minimize goldens to the contractual artifact. Canonicalize only incidental
variation: never strip a timestamp, order, path, or identity whose semantics
the test promises to verify. Label the oracle source under Rule 6. Pair
characterization with stronger semantic checks where available.

Re-baselining is a review event: explain the behavior change or legitimate
oracle/harness correction and inspect the diff. Bulk updates require a
reviewable common cause and semantic evidence, or decomposition; “update all”
is not its own justification. Refactoring preserves contractual expectations
even when tests or artifact storage move. A changed golden is a question to
diagnose, not automatic proof of a product bug.

Known deterministic failures may be pinned as XFAIL with the correct desired
expectation, owner, issue, expiry, and narrowly identified expected failure.
An unexpected pass must fail the expectation check and trigger promotion. An
unrelated failure, setup failure, or crash must not count as the expected bug.
Expiry requires remediation or an explicit risk decision under Rule 10.
Quarantine is for an untrusted verdict; XFAIL records a trusted known failure.
Both stay visible and neither resolves the underlying product risk.

**Prevents:** unread approvals, accidental normalization of wrong behavior,
overbroad XFAIL masks, and permanent hidden known failures.

## 18. Maintain tests as production code and account for deletion

Review tests for obviousness and actionable failures. Prefer straightforward
arrange/act/assert and descriptive names over clever abstraction. Parameterized
loops, output traversal, state-machine histories, and fault exploration are
legitimate where they express the claim. Do not impose a blanket prohibition
on control flow that would prohibit the generated tests required elsewhere.
Nontrivial checkers, generators, and replay harnesses are software and warrant
their own validation; simple expected-value code should stay easy to inspect.

Failures must show the promise, actual/expected outcome, relevant inputs, and
replay command, with seeds/schedules when applicable. Bound diagnostic output
and redact secrets without destroying the controlled reproducer; use synthetic
fixtures or appropriately scoped artifact storage where necessary.

Record deletion criteria at the claim/suite level and apply them explicitly:
the protected behavior was removed; an identified stronger/cheaper replacement
necessarily preserves the relevant evidence; a duplicate corpus entry has
equivalent guaranteed replay; or an unjustifiable test is retired through an
approved risk decision that identifies the remaining gap and its owner.
Record the criterion, displaced risk, and replacement in the change.

A generator's possible output is not guaranteed replay. Quarantine expiry,
missing ownership, an unreadable golden, or a surviving mutant initiates
investigation; none alone authorizes deletion. A red test cannot be removed
merely to make CI green. Retain the known counterexample and failure evidence
unless its retirement is specifically justified with the affected promise.

Measure suite latency, flakes, quarantine/XFAIL age, reruns, and test churn
during refactoring. Review the credibility of covered suites and their risk
maps at least quarterly. Owners maintain the metadata and report unaddressed
blind spots; this is curation, not a quota for test counts.

**Prevents:** opaque harnesses, growing test maintenance cost, deletion as
failure concealment, and counterexamples silently lost during consolidation.

## 19. Gate on trustworthy evidence and explicit risk decisions

Required tests run before integration on the smallest justified affected set,
with periodic full-suite validation of selection. Releases run the applicable
full platform/risk matrix. Failures block by default until fixed, reverted,
diagnosed as unrelated with evidence, or covered by an approved, scoped,
expiring risk decision. A broken mainline takes priority over feature work.

Appropriate gates include controlled behavioral/contract suites, claim
calibration, red-on-unfixed evidence, relevant fuzz/sanitizer findings, actual
resource limits, XFAIL symmetry, and well-founded performance decisions.
Review-enforced obligations are binding before they have an automated check.
Do not gate on project coverage percentages, mutation scores, thresholds below
natural measurement variance, or an unexplained retry-to-green result.

Every target and failure needs an owner. Preserve command, build, relevant
environment, first-failure logs/diffs, and replay input or minimized case.
History/fault tests need operation identities and causal/schedule evidence
sufficient to investigate. Diagnostics are part of testability; retain only
appropriately scoped, safe artifacts. Observe infrastructure retries separately
from assertion retries; neither may conceal the failing test verdict.

Exceptions must follow the [adoption record](docs/testing/adoption.md): specific
claim/rule/scope, evidence and attempts, residual risk, compensating checks,
owner, explicit maintainer approval, expiry, and remediation. An automation
backlog card is not an exception. Existing Graft third-party review, current-head
CI, and separate merge/release authorization remain in force.

**Prevents:** green builds manufactured by reruns, unowned failures, selection
gaps, and missing tooling being treated as permission to omit evidence.

## Test types and evidence

| Technique | Oracle and useful boundary | Limit to record |
| --- | --- | --- |
| Named behavioral/boundary example | Encoded requirement on an explicit case | Other cases not explored |
| Property / metamorphic | Invariant or relation over generated cases | Generator domain and partial oracle |
| Differential | Reference implementation or prior version | Shared errors and intentionally changed behavior |
| Golden / characterization | Reviewed artifact; requirement or prior output | Whether wrongness or only change is detected |
| Contract / conformance | Shared expectations across dependency and double | Verified operations and environment |
| Fuzz | Robustness, semantic, or differential oracle | Corpus, budget, and unobserved classes |
| Schedule exploration / simulation | Safety and progress under a model | Scheduling, memory, I/O, and fault assumptions |
| Fault injection | Required behavior after controlled faults | Fault matrix and recovery phases |
| Performance | Comparative or absolute quantitative requirement | Workload, sample, uncertainty, hardware |
| XFAIL | Desired expectation with an identified known failure | Accepted defect and expiring risk decision |
| Human exploration | Human judgment discovering cases | Convert findings to retained regressions or tracked reproduction gaps |

Each covered subsystem needs a concise risk map: consequences, contract
boundaries, owners, consequential claims and oracles, fault/model assumptions,
CI stages/budgets, and accepted blind spots. Keep it in the design packet or
existing test documentation; avoid a redundant case-by-case prose catalog.
Review at least quarterly and when material risks change. Portfolio ratios
follow the risks; no fixed pyramid ratio or one-E2E-per-journey ceiling applies.

## Reviewer checklist

For each applicable item, require evidence or a recorded exception. An item
outside the change's scope is N/A with a reason, not silently satisfied.

1. **Calibration (4):** Which new/materially changed consequential claims were
   demonstrated sensitive to relevant violations? Did the intended checks run
   and fail, and does the receipt distinguish independent checks?
2. **Oracle (6, 17):** Is the expectation's source clear? Is characterization
   labeled and reviewed? Does a failure trigger diagnosis rather than assume
   the implementation is guilty?
3. **Regression (12):** Where is the observed red on unfixed code and restored
   green, or the approved reproduction exception and expanded evidence?
4. **Change kind (3, 17):** Are behavior changes separated from test maintenance?
   Do refactorings preserve contractual expectations even if files move?
5. **Boundary (1):** Does the narrowest meaningful contract own the claim,
   including legitimate internal contracts without forced public APIs?
6. **Outcomes (2):** Do assertions observe contractual results or effects,
   including prohibited effects, rather than private choreography?
7. **Vacuity (2):** Are universal traversal scope and witness counts explicit,
   required existentials checked, and unknown protected shapes rejected?
8. **Cohesion (3, 18):** Does the test express one atomic promise clearly?
   Multiple assertions, “and” names, traversal, and protocol sequences are
   allowed when they serve that promise.
9. **Isolation (8):** Are state/network/ports owned and bounded? What did alone,
   shuffled, parallel, and repeated runs establish within this test's size?
10. **Replay (7):** Which time, randomness, scheduling, environment, and identity
    inputs affect the verdict, and which are controlled or explicitly limited?
11. **Size (9):** Are class, owner, numeric ceilings, suite budget, actual
    controls, and unautomated gaps declared honestly?
12. **Doubles (2):** Which shared conformance evidence covers the fake's
    behavior? Is any missing verification an explicit scoped exception?
13. **Flakes (10):** Is first-failure evidence preserved? Are owner, risk,
    compensating checks, and expiry present? Expiry is not deletion authority.
14. **Coverage (11):** Is coverage used to inspect relevant gaps without claiming
    oracle quality or imposing a repository percentage target?
15. **Generation (5, 13):** Are domain, budget, external seed record when random,
    reduction, and replay retained? Does replacement necessarily execute known
    cases rather than merely have a chance to generate them?
16. **Concurrency (14):** Which schedules/model assumptions were explored?
    Are safety, progress, real-system evidence, and simulation limits separate?
17. **Recovery (15):** Which fault-matrix cells, including recovery faults, were
    exercised? Can fixed or seeded schedules and initial state be replayed?
18. **Performance (16):** Are the workload, distribution, uncertainty, and
    calibrated harness appropriate to comparative and/or absolute promises?
19. **Curation and gates (18, 19):** Does deletion preserve evidence or explicitly
    account for residual risk? Are selection, owners, exception approvals, and
    current-head integration gates satisfied without retry-to-green?

Quarterly review checks the scoped risk maps, suite latency and flake budgets,
quarantine/XFAIL ownership and expiry, replay corpora, relevant parser targets,
schedule/fault evidence, sampled calibration and coverage gaps, test selection,
and justified deletions. Record findings and follow-on work. Do not claim an
unperformed audit of unchanged legacy tests.

## Contested choices and Graft's decisions

- **Mocks:** state evidence is preferred; interactions that are themselves a
  contract, including forbidden side effects, are legitimate (1–2).
- **Coverage:** useful for gaps; no repository percentage target. A documented
  narrow component obligation is distinct from a quality score (11).
- **Test-first:** claim calibration is mandatory regardless of authoring style;
  bug fixes and Graft's repair loop retain observed RED/GREEN requirements (4, 12).
- **Simulation:** controlled exploration is required for concurrency claims;
  real-system testing supplements the model instead of being prohibited (14).
- **Plans and ratios:** a concise risk map complements executable cases; neither
  duplicate prose inventories nor fixed portfolio ratios are required (9, 19).
- **Known failures:** precise XFAIL and visible quarantine serve different
  purposes; both preserve risk and require owned expiry decisions (10, 17).

## The standard, compressed

1. Test at the narrowest meaningful contract, including internal contracts;
   avoid incidental structure and unnecessary public APIs.
2. Assert outcomes and contractual effects; traverse universals with witness
   counts, check existence, and verify doubles against the relevant contract.
3. Organize by atomic behavior and classify changes; preserve expectations
   during refactoring while explaining legitimate test maintenance.
4. Calibrate every new/materially changed consequential claim with recorded
   relevant failure and restored success; automate selectively, never score-gate.
5. Use generated or exhaustive evidence for scoped quantified claims; record
   exploration limits, reduce failures, and guarantee known-counterexample replay.
6. Name the oracle; a failing specified expectation establishes disagreement
   whose cause must be diagnosed, and may still block integration.
7. Control the nondeterminism that affects the verdict and retain replay inputs;
   state residual real-system limits.
8. Own mutable state and isolate dependencies by default; declare and bound
   necessary nonhermetic integration evidence.
9. Declare size, ownership, numeric resource ceilings, suite latency budgets,
   and actual enforcement; record missing controls without claiming they exist.
10. Preserve first failures; quarantine visibly with an owner and expiry that
    forces remediation or an approved risk decision, never automatic deletion.
11. Inspect coverage gaps without treating percentages as correctness or a
    repository target; justify narrow component-specific obligations.
12. Observe bug regressions red on unfixed code and green with the fix; retain
    owned reproduction gaps, instrumentation, and exploration when waived.
13. Maintain trust-boundary fuzz targets and transformation properties with
    recurring exploration, suitable oracles, and a managed replay corpus.
14. Explore controlled schedules with safety and progress assumptions; report
    model limits and supplement with appropriate real-system evidence.
15. Inject relevant faults, including recovery faults, on replayable fixed,
    enumerated, or seeded schedules with explicit fault models and initial state.
16. Use calibrated controlled performance experiments for comparative regressions
    and absolute promises; record distributions, uncertainty, and workload.
17. Minimize and review golden changes; pin only identified XFAIL outcomes, with
    unexpected passes and unrelated failures requiring action.
18. Keep tests clear and failures actionable; justify deletion with preserved
    evidence or explicit residual risk, and curate suite cost and credibility.
19. Gate on trustworthy evidence and approved scoped exceptions; manual
    obligations bind before automation, and retries cannot erase a failure.

State what was checked, against which oracle, with which demonstrated
sensitivity, under which exploration and environment limits. Passing evidence
supports those claims; it does not prove an unrestricted “if and only if.”
