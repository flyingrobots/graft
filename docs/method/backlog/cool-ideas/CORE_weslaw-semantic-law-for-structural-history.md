---
title: "weslaw semantic law document for structural history"
feature: core
kind: architecture
legend: CORE
lane: cool-ideas
priority: 5
effort: M
status: open
reported: 2026-06-10
---

# weslaw semantic law document for structural history

## Context

Wesley has a semantic law layer (`weslaw/v1`): schema-bound scalar semantics,
discriminated input variants, operation footprint law, and channel law,
validated by `wesley law validate` into a contract bundle manifest carrying
`lawHash`, `profileHash`, and `bundleHash`. Emitters accept `--law` and embed
those identities in generated artifacts and metadata sidecars. Graft's
structural-history schema already carries `@wes_footprint` directive data on
its operations but has no law document binding it.

## Idea

At (or before) the Echo integration gate, author
`schemas/graft-structural-history.weslaw.yaml`:

- footprint law for each structural-history operation (reads/writes/creates
  per entity, plus forbids);
- scalar semantics for `Hash` and span/encoding scalars;
- bind it in the hermetic schema pipeline (`wesley law validate`) and record
  `lawHash`/`bundleHash` in the Echo package descriptor next to the existing
  schema identities.

## Why it matters

The contract package descriptor currently names schema and artifact
identities. Adding law identities makes the Graft↔Echo contract carry declared
operation footprints with a stable hash — exactly the evidence a host wants
before admitting a package. Wesley's `law capabilities` report stays honest
(`reportOnly: true`); enforcement remains Echo's job.

## First step

Run `wesley init-law --schema schemas/graft-structural-history.graphql
--family graft-structural-history` and review which directives lower into
active law versus draft suggestions.
