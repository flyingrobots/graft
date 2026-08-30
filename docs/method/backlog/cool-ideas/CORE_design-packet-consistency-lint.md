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

While repairing `CORE_first-retained-workspace-observation`, the most common
defect was not a wrong claim but **one section of the packet contradicting or
under-scoping another** after an edit landed in one place and not the others.
It recurred at least six times: the Hill demanding byte-identical output while
acceptance said raw equality was the wrong bar; playback questions and the test
strategy still describing the superseded comparison; the implementation
boundary naming three evidence counters when acceptance required seven; the
test strategy authorizing no step for three invariants acceptance required.

Every instance was mechanical — two lists that must agree had stopped agreeing.

## The idea

A closure lint is viable only after a packet exposes an explicit,
schema-validated machine-readable manifest beside the prose. That manifest —
not Markdown numbering, headings, checkboxes, or words — is the authoritative
input for invariant IDs, acceptance/test bindings, counter IDs, and cited
source paths.

Against that model, checks that hold regardless of how the packet is worded
become legitimate:

1. **Invariant coverage** — every declared invariant ID has at least one
   acceptance binding and one executable-evidence binding.
2. **Counter closure** — the identifiers in the required-evidence block and the
   acceptance/implementation bindings are the same set. On this packet the two
   sets disagreed twice, once under two names for the same count.
3. **Reference resolution** — every source path declared in the manifest exists
   in the tree, catching a packet that has gone stale against the implementation
   without scraping inline code spans from prose.

Tests for this tooling assert the manifest schema, typed model, and closure
behavior. They do not assert a design document's formatting, wording, numbered
lists, headings, or incidental links.

## Scope note

Three shortcuts are explicitly rejected: an equality-vocabulary check, a
numbered-list integrity check, and inferring invariant coverage by parsing
numbered Markdown references. All assert document wording or formatting, which
`AGENTS.md` prohibits; the wording check also produced false positives on
correct text in this very packet. They are recorded here only so they are not
re-proposed.

This is an idea, not a specification. Anything beyond the three checks above —
including whether the lint is worth building at all — is for the cycle that
picks it up.
