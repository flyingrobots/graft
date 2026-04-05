# Invariant: Observer Lens Totality

**Status:** Enforced (observer factory ships with WARP Level 1)
**Legend:** WARP

## What must remain true

Every public WARP-backed query must have a canonical observer lens
definition.

## Why it matters

Without this, "observer-based" becomes vibes. Different tools
invent slightly different apertures for the same question. Semantic
drift with a fancy name. The observer factory exists to prevent
this — one canonical lens per query pattern.

## How to check

- Each WARP-backed tool maps to one documented observer lens
- Equivalent queries don't fork into multiple ad hoc match patterns
- Lens definitions are test-covered
- Observer factory is the single entry point for lens construction
