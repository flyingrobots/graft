# Lowering Evidence: `graft.warp@1 / recordSymbolChange`

**Claim (narrow, on purpose):** this experiment proves the Graft-shaped action `recordSymbolChange` is resolvable and lowerable through Edict's real Core compiler and its real built-in Echo Target-IR lowerer, targeting `echo.dpo@1`. It does **not** prove stale-basis enforcement (the source uses `basis none`), correct persistence semantics, bundle assembly, or runtime execution against Echo. Those are later rungs, not yet attempted.

## Setup

- Harness: standalone Rust binary (`harness.rs` in this directory), depending on `edict-syntax` as a **local path dependency** against a checkout of `~/git/edict` at its current `main`.
- Construction mirrors `~/git/echo/tests/edict-provider-host-v1/tests/package_contract.rs`'s `echo_core_from` / `oracle_target_ir_artifact` functions as closely as possible: same `CompilerContext` builder shape, same `TargetIrLoweringFacts` shape, same `lower_with_builtin_lowerer(BuiltinTargetLowerer::EchoDpo, ...)` call. No authority-facts CBOR files were needed for this rung — those (per reading `package_contract.rs`) are only required for the later provider-lowering-request/verification/bundle-assembly stages, not for `compile_to_core`/`lower_to_target_ir` directly. `authority-facts.json` in this directory documents the facts used; it is not a file the harness reads.

## Dependency-drift finding (precise phrasing)

Echo's cross-repo test harness (`tests/edict-provider-host-v1/Cargo.toml`) pins Edict at commit `c75c3f550d049485ba00eae0dc272c6dd6aca11f`. Edict's `main` is currently `9f1a11e0358caeb03339f0035333f8a49a2a814a` — the very next commit, `Refactor: Rename Intent to Action workspace-wide`, which also renamed `TargetIrArtifact.intents` → `TargetIrArtifact.actions`.

**Precise claim:** *the current lowering harness does not build against Echo's pinned Edict revision* (see `evidence/echo-pinned-edict-build-failure.txt` for the exact compiler error). This experiment did **not** build or test Echo's own repository against either revision — that is a separate, not-yet-performed check, and "Echo's build is broken" would overstate what was actually observed here.

This harness was built against Edict's current `main` via a local path dependency to get a working result (see `evidence/edict-main-lowering-output.txt` for full raw output).

## Facts

- Edict revision used for the passing run: `9f1a11e0358caeb03339f0035333f8a49a2a814a`
- Echo's currently pinned Edict revision (not built/tested in this experiment): `c75c3f550d049485ba00eae0dc272c6dd6aca11f`
- Source SHA-256: `9c0dcb789f8c4574caf444666a445ba27fd47d2758d9e4b771ff47b00cb0a6ed`
- Full raw stdout: `evidence/edict-main-lowering-output.txt`

## Positive result

`compile_to_core` — **OK**. Real Core IR produced: alpha-renamed locals (`$arg0`, `$local0`, `$obstruction0`), typed record fields for `SymbolChangeInput`/`SymbolReceipt`/`SymbolChangeOutput`, one `Effect` node (`effect: "target.replace"`) bound to an obstruction arm calling `graft.SymbolChangeObstruction.BasisConflict` as a zero-arg constructor.

`lower_to_target_ir` (via `lower_with_builtin_lowerer(BuiltinTargetLowerer::EchoDpo, ...)`) — **status: Lowered, zero failures**, once `target_profile.digest` was given a syntactically-valid `sha256:<64 hex>` shape (a `None` digest fails closed with `UndigestedTargetProfile` — Edict correctly refusing an undigested target-profile reference, not a bug in the draft).

Structural assertions on the resulting `TargetIrArtifact` (checked against the raw output, not just `Result::Ok`):
- `domain: "echo.span-ir/v1"` — correct, matches `ECHO_SPAN_IR_DOMAIN`.
- `action names: ["recordSymbolChange"]` — exactly one action, correctly named, not silently dropped.
- exactly one step: `effect=target.replace`, `target_intrinsic=echo.dpo@1.replace`, `obstruction_arms=["rejected"]`.
- `operation_profile: "continuum.profile.write/v1"` and `core_evaluation_budget: { max_steps: 8, max_allocated_bytes: 1024, max_output_bytes: 256 }` both present and correctly bound.
- `result` record correctly references both `input.symbolId` and `receipt.newVersionId` (the two fields the action's `return` declares).

## Negative controls (discriminating power confirmed)

| Removed fact | Result | Diagnostic |
|---|---|---|
| `.with_operation_profile("graft.structuralWrite", ...)` | **Fails, as expected** | `CompilerError { stage: Resolve, kind: MissingContextFact, message: "operation profile \`graft.structuralWrite\` has no compiler context fact" }` |
| `.with_budget("graft.tinyBudget", ...)` | **Fails, as expected** | `CompilerError { stage: Resolve, kind: MissingContextFact, message: "budget \`graft.tinyBudget\` has no compiler context fact" }` |
| `.with_effect_write_class("target.replace", ...)` | **Fails, as expected** | Cascading `TypeCheck` errors: `MissingContextFact` on the effect, then `UnresolvedType` on `receipt`, then `TypeMismatch` ("action body must return a value") |
| Renamed `graft.SymbolChangeObstruction.BasisConflict` → an arbitrary other name | **Compiles successfully** — *this is the informative result, not a bug* | No diagnostic; obstruction identifiers are author-chosen labels carried into Core as a zero-arg `Call`, not resolved against any `CompilerContext` fact the way profile/budget/effect-write-class are |

All three real facts (`graft.structuralWrite`, `graft.tinyBudget`, `target.replace`'s write class) are genuinely participating in resolution — each produces a specific, correctly-attributed failure when removed, not a generic crash. The obstruction name is confirmed to be free-form and not fact-checked at this compiler stage — a real, useful, structural finding about how the language actually works, not a gap in the experiment.

## Success criteria checklist

```text
[x] Exact draft passes compile_to_core
[x] Exact resulting Core module passes lower_with_builtin_lowerer
[x] Target is explicitly echo.dpo@1
[x] No fixture-specific fallback or source substitution occurs (positive case ran the real, unmodified draft)
[x] Removing a required Graft fact produces a meaningful failure (3 of 3 real facts confirmed discriminating)
[x] Edict commit SHA is recorded
[x] Source hash and exact source text are recorded
[x] Core/Target output is retained (raw output file) and summarized above
```

## What this does not prove (restating the boundary on purpose)

- Nothing about stale-basis enforcement — the draft uses `basis none`; `priorVersionId` is declared but never consumed by the effect.
- Nothing about bundle assembly, WASM component execution, or a real Echo runtime accepting this specific action — that requires the semantic-inputs/authority-facts/bundle-assembly machinery `package_contract.rs` exercises next, which this experiment deliberately stopped short of.
- Nothing about whether `graft.structuralWrite`/`continuum.profile.write/v1` is the *correct* real-world profile choice for a Graft write — that's a design decision, not something this compile step validates.
- Nothing about whether Echo's own repository builds or tests pass at any particular Edict revision — not checked in this experiment.

## Next steps (not yet started, tracked here so they aren't lost)

1. Determine the smallest known-good Edict revision to pin: the only functionally-relevant commit between Echo's current pin and Edict's `main` is `main` itself (the rename commit; the other 9 intervening commits are docs-only). Verify Echo's own repository (a) builds and (b) its existing test suite, including the pinned `provider-conformance-v1` fixture, still passes at that revision before recommending Echo's pin move.
2. Only after Echo's pin is settled on a verified-good revision, extend this experiment through provider semantic-inputs, bundle assembly, and WASM component execution (mirroring `package_contract.rs`/`host_contract.rs` fully) — against that same settled revision, not against Edict `main` opportunistically.
