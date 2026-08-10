# Requested Worktree Authority Verification

Cycle: `SURFACE_requested-worktree-authority`

## RED

The initial focused run failed on the three intentionally absent contracts:

```text
npx vitest run test/unit/mcp/per-call-workspace-route.test.ts test/unit/mcp/workspace-binding.test.ts
```

Result: 3 failed, 19 passed. Routed results lacked `_workspace`, routed
resolution threw a generic `Error`, and contradictory identity hints were
accepted. The initial dirty-only `graft_since` fixture also returned no files
because that command compares refs; the fixture was corrected to use unique
branch commits without changing product semantics. The corrected route RED
failed only on missing route evidence and the generic resolution error.

## GREEN and Contract Surface

```text
npx vitest run test/unit/mcp/per-call-workspace-route.test.ts test/unit/mcp/workspace-binding.test.ts test/unit/contracts/output-schemas.test.ts test/unit/mcp/daemon-worker-pool.test.ts
```

Result: 4 files and 41 tests passed.

The focused proof covers:

- both route directions across two worktrees of one repository;
- distinct structural symbols and worktree identities with one shared repo id;
- identical `_workspace` and `_receipt.workspace` evidence;
- output-schema validation of routed results;
- unchanged active session binding;
- typed missing-root and unauthorized-root failures;
- fail-closed `repoId`, `worktreeRoot`, and `gitCommonDir` mismatches; and
- evidence propagation through daemon worker execution.

## Full Validation

| Gate | Command | Result |
| :--- | :--- | :--- |
| Full isolated suite | `pnpm test` | pass; 258 files, 2,051 tests |
| Build | `pnpm build` | pass |
| Public surface | `pnpm release:surface-gate` | pass; 2 files, 10 tests |
| Lint | `pnpm lint` | pass |
| Types | `pnpm typecheck` | pass |
| Whitespace | `git diff --check` | pass |

The full suite executed in the repository's Docker-isolated runner. There were
no failed, flaky, retried, or unexplained tests.

## Scope Witness

The branch contains one planning commit and one behavior commit before this
closure packet. No generated schema artifact, dependency, structural-diff
algorithm, Echo integration, git-warp behavior, daemon dashboard, or unrelated
backlog card changed.
