---
title: "Descriptor package registry for structural contracts"
feature: core
kind: cool-idea
legend: CORE
lane: cool-ideas
priority: 3
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/82
---

# Descriptor package registry for structural contracts

## Idea

Create a small registry of Graft-owned structural contract descriptors.

## Why

The structural-history Echo package descriptor is the first descriptor, but it
will not be the last if Graft continues toward schema-first contracts. A registry
would provide one place to discover descriptor IDs, schema paths, generated
artifacts, and drift checks.

## Desired Outcome

Contract descriptors become discoverable through one manifest rather than by
ad hoc file naming.

## Acceptance Criteria

- Registry includes the structural-history descriptor.
- Registry entries are repo-root-relative.
- Drift checks verify every registered descriptor exists and is fresh.
- Adding a descriptor requires updating the registry.
