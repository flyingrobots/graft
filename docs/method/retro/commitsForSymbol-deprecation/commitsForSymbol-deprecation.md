# Retro: commitsForSymbol-deprecation

## What shipped

Added @deprecated JSDoc to commitsForSymbol pointing to symbolTimeline.
Switched stale-docs.ts from commitsForSymbol to symbolTimeline.
Added eslint-disable to remaining consumers (structural-blame pending rewrite).

## Playback

Refactor — behavior unchanged. stale-docs tests still pass.
No RED phase (behavior-preserving refactor).

## Drift check

- eslint-disable comments reference the rewrite card that will remove them ✅
- symbolTimeline uses observeGraph convention correctly ✅
