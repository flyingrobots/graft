---
title: "Wesley codec and observer-plan generation for structural history"
feature: core
kind: architecture
legend: CORE
lane: cool-ideas
priority: 4
effort: M
status: open
reported: 2026-06-10
---

# Wesley codec and observer-plan generation for structural history

## Context

Jedit's Echo integration consumes four Wesley-generated artifact kinds: types,
operation objects, binary/JSON codecs, and observer plans. Graft's generated
structural-history model (`src/generated/graft-structural-history.ts`)
currently has only types and operation objects. The fake Echo witness slice
bridges the gap with a hand-rolled canonical-JSON envelope codec
(`graft-structural-history-json-v1`) and no observer plans.

## Idea

Before (or at) the real Echo integration gate, extend Graft's Wesley pipeline
to emit:

- envelope codecs (LE binary and/or JSON) for structural-history intents and
  observe requests, replacing the hand-rolled JSON-v1 codec;
- observer plans for the structural-history queries, so bounded reads carry
  explicit aperture, basis, budgets, and rights the way jedit's
  `*.observer-plan.generated.ts` artifacts do.

## Why it matters

The hand-rolled codec is a witness-grade stand-in. Real Echo package
compatibility wants generated codecs whose identity is captured in the
contract package descriptor, and observer plans are how Echo bounds reads —
Graft's read-governance story should ride that, not bypass it.

## First step

Compare jedit's Wesley invocation/config with Graft's schema build
(`pnpm schema check` pipeline) and list what generator features Graft is not
yet using.
