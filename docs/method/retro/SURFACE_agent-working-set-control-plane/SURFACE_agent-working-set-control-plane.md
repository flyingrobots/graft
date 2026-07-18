---
title: "SURFACE: Agent working-set control plane"
cycle: "SURFACE_agent-working-set-control-plane"
design_doc: "docs/design/SURFACE_agent-working-set-control-plane.md"
outcome: hill-met
drift_check: manual
---

# SURFACE: Agent working-set control plane Retro

## Status

Implementation, agent playback, human playback, drift reconciliation, and
exact-commit validation are complete. A complete pre-PR Code Lawyer pass then
found seven issues; every concrete branch defect was repaired and the final
runtime head passed 253 files and 1,910 tests. The operator approved the four
remaining human playback claims and explicitly authorized repair and push.
After publication, Codex found one additional rolling-upgrade compatibility
defect in the composed daemon-status reader. `55d21c14` repairs it through
advertised-input negotiation; focused compatibility tests, typecheck, lint,
and diff hygiene pass, while current-head PR CI remains the merge gate.

## Summary

This campaign turned Graft's high-volume MCP surface into a bounded,
schema-published agent control plane through five independently committed
slices:

1. first observations now describe baseline state instead of inventing motion;
2. MCP receipts default to a sub-512-byte compact projection while explicit
   full receipts preserve the audit surface;
3. `doctor` and `activity_view` default to sub-2-KiB summaries with explicit
   full detail;
4. every successful public MCP tool publishes bounded native output discovery
   and returns equivalent validated structured content plus compatibility text;
5. `capabilities` gives agents a bounded seven-family workflow map before they
   spend context on the complete tool registry.

The campaign preserved full audit access, cumulative accounting, existing tool
names, CLI compatibility, receiver-side authorization checks, and text-only MCP
error compatibility. It did not add session orchestration, filesystem watching,
history transport, transactional patches, or a hosted schema registry.

## Playback Witness

- [verification.md](witness/verification.md)

## Manual Drift Reconciliation

The implementation, strict schemas, advertised schemas, public documentation,
capability matrix, affected tests, full exact-commit suites, and non-goals were
compared manually with the design packet. No undocumented product-surface drift
remains after the repair addendum. All eight agent playback questions now have
executable evidence.

Method's automated drift command was also run, but its apparent clean result was
rejected as evidence because it scanned zero playback questions and only the
configured `tests/` root. The parser requires a differently cased heading and
does not see most unit and integration evidence. That defect is recorded in
`CLEAN_method-drift-can-silently-pass-with-zero-playback-questions.md`.

## What surprised us?

- Existing dirty files are state, not movement. The first slice exposed how
  easily an observer can manufacture causal transitions by confusing baseline
  acquisition with comparison.
- Compact receipt byte accounting encountered a real fixed-point edge: a
  rounded derived compression ratio can change the very payload length it is
  supposed to describe.
- Legal long Git refs broke the first diagnostic budget despite individually
  bounded fields, reinforcing that only the complete encoded response is the
  product boundary.
- The installed MCP SDK could not directly advertise a strict object-root union
  for `file_outline`; bounded discovery projection was required for correctness
  as well as context economy.
- Graft already had two exhaustive MCP output-schema authorities, and they had
  drifted. Slice 5 wired the new contract through both but filed the duplication
  as debt instead of hiding a campaign-expanding refactor.
- Endpoint-shaped event identity was insufficient for causal history: an
  A-to-B-to-A sequence could reuse a node and create a cycle. Durable history
  requires occurrence identity as well as semantic identity.
- Requesting a full MCP response did not by itself preserve CLI-v1 body shape.
  Compatibility requires an explicit projection plus frozen structural
  witnesses, not an unchanged version string.
- Strict response validation belongs before an irreversible edit. Graft now
  preflights the exact-edit body; broader daemon mutation planning remains a
  separate transactional design problem.

## What would we do differently?

- Use the installed MCP SDK and complete-response byte measurements from the
  first RED witness, not after pure schema tests pass.
- Validate every implementation commit from a clean exact checkout before
  interpreting a live-worktree full-suite failure.
- Make output-schema authority singular before expanding the public tool set.
- Bound auxiliary-agent review calls with a short timeout and immediately fall
  back to local review; this closeout lost substantial wall-clock time waiting
  on a stalled review call even though the implementation evidence was ready.
- End delegated review work at the first missed progress deadline. The repair
  cycle again lost wall-clock time to a hung agent-launch call even while five
  completed repairs had already reached the remote branch.

## Follow-up Items

- `CLEAN_mcp-output-schema-authority-duplicated-and-drifted.md`: restore one
  executable MCP output-schema authority.
- `CLEAN_method-drift-can-silently-pass-with-zero-playback-questions.md`: make
  zero-input drift checks explicit and scan Graft's real evidence roots.
- `SURFACE_on-demand-exact-mcp-output-contracts.md`: add exact on-demand schema
  distribution only if clients need more than bounded native discovery.
- `CLEAN_mutating-tools-need-prepared-response-contract.md`: generalize the
  exact-edit preflight into plan/validate/commit and idempotency semantics for
  consequential daemon and foreign effects.

## Automation Limitations

The normal Method close path was not used. It would rerun and overwrite witness
capture in the operator's intentionally dirty worktree, where an unrelated
untracked backlog card changes the dependency-DAG input. The manual packet
therefore separates focused local results, contaminated live-worktree results,
clean exact-commit evidence, drift limitations, and final human attestation.
