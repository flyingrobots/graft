---
title: "A lint for design-packet internal consistency"
feature: method-tooling
kind: cool-idea
legend: CORE
lane: cool-ideas
priority: 3
effort: M
status: open
reported: 2026-08-16
---

# A lint for design-packet internal consistency

## The observation

Across four rounds on `CORE_first-retained-workspace-observation`, the single
most common defect was not a wrong claim. It was **one section of the packet
contradicting or under-scoping another**, after an edit landed in one place and
not the others.

Concretely, the same failure recurred at least six times:

- the Hill demanded "byte-identical output" while the acceptance list said raw
  equality was explicitly the wrong bar;
- a human playback question asked for "the same structured result" after the
  comparison had been redefined as a projection;
- the test strategy said "compares structured results" for the same reason;
- an agent playback question enumerated four authority kinds after a fifth
  (process execution) had been added to the invariant it mirrors;
- the implementation boundary named three evidence counters after seven were
  required by acceptance;
- the test strategy authorized no step for three invariants acceptance
  required.

Every one is mechanical. None required understanding the domain — only noticing
that two lists that must agree had stopped agreeing.

## The idea

A lint over `docs/design/**` that checks a packet against itself. Candidate
rules, all cheap:

1. **Invariant coverage.** Every numbered invariant has at least one acceptance
   criterion and at least one test-strategy step that references it. An
   invariant nobody tests is a claim, not a constraint.
2. **Counter closure.** Every identifier in the required-evidence block is
   defined in prose somewhere in the packet, and every counter mentioned in an
   acceptance criterion appears in the evidence block. On this packet the two
   sets disagreed twice, under two different names for the same count.
3. **Reference resolution.** "See below" resolves to something below; every
   `src/...` path cited exists in the tree. The path check alone would be worth
   it — a packet naming a file that has since moved is a packet describing a
   system that no longer exists.

## Two rules were proposed and withdrawn

Recorded so they are not re-proposed, and because *why* they failed is the more
useful half of this card.

**An equality-vocabulary rule.** Proposed as: a packet defining a named
comparison must not also assert raw equality. Two drafts, both unsound. The
first banned "identical" / "byte-identical" wherever the named comparison
existed, which fires on this packet's *correct* sentences. The second narrowed
it to equality words that do not name the comparison in the same sentence —
which still fires on the Hill's `Byte-identical is deliberately not the bar`,
because that sentence is **negating** raw equality and so never names the
projection. Catching it needs claim polarity and comparison mode modelled
structurally, at which point the word list is doing no work. Withdrawn: the
real defect is real, but no prose-level predicate expresses it.

**A numbered-list integrity rule.** Proposed as: no holes, no repeats. This is
a Markdown formatting assertion, and `AGENTS.md` prohibits exactly that — tests
and checks assert software invariants and user-visible contracts, never
document structure. That a numbering hole did appear in this packet and had to
be caught by eye does not license encoding formatting in CI. Withdrawn.

Both withdrawals follow the non-goals below rather than overriding them. The
three surviving rules are set-agreement and reference-resolution checks, which
hold regardless of how the packet is worded.

## Why it is worth building

The design packet is the spec an implementation cycle is built from, and
`METHOD.md` puts it before the code deliberately. A packet that contradicts
itself does not fail loudly — it produces a cycle that satisfies one half of
the contradiction and calls the hill met.

Rule 3's path check has a second life: it catches packets that have gone stale
against the tree, which is the normal fate of a design document that outlives
one refactor.

## Non-goals

Not a prose-quality or style checker, and not a spellchecker for design
documents. `AGENTS.md` is explicit that asserting on document wording is the
wrong kind of check. Every rule above must be structural — sets that must
agree, references that must resolve — and none may assert what the packet
should say.

Two candidate rules drifted across that line and were withdrawn above — an
equality-vocabulary check and a numbered-list formatting check. Both are
recorded rather than deleted, because the instinct that produced them will
recur: a real defect was observed, and the nearest available predicate was a
text pattern.

The standing rule for this card is that a lint nobody trusts gets disabled and
takes the sound rules with it. Drop a rule rather than ship a brittle one.

## Prior art in this repo

`tools/` in the sibling `salesos` repository does exactly this shape for a
different property: `lint_import_direction.py` enforces a source fact by AST,
prints the population it examined so "clean" and "scanned nothing" cannot look
alike, and runs as its own CI step so a failure reads as a house-rule
violation. The same three properties apply here.
