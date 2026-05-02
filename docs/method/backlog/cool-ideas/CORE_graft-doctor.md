---
title: "graft doctor repo-generic health posture"
feature: surface
kind: leaf
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "doctor MCP tool (shipped)"
  - "graft doctor CLI alias (shipped)"
  - "graft diag doctor CLI command (shipped)"
  - "doctor --sludge parser-backed smell scan (shipped)"
  - "runtime observability and repo footing fields (shipped)"
acceptance_criteria:
  - "Doctor remains a repo-generic health/capability posture surface for any Git repository"
  - "The first slice composes only shipped doctor facts and optional shipped sludge facts"
  - "No METHOD backlog, retro, dependency-DAG, release, or project-management state is read or reported"
  - "No new WARP indexing semantics, LSP enrichment, governed writes, daemon actions, or provenance expansion"
  - "No CI/pre-commit gate semantics or broad all-integrity-check exit-code policy in this slice"
  - "Human and JSON output, if touched, preserve the existing MCP/CLI doctor truth surface"
  - "Tests use temp repos and prove top-level doctor and diag doctor behavior remains repo-generic"
---

# graft doctor repo-generic health posture

## Scope Check Verdict

The original card was valid product instinct but stale and too broad for
the next Graft pull.

It asked for a new `graft doctor` command that runs all integrity checks:
drift-sentinel, structural-drift-detection, and version-drift. That is
not the current product reality. `doctor` already ships as both an MCP
tool and CLI surface, and its contract is runtime health plus repo state,
with an opt-in parser-backed sludge scan.

Keep the card, but narrow it to a first slice that makes the existing
doctor posture clearer and more coherent without turning it into a
project-management dashboard or a CI integrity gate.

## Shipped Reality

- `src/mcp/tools/doctor.ts` exposes the MCP `doctor` tool.
- `src/cli/command-parser.ts` routes both `graft diag doctor` and the
  top-level `graft doctor` alias to the same command.
- `src/contracts/capabilities.ts` describes doctor as runtime health and
  repo state.
- `doctor` reports project root, parser health, thresholds, session
  depth, burden summary, runtime observability, causal context, local
  history footing, repo concurrency, staged target, and recommended next
  action.
- `doctor --sludge` / `{ sludge: true }` runs the shipped parser-backed
  sludge detector through the existing filesystem, Git, and path
  confinement ports.
- Existing tests cover MCP doctor health output, opt-in sludge output,
  and the top-level CLI alias.

## Narrowed First Slice

The next implementation cycle, if pulled, should improve doctor as a
repo-generic operational posture surface over shipped facts.

In scope:

- Clarify the health/capability posture that existing doctor fields
  already express.
- Keep the output useful for any Git repository, not just this repo.
- Preserve the existing MCP doctor schema unless a schema change is
  explicitly proven and tested.
- If human output is touched, keep it deterministic and boring.
- Keep `--sludge` opt-in and parser-backed.
- Add tests around the model/render/parser boundary only if the cycle
  introduces that boundary.

Out of scope:

- Reading METHOD backlog cards, retros, release docs, dependency DAGs,
  or active-cycle state.
- Running drift-sentinel, structural-drift-detection, and version-drift
  as a single pass/fail CI gate.
- Changing process exit policy to fail on advisory findings.
- Adding daemon actions, governed writes, native editor interception,
  WARP indexing changes, LSP enrichment, or provenance expansion.

## Deferred Follow-Up

A separate repo-generic integrity-gate card may still be useful later,
but it should be explicit about check plugins, cost, exit-code policy,
and whether each check applies to arbitrary Git repositories. It should
not be smuggled into the existing `doctor` runtime-health contract.
