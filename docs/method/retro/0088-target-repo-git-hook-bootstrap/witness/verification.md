---
title: "Verification Witness for Cycle 88"
---

# Verification Witness for Cycle 88

This witness records the targeted evidence actually used to close
`0088-target-repo-git-hook-bootstrap`.

## Verified Hill

`graft init --write-target-git-hooks` installs a truthful minimal hook
bootstrap in target repos, preserves external hook ownership, and lets
runtime overlay surfaces distinguish absent hooks from installed
checkout-boundary observation.

## Commands Run

```text
npm test -- --run test/unit/cli/init.test.ts test/unit/mcp/runtime-observability.test.ts test/unit/mcp/runtime-workspace-overlay.test.ts tests/playback/0088-target-repo-git-hook-bootstrap.test.ts
```

Result:

```text
Test Files  4 passed (4)
Tests       49 passed (49)
```

```text
method_drift 0088-target-repo-git-hook-bootstrap
```

Result:

```text
No playback-question drift found.
```

## Evidence Notes

- `test/unit/cli/init.test.ts`
  proves explicit flag installation, `core.hooksPath` composition,
  external hook preservation, hook event append behavior, and lawful
  erroring outside a git worktree.
- `test/unit/mcp/runtime-observability.test.ts`
  proves doctor/runtime footing surfaces installed hooks honestly and
  upgrades boundary authority after a hook-observed checkout event.
- `test/unit/mcp/runtime-workspace-overlay.test.ts`
  proves absent / external / installed / hook-observed footing states
  for target-repo hook bootstrap.
- `tests/playback/0088-target-repo-git-hook-bootstrap.test.ts`
  gives METHOD-visible repo playback witness for the shipped behavior.
