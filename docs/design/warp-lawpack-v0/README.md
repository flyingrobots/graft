# WARP Lawpack v0 — Research Spike

> **Lowering-validated research spike. Not a production lawpack.**
> Validated through Core and Target IR against Edict `main` (`9f1a11e0358caeb03339f0035333f8a49a2a814a`) **and, separately, against Echo's actual pinned revision** (`c75c3f550d049485ba00eae0dc272c6dd6aca11f`, via a mechanically-derived `intent`-keyword variant of the same source).
> Against the pinned revision, the action was also driven through **real WASM invocation of Echo's checked, unmodified `lowerer.echo-dpo.component.wasm`** — which returned a genuine typed refusal (`UnsupportedSemantics`), not a crash. Bundle assembly, full runtime execution, persistence semantics, and stale-basis enforcement remain unproven.
> Edict `main` and Edict `c75c3f5` are two internally coherent compiler epochs (`action`/`.actions` vs. `intent`/`.intents`) — this is a confirmed breaking compiler-epoch boundary between them, not a defect in either revision on its own terms. Echo's checked, digest-locked provider package was used exactly as-is throughout; nothing in Echo was regenerated or modified.
> **Follow-up finding: the refusal is not about the vocabulary epoch or action shape.** A single-field action with the exact same structural shape as the (accepted) original fixture, differing only in names, is refused identically. The checked lowerer component currently accepts exactly one action identity — the original fixture it was built and reviewed against — not a general class of `target.replace`-shaped actions. See `shape-isolation-evidence.md`.

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
| `harness-c75-shape-isolation.rs` | Three-variant harness isolating whether the checked component's refusal is about epoch, shape, or identity — includes a positive control (the exact original fixture) and a single-field Graft action. |
| `shape-isolation-evidence.md` | The write-up: the refusal is about neither epoch nor shape — the checked component accepts exactly one action identity (the original fixture), full stop. Includes an honestly-recorded harness bug found and fixed mid-experiment. |
| `evidence/edict-c75-shape-isolation-output.txt` | Full raw stdout from the shape-isolation run (post-fix). |

## Status, precisely

Proven: the action resolves and lowers to real Core IR and real Target IR under **both** Edict `main` and Edict `c75c3f5` (Echo's actual pin), with negative controls confirming the custom facts genuinely participate in compiler resolution. Under the pinned epoch, real invocation of Echo's checked, unmodified WASM lowerer component was performed. The `intents`→`actions` rename is confirmed to be a pure terminology change with no semantic drift. **The component's refusal of new actions is confirmed to be identity-scoped, not epoch- or shape-related** — it currently accepts only the exact original fixture it was built and reviewed against.

Not proven: bundle assembly, full runtime execution (`TrustedRuntimeHost`/scheduler/receipts), persistence semantics, or stale-basis enforcement.

## Next steps

Given the shape-isolation finding, the Echo `intent`→`action` migration is **no longer the obvious next step** — it would not, by itself, unblock any new action (Graft's or otherwise) through this specific checked component, since the component doesn't generalize past its one reviewed identity regardless of vocabulary. The actual gating question is: what would it take to get the checked lowerer component to recognize a *second* action identity at all. That likely requires the same `echo-wesley-gen` regeneration machinery either way, so it may be worth learning what that involves before committing to either the epoch migration or a "teach the component a new action" effort as separate projects.

See `lowering-evidence.md`, `pinned-epoch-evidence.md`, and `shape-isolation-evidence.md` for full detail, in that order.
