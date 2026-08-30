---
title: "Verification witness for automatic isolated workspace sidecars"
---

# Verification Witness

This witness records the RED/GREEN evidence for
`WARP_automatic-isolated-workspace-sidecars`, the strict review gates, and the
proof that test execution had no path back to the host checkout.

## Hermetic Boundary

After the operator's halt, every Vitest invocation ran inside a Docker image
built from a copied source snapshot. No subsequent test command used a bind
mount or volume.

The Dockerfile performs both post-copy build steps without network access:

```dockerfile
FROM deps AS source
COPY . .
RUN --network=none sh scripts/strip-copied-git-remotes.sh /app

FROM source AS build
RUN --network=none pnpm build
```

The scrub step emits this build witness only after it has inspected every
copied Git repository, removed every remote, removed linked-worktree pointer
file, and verified that none survived:

```text
copy-in Git scrub complete: no copied repository remotes or worktree pointers
```

The public test runner builds a unique image for every invocation and launches
it with this semantic command shape:

```text
docker run --rm \
  --network none \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -- \
  <unique-image-reference> \
  pnpm exec vitest run --maxWorkers 2
```

There is no host Vitest fallback. `.dockerignore` excludes the source
checkout's `.git`, `.graft`, host `node_modules`, build output, and coverage
directory. The run command has no mount argument. The test image is removed
after the invocation, including after a test failure.

## RED Evidence

The cycle first proved the requested behavior absent:

- automatic-open and sidecar-isolation RED: 12 expected failures across 19
  focused tests;
- first complete hermetic suite after implementation: 8 failed files and 11
  failed tests, with 253 files and 2,056 tests already passing; and
- strict review REDs reproduced concurrency, path-overlap, persistence-order,
  stale-identity, Docker isolation, and source-fingerprint defects before each
  repair.

The first complete-suite failures were bounded:

- eight historical/clean-head fixtures wrote WARP state through the old source
  repository actor and then queried a newly isolated session or CLI actor;
- one path-boundary allowlist omitted the new adapter/composition files;
- one release assertion still required direct host Vitest; and
- one generated backlog DAG did not yet contain the sidecar-retention card.

No failure required sharing actors or restoring source-repository graph
storage.

## GREEN Evidence

The final complete branch gate ran from the clean, pushed tree at
`e5fe5947625febdf338c7a694c3eec4f32fb2120`:

```text
Full repository gate
Test Files  262 passed (262)
Tests       2081 passed (2081)
Duration    110.87s

Focused strict-review gate
Test Files  3 passed (3)
Tests       29 passed (29)

pnpm lint       passed in the copied validation image
pnpm typecheck  passed in the copied validation image
pnpm build      passed in a network-disabled post-copy Docker stage
pnpm pack:check passed in a network-disabled copied container
pnpm security:check
  critical=0 high=0 moderate=0 low=0 info=0
agent worktree hygiene: pass
```

The package check produced `flyingrobots-graft-0.13.0.tgz`. The release
security gate queried the registry from a disposable copied container with no
mounts; it was not a test invocation and required network access for the audit.

The focused behavior gates covered:

- first-call auto-opening and non-inherited capabilities;
- linked-worktree and independent-session sidecar separation;
- same-worktree parallel sessions writing and observing isolated graph facts;
- sidecar path containment, private directories, bare-repository validation,
  deterministic local Git identity, concurrent first-open, and failed-open
  retry;
- blank, source-overlapping, ancestor, and symlink-aliased graph-root failure
  before storage mutation;
- serialized authorization updates, path-replacement identity, persistence
  failure atomicity, and persist-before-publish visibility;
- daemon worker, monitor, repo-local MCP, API, and CLI composition roots;
- historical precision reads, structural blame, symbol history, and dead
  symbols within the correct actor lane; and
- Docker image-reference safety, unique concurrent images, exact build inputs,
  post-copy no-network steps, complete remote scrubbing, release-gate routing,
  and path-boundary allowlists.

Documentation validation ran against all 31 changed Markdown documents inside a
copied image whose Git remotes were scrubbed and whose post-copy steps had no
network. Markdown lint reported zero errors. The relative-link audit resolved
141 links with zero missing targets; the literal-path audit classified six
historical source records, four release-template placeholders, and one planned
release witness without treating them as current navigational links.

## Source Repository Immutability

Immediately before and after the complete container run at `e5fe5947`, the
live source checkout reported identical WARP refs, Git object accounting,
local-config digest, hook-file digests, and status. The pre-run snapshot was:

```text
HEAD
e5fe5947625febdf338c7a694c3eec4f32fb2120

status --porcelain
<empty>

source WARP refs
refs/warp/graft-ast/checkpoints/head 714da101e689215e064d20f837b7d65be0fde9df
refs/warp/graft-ast/writers/graft edf21a7a8b91533ff27b0a101f7e5c80582482a1

count-objects -v
count: 6738
size: 45196
in-pack: 25704
packs: 4
size-pack: 18338
prune-packable: 0
garbage: 1
size-garbage: 0

source Git config SHA-256
21be0848f1f179351f3a2c4e4ffd5c7cae01604b0d190c613d8dff0c75d1de3e

source hooks
14 files; every individual SHA-256 identical before and after
```

Both snapshots emitted the same pre-existing warning about
`.git/worktrees/graft-auto-open-sidecars/refs`. The test container neither
introduced nor removed that host metadata. The source repository could not be
mutated by the test process: Docker received copied bytes, no mount, no
network, no Linux capabilities, and `no-new-privileges`.

The runner used
`graft-test:local-45888-68b0ea4d-2c98-4071-98ea-021d4927d12c` and deleted it
after the green run. A post-run image query returned no match.

## Strict Review

The complete evidence ledger is
[self-code-review.md](self-code-review.md). The review found 4 critical, 9
high, 5 medium, and 59 low issues. All 77 were repaired; zero findings remain
open.

The review was performed before a PR existed. Consequently there was no PR
thread on which to post the requested interim `@codex` summary. The ready PR
is created only after this review witness and Retro are committed and
validated.

## Commit Ledger

```text
6fd810dd docs(design): define automatic isolated workspace sidecars
12dde371 docs(design): remove trailing blank line
b1260f70 test(mcp): require first-call workspace auto-opening
88577156 test(mcp): prevent auto-open capability inheritance
8bb45a13 feat(mcp): auto-open routed workspaces
e13881c6 test(warp): require isolated sidecar persistence
5401af4b feat(warp): isolate workspace graphs in sidecars
63867bcc docs(design): require copy-in Docker test isolation
9f8f7f0f test(release): require fully hermetic Docker validation
6ff4aa4a feat(test): enforce copy-in Docker isolation
a76e4447 feat(cli): route graph commands through sidecars
c805e49e docs: document automatic isolated workspaces
cceae7ec test(warp): seed actor-isolated sidecar fixtures
e0c05a8d docs(method): refresh backlog dependency graph
ec21094b docs(retro): close isolated workspace sidecar cycle
5447e76c fix(test): reject unsafe Docker image references
36dc9015 build(test): pin Docker base image digest
a0d6cf2a fix(warp): make sidecar opening concurrency-safe
6bb6a808 docs: reconcile automatic workspace truth
dcfd90e4 chore(release): prepare v0.13.0
45a178d2 fix(mcp): serialize automatic workspace admission
a95e1c83 build(test): complete copied Git repository scrubbing
642f33fa test(warp): prove parallel session isolation
e8b19003 fix(test): isolate concurrent Docker invocations
4b2bd172 fix(mcp): verify monitor workspace identity
18886ee7 fix(mcp): roll back failed authorization writes
36c2df56 test(warp): fingerprint source Git mutation surfaces
d101bfd9 fix(warp): reject blank sidecar storage paths
ea09712c fix(warp): reject source-overlapping graph roots
002e2f43 fix(mcp): publish authorization after persistence
2148daa1 build(test): disable post-copy network access
220c7e4a docs: close automatic sidecar audit gaps
9a27d673 fix(test): satisfy strict runner type boundaries
cf1ad05e docs: satisfy strict Markdown style
88ae127e docs: repair stale design references
e5fe5947 docs(retro): record strict pre-publication review
```

## Bounded Non-goals

- Existing source-repository WARP refs were not imported, migrated, or deleted.
- Sidecar retention and pruning were not implemented; the Retro links the
  committed debt card.
- Windows-specific permission behavior was not exercised by the Linux Docker
  image.
- Exact Wesley regeneration was left to the pinned CI gate; descriptor and
  generated-contract tests passed in the full suite.
- The cycle did not merge, release, or change unrelated GitHub state.
