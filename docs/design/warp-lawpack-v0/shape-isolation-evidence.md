# Shape-Isolation Evidence: Is `UnsupportedSemantics` About the Epoch, the Shape, or Identity?

**Question this answers:** the previous rung (`pinned-epoch-evidence.md`) found that Echo's real, checked, unmodified WASM lowerer component refuses `recordSymbolChange` with `UnsupportedSemantics`, while the native oracle lowerer accepts it. Before investing in the Echo `intent`→`action` migration, this experiment asks: is that refusal actually about the `intent`/`action` vocabulary epoch, about the *shape* of the action (field count/complexity), or about something else entirely?

## Method

Three variants, same pinned epoch (Edict `c75c3f5`), same pipeline, same unmodified checked Echo package, compared directly:

1. **Positive control** — the exact original fixture (`package a.b@1; ... intent t(...) ...`), completely unmodified.
2. **Single-field Graft action** — `package graft.warp.tick@1; ... intent recordTick(input: TickInput) ...`, matching the original's exact shape (one `String<max=16>` field, one `target.replace` effect, one obstruction) but with different package/type/action/obstruction names.
3. **Four-field `recordSymbolChange`** — the action from the prior rung, re-run for direct comparison.

## A bug found and fixed along the way (worth recording honestly)

The first run of this experiment produced a false result: the positive control (variant 1) was refused with `InvalidSemanticArtifact: "Core coordinate does not equal its bound reference"` — not the expected success. Root cause was a bug in this harness, not a finding about Echo: `echo_request_from_core_bytes` hardcoded the bound-artifact coordinate label as `"graft.warp@1"` regardless of the actual compiled source's real package coordinate, which happened to accidentally match variant 3's package but not variant 1's (`a.b@1`). Fixed by threading the real `core.coordinate` through instead of a hardcoded string. Re-ran all three variants after the fix. Recording this because a wrong "control failed" result, left uninvestigated, would have invalidated the entire experiment.

## Result (after the fix)

| Variant | Coordinate | Result |
|---|---|---|
| 1. Original fixture (unmodified) | `a.b@1` | **Accepted** — real lowering response returned |
| 2. Single-field Graft action (same shape, different names) | `graft.warp.tick@1` | **Refused** — `UnsupportedSemantics` |
| 3. Four-field `recordSymbolChange` | `graft.warp@1` | **Refused** — `UnsupportedSemantics` (same as before) |

Variant 2's refusal is structurally identical to variant 3's — same `kind: UnsupportedSemantics`, same diagnostic code and message, `subject` correctly reflecting each variant's actual submitted coordinate (confirming the check is genuinely identity-aware, not a fixed/hardcoded error unrelated to input).

## Conclusion

**The refusal is not about shape, and not about the vocabulary epoch.** A single-field action, structurally identical to the accepted original fixture in every way except its names, is refused exactly like the more complex four-field action. Only the *exact original fixture's identity* (`a.b@1` / `t` / its specific type and obstruction names) is accepted. Echo's own docs' own description of this component as implementing "narrow v0.9 target slices" understates just how narrow: this is not a general-but-limited lowering engine for `target.replace`-shaped actions — **it is, in effect, an allowlist of one specific, exactly-named, already-reviewed source occurrence.**

## Why this matters for planning

This reframes the Echo `intent`→`action` migration's expected payoff. Migrating the vocabulary epoch would **not**, by itself, unblock a *new* Graft action executing against Echo's real checked lowerer component — the component doesn't generalize to new action identities at all, regardless of which keyword compiled them. Getting any new action (Graft's or otherwise) through this specific checked component requires the component itself to be extended or regenerated to recognize that new action's identity — which is a materially different, and likely larger, task than a vocabulary rename. This is consistent with `schemas/edict-provider/package/README.md`'s framing of the checked package as "the first exact digest-locked Echo Edict provider distribution" bound to one specific, reviewed fixture (`ORIGIN.toml`: "Materialized reviewed source fixture... whitespace is part of this exact Echo-owned occurrence") — not a general-purpose compiler target yet.

## What this does not change

- The Core/Target-IR structural findings from `lowering-evidence.md` and `pinned-epoch-evidence.md` still hold: `recordSymbolChange` compiles and lowers correctly via the native compiler pipeline at both Edict epochs.
- The `intent`↔`action` rename is still confirmed as pure terminology with no semantic drift, for whichever action shape is being compiled.
- Bundle assembly, full runtime execution, persistence semantics, and stale-basis enforcement remain unattempted.

## Recommended next question, if this line of work continues

Not "should we migrate Echo's pin" — first: **what would it take to get the checked lowerer component to recognize a second action identity at all**, independent of vocabulary epoch? That's likely the actual gating question for "Echo hosts Graft's data model" being real, and it may turn out to require the same regeneration machinery (`echo-wesley-gen`) the epoch migration would also need — worth learning that once, deliberately, rather than assuming the epoch migration alone gets there.
