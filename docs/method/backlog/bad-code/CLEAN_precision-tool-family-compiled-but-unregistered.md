---
title: "Precision tool family is compiled but registered nowhere"
feature: surface
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-07-15
---

# Precision tool family is compiled but registered nowhere

## Problem

`src/mcp/tools/` contains an eight-file `precision-*` family
(`precision.ts`, `precision-query.ts`, `precision-match.ts`,
`precision-live.ts`, `precision-paths.ts`, `precision-show.ts`,
`precision-visibility.ts`, `precision-warp.ts`) that no module outside
the family imports. Neither `TOOL_REGISTRY` nor `DAEMON_TOOL_REGISTRY`
in `src/mcp/tool-registry.ts` includes any precision tool, so no agent
can ever invoke this surface.

Meanwhile the capability plumbing for it is live and shipping:

- `precisionTools: boolean` in `src/mcp/workspace-router-model.ts:16`,
  defaulted `true` at lines 159 and 168
- the same field in `src/mcp/control-plane/authz-storage.ts:17` and in
  `src/contracts/output-schemas.ts` / `output-schema-fragments.ts`

A compiled, capability-gated, schema-validated tool surface that is
unreachable is drift in its purest form: it inflates the build, misleads
readers of the capability profile (a flag that gates nothing), and is
invisible to all shipped docs.

## Expected

Either the family is registered behind the existing `precisionTools`
capability flag with playback coverage, or all eight files plus the
`precisionTools` field are removed from the router model, authz storage,
and output schemas, with a CHANGELOG entry. No third state.

## Evidence

- Found during the 2026-07-15 deep-dive audit
  (`blog/Graft/audits/2026-07-15-graft-deep-dive.md`, claims 11-12, 50).
- Negative import sweep: `grep -rn "tools/precision" src --include='*.ts'`
  matches only the family's own files.
