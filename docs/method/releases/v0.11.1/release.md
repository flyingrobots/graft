# Release Design: v0.11.1

## Included Work

- Document the required release-inspection sequence for Graft's tag-triggered
  GitHub Actions release workflow.
- Document the release authority invariant: releases are cut only from commits
  already on `main` and tagged with the release version.
- Bump the package and structural-history package descriptor version to
  `0.11.1`.

## Deferred Work

- No workflow implementation changes are included.
- No package API, CLI, MCP, projection, or runtime behavior changes are
  included.
- No jedit dependency bump is included in this release branch.

## Hills Advanced

- **Release Operator Discipline**: Future operators have a repo-local rule for
  inspecting release Actions and npm registry truth before claiming success.
- **Tag Authority Discipline**: The release packet reinforces that GitHub
  Actions deploys release tags from `main`, not release branches or PR heads.

## Sponsored Users

- **Maintainers** get an inspectable release procedure with a hard
  main-tag-only invariant.
- **Downstream packages** get a published Graft patch carrying the corrected
  release guidance.

## Version Justification

**Patch** (`0.11.0` to `0.11.1`).

The change is documentation/process guidance plus release metadata. It does not
change documented public API, CLI, MCP, package behavior, projection contracts,
or runtime behavior.

## Migration

No migration is required.

## Release Acceptance

This release is ready to tag when all of the following are true:

- `package.json` is bumped to `0.11.1`.
- `schemas/graft-structural-history.echo-package.json` carries
  `sourcePackageVersion: "0.11.1"`.
- `CHANGELOG.md` has a dated `0.11.1` section.
- `docs/releases/v0.11.1.md` is final.
- `docs/method/releases/v0.11.1/verification.md` records preflight evidence.
- `pnpm release:check` passes on the final release-prep commit.
- The registry still reports `@flyingrobots/graft` latest as `0.11.0` before
  tag publication.
- The release PR is merged to `main`.
- `main` is exactly synced with `origin/main` before tagging.
- The `v0.11.1` tag is pushed only from the merged main release commit.
