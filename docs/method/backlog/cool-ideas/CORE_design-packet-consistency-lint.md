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
3. **Unqualified equality claims.** A packet that defines a named comparison
   (here, `replayProjection`) must not also assert equality *without naming
   it*. The rule is scoped to **unqualified** claims — an equality word with no
   reference to the named comparison in the same sentence or list item.

   A first draft of this rule flagged "identical" / "byte-identical" / "the
   same … result" wherever the named comparison existed anywhere in the
   document. That version was wrong and would have fired on this very packet's
   correct sentences: the Hill says byte identity is *deliberately not* the bar,
   and the acceptance criterion says "identical to the live one **under the
   comparison projection**". Both are right; a word-ban rejects both. Better
   still, model the comparison mode structurally — one declared comparison per
   claim — and check that rather than the prose around it.
4. **Reference resolution.** "See below" resolves to something below; every
   `src/...` path cited exists in the tree. The path check alone would be worth
   it — a packet naming a file that has since moved is a packet describing a
   system that no longer exists.
5. **Numbered-list integrity.** No holes, no repeats. A hole appeared in this
   packet's invariant list during editing and had to be caught by eye.

## Why it is worth building

The design packet is the spec an implementation cycle is built from, and
`METHOD.md` puts it before the code deliberately. A packet that contradicts
itself does not fail loudly — it produces a cycle that satisfies one half of
the contradiction and calls the hill met.

Rule 4's path check has a second life: it catches packets that have gone stale
against the tree, which is the normal fate of a design document that outlives
one refactor.

## Non-goals

Not a prose-quality or style checker, and not a spellchecker for design
documents. `AGENTS.md` is explicit that asserting on document wording is the
wrong kind of check. Every rule above must be structural — sets that must
agree, references that must resolve — and none may assert what the packet
should say.

Rule 3 is the one that can drift across that line, and its first draft did:
banning equality words wherever a named comparison exists is a wording
assertion with immediate false positives, not a semantic invariant. It is kept
because unqualified equality beside a defined comparison is a real defect, but
it must be scoped to unqualified claims or replaced by a structural model of
comparison mode. If it cannot be built without a word list, drop it rather than
ship a brittle check — a lint nobody trusts gets disabled, taking the four
sound rules with it.

## Prior art in this repo

`tools/` in the sibling `salesos` repository does exactly this shape for a
different property: `lint_import_direction.py` enforces a source fact by AST,
prints the population it examined so "clean" and "scanned nothing" cannot look
alike, and runs as its own CI step so a failure reads as a house-rule
violation. The same three properties apply here.
