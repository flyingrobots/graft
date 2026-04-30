---
title: "Governed edit tool for agent DX"
legend: "SURFACE"
cycle: "SURFACE_agent-dx-governed-edit"
release: "v0.7.0"
source_backlog: "docs/method/backlog/v0.7.0/SURFACE_agent-dx-governed-edit.md"
scope_check: "2026-04-28"
scope_verdict: "valid-but-too-broad"
---

# Governed edit tool for agent DX

Source backlog item: `docs/method/backlog/v0.7.0/SURFACE_agent-dx-governed-edit.md`
Legend: SURFACE

## Hill

Agents can perform one governed exact replacement through Graft without
falling back to native `Read` prerequisites, shell `cat`, or ad hoc `sed`.

The first slice is deliberately narrow: add a `graft_edit` MCP tool that
accepts `path`, `old_string`, and `new_string`, validates that the requested
file is within the repo policy boundary, performs exactly one replacement, and
returns a schema-validated deterministic response.

## Scope Check Verdict

`SURFACE_agent-dx-governed-edit` is valid, but the backlog card is too broad
if read as a complete governed write system. The implementation cycle should
be narrowed to the first usable edit surface only.

The problem is real: current governed read behavior can block native `Read`,
while native `Edit` expects native `Read` evidence. That creates pressure to
bypass Graft with shell commands. The release-facing fix is not a full write
governor yet. It is a safe, exact-replacement edit primitive that keeps the
agent inside Graft's path, policy, schema, and observability boundaries.

### Existing Surfaces to Compose

- Tool registry: `src/mcp/tool-registry.ts`
- MCP handler context and response path: `src/mcp/context.ts`,
  `src/mcp/server.ts`, `src/mcp/server-invocation.ts`
- MCP capability contract: `src/contracts/capabilities.ts`
- MCP output schemas: `src/contracts/output-schemas.ts`,
  `src/contracts/output-schema-mcp.ts`
- Burden accounting: `src/mcp/burden.ts`
- Read-side policy/refusal substrate: `src/mcp/policy.ts`,
  `src/policy/evaluate.ts`
- Filesystem write port: `src/ports/filesystem.ts`,
  `src/adapters/node-fs.ts`
- Path confinement precondition: `src/ports/paths.ts`,
  `src/adapters/repo-paths.ts`, `src/adapters/node-paths.ts`

### First Slice Acceptance Criteria

- `graft_edit` exists as an MCP tool.
- Input schema accepts `path`, `old_string`, and `new_string`.
- The tool resolves `path` through the same repo path confinement used by
  governed reads.
- The tool refuses paths outside the repo.
- The tool refuses paths denied by `.graftignore` or existing hard policy
  boundaries such as generated, minified, binary, lockfile, build output, and
  likely-secret files.
- The tool reads current file content through the filesystem port, performs an
  exact string replacement, and writes through the filesystem port.
- The tool succeeds only when `old_string` occurs exactly once.
- The tool fails clearly when `old_string` is absent.
- The tool fails clearly when `old_string` is ambiguous because it occurs more
  than once.
- The tool does not create new files.
- The tool does not delete files.
- The tool does not append, multi-edit, rename, chmod, format, or run shell
  commands.
- The response is deterministic JSON and has output-schema coverage.
- The runtime footprint records the edited path through existing invocation
  observability, without claiming a full causal write-event system.
- Tests use temp repos only.
- Validation uses Dockerized `pnpm test`.

### Deferred Work

- `read_range` evidence attestation. The current system exposes read receipts
  and observations, but this scope check did not find a ready contract for an
  edit tool to verify that a supplied `read_range` receipt proves the exact
  current file state. The first slice should rely on exact `old_string`
  matching instead.
- Full governed write tools and broad write policy modeling.
- First-class causal write events / provenance expansion.
- Agent drift warning after writes.
- Create, append, delete, rename, chmod, format, and multi-edit operations.
- Daemon, WARP, LSP, and provenance expansion.

## Playback Questions

### Human

- [ ] Can I call `graft_edit` with `path`, `old_string`, and `new_string`
      without using native `Read` first?
- [ ] Does the tool perform exactly one edit when the old string is present
      once?
- [ ] Does it refuse missing and ambiguous old strings with clear messages?
- [ ] Does it refuse outside-repo, ignored, generated, lockfile, binary,
      minified, build-output, and likely-secret paths?
- [ ] Does the output make the edit result obvious without pretending the full
      governed write surface exists?

### Agent

- [ ] Does `graft_edit` use `ctx.resolvePath` or the equivalent shared repo
      path resolver rather than direct path math?
- [ ] Does it route all filesystem reads and writes through the filesystem
      port?
- [ ] Does it reuse existing policy/refusal semantics where they are currently
      applicable?
- [ ] Are `MCP_TOOL_NAMES`, tool registry, burden accounting, and MCP output
      schemas updated together?
- [ ] Are model/handler tests deterministic and temp-repo-only?
- [ ] Does playback avoid using the live checkout as subject data?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: responses must use plain fields
  and stable refusal reasons rather than terminal-only formatting.
- Non-visual or alternate-reading expectations: the tool is MCP/JSON-first, so
  the first slice has no visual rendering dependency.

## Localization and Directionality

- Locale / wording / formatting assumptions: refusal and success messages are
  English-only for v0.7.0 and should be short enough for agent parsing.
- Logical direction / layout assumptions: no layout or bidirectional text
  behavior is introduced in this slice.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: target path, operation
  kind, whether the edit changed content, old-string match count, byte/line
  deltas if reported, and refusal reason.
- What must be attributable, evidenced, or governed: the edited path must be
  captured in the existing invocation footprint. The response must not imply
  full causal write provenance until that subsystem exists.

## Non-goals

- [ ] No governed write/edit work beyond exact replacement `graft_edit`.
- [ ] No `read_range` evidence attestation in the first slice unless a
      verifiable receipt contract is designed first.
- [ ] No broad write policy engine.
- [ ] No create, append, delete, rename, chmod, format, or multi-edit.
- [ ] No daemon feature work.
- [ ] No WARP/LSP/provenance expansion.
- [ ] No drift-warning implementation.
- [ ] No broad `node:path` or filesystem refactor.

## Backlog Context

## Problem

Graft's governed read hooks block native `Read` on large files, redirecting agents to `read_range`/`file_outline`. But the native `Edit` and `Write` tools require a prior native `Read` call as a safety check. This creates a catch-22: the agent can't read the file (governed) and therefore can't edit it (harness blocks).

Current workarounds are ugly: `cat` via Bash to satisfy the read prerequisite, or `sed` for inline edits. These bypass the governance boundary entirely.

## Agent DX impact

This friction hits every editing workflow. Agents waste tokens on workarounds, lose the audit trail that governed reads provide, and sometimes make mistakes with sed that require cleanup.

## Proposed shape

A `graft_edit` MCP tool that:
- Accepts `path`, `old_string`, `new_string` (like the native Edit tool)
- Accepts `read_range` evidence instead of requiring native `Read`
- Respects `.graftignore` (refuse edits to ignored paths)
- Records the edit in the causal provenance footprint
- Could enforce write policy (prevent edits to lockfiles, build output, etc.)

This closes the read-edit loop entirely within graft's policy boundary. See also: `SURFACE_governed-write-tools.md` for the broader write-governance vision.
