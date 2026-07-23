# Research: What Would It Take to Teach Echo's Checked Component a Second Action?

**Scope: research only, per explicit instruction. Nothing in Echo was modified, built, or regenerated for this note.** This answers the question `shape-isolation-evidence.md` raised: is the checked lowerer component's narrowness fixable by artifact regeneration alone, or does it require real source changes?

## The mechanism, found directly in source

`~/git/echo/crates/echo-edict-provider-lowerer/src/lib.rs` (2,044 lines) and its sibling `~/git/echo/crates/echo-edict-provider-verifier/src/lib.rs` (1,862 lines) each hardcode the exact identity of the one fixture they accept, as literal Rust constants:

```rust
const CORE_COORDINATE: &str = "a.b@1";
const OPERATION_COORDINATE: &str = "a.b@1.t";
const OPERATION_INPUT_TYPE: &str = "a.b@1.Input";
const OPERATION_OUTPUT_TYPE: &str = "a.b@1.Output";
const OPERATION_PROFILE: &str = "continuum.profile.write/v1";
```

The lowering function checks the submitted Core module against these literally, in sequence — coordinate equality, exact type-shape equality (`expected_core_types()` hand-constructs the precise `Input`/`Output`/`Receipt` record shapes, each a single `String<max=16>` field named `id`), a hard requirement that the module contain **exactly one** action (`let [(intent_key, intent)] = intents.as_slice() else { return Err(unsupported_semantics(coordinate)); }`), the action name literally equal to `"t"`, and the input/output type names, operation profile, and evaluation budget all checked against further hardcoded expectations. Any mismatch at any of these checks returns `UnsupportedSemantics` — which is exactly the refusal observed for every variant except the byte-for-byte original in `shape-isolation-evidence.md`.

This is not a data-driven allowlist (e.g., a registered list of known action identities the component reads from its semantic-inputs) — it's Rust `if`/`==` control flow, compiled directly into the WASM component. **The component is source code that recognizes one fixture, not an engine configured with one fixture's data.**

## What this means concretely

Teaching this component a second action requires changing `echo-edict-provider-lowerer`'s and `echo-edict-provider-verifier`'s actual Rust source — there is no configuration, generated-artifact, or authority-facts change that adds a new accepted action on its own. Two paths exist:

1. **Add a second hardcoded branch** (extend the existing pattern: check "is this coordinate `X`? handle it this way. Is it `Y`? handle it that way."). Cheap per-action, but doesn't generalize — every future new action needs its own new hardcoded branch, by hand, forever. This is consistent with the component's own self-description as "narrow v0.9 target slices" that are explicitly *not* meant to be the long-term shape.
2. **Genuinely generalize the lowerer/verifier** to interpret an arbitrary Core module structurally — i.e., port the real algorithm `edict-syntax`'s own native `lower_to_target_ir` already implements (the "oracle" this whole experiment has been comparing against) into these WASM-component crates. This is the architecturally correct fix, but a real rewrite of ~2,000 (lowerer) + ~1,800 (verifier) lines of hand-written recognizer logic into a genuine interpreter — not a quick change.

Notably, **`echo-edict-provider-lowerer` does not depend on `edict-syntax` at all** (its own `Cargo.toml`: only `echo-edict-canonical`, plus `wit-bindgen` for the `wasm32` target). This looks like a deliberate trust-boundary choice — the untrusted WASM guest doesn't link the full compiler — which means path 2 can't be "just call edict-syntax's function from here"; it requires either re-deriving that logic independently inside the WASM-safe crate, or establishing a new, deliberate way to share the algorithm across the trust boundary without violating whatever isolation reason led to this separation in the first place. That reason isn't stated in the code and would be worth asking about before assuming path 2 is straightforward.

## Downstream cost, either path

Whichever path, changing this component's Rust source means:
- Recompiling to WASM via the existing `xtask` pipeline (`xtask/src/provider_lowerer_component.rs`, 2,868 lines as of this writing — a real, already-built tool, not something to write from scratch).
- Regenerating the full digest-locked distribution via `echo-wesley-gen --bin echo-edict-provider-package` (new component bytes → new digests throughout the manifest chain).
- Re-verifying via `scripts/verify-edict-provider-host-v1.sh`.
- Updating or regenerating any of Echo's own tests that assert exact digests against the current component (`RAW_TARGET_IR_SHA256`, `DOMAIN_TARGET_IR_SHA256`, etc. in `host_contract.rs` — these are byte-identity-pinned to the current component's exact output and would need updating once its behavior changes).
- Running Echo's full test suite.

This is on top of, not instead of, the `intent`→`action` fixture rewrite already scoped in `lowering-evidence.md`'s acceptance gate — the two are separable but likely worth doing together if either is undertaken, since both touch the same digest-locked package.

## Bottom line

"Teach the component a new action" is a real, moderate-to-large engineering project — closer in size to "write a second small compiler backend" (path 2) or "hand-maintain a small but growing set of hardcoded recognizers forever" (path 1) than to a configuration change. Neither path is something to start opportunistically; both deserve the same explicit scoping (an Echo issue/branch, a decision on path 1 vs. path 2, a real acceptance gate) already proposed for the vocabulary migration in `lowering-evidence.md`. This research doesn't recommend either path — it establishes, with certainty rather than inference, what each one actually costs.
