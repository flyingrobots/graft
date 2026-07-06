# Verification Witness: CLEAN CI Node 20 smoke

## Baseline Evidence

CI run `28760702996` on `main` at `8703e590` showed duplicated Dockerized test
work:

```text
test (22): pnpm test ran ~3m00s inside a 3m51s job
test (20): pnpm test ran ~3m37s inside a 4m36s job
```

The Dockerfile test stage uses `node:22-alpine`, so the Node 20 lane's full
`pnpm test` step rebuilt and ran the same Node 22 test container rather than
executing the full suite under Node 20.

## Cache Rollback Evidence

The first PR #225 run with Buildx cache enabled produced:

```text
test (20): pass, 36s
test (22): pass, 4m43s
```

Because the cache path made the first PR run slower than the baseline, it was
removed from the final diff. The proven improvement kept in the branch is the
Node 20 lane reduction from 4m36s to 36s.

## Focused Runner Tests

```bash
pnpm exec vitest run \
  test/unit/release/docker-test-isolation.test.ts \
  test/unit/scripts/isolated-test-args.test.ts
```

Result:

```text
Test Files  2 passed (2)
Tests       13 passed (13)
```

## Docker-Isolated Focused Proof

```bash
pnpm test -- \
  test/unit/release/docker-test-isolation.test.ts \
  test/unit/scripts/isolated-test-args.test.ts
```

Result:

```text
Test Files  2 passed (2)
Tests       13 passed (13)
```

The Docker run used the default local path and preserved the existing
`docker build --target test -t graft-test:local .` behavior.

## Host Gates

```bash
git diff --check
pnpm lint
pnpm typecheck
pnpm build
node bin/graft.js --version
```

Results:

```text
git diff --check: pass
pnpm lint: pass
pnpm typecheck: pass
pnpm build: pass
node bin/graft.js --version: graft 0.11.1
```

## CI Contract

- The `test (22)` check remains the full Docker-isolated lane.
- The `test (20)` check remains present and now proves Node 20 host package
  compatibility.
- Local `pnpm test` defaults are unchanged.
