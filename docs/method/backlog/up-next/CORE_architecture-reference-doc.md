# CORE — Architecture Reference Doc

Graft has strong product docs (`README.md`, `docs/GUIDE.md`) and strong
directional docs (`docs/BEARING.md`, `docs/VISION.md`), but it still
lacks a single contributor-facing architecture reference that explains
how CLI, MCP, hooks, policy, repo-state observation, and WARP fit
together.

This gap shows up repeatedly in audits and onboarding: engineers can
work it out from code, but the repo does not yet teach it directly.

## Pull when

- contributor onboarding starts to require too much code spelunking
- CLI / MCP / hook behavior changes and docs drift risk rises
- shared-daemon or worldline work needs one stable architecture map

## Scope

- create `ARCHITECTURE.md`
- explain runtime surfaces: CLI, MCP, hooks
- explain the shared policy seam and where it is enforced
- explain layered worldline semantics and repo-state observation
- explain WARP write/read split (`indexer` vs `observers`)
- link from `README.md` and `CONTRIBUTING.md`
