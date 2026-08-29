# Release Design: v0.13.0

## Included Work

- Publish first-call automatic opening for daemon-routed repository tools with
  explicit `cwd`, default capabilities, opened-workspace observation, and no
  active rebind.
- Publish private WARP sidecars keyed by canonical repository, worktree, and
  actor identity across MCP, daemon workers, persistent monitors, API hosts,
  and graph-backed CLI commands.
- Publish concurrency-safe sidecar installation and exact in-process open
  coalescing.
- Publish the copy-in-only Docker test boundary with a pinned base digest,
  copied-repository remote scrubbing, no network, no host mounts, and no
  host-side Vitest fallback.
- Add the public optional `graphRoot` field to `CreateGraftServerOptions` and
  `StartDaemonServerOptions`.
- Move the package and structural-history descriptor versions to `0.13.0`.

## Deferred Work

- No legacy source-repository WARP ref import, merge, or deletion is included.
- No sidecar retention, quota, discovery UI, or pruning policy is included.
- No cross-actor graph merge or causal ownership inference is claimed.
- No remote multi-user daemon or operating-system privilege boundary is added.
- No merge, tag, npm publication, or daemon cutover is authorized by this
  packet alone.

## Hills Advanced

- **Agent ergonomics**: the first explicitly routed repository call succeeds
  without a registration prelude.
- **Repository integrity**: the observed source repository is no longer a WARP
  persistence target.
- **Parallel-agent isolation**: repository, worktree, and actor identity select
  distinct graph stores and handles.
- **Test containment**: repository behavior tests cannot mount or address the
  live host checkout.

## Public API Review

- Root exports added: none.
- Root exports removed or renamed: none.
- Public option fields added: `graphRoot` on `CreateGraftServerOptions` and
  `StartDaemonServerOptions`.
- Classification: additive.
- Migration: optional; existing hosts keep the default `~/.graft/graphs` root.

## Version Justification

**Minor** (`0.12.0` to `0.13.0`).

The release adds public option fields and materially expands documented daemon
behavior while preserving supported package entry points, tool names, and
command paths. The persistence change is externally meaningful and is called
out explicitly, but this pre-1.0 release does not require a package-major
migration.

## Migration

Clients may use explicit per-call `cwd` instead of calling `workspace_open`
before their first routed repository tool. Clients still use `workspace_open`
for activation or non-default capabilities. Existing source `refs/warp/*`
remain untouched and are not migration input.

## Release Acceptance

This release is ready to tag only when all of the following are true:

- `package.json` is `0.13.0`.
- `schemas/graft-structural-history.echo-package.json` carries
  `sourcePackageVersion: "0.13.0"`.
- `CHANGELOG.md` has a dated `0.13.0` section.
- `docs/releases/v0.13.0.md` is final.
- `docs/method/releases/v0.13.0/verification.md` records the final preflight.
- the strict self-code review has zero unresolved findings.
- the repository's release validation passes on the final release-prep commit.
- the release PR passes green CI and substantive third-party review.
- the release PR merges through the normal review gate.
- `main` is exactly synced with `origin/main` before tagging.
- tag `v0.13.0` is created on the merged `main` commit and pushed only with
  separate release authority.
- the tag workflow and npm registry independently confirm publication.
