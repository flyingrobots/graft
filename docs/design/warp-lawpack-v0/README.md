# WARP Lawpack v0 — Research Spike

> **Lowering-validated research spike. Not a production lawpack.**
> Validated through Core and Target IR against Edict `main` (`9f1a11e0358caeb03339f0035333f8a49a2a814a`) **and, separately, against Echo's actual pinned revision** (`c75c3f550d049485ba00eae0dc272c6dd6aca11f`, via a mechanically-derived `intent`-keyword variant of the same source).
> Against the pinned revision, the action was also driven through **real WASM invocation of Echo's checked, unmodified `lowerer.echo-dpo.component.wasm`** — which returned a genuine typed refusal (`UnsupportedSemantics`), not a crash. Bundle assembly, full runtime execution, persistence semantics, and stale-basis enforcement remain unproven.
> Edict `main` and Edict `c75c3f5` are two internally coherent compiler epochs (`action`/`.actions` vs. `intent`/`.intents`) — this is a confirmed breaking compiler-epoch boundary between them, not a defect in either revision on its own terms. Echo's checked, digest-locked provider package was used exactly as-is throughout; nothing in Echo was regenerated or modified.

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
| `evidence/edict-main-lowering-output.txt` | Full raw stdout from the passing run against Edict `main`. |
| `evidence/echo-pinned-edict-build-failure.txt` | Full raw compiler output from attempting to build the `main`-targeting harness against Echo's pinned Edict revision instead — confirms the epoch boundary, not a claim that Echo's own repository fails to build. |
| `harness-c75-pinned.rs` | The pinned-epoch harness: mechanically derives the `intent`-keyword variant, compiles it under Edict `c75c3f5` (local worktree, not `main`), and drives it through real WASM invocation of Echo's checked, unmodified lowerer component. |
| `pinned-epoch-evidence.md` | The write-up for the pinned-epoch run: the real typed refusal returned by Echo's WASM component, and the cross-version Core/Target-IR structural comparison against the `main` run. |
| `evidence/edict-c75-pinned-run-output.txt` | Full raw stdout from the pinned-epoch run. |

## Status, precisely

Proven: the action resolves and lowers to real Core IR and real Target IR under **both** Edict `main` and Edict `c75c3f5` (Echo's actual pin), with negative controls confirming the custom facts genuinely participate in compiler resolution. Under the pinned epoch, real invocation of Echo's checked, unmodified WASM lowerer component was performed — it returned a genuine typed refusal (`UnsupportedSemantics`), a real, informative boundary rather than a crash. The `intents`→`actions` rename is confirmed to be a pure terminology change with no semantic drift, via structural comparison of both runs' Core/Target-IR output.

Not proven: bundle assembly, full runtime execution (`TrustedRuntimeHost`/scheduler/receipts), persistence semantics, stale-basis enforcement, or whether a differently-shaped action would clear the real component's apparently narrower acceptance closure.

## Next steps

1. Treat the Echo compiler-epoch migration (rewrite the checked fixture from `intent` to `action`, regenerate the digest-locked provider package via `echo-wesley-gen`, re-verify, run Echo's full suite) as its own separate, explicitly-scoped Echo change — not bundled with this spike. See `lowering-evidence.md`'s acceptance-gate checklist.
2. If continuing this spike before that migration lands: investigate why Echo's real WASM lowerer component refuses a structurally-analogous-but-differently-shaped action (`UnsupportedSemantics`) when the native oracle accepts it — possibly try a smaller/closer-to-original action shape to find the actual boundary of the checked component's "narrow v0.9" acceptance closure.

See `lowering-evidence.md` and `pinned-epoch-evidence.md` for full detail.
