---
title: "Provenance and attribution instrumentation"
legend: "WARP"
cycle: "WARP_provenance-attribution-instrumentation"
source_backlog: "docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md"
---

# Provenance and attribution instrumentation

Source backlog item: `docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

Define the first honest runtime attribution model for Graft so bounded
surfaces can say when a line of work is attributable to an `agent`, a
`human`, `git`, or explicitly `unknown`, with inspectable evidence and
confidence that do not outrun what the product actually knows.

## Playback Questions

### Human

- [ ] Can a human inspect the current causal workspace and see whether
      Graft attributes it to an `agent`, a `human`, `git`, or
      explicitly `unknown`?
- [ ] When attribution evidence is weak, absent, or mixed, does Graft
      say `unknown` or mixed instead of pretending to know who caused
      the work?
- [ ] Do explicit continuation/handoff declarations strengthen
      attribution lawfully instead of silently overwriting prior
      ambiguity?
- [ ] Are checkout-boundary transitions allowed to attribute continuity
      movement to `git` when that is the strongest inspectable evidence?
- [ ] Can a human inspect attribution through bounded machine-readable
      surfaces rather than raw logs or transcripts?
- [ ] When a staged artifact is present, can a human inspect its
      runtime-local attribution directly instead of only the broader
      causal workspace attribution?
- [ ] When an unambiguous staged artifact is present, can a human
      inspect the latest attributed `stage` event as bounded local
      `artifact_history`?
- [ ] After a bounded read, can a human inspect the latest attributed
      `read` event with an explicit footprint and honest source layer?

### Agent

- [ ] Are actor classes and authority scopes explicit enough to
      implement without churn:
      `human`, `agent`, `git`, `daemon`, `unknown` and
      `authoritative`, `declared`, `inferred`, `mixed`?
- [ ] Are attribution evidence, downgrade paths, and confidence bounds
      explicit enough that agents can reason about trust instead of
      guessing?
- [ ] Does the cycle keep attribution separate from canonical
      provenance so runtime-local attribution does not overclaim
      collapse-admitted truth?
- [ ] Is the runtime seam explicit about what evidence can currently
      prove `agent`/`human`/`git`, and what still remains `unknown`?
- [ ] Does artifact-local attribution stay honest by projecting current
      local evidence onto staged targets without pretending to be
      collapse-admitted blame?
- [ ] Does the cycle start using the causal-event contract for local
      attributed `stage` events without overclaiming canonical
      provenance?
- [ ] Does the cycle start using the causal-event contract for bounded
      local attributed `read` events without treating them as canonical
      provenance?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - say "who or what advanced this line of work?" before using terms
    like attribution summary or authority scope
  - treat `unknown` as a truthful product state, not a temporary
    embarrassment to be hidden
- Non-visual or alternate-reading expectations:
  - attribution must be inspectable through bounded JSON and short
    textual summaries
  - users and agents must be able to answer "why does Graft think this
    was agent work?" without replaying chat history

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - user-facing surfaces should prefer `agent`, `human`, `git`, and
    `unknown` over more abstract provenance language
  - "confidence" and "evidence" must remain stable product terms
- Logical direction / layout assumptions:
  - no diagram dependency; attribution meaning must survive in linear
    text and bounded JSON
  - handoff should be explainable as ordered evidence rather than only
    visual timelines

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - the current attributed actor kind
  - the authority scope behind that attribution
  - the exact evidence objects that support it
  - the current confidence bound and any downgrade to `unknown`
- What must be attributable, evidenced, or governed:
  - explicit attach/handoff declarations
  - checkout-boundary transitions that move continuity through Git
  - the difference between continuity confidence and actor attribution
    confidence
  - the rule that no bounded surface may imply a stronger actor claim
    than its evidence supports

## Non-goals

- [ ] Infer detailed author identity from raw editor or shell history.
- [ ] Treat runtime-local attribution as canonical provenance.
- [ ] Solve full strand-aware causal collapse in this cycle.
- [ ] Eliminate `unknown` attribution when the evidence is genuinely
      weak.
- [ ] Solve rename continuity or symbol-level causal blame here.

## Backlog Context

Strengthen live-edit provenance beyond the current conservative
`unknown` / `low` fallback.

Scope:
- direct evidence for `agent`, `human`, and `git` attribution when
  available
- explicit confidence rules and downgrade paths
- inspectable evidence trails in user-facing output
- no false certainty when evidence is weak or mixed

Why separate cycle:
- attribution is a product trust problem, not just a data collection
  problem

Effort: L

## Problem framing

`0060` made local between-commit history durable and inspectable.

What it did not settle is the actor question:

- who or what advanced this line of work?
- when is that answer direct versus inferred?
- when should the answer remain `unknown`?

Right now Graft has evidence objects and confidence helpers, but the
product surfaces do not yet carry an explicit attribution summary.
That leaves a trust gap:

- humans and agents can inspect continuity, but not who it is actually
  attributed to
- explicit attach declarations exist, but their meaning is buried in
  continuity evidence arrays
- checkout-boundary continuity can be driven by Git transitions, but
  the product does not yet expose that as a first-class actor claim

## Proposed model

### Attribution summary

Bounded runtime surfaces should expose one explicit attribution summary
with:

- `actor`
  - one of `human`, `agent`, `git`, `daemon`, `unknown`
- `authorityScope`
  - one of `authoritative`, `declared`, `inferred`, `mixed`
- `confidence`
  - bounded by the strength of the supporting evidence
- `basis`
  - `explicit_declaration`, `git_transition`, `unknown_fallback`, or
    `conflicting_signals`
- `evidence`
  - the bounded evidence objects that justify the claim

### Default attribution rules

1. **Explicit declarations win when present**
   - `causal_attach` with explicit actor declaration is the strongest
     runtime attribution source for `human` or `agent`
2. **Git transition evidence can attribute continuity movement to
   `git`**
   - checkout/fork/park continuity caused by observable Git transition
     evidence can surface as `git`
3. **Continuity evidence is not automatically actor evidence**
   - transport binding, worktree footing, and writer-lane identity may
     support continuity without proving the actor
4. **Unknown is lawful**
   - when actor evidence is absent or mixed, attribution must remain
     `unknown`

### Surfaces for this cycle

#### Slice 1: persisted local-history attribution

Extend persisted local-history records and summaries with first-class
attribution instead of forcing consumers to reverse-engineer it from raw
evidence arrays.

#### Slice 2: bounded inspection surfaces

Surface the same attribution summary through:

- `causal_status`
- `causal_attach`
- `doctor`

so users and agents can inspect active-workspace attribution directly.

#### Slice 3: artifact-local staged-target attribution

When a runtime-local staged target exists, project the current
attribution summary onto that staged artifact surface too.

This keeps the answer to "who or what produced this current staged
artifact-history step?" inspectable without pretending Graft has
already performed causal collapse or canonical blame.

#### Slice 4: persisted local stage events

When the staged target is unambiguous and full-file, persist a bounded
local `stage` event that carries:

- the staged target id
- the staged footprint
- the same evidence-bounded attribution summary

This is the first honest attributed local artifact-history event. It is
still runtime-local `artifact_history`, not canonical provenance.

#### Slice 5: persisted local read events

When a bounded read surface returns meaningful local content or outline
state, persist a bounded local `read` event that carries:

- the read surface name
- the projection actually returned
- the best current source layer
- an explicit footprint over the file or targeted region
- the same evidence-bounded attribution summary

This gives Graft its first attributed local observation events instead
of only continuity posture and stage projections.

#### Slice 6: explicit runtime honesty

Keep attribution explicitly runtime-local:

- stronger than a raw guess
- weaker than canonical provenance
- separate from later collapse-admitted explanation

## Provenance honesty boundary

This cycle sharpens runtime attribution; it does not collapse it into
canonical provenance.

The product must make one thing explicit:

- actor attribution on `causal_status`, `causal_attach`, and `doctor`
  is runtime-local `artifact_history`
- it is an inspectable explanation for current local continuity
- it is not yet witness-backed canonical provenance

## Upstream dependency boundary

### What Graft can settle locally now

- explicit runtime actor categories
- direct declaration evidence for `human` and `agent`
- Git-transition-driven attribution for continuity movement
- explicit `unknown` fallback when actor evidence is absent or mixed
- bounded status surfaces for inspecting attribution now

### What remains blocked on `git-warp v17.1.0+`

- full strand-aware collapse of runtime-local attribution into
  canonical provenance
- deeper causal slicing that attributes staged artifacts across shared
  strand history
