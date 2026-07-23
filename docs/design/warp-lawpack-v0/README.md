# WARP Lawpack v0 — Research Spike

> **Lowering-validated research spike. Not a production lawpack.**
> Validated through Core and Target IR against Edict `9f1a11e0358caeb03339f0035333f8a49a2a814a`.
> Not validated for bundle assembly, WASM execution, persistence semantics, or stale-basis enforcement.
> Echo's pinned Edict revision (`c75c3f550d049485ba00eae0dc272c6dd6aca11f`) is not currently buildable by this experiment's harness, because of the `TargetIrArtifact` API transition from `intents` to `actions` introduced in the very next commit. This has been checked directly against a standalone harness, not against Echo's own build or test suite.

## What this is

A first attempt at expressing a real Graft WARP operation — recording one structural symbol-change fact (added/changed/removed, with a prior-version basis field and a new-signature digest) — as a real `.edict` action, and proving it actually compiles and lowers through Edict's real compiler rather than just looking syntactically plausible.

This came out of investigating the long-term architecture where Echo hosts Graft's structural-history data model and Graft uses Edict-compiled, lawfully-admitted operations to mutate it (see the Profunctor Plan constitution and the Echo/Edict repos for the surrounding context — not duplicated here).

## What's in this directory

| File | What it is |
|---|---|
| `record-symbol-change.edict` | The actual Edict source: one action, `graft.warp@1 / recordSymbolChange`. |
| `authority-facts.json` | Human-readable record of the compiler-context facts used by `harness.rs`. **Documentation only** — the harness builds these facts directly via `CompilerContext` builder calls, it does not load this file. |
| `harness.rs` | The standalone Rust harness that drives the source through `parse_module` → `compile_to_core` → `lower_with_builtin_lowerer`, plus four negative controls. Depends on `edict-syntax` as a local path dependency. |
| `lowering-evidence.md` | The full write-up: narrow claim statement, setup, the dependency-drift finding, positive result, negative-control table, success-criteria checklist, and what remains unproven. |
| `evidence/edict-main-lowering-output.txt` | Full raw stdout from the passing run (against Edict's `main`). |
| `evidence/echo-pinned-edict-build-failure.txt` | Full raw compiler output from attempting to build this same harness against Echo's currently pinned Edict revision instead — this is what actually failed, not Echo's own repository. |

## Status, precisely

Proven: the action resolves and lowers to real Core IR and real Echo Target IR (`echo.dpo@1` → `echo.span-ir/v1`), with negative controls confirming the custom facts genuinely participate in compiler resolution rather than being decorative.

Not proven: stale-basis enforcement, bundle assembly, WASM execution, persistence semantics, or that Echo's own repository builds/tests pass at any particular Edict revision.

## Next steps

1. Determine the smallest known-good Edict revision for Echo to pin (the rename commit is the only functionally-relevant commit between Echo's current pin and Edict `main`), and verify Echo's own build, Echo's existing test suite, and the pinned `provider-conformance-v1` fixture all still pass at that revision, alongside this experiment's harness.
2. Only then, extend this experiment through provider semantic-inputs, contract bundle assembly, and WASM component execution — against that same settled Edict revision, not opportunistically against `main`.

See `lowering-evidence.md` for the full detail behind both of these.
