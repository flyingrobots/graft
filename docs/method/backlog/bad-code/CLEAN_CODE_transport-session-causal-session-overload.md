# Transport session and causal session are overloaded

The codebase still uses "session" mostly as a transport/runtime concept,
but the product direction now needs a separate causal session model.

Current meaning overload includes:
- MCP / daemon transport session ids
- session-local cache / budget / saved state slices
- receipts and runtime observability correlation
- future strand-scoped causal workspace discussions

That overload is manageable while Graft is mostly a governor, but it
becomes dangerous once WARP session/strand/collapse semantics are real.
If the same word keeps meaning both "socket lifetime" and "coherent line
of work," the code and docs will silently lie.

Needed follow-on:
- split naming for transport session, workspace slice, checkout epoch,
  and causal session / strand
- make receipts and daemon status explicit about which one they refer to
- avoid baking transport ids into future provenance ontology by default

Why bad-code:
- this is not a future feature idea; it is already a terminology and
  boundary smell in code and docs
- leaving it alone will make the ontology packet harder and noisier

Related:
- `docs/method/backlog/asap/WARP_graph-ontology-and-causal-collapse-model.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/invariants/transport-session-not-causal-session.md`

Effort: M
