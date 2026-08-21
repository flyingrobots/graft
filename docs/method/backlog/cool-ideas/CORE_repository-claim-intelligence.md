---
title: "Repository claim intelligence"
feature: repository-intelligence
kind: trunk
legend: CORE
lane: cool-ideas
effort: XL
requirements:
  - "Structural history graph and query surfaces (shipped)"
  - "Exact Git object and ref observation boundary"
  - "Reusable contextual-claims package"
acceptance_criteria:
  - "Commit messages, annotated tag messages, and selected Git notes are retained as exact artifact observations with object IDs, discovery basis, raw actor roles, and source times"
  - "Every extracted claim carries a source span, extractor version, derivation record, and validation result from the reusable contextual-claims package"
  - "Reports keep artifact history, model inference, structural evidence, forge snapshots, and canonical provenance visibly distinct"
  - "A commit dossier can explain its evidence basis, coverage, available capabilities, and residual uncertainty in structured output"
  - "Contributor dossiers preserve author, committer, co-author, reviewer, signer, alias, and unresolved-identity distinctions without ranking people or inferring performance"
  - "Issue, pull-request, and milestone state is reported only from a separately retained forge snapshot, never inferred from Git prose"
blocked_by_external:
  - "Reusable contextual-claims package"
---

# Repository claim intelligence

Graft can explain what changed structurally. A repository also contains narrative
evidence about why a change was attempted, what someone believed at the time,
which alternatives were rejected, and what an artifact claimed to close or ship.
That evidence appears in commit messages, annotated tag messages, selected Git
notes, and forge records.

Park a new intelligence trunk that compiles contextual claims from those
artifacts and joins them to Graft's structural history. The product is not “AI
reads Git and tells us the truth.” It is a set of evidence-bounded dossiers whose
claims remain traceable to exact source bytes and explicit observation bases.

## First hill

Start with one inspectable product surface:

```text
graft intel commit <sha> --json
```

The dossier should show:

- exact Git artifact observations and raw actor roles
- contextual claim occurrences with source spans and extraction derivation
- corroborating or conflicting structural-history evidence
- separately observed issue or pull-request evidence when that capability exists
- explicit coverage, unavailable capabilities, and residual posture

Before implementation, pull this card into a design packet and freeze a small,
representative repository corpus. Evaluation should prove exact excerpt recovery,
idempotent rescans, role preservation, and downgrade or refusal when an
observation basis disappears.

## Package boundary

The reusable contextual-claims package is the sole authority for the generic
claim model, validation, parsing or extraction contracts, and serialization.
Graft should consume that package rather than copy a second claim-term
declaration into this repository.

Graft remains responsible for:

- binary-safe Git object reads and ref snapshots
- Git-specific source metadata, identity roles, and time semantics
- deterministic evidence envelopes and structural-history joins
- separately retained forge snapshots
- capability-bounded repository intelligence reports

## Truth boundary

Repository prose is evidence of what an artifact claimed, not automatic proof of
what happened. Parsed prose remains artifact history or model inference unless a
separate authority explicitly promotes it. Structural joins can corroborate a
claim but do not prove its semantic correctness. A textual `#123` reference can
record an asserted relationship; it cannot establish the live state of issue
123.

Contributor reporting must keep raw identities, roles, aliases, and canonical
identity candidates separate. It must not infer effort, productivity, seniority,
personality, or ownership from commit counts or prose volume.

## Later projections

After the commit dossier passes a frozen-corpus evaluation, the same evidence
model could support dossiers for:

- contributors and unresolved identity clusters
- issues, pull requests, and milestones
- releases, features, and decisions
- files, symbols, and codebase areas

Each projection needs its own capability and completeness contract. “Unknown”
and “not observed” must remain valid report outcomes.

## Non-goals for the first cycle

- ranking contributors or producing performance scores
- sending the entire repository history to a model as the ingestion strategy
- treating conventional commit syntax as objective truth
- inferring current forge state from commit, tag, or note text
- expanding the structural-history schema into a second narrative claim schema

## Open questions

- Which claim genres belong in deterministic extraction before a prose model is
  introduced?
- Which Git notes refs are in scope, and how is their mutable discovery basis
  retained?
- Should forge snapshots be captured by Graft directly or admitted through a
  separate port?
- What evidence is sufficient to propose, but not silently accept, an identity
  alias?

## Effort rationale

Extra large. The first CLI projection is narrow, but the trunk crosses exact Git
ingestion, claim compilation, structural joins, forge snapshots, identity
resolution, evaluation, and report ethics. It should be delivered as staged
design and implementation cycles rather than one feature branch.
