# Audit remediation log

This log tracks remediation work created from the 2026-05-04 audit set.
It is intentionally separate from the audit reports: reports record what
was observed; this log records what the project plans to do about it.

Source reports:

- `docs/audit/2026-05-04_code-quality.md`
- `docs/audit/2026-05-04_documentation-quality.md`
- `docs/audit/2026-05-04_ship-readiness.md`

## Active Remediation Designs

- `docs/design/CORE_mcp-invocation-pipeline.md`
  Status: design ready.
  Audit finding: large MCP invocation function.
- `docs/design/CORE_composition-root-refactor.md`
  Status: design ready.
  Audit finding: large server composition root.
- `docs/design/CORE_unified-read-logic.md`
  Status: design ready.
  Audit finding: duplicate governed read logic.

## Implementation Status

### MCP invocation pipeline

Status: design ready, not implemented.

Tracks:

- `src/mcp/server-invocation.ts` large `invokeTool` orchestration path
- daemon versus repo-local authorization staging
- Zod validation ownership
- daemon scheduling and worker reconciliation
- runtime observability failure isolation
- read-attribution event recording

Next action: pull `CORE_mcp-invocation-pipeline` into a METHOD cycle
and start with behavior-preserving invocation tests.

### Composition root refactor

Status: design ready, not implemented.

Tracks:

- `src/mcp/server.ts` large `createGraftServer` composition root
- adapter construction boundaries
- daemon runtime construction
- workspace router construction
- MCP tool registration
- returned `GraftServer` surface construction

Next action: pull `CORE_composition-root-refactor` after or alongside
the invocation pipeline if the write sets stay separate.

### Unified governed read logic

Status: design ready, not implemented.

Tracks:

- `src/mcp/tools/safe-read.ts` cache and diff branches
- `src/operations/repo-workspace.ts` parallel cache and diff branches
- `src/operations/cached-file.ts` eager outline extraction

Next action: add parity tests for MCP and library `safe_read` behavior,
then extract the governed-read service.

## Related Documentation Remediation

The documentation-quality audit also called out public-facing
documentation gaps. They are not implemented in this docs-only hardening
turn, but they should remain visible:

- README editor integration and idempotent init language
- README verification section
- `docs/TROUBLESHOOTING.md` for daemon startup, socket ownership,
  stale sockets, and observability logs
- a causal-provenance example for skeptical readers

## Public API Guardrail

All active remediation designs are intended to be non-breaking.

They must not change:

- root exports documented in `docs/public-api.md`
- `createGraftServer`
- `CreateGraftServerOptions`
- `GraftServer`
- `RepoWorkspace.safeRead`
- MCP tool names
- MCP input schemas
- MCP output schemas

Any later decision to expose a new public helper must be handled as a
separate API design and versioning decision.

## Anti-Sludge Guardrail

Implementation cycles spawned from this log must follow
`docs/ANTI_SLUDGE_TYPESCRIPT_POLICY.md`.

In particular:

- exact named types over loose object bags
- discriminated unions over inferred field presence
- ports for effects
- no `any`
- no `as unknown as`
- no junk-drawer modules
- boundary-only validation
- core logic kept out of primary adapter registration

## Cool-Idea Follow-up Cards

The audit also surfaced user-facing ideas that are not part of the
hardening implementation:

- `docs/method/backlog/cool-ideas/CORE_graft-tool-client.md`
- `docs/method/backlog/cool-ideas/SURFACE_init-dry-run.md`

These remain exploratory until pulled through METHOD.
