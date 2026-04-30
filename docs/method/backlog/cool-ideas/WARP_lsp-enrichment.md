---
title: "Bounded LSP semantic enrichment first slice"
feature: surface
kind: leaf
legend: WARP
lane: cool-ideas
release_scope: post-v0.7.0
requirements:
  - "indexHead pipeline (shipped)"
  - "Tree-sitter parsing pipeline (shipped)"
  - "Semantic enrichment provider boundary"
  - "Explicit-path lazy indexing"
acceptance_criteria:
  - "Semantic enrichment only runs for explicit indexed paths, not whole-repo eager indexing"
  - "No daemon, background monitor, or automatic repo-wide LSP indexing is added"
  - "A semantic provider/port boundary exists so tests can use a fake provider"
  - "The first slice emits only bounded calls edges and/or provider-supplied typeof properties"
  - "Semantic facts per file are capped and the existing maxPatchJsonBytes guard still applies"
  - "Unavailable semantic provider degrades clearly without failing normal tree-sitter indexing"
  - "Tests use a fake provider; any real provider is optional and only allowed if dependency/source is explicit"
  - "No completeness claims are made for call graphs, type resolution, overloads, class hierarchy, or re-export chains"
---

# Bounded LSP semantic enrichment first slice

Source: symbol-reference-tracing cycle discussion (2026-04-20)

## Scope Verdict

The original card is valid product direction, but too broad for a safe
v0.7.0 implementation cycle as written.

Graft already has `indexHead`, tree-sitter parsing, per-file WARP
patches, attached AST snapshot blobs, `maxPatchJsonBytes`, and lazy
indexing guardrails. This first slice must preserve those boundaries.
It should not turn one indexed file into an implicit whole-project LSP
crawl.

This is no longer active v0.7.0 blocking scope. Keep it as a
post-v0.7.0 bounded first slice: a semantic enrichment seam and one
tiny fact payload, not a full tsserver project model.

## Hill

When a caller explicitly indexes a file path, Graft can optionally ask a
semantic enrichment provider for a small, bounded set of semantic facts
for that same file and write those facts in the same per-file WARP
patch as the tree-sitter facts.

If semantic enrichment is unavailable, the existing tree-sitter indexing
path still succeeds and reports a clear degraded/unavailable state.

## First Slice In Scope

- Explicit-path indexing only. The caller must pass `paths` or use an
  equivalent explicit path surface.
- No daemon, monitor, background, or automatic whole-repo enrichment.
- A semantic provider boundary that can be backed by a fake provider in
  tests.
- A graceful unavailable result when no real provider is configured or
  available.
- One or two bounded fact kinds only:
  - `calls` edges when the provider can identify a direct call target.
  - provider-supplied `typeof` properties on symbol nodes when already
    known.
- A hard per-file semantic fact cap.
- Preservation of the existing patch payload budget through
  `maxPatchJsonBytes`.
- Tests proving fake-provider facts are emitted deterministically and
  unavailable providers do not break normal indexing.

## Deferred From This Slice

- Full tsserver project model.
- Unbounded project-wide module graph loading.
- Overload resolution.
- Class hierarchy edges such as `extends` and `implements`, unless they
  are proven small enough to fit this first slice without broadening it.
- Re-export chain following.
- Full semantic call graph.
- Semantic completeness claims.
- Daemon, monitor, background, or live-refresh enrichment.
- Any change to governed edit/write behavior.
- Any WARP materialization policy change beyond preserving the current
  per-file patch budget.

## Model

The implementation should introduce a narrow provider shape rather than
wiring `indexHead` directly to a concrete tsserver process.

Expected flow:

1. `indexHead` selects parseable explicit paths using the existing lazy
   indexing rules.
2. For each file, tree-sitter parsing and outline/import emission run as
   they do today.
3. If a semantic provider is configured, `indexHead` asks it for bounded
   semantic facts for that same file path and HEAD content.
4. The provider returns facts or an unavailable/degraded result.
5. `indexHead` emits accepted facts into the same per-file patch and
   still enforces `maxPatchJsonBytes`.

The provider contract is the product boundary. A real tsserver-backed
provider is optional in this slice unless the dependency source,
lifecycle, and failure behavior are made explicit before implementation.

## Non-Goals

- No claim that Graft has complete type-aware reference tracing.
- No claim that all calls, all inferred types, all overloads, or all
  module aliases are resolved.
- No recursive scan of `node_modules`.
- No implicit use of the live checkout as test subject data.
- No test dependence on an operator's ambient TypeScript server state.

Effort: M for the first slice, L for the full original feature.

## Release Readiness Question

This card should not block v0.7.0 release prep. Pull it after v0.7.0
only if the next release explicitly wants a bounded semantic enrichment
slice before broader LSP work.
