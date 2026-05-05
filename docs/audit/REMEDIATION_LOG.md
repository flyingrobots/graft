# Audit remediation log

This log tracks remediation work created from the 2026-05-04 audit set.
It is intentionally separate from the audit reports: reports record what
was observed; this log records what the project plans to do about it.

Source reports:

- `docs/audit/2026-05-04_code-quality.md`
- `docs/audit/2026-05-04_code-quality_2.md`
- `docs/audit/2026-05-04_documentation-quality.md`
- `docs/audit/2026-05-04_documentation-quality_2.md`
- `docs/audit/2026-05-04_ship-readiness.md`
- `docs/audit/2026-05-04_ship-readiness_2.md`

## Active Remediation Designs

- `docs/design/CORE_mcp-invocation-pipeline.md`
  Status: implementation started.
  Audit finding: large MCP invocation function.
- `docs/design/CORE_composition-root-refactor.md`
  Status: implementation started.
  Audit finding: large server composition root.
- `docs/design/CORE_unified-read-logic.md`
  Status: implementation started.
  Audit finding: duplicate governed read logic.

## Implementation Status

### MCP invocation pipeline

Status: behavior-preserving first slice implemented.

Tracks:

- `src/mcp/server-invocation.ts` large `invokeTool` orchestration path
- daemon versus repo-local authorization staging
- Zod validation ownership
- daemon scheduling and worker reconciliation
- runtime observability failure isolation
- read-attribution event recording

Next action: add smaller stage-level tests around the extracted helpers
before adding new invocation behavior.

### Composition root refactor

Status: behavior-preserving first slice implemented.

Tracks:

- `src/mcp/server.ts` large `createGraftServer` composition root
- adapter construction boundaries
- daemon runtime construction
- workspace router construction
- MCP tool registration
- returned `GraftServer` surface construction

Next action: keep future factory changes behavior-preserving and avoid
adding runtime policy to the composition root.

### Unified governed read logic

Status: MCP `safe_read` now delegates to `RepoWorkspace.safeRead`.

Tracks:

- `src/mcp/tools/safe-read.ts` cache and diff branches removed
- `src/operations/repo-workspace.ts` owns governed cache and diff logic
- `src/operations/cached-file.ts` outline extraction made lazy

Next action: keep parity tests broad enough that future MCP changes
cannot reintroduce duplicate governed-read branches.

## Related Documentation Remediation

The documentation-quality audit also called out public-facing
documentation gaps. Some are implemented in the current remediation
slice; the remaining gaps should stay visible:

- README projection-bundle lifecycle example
- README editor integration and idempotent init language
- README verification section
- `docs/method/GLOSSARY.md`
- `docs/TROUBLESHOOTING.md` for daemon startup, socket ownership,
  stale sockets, and observability logs
- a causal-provenance example for skeptical readers

## Public API Guardrail

All active remediation designs are intended to be non-breaking.

They must not remove or incompatibly change:

- root exports documented in `docs/public-api.md`
- `createGraftServer`
- `CreateGraftServerOptions`
- `GraftServer`
- `RepoWorkspace.safeRead`
- MCP tool names
- MCP input schemas
- MCP output schemas

Additive root exports are allowed only when they are documented in
`docs/public-api.md` and treated as semver-public.

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
