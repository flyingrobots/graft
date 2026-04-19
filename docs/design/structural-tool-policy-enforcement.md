---
title: "Cycle 0032 — Structural Tool Policy Enforcement"
---

# Cycle 0032 — Structural Tool Policy Enforcement

**Hill:** Structural MCP tools do not silently leak or silently omit
policy-denied files. `graft_map`, `graft_diff`, and `graft_since`
activate the same MCP policy inputs as other governed surfaces and
report denied files explicitly.

## Why now

Cycle 0031 closed `.graftignore` and policy-option parity for bounded
reads and precision tools. The remaining obvious gap is structural
multi-file tools. Today they read working-tree and git-backed content
without any policy layer, so the product still has two truths.

## Playback questions

1. Does `graft_map` omit denied files and report them explicitly rather
   than leaking them or pretending they were never there?
2. Do `graft_diff` and `graft_since` apply the same policy inputs to
   historical and working-tree structural reads?
3. When a structural query is filtered by policy, does the response stay
   usable for the allowed files while still surfacing what was denied?
4. Have we removed the remaining structural-tool path that bypassed the
   shared MCP policy seam?

## Scope

In scope:
- `graft_map`
- `graft_diff`
- `graft_since`
- shared structural-policy helper(s)
- explicit denied-file reporting on structural outputs

Out of scope:
- `run_capture`
- hook/CLI parity witnesses beyond MCP
- versioned JSON schemas for the new structural response fields

## Design

Structural tools should use the same MCP policy evaluation seam already
used by bounded reads and precision tools.

For structural outputs, policy should work like this:
- denied files are excluded from the visible `files` payload
- denied files are surfaced in a top-level `refused` array with reason
  metadata
- multi-file summaries still return useful visible results instead of
  collapsing into a single hard refusal

This keeps structural tools honest without destroying their value as
aggregation surfaces.

## Witnesses

- `.graftignore`-matched files do not appear in `graft_map.files`
- `graft_map` includes an explicit `refused` entry for denied files
- `graft_diff` excludes denied changed files and reports them in
  `refused`
- `graft_since` excludes denied changed files and reports them in
  `refused`
- allowed files still appear normally alongside denied-file reporting
