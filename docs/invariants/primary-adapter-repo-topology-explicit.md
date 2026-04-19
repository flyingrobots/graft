# Invariant: Primary-Adapter Repo Topology Is Explicit

## What must remain true

- `src/api/`, `src/cli/`, and `src/mcp/` remain the explicit homes of
  the three official product entry points.
- `src/index.ts` stays a thin package export root for the public API,
  not the main implementation home for API behavior.
- Repo-visible docs name the current topology so humans and agents can
  tell where primary adapters, the application core, and secondary
  adapters live.
- Lint guardrails treat `src/api/` as a primary-adapter boundary
  instead of leaving API invisible to the architectural rules.

## Why it matters

If API stays hidden behind a root-export convention while CLI and MCP
have obvious directories, the repo tells two different architectural
stories at once. That makes it easier for product behavior to drift
back into the wrong layer, and it makes the hex posture harder to
inspect or enforce mechanically.

An explicit topology keeps the three entry points honest peers and
protects the one-core-many-adapters direction.

## How to check

- Read [repo-topology.md](../repo-topology.md) and verify it names
  `src/api/`, `src/cli/`, `src/mcp/`, and `src/index.ts`.
- Inspect `src/index.ts` and confirm it is a thin re-export root.
- Inspect `eslint.config.js` and confirm API is included in the
  primary-adapter guardrails.
