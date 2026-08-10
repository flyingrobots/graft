# Release Design: v0.12.0

## Included Work

- Publish qualified-reference and import-binding diagnostics across Python,
  TypeScript/JavaScript, Rust, and Go.
- Publish the admitted immutable workspace-read authority seam, including
  bounded aperture, root-identity, byte-budget, symlink, UTF-8, and mutation
  defenses.
- Publish the requested-workspace routing and session-isolation groundwork
  already merged to `main`.
- Publish the corrected Node 20/22 CI split and dependency graph with zero
  known high or critical npm advisories.
- Bump the package and structural-history package descriptor to `0.12.0`.

## Deferred Work

- No Graft-owned `ObserveWorkspaceSnapshot` Edict operation is included.
- No Echo settlement decoder, retained request/settlement composition, restart
  recovery, or zero-filesystem-read replay is claimed.
- Production composition roots continue to use `LiveWorkspaceReadSource`.
- No git-warp major-version migration or StructuralReadingPort Echo-native
  cutover is included.
- Requested-worktree issue #238 remains open for its exact two-worktree
  behavioral proof and requested/resolved-root observability closure.

## Hills Advanced

- **Workspace Authority**: Analysis can run behind an immutable admitted read
  view without silently falling back to live filesystem bytes.
- **Reference Precision**: Cross-language qualified references and import
  shadows now produce explicit confidence and warning evidence.
- **Release Integrity**: The published graph clears the repository's
  high/critical security gate.

## Sponsored Users

- **Agents and reviewers** get bounded, authority-aware workspace reads and
  more precise structural-reference evidence.
- **Library consumers** get versioned outline and structural-review output
  contracts plus explicit snapshot refusal codes.
- **Operators** get a release suitable for immutable daemon installation,
  decoupled from a changing development checkout.

## Version Justification

**Minor** (`0.11.1` to `0.12.0`).

This release adds public MCP/CLI capabilities and extends versioned response
contracts while preserving existing supported entry points. The admitted-read
surface is additive and the changed output contracts carry explicit major
schema versions; no package-major migration is required.

## Migration

No source migration is required for existing entry points. Consumers that
validate `file_outline` or structural-review response schemas must accept the
newly advertised `2.0.0` contracts and their added fields.

## Release Acceptance

This release is ready to tag when all of the following are true:

- `package.json` is `0.12.0`.
- `schemas/graft-structural-history.echo-package.json` carries
  `sourcePackageVersion: "0.12.0"`.
- `CHANGELOG.md` has a dated `0.12.0` section.
- `docs/releases/v0.12.0.md` is final.
- `docs/method/releases/v0.12.0/verification.md` records preflight evidence.
- `WESLEY_BIN=$HOME/.cargo/bin/wesley pnpm release:check` passes on the final
  release-prep commit.
- The registry still reports `@flyingrobots/graft@0.11.1` before publication.
- The release PR is merged to `main` through the repository review gate.
- `main` is exactly synced with `origin/main` before tagging.
- Signed tag `v0.12.0` is created on that merged `main` commit and pushed.
- The tag workflow's sanity, GitHub Release, and npm publish jobs pass.
- The GitHub Release and npm registry both report v0.12.0.
