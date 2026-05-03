---
title: "Bounded LSP semantic enrichment first slice"
legend: "WARP"
cycle: "WARP_lsp-enrichment"
source_backlog: "docs/method/backlog/cool-ideas/WARP_lsp-enrichment.md"
---

# Bounded LSP semantic enrichment first slice

Source backlog item: `docs/method/backlog/cool-ideas/WARP_lsp-enrichment.md`
Legend: WARP

## Hill

When a caller explicitly indexes a file path, Graft can optionally ask a
semantic enrichment provider for a small, bounded set of semantic facts
for that same file and write accepted facts into the same per-file WARP
patch as the tree-sitter facts.

If semantic enrichment is unavailable, tree-sitter indexing still
succeeds and the result reports a clear degraded state. This cycle
introduces the semantic enrichment seam and proof payloads; it does not
add a concrete language server runtime.

## Playback Questions

### Human

- [ ] Can a human tell this is a semantic enrichment provider boundary,
      not a full language server implementation?
- [ ] Can a human see that enrichment only runs for explicit-path
      indexing and never starts background or whole-repo indexing?
- [ ] Can a human identify the first accepted fact kinds and the
      semantic work deliberately deferred?

### Agent

- [ ] Does `indexHead` expose a semantic provider hook that is optional
      and deterministic under test?
- [ ] Does `indexHead` ask the provider only for explicitly indexed file
      paths and current HEAD content?
- [ ] Do fake-provider `call` facts emit bounded `calls` edges anchored
      to existing same-file symbols?
- [ ] Do fake-provider `typeof` facts emit bounded `typeof` properties
      on existing same-file symbol nodes?
- [ ] Does an unavailable provider preserve normal tree-sitter indexing
      while reporting semantic degradation?
- [ ] Do semantic fact caps and the existing `maxPatchJsonBytes` patch
      budget protect WARP materialization?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: enrichment status must be
  readable from plain result fields without inspecting graph internals.
- Non-visual or alternate-reading expectations: fact kinds and
  unavailable states must be explicit text, not only inferred from
  presence or absence of WARP patch entries.

## Localization and Directionality

- Locale / wording / formatting assumptions: English repo docs and
  machine-stable fact/status tokens.
- Logical direction / layout assumptions: no directional UI assumptions
  in this slice.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: provider input,
  accepted fact kinds, rejected facts, cap behavior, and unavailable
  reasons.
- What must be attributable, evidenced, or governed: semantic facts must
  be traceable to a provider result and must not create speculative
  symbol identities that tree-sitter did not anchor in the indexed file.

## Non-goals

- [ ] Implement a concrete tsserver, Pyright, rust-analyzer, gopls, or
      editor-backed provider.
- [ ] Build a full Language Server Protocol host.
- [ ] Start daemon, monitor, background, or live-refresh semantic
      enrichment.
- [ ] Perform implicit whole-repo or `node_modules` indexing.
- [ ] Claim complete type-aware reference tracing, overload resolution,
      alias resolution, or full semantic call graph coverage.
- [ ] Change governed edit/write behavior.
- [ ] Change WARP materialization policy beyond honoring the existing
      per-file patch budget.

## Backlog Context

Source: symbol-reference-tracing cycle discussion (2026-04-20)

## Scope Verdict

The original card is valid product direction, but too broad for a safe
v0.7.0 implementation cycle as written.

Graft already has `indexHead`, tree-sitter parsing, per-file WARP
patches, attached AST snapshot blobs, `maxPatchJsonBytes`, and lazy
indexing guardrails. This first slice must preserve those boundaries.
It should not turn one indexed file into an implicit whole-project LSP
crawl.

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

## Provider Boundary

Introduce a narrow provider shape instead of wiring `indexHead` directly
to a concrete language server process.

Expected request fields:

- `repoRoot`
- `filePath`
- `language`
- `content`
- `headSha`
- `maxFacts`

Expected result states:

- `available`: includes bounded facts and optional rejected fact count.
- `unavailable`: includes a stable reason string and leaves ordinary
  indexing successful.

Expected initial fact kinds:

- `call`: emits a `calls` edge from an existing same-file source symbol
  to an existing same-file target symbol.
- `typeof`: sets a provider-supplied `typeof` property on an existing
  same-file symbol node.

The provider may reject facts that cannot be anchored to existing
tree-sitter symbols in the same indexed file. The first slice should
prefer explicit rejection accounting over creating speculative nodes.

## Indexing Flow

1. `indexHead` selects parseable explicit paths using the existing lazy
   indexing rules.
2. Tree-sitter parsing, outline emission, import emission, and AST blob
   attachment run as they do today.
3. If a semantic provider is configured, `indexHead` asks it for facts
   for that same file path and HEAD content.
4. Accepted facts are emitted into the same per-file patch.
5. Unavailable providers and rejected facts are reported in the indexing
   result.
6. `maxPatchJsonBytes` still governs the final WARP patch payload.

## Result Shape

Expose a small semantic enrichment summary from indexing results so
callers can distinguish "not configured" from "configured but
unavailable" and from "available but no accepted facts."

Suggested fields:

- `status`: `not_configured`, `skipped_not_explicit`, `available`, or
  `unavailable`
- `filesAttempted`
- `factsAccepted`
- `factsRejected`
- `unavailable`: file/reason pairs when applicable

The summary is product truth. It should not require callers to inspect
low-level WARP entries to understand whether enrichment ran.

## Cool-Ideas Backlog Fit

The remaining `cool-ideas` backlog contains many consumers of better
semantic confidence, but this cycle should only lay the substrate.

Directly strengthened by this slice:

- `SURFACE_offer-rename-refactor`: higher-confidence reference and
  ambiguity reporting.
- `WARP_structural-impact-prediction`: better call-site and type facts
  for future blast-radius analysis.
- `WARP_minimum-viable-context`: stronger dependency surfaces for
  context selection.
- `WARP_semantic-drift-in-sessions`: weighted recontextualization edges
  can distinguish calls from weaker imports later.
- `WARP_auto-breaking-change-detection` and
  `WARP_semantic-merge-conflict-prediction`: future signature and
  compatibility checks can consume semantic facts.
- `WARP_symbol-heatmap`, `WARP_symbol-history-timeline`, and
  `WARP_temporal-structural-search`: richer symbol-level observations
  become available after semantic facts are persisted.
- `CORE_pr-review-structural-summary` and
  `CORE_structural-test-coverage-map`: future summaries can cite
  semantic edges as evidence rather than text matches.

Guardrails and adjacent prerequisites:

- `WARP_projection-safety-classes` should eventually label semantic
  projections by confidence and completeness.
- `WARP_grouped-aggregate-queries`,
  `traverse-plus-query-hydration-helper`, and
  `bounded-neighborhood-for-references` can make semantic facts easier
  to query, but they are not required for the first seam.
- `WARP_background-indexing` and `monitor-tick-ceiling-tracking` remain
  deferred. Semantic enrichment must not become background project
  crawling in this cycle.
- `CORE_migrate-to-slice-first-reads`, `CORE_context-budget-forecasting`,
  and `WARP_budget-elasticity` remain relevant to keeping semantic reads
  bounded.

Independent tracks:

- Provenance and causal-session work such as
  `WARP_agent-action-provenance`, `WARP_provenance-dag`,
  `WARP_causal-write-tracking`, and `CI-001-causal-collapse-visualizer`
  should not be pulled into this cycle.
- Daemon/status/TUI/operator surfaces and PR feedback workflow helpers
  remain SURFACE work, not part of the semantic indexing seam.
- Policy, teaching, handoff, and session-resume cards remain CORE
  workflow features that may later consume semantic facts but do not
  shape this implementation.

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

Effort: M for the first slice, L for the full original feature.

## Release Readiness Question

This card should not block v0.8.0 release prep unless the release
explicitly wants the semantic enrichment seam before broader LSP work.
