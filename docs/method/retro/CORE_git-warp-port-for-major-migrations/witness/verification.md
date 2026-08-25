---
title: "git-warp port for sequential major migrations verification"
cycle: "CORE_git-warp-port-for-major-migrations"
---

# git-warp port for sequential major migrations verification

## Checkpoints

| Checkpoint | Commit | Result |
| :--- | :--- | :--- |
| Design | `31b568a8` | Defined the pre-migration boundary and non-goals |
| RED | `8ad52899` | Committed the executable negative import witness |
| GREEN | `519487e0` | Routed graph reads and writes through the port |

All three commits were pushed to `origin/git-warp-v19.1.0` before the Retro
was written.

## RED

The boundary witness was run before `src/ports/warp.ts` and the adapter
wrappers existed:

```text
pnpm exec vitest run tests/playback/0080-warp-port-and-adapter-boundary.test.ts
```

Result: 2 failed and 2 passed. The failures proved both missing contracts:

- `src/ports/warp.ts` did not exist; and
- 17 production modules imported `@git-stunts/git-warp` outside the adapter
  allowance.

The committed RED test parses TypeScript syntax rather than searching prose.
Its adversarial fixture distinguishes a package-name string from type-only
imports, re-exports, import types, dynamic imports, and `require()`.

## GREEN

The focused WARP, MCP pool, precision, local-history, and boundary slice passed
14 files and 72 tests. A wider host-side WARP/MCP diagnostic batch passed 37 of
39 files and 314 assertions but reported three five-second timeouts under
parallel load: two in `structural-blame.test.ts` and one in
`precision.test.ts`. There were no assertion failures. The structural-blame
file then passed 2/2 in isolation, and the named precision case passed in
isolation.

The canonical repository gate resolved the diagnostic uncertainty:

```text
pnpm test
```

Result: 258 test files and 2,052 tests passed in the Docker-isolated runner.
The previously timed-out cases passed there. No retry or timeout exception was
used.

## Static and Build Gates

| Gate | Command | Result |
| :--- | :--- | :--- |
| Boundary | `pnpm exec vitest run tests/playback/0080-warp-port-and-adapter-boundary.test.ts` | pass; 4/4 |
| Types | `pnpm typecheck` | pass |
| Build | `pnpm build` | pass |
| Lint | `pnpm lint` | pass |
| Whitespace | `git diff --check` | pass |

The only lint/build noise was the existing local `.npmrc` warning that
`${NPM_TOKEN}` was unavailable; the commands exited successfully.

## Import Boundary

The final source census finds the package name only in:

```text
src/warp/open.ts
src/warp/plumbing.d.ts
```

`src/warp/open.ts` is the runtime adapter. `src/warp/plumbing.d.ts` is a
declaration-only compatibility bridge. The playback test traverses all
production TypeScript modules and fails on any other package dependency.

## Dependency and Migration Boundary

`package.json` still declares `@git-stunts/git-warp` as `^16.0.0`, and the
frozen lockfile still resolves 16.0.0. The branch diff contains no change to
`package.json` or `pnpm-lock.yaml`. No migration script was invoked, and no
stored graph was transformed.

## Scope

The implementation changed one port, one concrete adapter, production graph
consumer types, and tests that depended on package internals. It did not change
CLI, API, MCP schemas, graph facts, persistence configuration, dependency
versions, or migration state.
