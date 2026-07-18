# Mutating tools need a prepared-response contract

## Problem

MCP output validation is part of the success boundary, but several daemon and
control-plane operations compute their result only after changing runtime
state. If a future contract drift rejects that result, the client can receive
an error after an effect has already occurred and may retry unsafely.

The agent working-set control-plane campaign now protects the non-idempotent
`graft_edit` filesystem path: it validates the complete domain response before
writing file bytes. That repair does not by itself provide two-phase execution
for workspace authorization, binding, monitor lifecycle, causal attachment, or
future multi-object mutations.

## Required outcome

- Define a reusable plan/validate/commit result contract for consequential MCP
  operations.
- Bind an operation or idempotency identity before effect admission.
- Make retry posture explicit when an external or daemon-owned effect cannot be
  rolled back.
- Ensure validation and serialization failures cannot masquerade as proof that
  no effect occurred.
- Integrate with the operation journal and generation fencing already planned
  by the managed-workspace-store design.

## Acceptance evidence

- Fault injection at every post-plan failure boundary.
- Tests for no-effect rejection, committed-and-acknowledged success, and
  indeterminate external-effect posture.
- At-least-once retry tests proving operation identity prevents duplicate
  consequence.

## Scope

This is architectural follow-up for the broader mutating control plane. It does
not reopen the exact-edit preflight repaired in the active campaign.
