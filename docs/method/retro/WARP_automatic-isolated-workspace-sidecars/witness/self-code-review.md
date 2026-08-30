---
title: "Self-code review for automatic isolated workspace sidecars"
---

# Self-Code Review Witness

This witness records the strict pre-publication review of
`cycle/isolated-auto-open-workspaces`. The review treated the branch as
hostile input, examined the complete diff against `origin/main`, and required
an executable regression or another inspectable proof for every repair.

## Preconditions

- Review baseline:
  `ec21094b25e885209c07087c01e1f4a968629619`.
- Merge target: `origin/main` at
  `dc6195147aabcb7a6a0d922aa0920dede720ce9e`.
- `git status --short --branch` showed no changed or untracked paths before
  review.
- `git fetch --prune origin` completed before the diff was inspected.
- `gh pr list --head cycle/isolated-auto-open-workspaces --state all` returned
  an empty list. There was no PR on which to publish an interim review comment.

## Disposition

| Severity | Found | Fixed | Remaining |
| --- | ---: | ---: | ---: |
| Critical | 4 | 4 | 0 |
| High | 9 | 9 | 0 |
| Medium | 5 | 5 | 0 |
| Low | 59 | 59 | 0 |
| Total | 77 | 77 | 0 |

No finding was waived. The low-severity count comprises 39 individual
Markdown lint errors and 20 stale current-reference paths.

## Findings by File

### `scripts/isolated-test-runner.ts`

#### SCR-01: Docker argument injection through the image setting — Critical

- Evidence: `scripts/isolated-test-runner.ts:207-230@ec21094b` passed
  `GRAFT_TEST_IMAGE` into both Docker commands without validation and placed
  it in the `docker run` option region without an `--` terminator.
- Type: host-isolation and command-boundary vulnerability.
- Consequence: a leading Docker option could be interpreted as runner
  configuration instead of an image reference, weakening the promised
  container boundary.
- Mitigation prompt: “Validate the configured Docker image base as one safe
  image-reference argument, reject leading options and digest/whitespace
  tricks, add `--` before the run image, and prove rejection with behavioral
  tests.”
- Resolution: `5447e76c`; regression coverage in
  `test/unit/release/docker-test-isolation.test.ts`.

#### SCR-08: Concurrent test runs shared one mutable image tag — High

- Evidence: `scripts/isolated-test-runner.ts:14-15@ec21094b` declared the
  process-global `graft-test:local` tag, and
  `scripts/isolated-test-runner.ts:207-230@ec21094b` reused it for every build
  and run.
- Type: concurrency and test-integrity defect.
- Consequence: parallel invocations could replace or remove the image another
  invocation was about to execute, so a run could test the wrong source
  snapshot.
- Mitigation prompt: “Derive a validated per-invocation image reference from
  process and random identity, use that exact reference for build, run, and
  cleanup, and prove two invocations cannot collide.”
- Resolution: `e8b19003`; regression coverage in
  `test/unit/release/docker-test-isolation.test.ts`.

### `Dockerfile`

#### SCR-02: Mutable base image and package inputs — Medium

- Evidence: `Dockerfile:1-6@ec21094b` selected `node:22-alpine` and an
  unconstrained Alpine `git` package.
- Type: reproducibility and supply-chain drift.
- Consequence: identical source could build against different operating-system
  and Git bytes over time.
- Mitigation prompt: “Pin the Node base by digest and the Alpine Git package by
  exact revision, then make the isolation contract reject regressions.”
- Resolution: `36dc9015`; Docker isolation tests assert both exact inputs.

#### SCR-14: Project-source build layers retained network access — High

- Evidence: `Dockerfile:26-32@ec21094b` copied project source, scrubbed it, and
  built it in ordinary network-enabled `RUN` steps.
- Type: hermeticity boundary defect.
- Consequence: copied project code or a compromised build script could contact
  external services after gaining access to the source snapshot.
- Mitigation prompt: “Mark every `RUN` after project-source `COPY` with
  `--network=none`, including the remote scrub and TypeScript build, and assert
  this Dockerfile invariant.”
- Resolution: `2148daa1`; regression coverage in
  `test/unit/release/docker-test-isolation.test.ts`.

### `scripts/strip-copied-git-remotes.sh`

#### SCR-09: Remote scrubbing missed arbitrarily named bare repositories — High

- Evidence: `scripts/strip-copied-git-remotes.sh:20-47@ec21094b` searched only
  `.git` directories and directories whose names ended in `.git`.
- Type: incomplete host-severance boundary.
- Consequence: a copied bare repository named, for example, `mirror` could
  retain a real remote and permit a test or build step to interact with it.
- Mitigation prompt: “Discover Git repositories by repository behavior rather
  than filename convention, remove every remote, reject surviving linked
  worktree pointers, and fail closed when any candidate remains connected.”
- Resolution: `a95e1c83`; shell behavior is covered by
  `test/unit/scripts/strip-copied-git-remotes.test.ts` and the Docker build
  witness.

### `src/warp/sidecar.ts`

#### SCR-03: First-open initialization was not concurrency-safe — High

- Evidence: `src/warp/sidecar.ts:138-181@ec21094b` performed a check, directory
  creation, `git init --bare`, validation, and Git configuration as separate
  observable steps with no cross-process exclusion.
- Type: time-of-check/time-of-use race.
- Consequence: two agents opening the same actor sidecar for the first time
  could observe a half-initialized repository or fail nondeterministically.
- Mitigation prompt: “Make first-open initialization atomic across processes,
  retain in-process promise coalescing, validate the winning repository, clean
  failed staging state, and exercise concurrent opens.”
- Resolution: `a0d6cf2a`; concurrent-open regressions live in
  `test/unit/warp/sidecar.test.ts`.

#### SCR-11: A blank graph root resolved to the process directory — Critical

- Evidence: `src/warp/sidecar.ts:194-227@ec21094b` applied `path.resolve` to
  unchecked storage input; an empty graph root therefore became the current
  process directory before managed-directory creation and permission changes.
- Type: unsafe path normalization.
- Consequence: misconfiguration could make Graft create or chmod paths in an
  unrelated working directory.
- Mitigation prompt: “Reject blank storage roots and blank sidecar paths before
  normalization or filesystem access, and test every production composition
  root that forwards the setting.”
- Resolution: `d101bfd9`; regression coverage in
  `test/unit/warp/sidecar.test.ts`.

#### SCR-12: Graph storage could overlap source Git state — Critical

- Evidence: `src/warp/sidecar.ts:104-125@ec21094b` created and chmodded the
  configured root, while `src/warp/sidecar.ts:194-227@ec21094b` never compared
  that root with `worktreeRoot` or `gitCommonDir`.
- Type: source-repository mutation vulnerability.
- Consequence: a root inside, above, or symlink-aliased to the source worktree
  or common Git directory could let sidecar setup mutate source-owned paths.
- Mitigation prompt: “Canonicalize the prospective root without creating it,
  reject containment in either direction against the canonical worktree and
  common Git directory, reject symlink aliases, and prove failure occurs
  before chmod or creation.”
- Resolution: `ea09712c`; path-overlap regressions live in
  `test/unit/warp/sidecar.test.ts`.

#### SCR-20: Omitted graph authority could be inferred as a broad host path — Critical

- Evidence: the published PR head allowed `openWarpSidecar` callers to omit
  `graphRoot` and reconstructed it by walking four parents above
  `sidecarRepo`. For a shallow path such as `/tmp/project`, that calculation
  could resolve to `/`, after which storage setup would inspect or change a
  host-wide path instead of the configured Graft graph root.
- Type: authority-boundary violation and destructive path derivation.
- Consequence: a malformed internal call could expand Graft's filesystem
  authority far beyond the locator-owned graph root.
- Mitigation prompt: “Make the canonical locator root mandatory at the type
  and runtime boundaries, propagate it through daemon and monitor jobs, and
  reject omission before creating any storage.”
- Resolution: the post-publication P0 repair recorded by the commit containing
  this entry; the omitted-root regression and all direct call sites are in
  `test/unit/warp/sidecar.test.ts` and the worker-routing suites.

### `src/mcp/daemon-control-plane.ts`

#### SCR-04: Authorization persistence admitted lost updates — High

- Evidence: `src/mcp/daemon-control-plane.ts:160-191@ec21094b`,
  `src/mcp/daemon-control-plane.ts:199-227@ec21094b`, and
  `src/mcp/daemon-control-plane.ts:255-263@ec21094b` independently mutated one
  in-memory map and persisted whole-state snapshots with no mutation queue.
- Type: concurrent state durability defect.
- Consequence: simultaneous automatic opens, revocations, or binding updates
  could overwrite one another on disk.
- Mitigation prompt: “Serialize all control-plane state mutations through one
  failure-tolerant queue and prove overlapping mutations retain every update.”
- Resolution: `45a178d2`; concurrency regressions live in
  `test/unit/mcp/daemon-control-plane.test.ts`.

#### SCR-05: Direct authorization surfaces trusted stale path identity — High

- Evidence: `src/mcp/daemon-control-plane.ts:199-226@ec21094b` revoked by
  `worktreeId` presence alone, and
  `src/mcp/daemon-control-plane.ts:278-284@ec21094b` returned a stored record
  without comparing the freshly resolved repository identity.
- Type: stale-authority and repository-replacement defect.
- Consequence: a different repository placed at the same path could inherit or
  revoke a record belonging to the prior repository.
- Mitigation prompt: “Require repo ID, worktree root, and common Git directory
  to match every freshly resolved path before read, bind-note, or revoke
  behavior can use a stored authorization.”
- Resolution: `45a178d2`; repository-replacement regressions live in
  `test/unit/mcp/daemon-control-plane.test.ts`.

#### SCR-06: Monitor lookup could select a replaced worktree — High

- Evidence: `src/mcp/daemon-control-plane.ts:286-302@ec21094b` selected monitor
  candidates only by stored `repoId` and preferred path, without re-resolving
  the live Git identity.
- Type: stale-observation routing defect.
- Consequence: the monitor could read or write the logical sidecar for a
  repository no longer present at the recorded path.
- Mitigation prompt: “Re-resolve every monitor candidate with Git, retain only
  exact authorization matches, and cover same-path repository replacement.”
- Resolution: `4b2bd172`; regression coverage lives in
  `test/unit/mcp/daemon-control-plane.test.ts`.

#### SCR-07: Failed persistence leaked an in-memory authorization — High

- Evidence: `src/mcp/daemon-control-plane.ts:189-191@ec21094b` published the
  map mutation before awaiting persistence and had no failure rollback; revoke
  and `noteBound` used the same ordering.
- Type: failure-atomicity defect.
- Consequence: callers after a failed write could observe authority that would
  disappear on daemon restart.
- Mitigation prompt: “Make every authorization mutation failure-atomic and add
  injected-filesystem failures for authorize, revoke, and bind timestamps.”
- Resolution: `18886ee7`; failure regressions live in
  `test/unit/mcp/daemon-control-plane.test.ts`.

#### SCR-13: Authorization became visible before durable commit — High

- Evidence: even after rollback was added,
  `src/mcp/daemon-control-plane.ts:191-203@18886ee7` updated the shared map
  before the awaited persistence operation completed.
- Type: linearizability and durability-ordering defect.
- Consequence: another call could consume transient authorization while the
  write was still pending, including a write that ultimately failed.
- Mitigation prompt: “Build a candidate snapshot, persist it first, and publish
  the in-memory mutation only after success; prove delayed persistence hides
  the candidate from concurrent readers.”
- Resolution: `002e2f43`; delayed-filesystem regressions live in
  `test/unit/mcp/daemon-control-plane.test.ts`.

### Isolation and source-mutation tests

#### SCR-10: Session isolation lacked a real parallel same-worktree proof — Medium

- Evidence: `test/unit/mcp/warp-sidecar-routing.test.ts:61-131@ec21094b`
  exercised two linked worktrees sequentially, while
  `test/unit/warp/sidecar.test.ts:54-79@ec21094b` checked only deterministic
  path inequality for two actor IDs.
- Type: acceptance-proof gap.
- Consequence: the requested “parallel agents in one project” behavior could
  regress even while the path calculator tests remained green.
- Mitigation prompt: “Run independent MCP sessions concurrently against the
  same worktree, write distinct graph facts, and prove each session observes
  only its own sidecar.”
- Resolution: `642f33fa`; parallel integration coverage lives in
  `test/unit/mcp/warp-sidecar-routing.test.ts`.

#### SCR-15: Source immutability fingerprints omitted config and hooks — Medium

- Evidence: `test/unit/warp/sidecar.test.ts:81-145@ec21094b` compared source
  WARP refs and `count-objects -v`, but did not fingerprint local Git config or
  the hooks tree.
- Type: incomplete non-mutation proof.
- Consequence: a regression that changed source Git configuration or hooks
  could pass the stated sidecar acceptance test.
- Mitigation prompt: “Fingerprint source WARP refs, object accounting, local
  config, and every hook before and after sidecar writes, then require exact
  equality.”
- Resolution: `36c2df56`; expanded fingerprints live in
  `test/unit/warp/sidecar.test.ts`.

### Living documentation

#### SCR-16: Maintained docs described contradictory workspace truth — Medium

- Evidence: `docs/MCP.md:45-86@ec21094b` still said every daemon repo call
  required prior authorization and binding, and other maintained guides mixed
  source-repository WARP storage, shared writer lanes, and per-call caller
  overrides with the new implementation.
- Type: public contract and documentation drift.
- Consequence: users could perform unnecessary setup or assume graph sharing
  and storage behavior that the software intentionally no longer provides.
- Mitigation prompt: “Audit every maintained setup, MCP, CLI, architecture,
  invariant, security, release, and teardown document against the live call
  graph; distinguish automatic routed opening, explicit binding, stable CLI
  sharing, and actor-isolated MCP sidecars.”
- Resolution: `6bb6a808` and `220c7e4a`; all maintained relative links and
  Markdown lint rules pass in a copied, remote-scrubbed container.

#### SCR-18: Branch-touched docs retained 39 Markdown violations — Low

- Evidence: the expanded copied-container audit reported these exact rule
  failures before repair:

  | File | Findings | Rules |
  | --- | ---: | --- |
  | `ARCHITECTURE.md` | 3 | MD022, MD032 |
  | `GUIDE.md` | 6 | MD022, MD032 |
  | `docs/design/system-wide-mcp-daemon-and-workspace-binding.md` | 6 | MD032 |
  | `docs/design/WARP_logical-writer-lanes.md` | 5 | MD032 |
  | `docs/design/WARP_same-repo-concurrent-agent-model.md` | 10 | MD032 |
  | `docs/design/warp-graph-model.md` | 6 | MD022, MD032, MD040 |
  | `docs/design/workspace-bind-and-routing-surface.md` | 3 | MD032 |

- Type: Markdown structure and assistive-reading consistency.
- Consequence: headings and lists lacked required separation, and two diagram
  fences had no language label. Renderers and assistive tooling could parse
  those structures inconsistently.
- Mitigation prompt: “Run the repository Markdown rules over every changed
  Markdown path in the copied, remote-scrubbed image; add the required blank
  lines, label text diagrams, and repeat until all 31 files report zero
  errors.”
- Resolution: `cf1ad05e`; the repeated container build reports 31 files and
  zero Markdown errors.

#### SCR-19: Current design references pointed at retired paths — Low

- Evidence: the copied-container path audits found 20 actionable stale
  references across branch-touched packets:

  | File | Findings | Defect |
  | --- | ---: | --- |
  | `docs/design/WARP_logical-writer-lanes.md` | 3 | retired live-plan and related paths |
  | `docs/design/system-wide-mcp-daemon-and-workspace-binding.md` | 8 | retired related paths and broken links |
  | `docs/design/system-wide-resource-pressure-and-fairness.md` | 6 | retired related paths |
  | `docs/design/workspace-bind-and-routing-surface.md` | 3 | retired related paths |

- Type: navigational accuracy and documentation lifecycle drift.
- Consequence: readers were directed to removed backlog cards even though the
  corresponding work now lives in current design packets.
- Mitigation prompt: “Resolve every active Related, Live plan, and Markdown
  link against the current design/backlog manifests; preserve only explicitly
  historical source provenance and intentional release-template paths.”
- Resolution: `88ae127e`; the repeated relative-link audit resolves 141 links
  across all 31 changed documents with zero missing targets. The remaining
  literal non-existent paths are six historical `source_backlog` records, four
  `vX.Y.Z` templates, and the planned v0.13.0 release witness.

### Strict static-check surfaces

#### SCR-17: Review repairs introduced strict type and lint violations — Medium

- Evidence: `scripts/isolated-test-runner.ts:54-58@220c7e4a` combined an
  optional property with explicit `undefined`, making
  `Required<IsolatedTestRunnerOptions>` non-callable;
  `src/warp/sidecar.ts:372-377@220c7e4a` used a confusing `void` promise arrow;
  and the parallel routing test rejected an `unknown` value directly.
- Type: static correctness and code-quality regression.
- Consequence: the feature tests passed while the repository's required lint
  and type gates failed.
- Mitigation prompt: “Run strict lint and typecheck over the copied source,
  repair exact-optional-property and promise-handler boundaries without
  weakening types, then rerun the focused behavior tests.”
- Resolution: `9a27d673`; `pnpm lint`, `pnpm typecheck`, and the 29 focused
  tests pass in the copied validation image.

## Final Review State

The 76 pre-publication findings and one post-publication critical finding were
repaired without waiver. The final publication preflight repeats a clean-status
check, fetches `origin`, and reviews the full `origin/main...HEAD` diff so these
repair commits are reviewed together with the original implementation.
