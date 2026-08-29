---
title: "Verification witness for automatic isolated workspace sidecars"
---

# Verification Witness

This witness records the RED/GREEN evidence for
`WARP_automatic-isolated-workspace-sidecars` and the proof that test execution
had no path back to the host checkout.

## Hermetic Boundary

After the operator's halt, every Vitest invocation ran inside a Docker image
built from a copied source snapshot. No subsequent test command used a bind
mount or volume.

The image build completed this required post-copy step:

```text
[source 3/3] RUN sh scripts/strip-copied-git-remotes.sh /app
copy-in Git scrub complete: no copied repository remotes or worktree pointers
```

The final test command was:

```text
docker run --rm \
  --network none \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  graft-test:actor-fixtures-green \
  pnpm exec vitest run --maxWorkers 2
```

The image contained no copied `.git`, `.graft`, host `node_modules`, build
output, or coverage directory because `.dockerignore` excluded them. The
Dockerfile nevertheless scrubbed all copied Git repositories after `COPY` and
failed closed if a remote or linked-worktree pointer survived.

## RED Evidence

The cycle first proved the requested behavior absent:

- automatic-open and sidecar isolation RED: 12 expected failures across 19
  focused tests
- first complete hermetic suite after implementation: 8 failed files and 11
  failed tests, with 253 files and 2,056 tests already passing

The complete-suite failures were bounded:

- eight historical/clean-head fixtures wrote WARP state through the old source
  repository actor and then queried a newly isolated session or CLI actor
- one path-boundary allowlist omitted the new adapter/composition files
- one release assertion still required direct host Vitest
- one generated backlog DAG did not yet contain the sidecar-retention card

No failure required sharing actors or restoring source-repository graph
storage.

## GREEN Evidence

After repairing those exact contracts:

```text
Focused regression gate
Test Files  8 passed (8)
Tests       46 passed (46)

Full repository gate
Test Files  261 passed (261)
Tests       2067 passed (2067)
Duration    90.97s

pnpm lint       passed in an isolated container
pnpm typecheck  passed in an isolated container
pnpm build      passed as the Docker build stage
git diff --check passed on the host as a read-only Git check
```

The focused gate covered:

- first-call auto-opening and non-inherited capabilities
- linked-worktree and independent-session sidecar separation
- sidecar path containment, private directories, bare-repository validation,
  deterministic local Git identity, and failed-open retry
- daemon worker, monitor, repo-local MCP, API, and CLI composition roots
- historical precision reads, structural blame, symbol history, and dead
  symbols within the correct actor lane
- Docker command isolation, release-gate routing, path-boundary allowlists, and
  the generated backlog graph

## Source Repository Immutability

Immediately before and after the final full container run, the live checkout
reported the same state:

```text
HEAD
e0c05a8df8f830ad4e78d1b476e142d0f4fff851

status --porcelain
<empty>

source WARP refs
refs/warp/graft-ast/checkpoints/head 714da101e689215e064d20f837b7d65be0fde9df
refs/warp/graft-ast/writers/graft edf21a7a8b91533ff27b0a101f7e5c80582482a1

count-objects -v
count: 6495
size: 44004
in-pack: 25704
packs: 4
size-pack: 18338
prune-packable: 0
garbage: 1
size-garbage: 0
```

Both snapshots also emitted the same pre-existing warning about
`.git/worktrees/graft-auto-open-sidecars/refs`. The run neither introduced nor
removed that host metadata. Identical status, refs, loose-object count, pack
count, and sizes prove that the full test container did not mutate the source
Git repository.

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
```

## Bounded Non-goals

- Existing source-repository WARP refs were not imported, migrated, or deleted.
- Sidecar retention and pruning were not implemented; the Retro links the
  committed debt card.
- Windows-specific permission behavior was not exercised by the Linux Docker
  image.
- The cycle did not merge, release, or change unrelated GitHub state.
