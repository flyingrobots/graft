---
title: "Graft structural-history Echo package descriptor"
feature: core
kind: architecture
legend: CORE
lane: asap
priority: 2
effort: M
requirements:
  - "Graft describes the Echo package it expects before requiring real Echo execution"
  - "The descriptor is deterministic and derived from schema authority"
  - "Version and artifact identity are explicit"
  - "No Echo runtime change is required"
acceptance_criteria:
  - "Graft has a deterministic structural-history package descriptor"
  - "The descriptor records package identity, schema identity, generated artifact identity, Wesley CLI version, and operation/query identifiers"
  - "Descriptor drift fails in Graft-local checks"
  - "No real Echo installation or Echo code change is required"
---

# Graft structural-history Echo package descriptor

## Hill

Graft defines the contract package shape it expects Echo to install later, while
keeping this slice entirely inside Graft.

This descriptor is a planning and drift artifact. It should answer: "What
would Graft hand to Echo?" It should not require Echo to run that package yet.

## Design Packet

Primary design packet:
[`docs/design/CORE_graft-echo-typescript-integration-requirements.md`](../../../design/CORE_graft-echo-typescript-integration-requirements.md)

Related migration card:
[`docs/method/backlog/up-next/CORE_structural-history-schema-and-echo-migration.md`](../up-next/CORE_structural-history-schema-and-echo-migration.md)

## Descriptor Contents

The descriptor should be deterministic and should avoid machine-local paths.
Expected fields include:

| Field | Purpose |
| :--- | :--- |
| package identity | Names the Graft structural-history contract package. |
| schema identity | Records the GraphQL schema path, version, and hash. |
| generated artifact identity | Records the generated TypeScript artifact and hash. |
| Wesley CLI version | Captures the generator version that produced the artifact. |
| codec or target identity | Names the intended Echo-facing contract format. |
| operation/query identifiers | Names the commands, mutations, or queries Graft expects to expose. |

## Scope

1. Define a Graft-owned descriptor format for the structural-history Echo
   package.
2. Generate or check the descriptor from schema and generated artifact facts.
3. Add drift coverage so hand-edited descriptors or generated artifacts fail.
4. Document that the descriptor is a pre-runtime contract boundary.

## Non-goals

- Do not install the package into a real Echo runtime.
- Do not require an Echo TypeScript client.
- Do not change Echo.
- Do not change Wesley semantics.
- Do not claim Echo-backed storage or replay is active.

## Test Strategy

1. Add deterministic descriptor generation or checking tests.
2. Assert schema hash, generated artifact hash, and Wesley version are stable
   and machine-independent.
3. Add a stale descriptor fixture or mutation test if the existing test harness
   makes that practical.

## Playback Questions

1. Can a reviewer identify the exact package Graft expects Echo to host later?
2. Does the descriptor prove the generated artifact came from schema authority?
3. Would a machine-local path or ambient generator version change the output?
