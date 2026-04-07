# Cycle 0030 — Policy Fidelity Audit

**Hill:** Produce a factual audit of policy enforcement across MCP,
hooks, and CLI, align doctrine with the current truth, and split the
real enforcement gaps into specific follow-on work.

**Outcome:** Hill met.

## What shipped

- `docs/design/0030-policy-fidelity-audit/design.md`
- `docs/design/0030-policy-fidelity-audit/policy-matrix.md`
- doctrine alignment in `docs/invariants/policy-total.md`
- focused follow-on backlog items for the actual enforcement gaps

## What we learned

- `safe_read` policy totality and whole-product policy fidelity are not
  the same claim.
- Hooks are currently stricter than MCP on `.graftignore`.
- Structural tools (`file_outline`, `graft_map`, `graft_diff`,
  `graft_since`) are the largest missing policy surface on `main`.
- `code_find` currently hides refused matches instead of reporting
  them.
- `run_capture` is effectively an escape hatch until we define a more
  explicit contract.

## Decisions locked in

- Missing `.graftignore` enforcement on a bounded-read entry point is a
  bug.
- The target contract is that bounded-read entry points activate the
  same policies, not that each surface gets to choose its own subset.

## Follow-on work

- `CORE_mcp-graftignore-and-policy-option-parity.md`
- `CORE_structural-tool-policy-enforcement.md`
- `CORE_run-capture-policy-boundary.md`
- `CORE_cross-surface-policy-parity-tests.md`

## Why this cycle closes cleanly

This was an audit cycle, not an implementation slice. The deliverable
was a matrix and a queue, not a parity patch. Those docs now exist, the
current doctrine is less misleading, and the next work is narrower than
the original blob backlog item.
