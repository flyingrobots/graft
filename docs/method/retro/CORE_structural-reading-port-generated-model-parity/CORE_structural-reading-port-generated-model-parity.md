---
title: "StructuralReadingPort generated-model parity"
cycle: "CORE_structural-reading-port-generated-model-parity"
design_doc: "docs/design/CORE_structural-reading-port-generated-model-parity.md"
outcome: hill-met
drift_check: yes
---

# StructuralReadingPort Generated-Model Parity Retro

## Summary

The slice shipped as PR #92 and landed on `main` in merge commit
`a049a93a`.

Graft now proves that git-warp-backed structural reads can enter the
Wesley-generated structural-history model and come back out with byte-equal
public behavior: a pure deterministic mapping
(`src/echo/structural-reading-generated-model.ts`) carries every
`StructuralReadingResult` shape onto the generated
`StructuralReading`/`StructuralReadingEvidence`/`StructuralBasis` triple and
back loss-free, with sha256 canonical-JSON ids and digests, a typed
`ECHO_NATIVE_REFUSED` obstruction naming
`fallback_translated_is_not_native_continuum`, and typed refusals on every
unrepresentable or tampered shape. Tool-level parity fixtures prove
`graft_dead_symbols` and the `graft_review` reference-count path are
deep-equal through the round-trip. This was the last Graft-only pre-Echo
slice; the packet's "Blockers for Echo-backed replacement" section (5 items)
is now the gate ledger for any `echo-native` claim.

## Playback Witness

Artifacts under
`docs/method/retro/CORE_structural-reading-port-generated-model-parity/witness`.
Playback answers are recorded in the design packet.

## Drift Check

`method_drift` reported no playback-question drift:

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 306 test descriptions.
```

## What surprised you?

1. **The self-review loop out-found the bots.** Two finder agents surfaced
   18 verified candidates post-GREEN; the hardening commit (`136c2994`)
   landed before Codex posted its 3 P2s, two of which were already fixed by
   then. The remaining one (payload-shape validation on the reverse path)
   was real and became `MALFORMED_PAYLOAD` (`2d59a827`).
2. **Slice 4 was Continuum conformance before reading the doctrine.** The
   Continuum Compendium V1's Graft repo-role row — "must not launder
   structural readings into native Continuum witnesshood unless relaying
   real native evidence" — is literally what `ECHO_NATIVE_REFUSED`
   enforces. Implementation and doctrine converged independently.
3. **The gate document was the highest-value deliverable.** Mapping into a
   fixed generated schema exposed exactly where the v0.1 columns run out
   (residue folding into `summary`, unpinned bases, generated-only enums,
   `Hash`/`Json` as `unknown`, JSON-representability limits) — a precise
   punch list for the Echo-backed replacement rather than a vague "needs
   work."
4. **The miss-log was founded mid-cycle** (James's request): 11 honest
   entries; reflex misses dominate 8/11, the one genuine tooling gap is
   governed full-text search.

## What would you do differently?

Run the finder/verify self-review loop *before* opening the PR, not after —
Codex reviewed the pre-hardening commit, so two of its three findings were
already stale on arrival. Review noise is cheapest to avoid by sequencing.

## Follow-on work filed

- `cool-ideas/CORE_generated-model-reverse-id-content-binding.md`
  (reverse id↔content binding decision, owned by the import-batch slice)
- `cool-ideas/CORE_align-structural-evidence-with-continuum-evidence-posture.md`
  (multidimensional EvidencePosture per Compendium Decision 5)
- `up-next/CORE_unpinned-basis-kind-for-structural-history.md`
  (schema rename sanctioned by James: unpinned committed-history bases get
  their own basis kind instead of `GIT_REF` + `refName: null`)
- `bad-code/CLEAN_sha256-stable-id-helper-duplication.md` updated with two
  new sites (module + test oracle)
- `docs/miss-log.jsonl` founded (non-graft read tracking)
