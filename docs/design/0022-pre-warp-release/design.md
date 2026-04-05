# Cycle 0022 — Pre-WARP Release

**Sponsor human:** James
**Sponsor agent:** Claude

**Hill:** Clear the non-WARP backlog and cut a release that makes
graft production-ready before WARP begins.

## Playback questions

- Agent: are all non-WARP backlog items closed or deferred? **Yes.**
- Agent: does every new feature have tests? **Yes** — 411→417 tests.
- Human: is the release publishable on npm? **Yes** — v0.3.1 published.
- Human: does `graft init` work from any directory? **Yes** — tested.

## Non-goals

- WARP features (AST-per-commit, symbol identity)
- Live study execution
- src/ → dist/ migration (separate cycle)

## Scope

### Flagship
- **context-budget** (M) — budget-aware governor

### Bug class elimination
- **policy-check-middleware** (S) — auto evaluatePolicy for path-bearing tools
- **cached-file-abstraction** (S) — CachedFile value object, TOCTOU elimination
- **guarded-port-factory** (S) — Proxy-based stream guard for whole ports

### Measurement + polish
- **receipt-compression-ratio** (XS) — returnedBytes / fileBytes
- **diff-summary-line** (XS) — structural --stat per file
- **graft-explain** (XS) — reason code help tool

### Onboarding
- **graft-init** (S) — zero-friction project scaffolding

### Release infrastructure
- npm OIDC provenance publish in CI
- Tarball + SHA256SUMS as GitHub release assets
- package.json optimized for npm (publishConfig, homepage, bugs, keywords)

### Housekeeping
- Close CORE_token-usage-comparison (subsumed by study)
- Regenerate README, GUIDE, BEARING, VISION signposts
- Redact local paths from committed witnesses
- Fix CI pnpm version conflict (packageManager vs action-setup)
- Brand colors on graft.svg
