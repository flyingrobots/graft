# Pinned-Epoch Evidence: `recordSymbolChange` Against Edict `c75c3f5` and Echo's Unmodified Checked Package

**Sequencing note:** this is a follow-on to `lowering-evidence.md`, done *instead of* advancing Echo's pin. Echo's pin (`c75c3f550d049485ba00eae0dc272c6dd6aca11f`) and its digest-locked provider package remain completely untouched — this experiment reused them exactly as checked in. No `echo-wesley-gen` regeneration was run. If/when the Echo compiler-epoch migration happens, it is tracked as a separate, explicitly scoped change (see "Deferred" below), not bundled with this spike.

## What this experiment did

1. Mechanically derived a `c75`-compatible (`intent` keyword) variant of the canonical `record-symbol-change.edict` (which uses current Edict's `action` keyword) — a single-token `action `→`intent ` replacement, asserted in code to be exactly one occurrence and to change nothing else in the source (harness-c75-pinned.rs's `derive_pinned_dialect_source`).
2. Compiled the derived source to Core using Edict `c75c3f5` (via a local worktree at that exact commit, not a network fetch — see `evidence/`), with the same Graft-named compiler-context facts as before (`graft.structuralWrite`, `graft.tinyBudget`, `target.replace`'s write class), all resolving to the same canonical identities (`continuum.profile.write/v1`) already proven at current Edict.
3. Lowered that Core to Target IR twice: once via the native built-in Rust lowerer (the "oracle"), and once via **Echo's real, checked, unmodified `lowerer.echo-dpo.component.wasm`**, invoked through `edict_provider_host_wasmtime::ProviderComponentHost` — genuinely executing the WASM component, not simulating it. All checked byte artifacts (`schema.echo-provider-artifacts.cddl`, `target-profile.echo-dpo.cbor`, `lawpack.echo-dpo.cbor`, both `authority-facts.*.cbor` files, and the lowerer component itself) were loaded verbatim from Echo's tree and never modified or regenerated.

## Result: outcome bucket 2 — real component invocation, real typed refusal

The pinned-dialect source parses and compiles to Core cleanly (`compile_to_core: OK`). The native oracle lowers it to Target IR successfully. **The real WASM lowerer component executes and returns a genuine, well-formed, typed refusal — not a crash, not a request-validation failure:**

```text
ProviderRefusal {
    kind: UnsupportedSemantics,
    subject: Some("graft.warp@1"),
    diagnostics: [
        ProviderDiagnostic {
            code: "echo.provider.unsupported-semantics",
            severity: Error,
            message: "the supplied semantics are outside the exact first Echo lowering closure",
            repair: None,
        },
    ],
}
```

This is a real, preserved finding, not something patched around. Interpretation: the checked WASM lowerer component is scoped even more narrowly than the native built-in lowerer — `edict-syntax`'s own `target_ir.rs` documents itself as "narrow v0.9 target slices," and the checked component appears to allowlist something closer to the exact original `EFFECTFUL_REPLACE` fixture shape rather than any structurally-similar `target.replace`-based action. **This means the native oracle and the real WASM component disagree on a novel-but-analogous action shape** — the native lowerer accepts `recordSymbolChange` (4-field input record, different type/obstruction names), the real component refuses it. That is itself worth flagging: Echo PR #677's "prove Edict provider conformance and semantic parity" claim was validated against the *original* fixture; this experiment is the first evidence that parity does not automatically extend to a new, differently-shaped action under the same effect/profile pattern.

Bundle assembly (`assemble_contract_bundle_from_target_ir`) was not attempted, because it requires a successful lowering *response* to bundle, and the real component did not produce one — a refusal is the correct, honest stopping point per the outcome taxonomy specified for this experiment; forcing a bundle from the oracle's output instead would have proven something about the native lowerer, not about what Echo's real, currently-shipped provider actually does.

## Cross-version semantic comparison (current-Edict-`main` vs. pinned `c75`)

Comparing the Core module and native-oracle Target IR from this run against the earlier `lowering-evidence.md` run (current Edict `main`, `action` keyword), after normalizing the one known rename (`intents`/`TargetIrIntent` at `c75` vs. `actions`/`TargetIrAction` at `main`):

| Structure | `main` (action) | `c75` (intent) | Match? |
|---|---|---|---|
| Action/intent name | `recordSymbolChange` | `recordSymbolChange` | identical |
| Input/output types | `SymbolChangeInput` (4 fields), `SymbolChangeOutput` (2 fields) | identical | identical |
| `required_operation_profile` | `continuum.profile.write/v1` | identical | identical |
| `core_evaluation_budget` | `{max_steps: 8, max_allocated_bytes: 1024, max_output_bytes: 256}` | identical | identical |
| Effect node | `target.replace`, input = `arg.0.symbolId` | identical | identical |
| Obstruction arm | `rejected` → `Call(graft.SymbolChangeObstruction.BasisConflict)` | identical | identical |
| Result record | `{symbolId, newVersionId}` | identical | identical |
| Target IR domain | `echo.span-ir/v1` | identical | identical |
| Target step / intrinsic | `effect=target.replace`, `target_intrinsic=echo.dpo@1.replace` | identical | identical |

**Conclusion: the `intents`→`actions` rename was genuinely a pure terminology migration at the Core/Target-IR structural level** for this action shape — no semantic content changed alongside the vocabulary. This does not, by itself, explain the real WASM component's refusal (that refusal is about the *shape of the action being lowered*, unrelated to which vocabulary epoch compiled it) — the refusal would very likely also occur if this same 4-field action shape were somehow presented to whatever the checked component's `main`-epoch equivalent would be, since the narrowness appears to be about the lowering closure's supported input shapes, not about `intent` vs. `action` terminology.

## What's proven, precisely

- The Graft-shaped action is stable across the one known Edict vocabulary migration — same structure, same semantics, only spelling differs.
- Echo's real, unmodified, checked WASM lowerer component can be genuinely invoked against a novel action without touching any checked artifact.
- That invocation currently refuses our action with a specific, typed, actionable reason (`UnsupportedSemantics`) — a real boundary of what Echo's currently-shipped provider accepts, not a synthetic or hypothetical one.

## What's still not proven

- Bundle assembly and full runtime execution (the `TrustedRuntimeHost`/scheduler/receipt path in `warp-core`) — not reached, since the lowering step itself refused.
- Whether a *smaller or differently-shaped* Graft action (closer to the original fixture's exact single-field, single-record shape) would clear the real component's narrower closure — untested, and a plausible, well-scoped next experiment if this rung is worth continuing before the Echo epoch migration happens.
- Anything about stale-basis enforcement or persistence semantics (unchanged from `lowering-evidence.md`).

## Deferred (not started, and intentionally out of scope for this spike)

The Echo compiler-epoch migration (`intent`→`action`, rewriting the checked fixture, regenerating the digest-locked provider package via `echo-wesley-gen`, re-verifying via `scripts/verify-edict-provider-host-v1.sh`, running Echo's full test suite) remains a separate, explicitly scoped Echo-side change — not performed here, and not something this design packet's evidence depends on. See `lowering-evidence.md`'s "Next steps" section for the acceptance gate it should carry when someone picks it up.
