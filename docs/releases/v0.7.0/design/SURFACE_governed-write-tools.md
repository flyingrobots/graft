---
title: "Governed write tools"
legend: "SURFACE"
cycle: "SURFACE_governed-write-tools"
release: "v0.7.0"
source_backlog: "docs/method/backlog/v0.7.0/SURFACE_governed-write-tools.md"
scope_check: "2026-04-29"
scope_verdict: "defer-full-card-and-split"
---

# Governed write tools

Source backlog item: `docs/method/backlog/v0.7.0/SURFACE_governed-write-tools.md`
Legend: SURFACE

## Hill

Decide whether the remaining governed-write-tools card is still v0.7.0
implementation work after the `graft_edit` and agent drift warning slices
landed.

Verdict: do not implement this card as written for v0.7.0. The full governed
write surface should be deferred and split. v0.7.0 already has the first
release-facing write aperture: `graft_edit` exact replacement plus the
`CORE_agent-drift-warning` advisory diagnostic. The remaining ideas need
separate design work because they depend on evidence and write-history
contracts that do not exist yet.

## Scope Check Verdict

`SURFACE_governed-write-tools` is valid as a product direction, but too broad
as one v0.7.0 implementation cycle.

The backlog card currently bundles at least four different systems:

- read-range evidence attestation for edits
- write-specific policy beyond the first slice's hard denials
- session/tool write attribution
- causal write events and persisted write history

Those systems have different dependencies and risk profiles. Shipping them as
one card would blur the boundary between a safe edit primitive and a provenance
system.

### Current Reality

| Surface | Reality |
| --- | --- |
| `graft_edit` | Shipped. It performs one exact string replacement, requires one exact `old_string` match, refuses missing or ambiguous matches, refuses outside-repo and existing policy-denied paths, does not create files, and routes through `ctx.resolvePath` plus `ctx.fs`. |
| Agent drift warning | Shipped as a narrow `graft_edit`-only advisory. It is session-local, classifies only `jsdoc_typedef`, emits optional `driftWarnings`, and never refuses the edit. |
| Output schemas | `graft_edit` has schema coverage for edited/refused results and optional `driftWarnings`. It has no write provenance or causal write event fields. |
| Runtime observability | Tool calls emit metadata-only start/completion/failure events. `graft_edit` records the edited path in the existing completion footprint. The log does not record old/new text, write intent, or causal write events. |
| Local history | Persisted local history stores continuity, read, stage, and transition events. A causal `write` event schema exists, but the shipped store does not persist write events and the activity view does not render write activity. |
| Policy/refusals | Existing policy vocabulary is read-derived: binary, lockfile, minified, build output, secret, `.graftignore`, outline/session/budget pressure. `graft_edit` reuses hard denials plus exact-match refusals. There is no write-specific policy model for proposed content, create/delete/rename, or edit intent. |
| `read_range` receipt/evidence | `read_range` returns an MCP receipt and records attributed read regions when the workspace is bound. The receipt is not an edit attestation: it has no range content hash, target file identity proof, freshness contract, or verification API for `graft_edit`. |

### Decision

Defer the full governed write tools card from v0.7.0 implementation.

Do not turn this into a broad write-governance feature before the evidence
contracts exist. The remaining work should be split into narrower cards:

1. `CORE_read-range-evidence-attestation-for-graft-edit`
   Define a verifiable receipt/evidence contract that can prove which file
   range was observed and whether it is still current at edit time.
2. `CORE_causal-write-events-for-graft-edit`
   Add a real write event path for successful governed edits, including
   persisted local-history storage and activity rendering.
3. `CORE_write-policy-model-for-governed-edits`
   Separate read-policy hard denials from write-specific policy over proposed
   changes.
4. `SURFACE_governed-write-tools-full-surface`
   Only after the above, design broader write operations such as create,
   append, delete, rename, chmod, format, or multi-edit.

If v0.7.0 needs one more write-related cycle, the only defensible candidate is
a separate scope check for `CORE_read-range-evidence-attestation-for-graft-edit`.
Even that should start at design/RED only because the current receipt surface
is not an attestation contract.

## Playback Questions

### Human

- [ ] Is the shipped `graft_edit` exact-replacement tool enough to call the
      minimal governed-write aperture real for v0.7.0?
- [ ] Does the scope check avoid pretending completion footprints are causal
      write provenance?
- [ ] Are read-range receipts correctly classified as insufficient for edit
      attestation without a fresh evidence contract?
- [ ] Is the full governed write system split into smaller follow-up cards
      instead of implemented blindly?

### Agent

- [ ] Does `graft_edit` stay exact-replacement only?
- [ ] Does `graft_edit` output schema include deterministic edited/refused
      fields and optional advisory drift warnings, but no write provenance?
- [ ] Does runtime observability remain metadata-only with completion
      footprint rather than causal write events?
- [ ] Does persisted local history currently omit write events from stored
      activity?
- [ ] Does `read_range` provide receipts and read observations without a
      verification API suitable for edit attestation?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: the scope verdict should keep the
  release story readable by naming what is shipped, what is missing, and what
  must not be claimed.
- Non-visual or alternate-reading expectations: all evidence and proposed
  splits are expressed in plain Markdown tables and bullets.

## Localization and Directionality

- Locale / wording / formatting assumptions: English-only release planning
  language.
- Logical direction / layout assumptions: no UI surface is introduced by this
  scope check.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: `graft_edit` is the only
  shipped governed write primitive; it is exact replacement only and may emit
  advisory `driftWarnings`.
- What must be attributable, evidenced, or governed: the current system records
  completion footprints and attributed reads, not causal write provenance. Any
  future governed write surface must make that distinction explicit.

## Non-goals

- [ ] No production code changes in this scope check.
- [ ] No new write operation.
- [ ] No create, delete, append, rename, chmod, format, or multi-edit.
- [ ] No native Edit/Write interception.
- [ ] No read-range attestation implementation.
- [ ] No causal write event implementation.
- [ ] No persisted write-history implementation.
- [ ] No daemon, WARP, LSP, or provenance expansion.

## Backlog Context

## Why

Graft governs reads to prevent context bloat. But the write side has no
policy surface. Agents use native Edit/Write tools which require a prior
native Read — creating friction when graft's governed reads block the
Read tool for large files.

The minimal `graft_edit` first slice now exists. The remaining work is the
broader governed write surface:

- Accept `read_range` evidence instead of requiring native `Read`
- Enforce a fuller write policy beyond the first slice's exact-replacement
  and hard-denial checks
- Track which tool/session wrote what
- Emit causal write events for governed writes

## Possible shapes

1. **Minimal**: `graft_edit` — shipped as an exact replacement MCP tool.
2. **Full**: governed write surface with write policy, provenance
   tracking (which tool/session wrote what), and causal write events
