# CORE graft structural-history Echo package descriptor

## Status

Active slice.

## Hill

Graft publishes a deterministic, repo-local descriptor for the
structural-history contract package it expects Echo to host later, without
requiring any Echo runtime behavior in this slice.

## Why this slice does not require Echo changes

Echo is the substrate target. This slice only records the package facts Graft
will eventually hand to that substrate:

- package identity;
- schema identity;
- generated TypeScript artifact identity;
- Wesley generator identity;
- exposed structural-history record, evidence, and operation names;
- explicit descriptor-only Echo posture.

No package is installed into Echo. No Echo storage, replay, query execution, or
TypeScript client binding is invoked. The descriptor is therefore a Graft-owned
contract artifact, not an Echo feature request.

If a later slice discovers that Echo cannot accept this package shape, that
becomes a separate Echo planning item with concrete evidence. This slice should
not pre-emptively expand Echo.

## Acceptance Criteria

1. Graft has a checked-in structural-history Echo package descriptor.
2. The descriptor is deterministic and derived from existing schema authority
   facts plus `package.json` identity.
3. Descriptor paths are repo-root-relative and never machine-local absolute
   paths.
4. `pnpm schema:structural-history:check` fails when the descriptor drifts.
5. The descriptor explicitly states that Echo runtime installation and package
   installation are not required in this slice.

## Descriptor Surface

Descriptor path:
`schemas/graft-structural-history.echo-package.json`

The descriptor records:

| Section | Meaning |
| :--- | :--- |
| `descriptorVersion` | Version of the descriptor format itself. |
| `package` | Graft-owned Echo package identity and source package version. |
| `schema` | GraphQL schema path, hash, and Wesley L1 registry hash. |
| `generatedArtifacts` | Wesley-generated TypeScript artifact path, hash, and generator version. |
| `echo` | Descriptor-only Echo posture for this slice. |
| `contracts` | Required record types, evidence labels, and operation constants. |

## Drift Model

The descriptor is checked by
`scripts/check-structural-history-echo-package.ts`.

The checker rebuilds the expected descriptor from:

- `schemas/graft-structural-history.manifest.json`;
- `package.json`.

It then byte-compares the checked-in descriptor against the deterministic JSON
rendering. Hand-editing descriptor fields, changing package identity, changing
schema hash facts, or introducing absolute paths fails the Graft-local check.

## Test Strategy

Focused contract tests cover:

1. the checked-in descriptor matching the deterministic expected descriptor;
2. descriptor-only Echo posture and repo-root-relative paths;
3. stale descriptor drift producing a local check violation.

The script is also wired into `pnpm schema:structural-history:check`, which is
already part of release checks.

## Non-goals

- Do not change Echo.
- Do not change Wesley semantics.
- Do not install a package into Echo.
- Do not claim Echo-backed storage, replay, or query execution is active.
- Do not add a real Echo TypeScript client binding in this slice.

## Playback Questions

1. Can a reviewer identify exactly which package Graft expects Echo to host
   later?
2. Can a reviewer prove the descriptor came from the schema authority manifest
   and package identity rather than hand-edited hope?
3. Can a reviewer see that Echo runtime behavior remains out of scope?
