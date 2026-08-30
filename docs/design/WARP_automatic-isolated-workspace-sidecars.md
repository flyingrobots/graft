---
title: "Automatic workspace admission and isolated WARP sidecars"
legend: "WARP"
cycle: "WARP_automatic-isolated-workspace-sidecars"
source_backlog: "operator direction 2026-08-29"
status: completed
retro: "docs/method/retro/WARP_automatic-isolated-workspace-sidecars/WARP_automatic-isolated-workspace-sidecars.md"
---

# Automatic workspace admission and isolated WARP sidecars

Source: operator direction on 2026-08-29.

Legend: WARP

## Sponsors

- Human: James
- Agent: Codex

## Hill

An agent can make its first daemon-backed repo-tool call with an explicit
`cwd` anywhere inside a Git worktree and Graft opens that canonical worktree
automatically. The call does not require a preceding `workspace_open` or
`workspace_authorize`, and it does not mutate the session's active binding.

Every WARP working graph used by an MCP session is persisted in a Graft-owned
bare Git sidecar under the user's Graft home. Repository identity, worktree
identity, and actor/session identity are all part of the storage key. Two
agents in different worktrees, or two independent sessions in one worktree,
cannot receive the same graph handle or observe each other's working graph.
No WARP object, ref, config entry, or hook is written to the source
repository.

## Current Failure

The live composition has two separate defects.

1. `captureExecutionContextForWorkspace` resolves an explicit `cwd`, but then
   rejects it unless the daemon control plane already contains an
   authorization record. `workspace_open` knows how to create that record;
   ordinary routed repo-tool calls do not.
2. `InMemoryWarpPool` caches by `repoId + writerId`, while `openWarp` gives
   git-warp plumbing the source worktree as its Git repository. Linked
   worktrees share `repoId`, and git-warp writes `refs/warp/...` plus its
   objects into their common source Git directory.

The second defect is not repaired by adding `worktreeId` to the in-memory
cache alone. The persistence repository and the cache key must be derived
from the same complete identity.

## Decisions

### 1. An explicit routed `cwd` is opening intent

For daemon repo tools that already accept per-call routing, a non-empty
explicit `cwd` is sufficient same-user intent to open its containing Git
worktree with the default daemon capability profile.

The sequence is:

1. Resolve `cwd` server-side with Git to a canonical worktree root and Git
   common directory.
2. Reuse an exact matching authorization if one exists.
3. Otherwise persist a new default authorization for that exact resolved
   identity and observe it in the managed workspace registry.
4. Add it to this MCP session's opened-workspace list.
5. Capture an immutable routed execution context and run the tool without
   changing the active workspace binding.

This is narrowly bounded opening, not ambient discovery:

- Graft walks only through Git's resolution of the caller-supplied `cwd`.
- Graft does not scan sibling directories or inherit the daemon process cwd.
- A path outside a Git worktree still returns the typed resolution failure.
- Client-supplied `repoId`, `worktreeId`, and Git-directory hints remain
  non-authoritative.
- Auto-opening uses the default daemon profile. `workspace_open` remains the
  explicit surface for activation and capability changes such as
  `runCapture: true`.
- A later explicit call against a previously revoked path is fresh opening
  intent; revocation does not become a permanent deny-list entry.

### 2. Source repositories are observation targets, never WARP stores

git-warp receives plumbing rooted at a Graft-owned bare Git repository. It
never receives the source worktree or source Git common directory as its
persistence cwd in a production composition root.

The default layout is:

```text
~/.graft/
  graphs/
    <project-slug>--<repo-key>/
      <worktree-slug>--<worktree-key>/
        <actor-kind>--<actor-key>/
          warp.git/              # bare Git repository
```

The readable slugs are display aids only. Collision resistance and authority
come from the existing server-resolved `repoId` and `worktreeId`, plus a digest
of the logical actor namespace. Raw MCP session tokens are not written into
pathnames.

Project display name is derived from the repository owning the Git common
directory. Worktree display name is derived from the canonical worktree root.
Every path component is sanitized and length-bounded before an identity suffix
is added.

### 3. Actor namespaces are isolated by default

The actor namespace is the terminal WARP-store identity.

- Daemon MCP: the daemon-minted transport session writer identity.
- Repo-local MCP/API: the server-minted session writer identity, not the old
  process-global `graft` default.
- Persistent monitor: its stable logical monitor writer identity.
- One-shot CLI: one stable operator namespace per worktree. Separate CLI
  processes intentionally reuse that lane; there is no CLI actor override.
  Parallel agents that require isolated histories use separate MCP sessions.

The pool key is therefore:

```text
repoId + worktreeId + actorNamespace
```

Repeated calls with the same full key reuse one handle. Any change to repo,
worktree, or actor namespace opens a different sidecar and a different handle.

This deliberately supersedes the older provisional rule that all worktrees
of one repository share one default WARP handle. Canonical Git history remains
shared as source evidence; WARP working projections do not.

### 4. One locator owns both cache and persistence identity

A Graft-owned sidecar locator accepts the configured graph root, resolved
workspace identity, and actor namespace. It returns the exact bare-repository
path. `WarpPool`, daemon workers, monitors, and CLI composition roots use that
locator rather than independently reconstructing paths.

The locator's canonical graph root is part of that authority result. Every
worker boundary that carries the terminal repository path must carry the same
root explicitly, and the sidecar opener must reject an omitted root. It must
never reconstruct storage authority by walking upward from a terminal path.

Sidecar initialization must:

- reject a blank graph root, any graph root reached through a symlink alias,
  and any root that contains or is contained by the source worktree or common
  Git directory before touching storage;
- create Graft-owned directories with private permissions;
- refuse symlinked or non-directory managed path components;
- initialize an absent terminal repository as bare;
- accept an existing terminal repository only if Git confirms it is bare;
- be idempotent under repeated or concurrent opens; and
- fail closed on an occupied, malformed, or non-bare terminal path.

Existing `refs/warp/...` in a source repository are left untouched. They are
not read, deleted, copied, or silently merged into a new session sidecar.

### 5. Test execution is copy-in Docker only

All Vitest execution for this cycle uses the Docker test image. The host-side
launcher may invoke the Docker CLI, but it must never invoke Vitest, Node test
workers, or repository test helpers against the live checkout.

The isolation boundary is defense in depth:

1. `.dockerignore` excludes the source checkout's `.git`, `.graft`, host
   dependencies, build output, and coverage state from the build context.
2. The Dockerfile copies the remaining source snapshot into an image layer;
   tests do not bind-mount or volume-mount the host checkout.
3. Immediately after the copy, a Docker build step removes every configured
   remote from any Git repository that was nevertheless copied in, removes
   linked-worktree `.git` pointer files, and fails if a copied repository still
   advertises a remote.
4. Every Docker `RUN` step after project-source copy uses `--network=none`.
5. Test execution uses `--network none` and an ephemeral `--rm` container with
   all Linux capabilities dropped and `no-new-privileges` enabled.
6. Every invocation receives a unique image reference, so concurrent test
   runners cannot overwrite or remove one another's image.
7. Public package scripts do not expose a host-side Vitest fallback or a
   spoofable environment-only escape from Docker isolation.

The image may create disposable Git repositories inside its own filesystem for
behavior tests. A test may configure an inert `example.invalid` remote solely
to prove the post-copy scrub removes it. Network access remains unavailable,
and the assertion requires every copied repository to end with no remotes.
Their refs and objects disappear with the test container.

## Identity Matrix

| Scenario | Git evidence | Live files | WARP working graph |
| --- | --- | --- | --- |
| Same session, same worktree | shared | shared | shared handle |
| Same session, different worktrees | shared when linked | separate | separate sidecars |
| Different sessions, same worktree | shared | shared | separate sidecars |
| Different sessions, different worktrees | shared when linked | separate | separate sidecars |
| Persistent monitor and agent | shared | selected worktree | separate logical sidecars |
| Different CLI processes, same worktree | shared | shared | one stable CLI sidecar |

Separate graph stores do not claim separate ownership of the underlying live
files. Same-worktree overlap remains provenance-uncertain unless stronger
handoff or actor evidence exists.

## Playback Questions

### Human

- [x] Can I call `safe_read` with a nested `cwd` in a never-opened repo and
  get the file on the first call?
- [x] Does `workspace_list_opened` then show the canonical parent worktree
  while `workspace_status` remains unbound when I did not request activation?
- [x] Can two agents point at two linked worktrees and get only their own
  structural graph state?
- [x] Does the source repository retain the same WARP refs, objects, local Git
  configuration, and hooks tree?
- [x] Can I recognize the project and worktree in `~/.graft/graphs` without
  relying on those names as identity?

### Agent

- [x] Does a routed daemon invocation atomically ensure the exact resolved
  authorization instead of repeating path resolution through a second API?
- [x] Do two worktrees with one `repoId` resolve to different sidecar paths?
- [x] Do two session writers in one worktree resolve to different sidecars?
- [x] Does one complete sidecar identity drive both pool reuse and persistence
  location?
- [x] Do daemon child workers receive the resolved sidecar path rather than
  rebuilding it from the source cwd?
- [x] Do monitor and CLI production call sites stop passing source worktrees to
  the git-warp persistence adapter?
- [x] Does a malformed or non-bare sidecar fail without falling back to the
  source repository?
- [x] Do blank, symlink-aliased, and source-overlapping graph roots fail before
  any storage path is created or permission mode changed?

## Acceptance Criteria

- A daemon session with no active binding and no prior authorization can run a
  routed repo tool against an explicit nested `cwd` successfully.
- The newly resolved worktree appears in both daemon authorization state and
  that session's opened-workspace list with the default capability profile.
- Auto-opening does not change the session's active worktree.
- Non-Git paths and contradictory identity hints retain typed failures.
- Same-repo linked worktrees never share a WARP handle.
- Independent MCP sessions never share a WARP sidecar, including when they use
  the same worktree.
- A graph write creates refs and objects only in the expected bare sidecar.
  The source repository's WARP refs, object count, local configuration, and
  hooks tree remain unchanged.
- Production MCP, daemon-worker, monitor, API, and CLI composition roots do not
  open git-warp persistence against a source worktree.
- Existing behavioral, path-boundary, capability, output-schema, typecheck,
  lint, and build gates pass.
- Every package-script path that executes Vitest routes through the copy-in
  Docker harness; no supported `test:local`, watch, release, or environment
  bypass can execute tests against the host checkout.
- The Docker build visibly performs post-copy Git-remote scrubbing across
  ordinary repositories and arbitrarily named bare repositories, then fails
  closed if any copied repository retains a remote.
- The base image digest and Alpine Git package revision are exact, every
  post-copy build step has no network, and concurrent invocations use distinct
  image references.
- The test container has no host checkout mount and no network.

## Test Strategy

Tests assert behavior and Git state, not this document's formatting.

1. Replace the unauthorized per-call regression with first-call auto-opening
   from a nested directory; assert content, canonical opened root, persisted
   authorization, default capabilities, and unchanged active binding.
2. Preserve the repository-replacement regression by proving the replacement
   is admitted as a new resolved identity rather than inheriting the prior
   record.
3. Unit-test the locator for repo/worktree/session isolation, readable bounded
   names, collision-resistant suffixes, and path containment.
4. Unit-test pool reuse on the full identity and retry after an open failure.
5. Open two real bare sidecars, write distinct nodes, and prove each observer
   sees only its own node while the source repo retains the same WARP refs,
   objects, local configuration, and hooks tree.
6. Exercise routed work through the in-process daemon worker path and verify
   its exact sidecar receives the graph refs.
7. Run focused workspace-routing, daemon-session, WARP-open, pool, worker,
   monitor, CLI, output-schema, and architectural-boundary suites before the
   repository minimum gates.
8. Exercise the test-runner model to prove all Vitest package scripts select
   Docker, the run command has no volume flags, and the environment variable
   formerly used for host bypass no longer changes execution.
9. Build the test target from a copied context with an exact base image and Git
   package, inspect the post-copy scrub witness, prove post-copy build steps
   have no network, then run focused and full validation only through unique,
   ephemeral, network-disabled containers with no mounts.

## Accessibility and Assistive Reading

- Human-readable project and worktree slugs make the sidecar hierarchy
  navigable without requiring opaque-ID transcription.
- Every correctness claim is also available through structured workspace
  identity and deterministic filesystem/Git evidence; color or visual layout
  is not required.

## Localization and Directionality

- Path identity is byte-derived and locale-independent.
- Display slugs use a restricted ASCII projection with deterministic fallback;
  non-ASCII names remain distinguishable through identity suffixes.
- No direction-dependent layout is part of the contract.

## Agent Inspectability and Explainability

- Receipts keep the requested and resolved workspace route evidence.
- `workspace_list_opened` identifies the canonical opened worktree and source.
- Sidecar paths visibly separate project, worktree, and actor scope without
  exposing raw session tokens.
- Failures name whether workspace resolution, managed path safety, bare-repo
  validation, or WARP opening failed. No failure silently falls back to the
  source Git repository.

## Non-goals

- [ ] Do not make daemon process cwd an authorization source.
- [ ] Do not auto-open a path when a routed tool omitted `cwd`.
- [ ] Do not scan sibling repositories or parent directories beyond Git's
  containing-worktree resolution.
- [ ] Do not merge, import, or delete legacy source-repository WARP refs.
- [ ] Do not share working graph state merely because two worktrees have one
  Git common directory.
- [ ] Do not claim actor ownership from sidecar separation alone.
- [ ] Do not add sidecar pruning or retention policy in this cycle; record it
  as explicit debt if the Retro confirms it is needed.
- [ ] Do not merge or release as part of this cycle without separate authority.
