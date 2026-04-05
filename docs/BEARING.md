# Bearing: WARP

**Set:** 2026-04-05
**Direction:** Structural memory over Git. AST-per-commit worldlines.

## Why now

v0.3.0 closed the pre-WARP slate. Budget-aware governor, three
bug classes eliminated (policy middleware, CachedFile, guardedPort),
measurement infrastructure in place (compression ratio, receipts).
Non-WARP backlog: zero.

Graft governs reads. WARP gives it memory — structural diffs across
commits, not just across a single session's cache.

## What ships under this bearing

1. **AST-per-commit** (Level 1 worldline) — structural delta patches
   at each commit. The bridge from "what does the code look like now"
   to "how did the code change over time."
2. **graft since <ref>** — symbols changed since a commit.
3. **Phase 2 precision tools** — code_show, code_find. Depends on
   WARP's symbol-level infrastructure.

## What does NOT ship under this bearing

- Live study execution (infrastructure is built, study runs when ready)
- Non-read burden measurement (needs study data first)
- Human-facing UX (git-graft-enhance, graft-init — cool ideas for later)

## What just shipped

Cycle 0022 — pre-WARP release (v0.3.0): budget governor, explain
tool, policy middleware, CachedFile, guardedPort, compression ratio,
diff summary lines. 411 tests, 12 tools.

## What feels wrong

- CodeRabbit rate limiting creates a painful review loop. The stale
  check workaround (empty commit) works but adds noise.
- npm publish was missing from the release pipeline (fixed, untested
  with OIDC — v0.3.1 will be the proof).
